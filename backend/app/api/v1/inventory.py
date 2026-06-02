import os
import csv
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request, BackgroundTasks
from typing import List, Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.models.user import User, UserRole
from app.models.inventory import Category, Product, InventoryOrder, OrderItem
from app.api.v1.deps import PermissionChecker, get_active_user
from app.schemas.inventory import (
    CategoryCreate, CategoryUpdate, CategoryRead,
    ProductRead, OrderCreate, OrderRead
)
from app.api.v1.audit import create_audit_log
from app.services.email import notify_admins, notify_all_users
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter()

# Initialize Supabase client
supabase: Client = None
try:
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print(f"✅ Supabase client initialized ({settings.SUPABASE_URL})")
except Exception as e:
    print(f"⚠️ Supabase client failed to initialize: {e}")
    supabase = None


# ---- Thread-safe supabase upload helper ----
# supabase-py uses synchronous httpx internally. Calling it directly inside
# an async function blocks the event loop (fatal on Vercel serverless).
# asyncio.to_thread() runs it in a thread pool, keeping the loop clean.
async def _supabase_upload(file_name: str, content: bytes, content_type: str) -> str | None:
    """Upload file to Supabase Storage in a thread and return public URL."""
    if not supabase:
        print("⚠️ Supabase client not initialized.")
        return None
    
    clean_name = "".join([c if c.isalnum() or c in ".-_" else "_" for c in file_name])
    
    def _do_upload():
        try:
            supabase.storage.from_("products").upload(
                path=clean_name,
                file=content,
                file_options={"content-type": content_type or "application/octet-stream", "upsert": "true"}
            )
            return f"{settings.SUPABASE_URL}/storage/v1/object/public/products/{clean_name}"
        except Exception as e:
            print(f"❌ Supabase Storage Error: {e}")
            raise e
    
    try:
        return await asyncio.to_thread(_do_upload)
    except Exception as e:
        print(f"❌ Upload thread failure: {e}")
        return None


# ----------------------
# CATEGORIES
# ----------------------
@router.get("/categories", response_model=List[CategoryRead])
async def list_categories(session: AsyncSession = Depends(get_session),
                          current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.SUPER_HEAD, UserRole.NORMAL_STAFF]))):
    result = await session.execute(select(Category))
    return result.scalars().all()

@router.post("/categories", response_model=CategoryRead)
async def create_category(category: CategoryCreate,
                          request: Request = None,
                          session: AsyncSession = Depends(get_session),
                          current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    item = Category(**category.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    
    # Notify all users
    await notify_all_users(
        "🏷️ New Category Added",
        f"A new category '{item.name}' has been added to the inventory by {current_user.full_name}.",
        session
    )
    
    await create_audit_log(
        session, current_user, "CATEGORY_CREATED", 
        details=f"Added category '{item.name}'", 
        request=request
    )
    return item

@router.put("/categories/{category_id}", response_model=CategoryRead)
async def update_category(category_id: int, data: CategoryUpdate,
                          request: Request = None,
                          session: AsyncSession = Depends(get_session),
                          current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    result = await session.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if data.name is not None: cat.name = data.name
    if data.description is not None: cat.description = data.description
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    
    # Notify all users
    await notify_all_users(
        "🏷️ Category Updated",
        f"The category '{cat.name}' was updated by {current_user.full_name}.",
        session
    )
    
    await create_audit_log(
        session, current_user, "CATEGORY_UPDATED", 
        details=f"Updated category '{cat.name}'", 
        request=request
    )
    return cat

@router.delete("/categories/{category_id}")
async def delete_category(category_id: int,
                          request: Request = None,
                          session: AsyncSession = Depends(get_session),
                          current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    result = await session.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    name = cat.name
    await session.delete(cat)
    await session.commit()
    
    # Notify all users
    await notify_all_users(
        "🏷️ Category Deleted",
        f"The category '{name}' has been removed from the inventory by {current_user.full_name}.",
        session
    )
    
    await create_audit_log(
        session, current_user, "CATEGORY_DELETED", 
        details=f"Deleted category '{name}'", 
        request=request
    )
    return {"detail": "Category deleted"}

# ----------------------
# PRODUCTS
# ----------------------
UPLOADS_DIR = "uploads/products"

@router.get("/products", response_model=List[ProductRead])
async def list_products(
    skip: int = 0, 
    limit: int = 100,
    category_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_active_user)
):
    query = select(Product)
    if category_id:
        query = query.where(Product.category_id == category_id)
    
    result = await session.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/products", response_model=ProductRead)
async def create_product(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    sku: str = Form(...),
    price: float = Form(...),
    stock_quantity: int = Form(...),
    category_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    # Check if SKU exists
    existing_sku = await session.execute(select(Product).where(Product.sku == sku))
    if existing_sku.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Product with SKU '{sku}' already exists")

    # Save image if provided
    image_path = None
    if image and supabase:
        try:
            file_ext = image.filename.split(".")[-1]
            file_name = f"{sku}_{int(datetime.now().timestamp())}.{file_ext}"
            content = await image.read()
            
            # Use helper to upload in a thread pool (prevent blocking loop)
            image_path = await _supabase_upload(file_name, content, image.content_type)
            if image_path:
                print(f"✅ Successfully uploaded image: {image_path}")
        except Exception as e:
            print(f"❌ Failed to upload image to Supabase: {type(e).__name__}: {e}")
            # Don't fail the whole product creation if image upload fails, but log it
            image_path = None
    elif image:
        print("⚠️ Supabase credentials missing or client not initialized. Image upload skipped.")

    try:
        item = Product(
            name=name, sku=sku, price=price, 
            stock_quantity=stock_quantity, 
            category_id=category_id, 
            image_path=image_path
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)
    except Exception as e:
        await session.rollback()
        print(f"❌ Database error creating product: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save product: {str(e)}")
    
    # Notify all users & Create Audit Log (Background)
    # We DON'T pass the session to background tasks because it gets closed
    background_tasks.add_task(notify_all_product_creation, item.name, item.sku, item.price)
    background_tasks.add_task(create_audit_log_background, current_user.id, "PRODUCT_CREATED", f"Added product '{item.name}' (SKU: {item.sku})", request.client.host if request and request.client else "N/A")
    
    return item

@router.post("/products/bulk")
async def bulk_upload_products(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    decoded = content.decode('utf-8').splitlines()
    reader = csv.DictReader(decoded)
    
    products_added = 0
    errors = []
    
    for row in reader:
        try:
            sku = row.get('sku')
            if not sku: continue
            
            # Check SKU
            stmt = select(Product).where(Product.sku == sku)
            res = await session.execute(stmt)
            if res.scalar_one_or_none():
                errors.append(f"SKU {sku} already exists")
                continue
                
            p = Product(
                name=row.get('name', 'Unnamed Product'),
                sku=sku,
                price=float(row.get('price', 0)),
                stock_quantity=int(row.get('stock_quantity', 0)),
                category_id=int(row.get('category_id', 1))
            )
            session.add(p)
            products_added += 1
        except Exception as e:
            errors.append(f"Row {reader.line_num} error: {str(e)}")
            
    if products_added > 0:
        await session.commit()
        background_tasks.add_task(create_audit_log_background, current_user.id, "BULK_PRODUCT_UPLOAD", f"Uploaded {products_added} products via CSV", request.client.host if request and request.client else "N/A")
    
    return {"status": "success", "added": products_added, "errors": errors}

@router.put("/products/{product_id}", response_model=ProductRead)
async def update_product(
    background_tasks: BackgroundTasks,
    product_id: int,
    name: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    stock_quantity: Optional[int] = Form(None),
    category_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    result = await session.execute(select(Product).where(Product.id == product_id))
    prod = result.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if sku and sku != prod.sku:
        existing_sku = await session.execute(select(Product).where(Product.sku == sku))
        if existing_sku.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Product with SKU '{sku}' already exists")
        prod.sku = sku

    if name is not None: prod.name = name
    if price is not None: prod.price = price
    if stock_quantity is not None: prod.stock_quantity = stock_quantity
    if category_id is not None: prod.category_id = category_id

    if image and supabase:
        try:
            file_ext = image.filename.split(".")[-1]
            file_name = f"{prod.sku}_{int(datetime.now().timestamp())}.{file_ext}"
            content = await image.read()
            
            # Use helper to upload in a thread pool
            new_path = await _supabase_upload(file_name, content, image.content_type)
            if new_path:
                prod.image_path = new_path
                print(f"✅ Successfully updated image: {prod.image_path}")
        except Exception as e:
            print(f"❌ Failed to upload image to Supabase: {type(e).__name__}: {e}")
    elif image:
        print("⚠️ Supabase credentials missing. Image upload skipped.")

    try:
        session.add(prod)
        await session.commit()
        await session.refresh(prod)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")
    
    background_tasks.add_task(create_audit_log_background, current_user.id, "PRODUCT_UPDATED", f"Updated product '{prod.name}' (SKU: {prod.sku})", request.client.host if request and request.client else "N/A")
    
    return prod

@router.delete("/products/{product_id}")
async def delete_product(product_id: int,
                         background_tasks: BackgroundTasks,
                         request: Request = None,
                         session: AsyncSession = Depends(get_session),
                         current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    result = await session.execute(select(Product).where(Product.id == product_id))
    prod = result.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    name = prod.name
    sku = prod.sku
    # Delete image
    if prod.image_path:
        if "supabase.co" in prod.image_path and supabase:
            def _do_remove():
                try:
                    # Extract filename from URL (assumes filename is at the end)
                    file_name = prod.image_path.split("/")[-1]
                    supabase.storage.from_("products").remove([file_name])
                    return file_name
                except Exception as e:
                    print(f"⚠️ Failed to delete image from Supabase: {e}")
                    return None
            
            # Run removal in a thread pool
            removed_file = await asyncio.to_thread(_do_remove)
            if removed_file:
                print(f"✅ Deleted image from Supabase: {removed_file}")

    await session.delete(prod)
    await session.commit()
    
    await create_audit_log(session, current_user, "PRODUCT_DELETED", details=f"Deleted product '{name}' (SKU: {sku})", request=request)
    
    return {"detail": "Product deleted"}

# Helper Background Task Functions to avoid session closure crashes
async def notify_all_product_creation(name: str, sku: str, price: float):
    from app.db.session import async_session
    try:
        async with async_session() as session:
            await notify_all_users(
                "📦 New Product Added",
                f"Product '{name}' (SKU: {sku}) has been added to the catalog at ₦{price:,.2f}.",
                session
            )
    except Exception as e:
        print(f"⚠️ Background notification failed: {e}")

async def create_audit_log_background(user_id: int, action: str, details: str, ip_address: str):
    from app.db.session import async_session
    from app.models.user import User
    try:
        async with async_session() as session:
            user = await session.get(User, user_id)
            if user:
                # We need a dummy request or just call a simpler version
                from app.models.audit import AuditLog
                new_log = AuditLog(
                    user_id=user.id,
                    full_name=user.full_name,
                    email=user.email,
                    action=action,
                    details=details,
                    ip_address=ip_address
                )
                session.add(new_log)
                await session.commit()
    except Exception as e:
        print(f"⚠️ Background audit log failed: {e}")

# ----------------------
# ORDERS
# ----------------------
from sqlalchemy.orm import selectinload

@router.get("/orders", response_model=List[OrderRead])
async def list_orders(
    skip: int = 0, 
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.SUPER_HEAD, UserRole.NORMAL_STAFF]))
):
    result = await session.execute(
        select(InventoryOrder)
        .options(selectinload(InventoryOrder.items))
        .order_by(InventoryOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/orders", response_model=OrderRead)
async def create_order(order_in: OrderCreate,
                       request: Request = None,
                       session: AsyncSession = Depends(get_session),
                       current_user: User = Depends(get_active_user)):
    total_amount = 0.0
    order_items = []
    # Fetch all products in one go to avoid N+1 queries
    product_ids = [item.product_id for item in order_in.items]
    prod_stmt = select(Product).where(Product.id.in_(product_ids))
    prod_res = await session.execute(prod_stmt)
    products_map = {p.id: p for p in prod_res.scalars().all()}
    
    for item_in in order_in.items:
        product = products_map.get(item_in.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")
        if product.stock_quantity < item_in.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'")
        
        product.stock_quantity -= item_in.quantity
        session.add(product)
        total_amount += product.price * item_in.quantity
        order_items.append(OrderItem(product_id=product.id, quantity=item_in.quantity, unit_price=product.price))

    order = InventoryOrder(
        customer_name=order_in.customer_name, 
        total_amount=total_amount, 
        status="successful",
        staff_email=current_user.email,
        payment_mode=order_in.payment_mode or "Transfer"
    )
    session.add(order)
    await session.flush()

    for oi in order_items:
        oi.order_id = order.id
        session.add(oi)

    await session.commit()
    
    # Reload with items to prevent MissingGreenlet error during serialization
    stmt = select(InventoryOrder).where(InventoryOrder.id == order.id).options(selectinload(InventoryOrder.items))
    res = await session.execute(stmt)
    order = res.scalar_one()
    
    # Notify Admins, HR about the new order
    await notify_admins(
        "🛒 New Order Recorded",
        f"A new order (#ORD-{order.id}) for '{order.customer_name}' totaling ₦{order.total_amount:,.2f} has been initiated by {current_user.full_name}.",
        session,
        additional_emails=[current_user.email]
    )
    
    await create_audit_log(
        session, current_user, "ORDER_CREATED", 
        details=f"Initiated order #ORD-{order.id} for customer '{order.customer_name}'", 
        request=request
    )
    
    return order

@router.put("/orders/{order_id}", response_model=OrderRead)
async def edit_order_status(order_id: int, status: str,
                            request: Request = None,
                            session: AsyncSession = Depends(get_session),
                            current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    # Only Admin, SuperAdmin can edit orders (Line 260 blocks HR)
    result = await session.execute(
        select(InventoryOrder)
        .where(InventoryOrder.id == order_id)
        .options(selectinload(InventoryOrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    session.add(order)
    await session.commit()
    await session.refresh(order)
    
    # Notify admins of status change
    await notify_admins(
        "🛒 Order Status Update",
        f"Order #ORD-{order.id} status has been changed to '{status.upper()}' by {current_user.full_name}.",
        session
    )
    
    await create_audit_log(
        session, current_user, "ORDER_STATUS_CHANGED", 
        details=f"Updated order #ORD-{order.id} status to {status.upper()}", 
        request=request
    )
    
    return order

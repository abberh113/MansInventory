import os
import shutil
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request
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
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


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
    # Save image if provided
    image_path = None
    if image and supabase:
        try:
            file_ext = image.filename.split(".")[-1]
            file_name = f"{sku}_{int(datetime.now().timestamp())}.{file_ext}"
            content = await image.read()
            
            # Upload to Supabase bucket 'products'
            storage_res = supabase.storage.from_("products").upload(
                path=file_name,
                file=content,
                file_options={"content-type": image.content_type}
            )
            # Get Public URL
            image_path = supabase.storage.from_("products").get_public_url(file_name)
            print(f"✅ Successfully uploaded image: {image_path}")
        except Exception as e:
            print(f"❌ Failed to upload image to Supabase: {type(e).__name__}: {e}")
            image_path = None
    elif image:
        print("⚠️ Supabase credentials missing. Image upload skipped.")

    item = Product(
        name=name, sku=sku, price=price, 
        stock_quantity=stock_quantity, 
        category_id=category_id, 
        image_path=image_path
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    
    # Notify all users
    await notify_all_users(
        "📦 New Product Added",
        f"Product '{item.name}' (SKU: {item.sku}) has been added to the catalog at ₦{item.price:,.2f}.",
        session
    )
    
    await create_audit_log(
        session, current_user, "PRODUCT_CREATED", 
        details=f"Added product '{item.name}' (SKU: {item.sku})", 
        request=request
    )
    return item

@router.put("/products/{product_id}", response_model=ProductRead)
async def update_product(
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
    
    if name is not None: prod.name = name
    if sku is not None: prod.sku = sku
    if price is not None: prod.price = price
    if stock_quantity is not None: prod.stock_quantity = stock_quantity
    if category_id is not None: prod.category_id = category_id

    if image and supabase:
        try:
            file_ext = image.filename.split(".")[-1]
            file_name = f"{prod.sku}_{int(datetime.now().timestamp())}.{file_ext}"
            content = await image.read()
            
            # Upload to Supabase bucket 'products'
            storage_res = supabase.storage.from_("products").upload(
                path=file_name,
                file=content,
                file_options={"content-type": image.content_type}
            )
            # Get Public URL
            prod.image_path = supabase.storage.from_("products").get_public_url(file_name)
            print(f"✅ Successfully uploaded image: {prod.image_path}")
        except Exception as e:
            print(f"❌ Failed to upload image to Supabase: {type(e).__name__}: {e}")
    elif image:
        print("⚠️ Supabase credentials missing. Image upload skipped.")

    session.add(prod)
    await session.commit()
    await session.refresh(prod)
    
    # Notify all users
    await notify_all_users(
        "📦 Product Updated",
        f"The product '{prod.name}' details were updated by {current_user.full_name}.",
        session
    )
    
    await create_audit_log(
        session, current_user, "PRODUCT_UPDATED", 
        details=f"Updated product '{prod.name}' (SKU: {prod.sku})", 
        request=request
    )
    return prod

@router.delete("/products/{product_id}")
async def delete_product(product_id: int,
                         session: AsyncSession = Depends(get_session),
                         current_user: User = Depends(PermissionChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    result = await session.execute(select(Product).where(Product.id == product_id))
    prod = result.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    name = prod.name
    # Delete image
    if prod.image_path:
        if "supabase.co" in prod.image_path and supabase:
            try:
                # Extract filename from URL (assumes filename is at the end)
                file_name = prod.image_path.split("/")[-1]
                supabase.storage.from_("products").remove([file_name])
                print(f"✅ Deleted image from Supabase: {file_name}")
            except Exception as e:
                print(f"⚠️ Failed to delete image from Supabase: {e}")
        else:
            # Fallback for local files
            old_path = prod.image_path.lstrip("/").replace("/", os.sep)
            if os.path.exists(old_path):
                try: os.remove(old_path)
                except: pass

    await session.delete(prod)
    await session.commit()
    
    # Notify all users
    await notify_all_users(
        "📦 Product Discontinued",
        f"The product '{name}' has been removed from the inventory by {current_user.full_name}.",
        session
    )
    return {"detail": "Product deleted"}

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

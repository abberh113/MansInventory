from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

# --- CATEGORY ---
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CategoryRead(CategoryBase):
    id: int
    class Config:
        from_attributes = True

# --- PRODUCT ---
class ProductBase(BaseModel):
    name: str
    sku: str
    price: float
    stock_quantity: int
    category_id: int

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    category_id: Optional[int] = None

class ProductRead(ProductBase):
    id: int
    image_path: Optional[str] = None
    class Config:
        from_attributes = True

# --- ORDER ---
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    customer_name: str
    items: List[OrderItemCreate]
    payment_mode: Optional[str] = "Transfer"

class OrderItemRead(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    class Config:
        from_attributes = True

class OrderRead(BaseModel):
    id: int
    customer_name: str
    status: str
    total_amount: float
    staff_email: Optional[str] = None
    payment_mode: Optional[str] = "Transfer"
    created_at: datetime
    items: List[OrderItemRead] = []
    class Config:
        from_attributes = True

from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None

    products: List["Product"] = Relationship(back_populates="category")


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    sku: str = Field(unique=True, index=True)
    price: float
    stock_quantity: int
    category_id: int = Field(foreign_key="category.id")
    image_path: Optional[str] = Field(default=None)

    category: Optional[Category] = Relationship(back_populates="products")
    order_items: List["OrderItem"] = Relationship(back_populates="product")


class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="inventoryorder.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int
    unit_price: float

    order: Optional["InventoryOrder"] = Relationship(back_populates="items")
    product: Optional[Product] = Relationship(back_populates="order_items")


class InventoryOrder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_name: str
    status: str = Field(default="pending")  # pending, processing, completed, cancelled
    total_amount: float = Field(default=0.0)
    staff_email: Optional[str] = Field(default=None, index=True)
    payment_mode: Optional[str] = Field(default="Transfer") # Cash, Transfer, Card, POS
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    items: List[OrderItem] = Relationship(back_populates="order")

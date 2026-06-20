import os
from typing import List
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# Initialize FastAPI
app = FastAPI(
    title="Inventory & Order Management API",
    description="Production-Ready Python FastAPI Backend for Catalog, Customers, and Orders.",
    version="1.0.0"
)

# Enable CORS for frontend integration.
# Note: allow_origins cannot contain "*" if allow_credentials is True, which previously caused a startup assertion error/crash.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://inventory-management-drv63x2sh-khushi-ux123s-projects.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_origin_regex=r"https://.*|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Configuration (Supports environment-provided PostgreSQL, fallback on SQLite)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/inventory_db")

# Fallback on sqlite if postgres driver not found locally, for easier standalone testing
if "postgresql" in DATABASE_URL and not DATABASE_URL.startswith("sqlite"):
    # Ensure psycopg2 is installed or fall back to sqlite if needed
    try:
        engine = create_engine(DATABASE_URL)
    except Exception:
        DATABASE_URL = "sqlite:///./production_fallback.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Database Models

class ProductModel(Base):
    __tablename__ = "products"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)

class CustomerModel(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)

class OrderModel(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    customer_name = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("OrderItemModel", back_populates="order", cascade="all, delete-orphan")

class OrderItemModel(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    product_name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    
    order = relationship("OrderModel", back_populates="items")

# Create tables in the Database
Base.metadata.create_all(bind=engine)

# Dependency to retrieve database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas for requests/responses validation

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    price: float = Field(..., ge=0.0)
    quantity: int = Field(..., ge=0)

    class Config:
        from_attributes = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: str

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=1)

    class Config:
        from_attributes = True

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: str

class OrderItemRequest(BaseModel):
    productId: str
    quantity: int = Field(..., gt=0)

class OrderCreate(BaseModel):
    customerId: str
    items: List[OrderItemRequest]

class OrderItemResponse(BaseModel):
    productId: str
    productName: str
    price: float
    quantity: int

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: str
    customerId: str
    customerName: str
    items: List[OrderItemResponse]
    totalAmount: float
    createdAt: datetime

    class Config:
        from_attributes = True


# REST API ROUTERS

# --- Product Endpoints ---

@app.get("/products", response_model=List[ProductResponse])
def get_all_products(db: Session = Depends(get_db)):
    return db.query(ProductModel).all()

@app.get("/products/{id}", response_model=ProductResponse)
def get_product_by_id(id: str, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    sku_upper = product.sku.strip().upper()
    
    # Check if SKU already exists
    existing = db.query(ProductModel).filter(ProductModel.sku == sku_upper).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product SKU '{product.sku}' is already in use")

    import uuid
    db_product = ProductModel(
        id=f"p_{uuid.uuid4().hex[:9]}",
        name=product.name.strip(),
        sku=sku_upper,
        price=product.price,
        quantity=product.quantity
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/products/{id}", response_model=ProductResponse)
def update_product(id: str, product: ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(ProductModel).filter(ProductModel.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    sku_upper = product.sku.strip().upper()
    
    # Ensure SKU uniqueness
    existing = db.query(ProductModel).filter(ProductModel.sku == sku_upper, ProductModel.id != id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product SKU '{product.sku}' is in use by another product")

    db_product.name = product.name.strip()
    db_product.sku = sku_upper
    db_product.price = product.price
    db_product.quantity = product.quantity
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/products/{id}")
def delete_product(id: str, db: Session = Depends(get_db)):
    db_product = db.query(ProductModel).filter(ProductModel.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Constraint check: Do not delete if referenced in any order items
    referenced = db.query(OrderItemModel).filter(OrderItemModel.product_id == id).first()
    if referenced:
        raise HTTPException(status_code=400, detail="Cannot delete this product as it is referenced in past orders")

    db.delete(db_product)
    db.commit()
    return {"message": "Product successfully deleted"}


# --- Customer Endpoints ---

@app.get("/customers", response_model=List[CustomerResponse])
def get_all_customers(db: Session = Depends(get_db)):
    return db.query(CustomerModel).all()

@app.get("/customers/{id}", response_model=CustomerResponse)
def get_customer_by_id(id: str, db: Session = Depends(get_db)):
    customer = db.query(CustomerModel).filter(CustomerModel.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@app.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    email_lower = customer.email.strip().lower()
    
    # Email uniqueness check
    existing = db.query(CustomerModel).filter(CustomerModel.email == email_lower).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer with email '{customer.email}' already exists")

    import uuid
    db_customer = CustomerModel(
        id=f"c_{uuid.uuid4().hex[:9]}",
        name=customer.name.strip(),
        email=email_lower,
        phone=customer.phone.strip()
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.delete("/customers/{id}")
def delete_customer(id: str, db: Session = Depends(get_db)):
    db_customer = db.query(CustomerModel).filter(CustomerModel.id == id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Constraint check: Prevent deleting if has orders
    has_orders = db.query(OrderModel).filter(OrderModel.customer_id == id).first()
    if has_orders:
        raise HTTPException(status_code=400, detail="Cannot delete customer as they have active transaction histories")

    db.delete(db_customer)
    db.commit()
    return {"message": "Customer successfully deleted"}


# --- Order Endpoints ---

@app.get("/orders", response_model=List[OrderResponse])
def get_all_orders(db: Session = Depends(get_db)):
    all_orders = db.query(OrderModel).all()
    response = []
    for order in all_orders:
        items = [
            OrderItemResponse(
                productId=item.product_id,
                productName=item.product_name,
                price=item.price,
                quantity=item.quantity
            ) for item in order.items
        ]
        response.append(
            OrderResponse(
                id=order.id,
                customerId=order.customer_id,
                customerName=order.customer_name,
                items=items,
                totalAmount=order.total_amount,
                createdAt=order.created_at
            )
        )
    return response

@app.get("/orders/{id}", response_model=OrderResponse)
def get_order_by_id(id: str, db: Session = Depends(get_db)):
    order = db.query(OrderModel).filter(OrderModel.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    items = [
        OrderItemResponse(
            productId=item.product_id,
            productName=item.product_name,
            price=item.price,
            quantity=item.quantity
        ) for item in order.items
    ]
    return OrderResponse(
        id=order.id,
        customerId=order.customer_id,
        customerName=order.customer_name,
        items=items,
        totalAmount=order.total_amount,
        createdAt=order.created_at
    )

@app.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    # 1. Verify customer
    customer = db.query(CustomerModel).filter(CustomerModel.id == order_data.customerId).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer reference details not found")

    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must include at least one product reference")

    # Deduplicate order items if same product specified multiple times
    requested_quantities = {}
    for item in order_data.items:
        requested_quantities[item.productId] = requested_quantities.get(item.productId, 0) + item.quantity

    total_calculated_amount = 0.0
    items_to_save = []
    products_to_update = []

    # 2. Check each product, price, and inventory stock
    for product_id, quantity in requested_quantities.items():
        product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product SKU with ID '{product_id}' not found")

        # Inventory check
        if product.quantity < quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for product '{product.name}'. Available: {product.quantity}, Requested: {quantity}"
            )

        # Increment total amount
        item_total = product.price * quantity
        total_calculated_amount += item_total

        # Prepare Order Item database model
        items_to_save.append(
            OrderItemModel(
                product_id=product.id,
                product_name=product.name,
                price=product.price,
                quantity=quantity
            )
        )

        # Prepare stock deduction
        product.quantity -= quantity
        products_to_update.append(product)

    # 3. Save Order and Items to database
    import uuid
    new_order = OrderModel(
        id=f"o_{uuid.uuid4().hex[:9]}",
        customer_id=customer.id,
        customer_name=customer.name,
        total_amount=round(total_calculated_amount, 2),
        created_at=datetime.utcnow()
    )
    
    # Bind item models
    for item in items_to_save:
        item.order_id = new_order.id
        db.add(item)

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Format return elements
    res_items = [
        OrderItemResponse(
            productId=item.product_id,
            productName=item.product_name,
            price=item.price,
            quantity=item.quantity
        ) for item in new_order.items
    ]

    return OrderResponse(
        id=new_order.id,
        customerId=new_order.customer_id,
        customerName=new_order.customer_name,
        items=res_items,
        totalAmount=new_order.total_amount,
        createdAt=new_order.created_at
    )

@app.delete("/orders/{id}")
def cancel_and_rollback_order(id: str, db: Session = Depends(get_db)):
    db_order = db.query(OrderModel).filter(OrderModel.id == id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Restore stock
    for item in db_order.items:
        p_model = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if p_model:
            p_model.quantity += item.quantity

    db.delete(db_order)
    db.commit()
    return {"message": f"Order #{id} cancelled and item stock levels restored successfully"}


# Health Check
@app.get("/")
def health_check():
    return {"status": "online", "message": "Inventory management API running successfully"}

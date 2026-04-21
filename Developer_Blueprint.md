# Mans Inventory System - Developer Blueprint

## 1. System Architecture
Mans Inventory System is built using a modern decoupled architecture:
- **Frontend Layer:** React.js / Node.js
- **Backend Layer:** FastAPI / Python
- **Database:** Supabase PostgreSQL setup with SQLModel integration
- **Styling & UI:** Tailwind CSS or custom CSS with React-Bootstrap (glassmorphism UI patterns)

## 2. API & Data Models
The application data layer is structured over Python-based SQLModel (an extension of Pydantic and SQLAlchemy). The entities and their attributes are:

### User Object (`User` with `UserRole`)
Stores system users and authentication credentials.
- `id` (PK, int)
- `full_name` (str, unique)
- `email` (str, unique)
- `hashed_password` (str)
- `role` (enum: super_admin, admin, hr, super_head, normal_staff)
- `is_active` (bool), `is_confirmed` (bool), `is_google_user` (bool)
- `created_at` (datetime)

### Inventory Model Structure
#### Category (`Category`)
Product grouping system.
- `id` (PK, int)
- `name` (str, unique)
- `description` (str, optional)
- *Relationship:* One category can have many products.

#### Product (`Product`)
Core operational entity.
- `id` (PK, int)
- `name` (str)
- `sku` (str, unique)
- `price` (float)
- `stock_quantity` (int)
- `category_id` (FK to Category)
- `image_path` (str, optional)
- *Relationship:* Belongs to Category, multiple order items.

#### Order System (`InventoryOrder`)
Sales tracking element.
- `id` (PK, int)
- `customer_name` (str)
- `status` (str: pending, processing, completed, cancelled)
- `total_amount` (float)
- `staff_email` (str, tracked to staff issuing order)
- `payment_mode` (str: Cash, Transfer, Card, POS)

#### Order Item (`OrderItem`)
Join table indicating product and order quantities.
- `id` (PK, int)
- `order_id` (FK to InventoryOrder)
- `product_id` (FK to Product)
- `quantity` (int), `unit_price` (float)

### Audit and Tracking (`AuditLog`)
Maintains compliance and logs user actions across the platform.
- `id` (PK, int)
- `user_id` (int), `full_name` (str), `email` (str)
- `action` (str - e.g. LOGIN, PRODUCT_CREATED)
- `details` (str), `ip_address` (str)

## 3. Frontend Architecture
The system adopts specific view boundaries via pages located under `frontend/src/pages`:
- **Auth Flow:** `LoginPage`, `RegisterPage`, `ForgotPasswordPage`
- **Dashboard:** `DashboardPage` containing statistical summaries and analytics graphs.
- **Resource Managers:** `UsersPage`, `ProductsPage`, `CategoriesPage`, `OrdersPage`
- **Utility and Print:** `ReceiptPage` (For printable invoices).

## 4. Environment & Deployment Strategy
The backend is conventionally mapped to deploy on options like Vercel or locally. Wait for `npm run build` and Vite configuration. The APIs expose standard CRUD verbs corresponding to their data models. Token-based authentication using JWT ensures secure access to `api/v1` endpoints.

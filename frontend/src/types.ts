export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_confirmed: boolean;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  category_id: number;
  image_path?: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: number;
  customer_name: string;
  status: string;
  total_amount: number;
  staff_email: string;
  items: OrderItem[];
  created_at: string;
  payment_mode: string;
}

export interface ApiError {
  response?: {
    data?: {
      detail?: string | { msg: string }[];
    };
  };
}

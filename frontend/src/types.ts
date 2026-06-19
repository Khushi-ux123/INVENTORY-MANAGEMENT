export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  lowStockCount: number;
  totalRevenue: number;
}

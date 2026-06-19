import React, { useState, useEffect } from "react";
import { 
  LayoutGrid, 
  ShoppingBag, 
  Users, 
  FileText, 
  Menu, 
  X, 
  Package,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Dashboard from "./components/Dashboard";
import ProductSection from "./components/ProductSection";
import CustomerSection from "./components/CustomerSection";
import OrderSection from "./components/OrderSection";
import { Product, Customer, Order, DashboardStats } from "./types";

export default function App() {
  // Navigation active tab index
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalOrders: 0,
    lowStockCount: 0,
    totalRevenue: 0
  });

  // UI state management
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Custom Banner Alerts
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Fetch all endpoints
  const fetchEverything = async () => {
    try {
      const [productsRes, customersRes, ordersRes, statsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/customers"),
        fetch("/api/orders"),
        fetch("/api/dashboard/stats")
      ]);

      if (!productsRes.ok || !customersRes.ok || !ordersRes.ok || !statsRes.ok) {
        throw new Error("Failed to synchronize database state");
      }

      const productsData = await productsRes.json();
      const customersData = await customersRes.json();
      const ordersData = await ordersRes.json();
      const statsData = await statsRes.json();

      setProducts(productsData);
      setCustomers(customersData);
      setOrders(ordersData);
      setStats(statsData);
      setIsDataLoaded(true);
      setErrorMessage(null);
    } catch (error: any) {
      console.error("Data synchronization error:", error);
      setErrorMessage("System network or database connection failed. Please ensure the backend server is running.");
    }
  };

  useEffect(() => {
    fetchEverything();
  }, []);

  const clearBanners = () => {
    setErrorBanner(null);
    setSuccessBanner(null);
  };

  // Helper handling API actions
  const onAddProduct = async (product: Omit<Product, "id">): Promise<boolean> => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to catalog product");
        return false;
      }
      setSuccessBanner(`Product '${product.name}' cataloged successfully!`);
      await fetchEverything();
      return true;
    } catch (err) {
      setErrorBanner("Server network error cataloging product");
      return false;
    }
  };

  const onUpdateProduct = async (id: string, product: Omit<Product, "id">): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to update product Details");
        return false;
      }
      setSuccessBanner(`Product SKU '${product.sku}' successfully revised!`);
      await fetchEverything();
      return true;
    } catch (err) {
      setErrorBanner("Server network error updating product details");
      return false;
    }
  };

  const onDeleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Cannot delete registered product");
        return false;
      }
      setSuccessBanner("Product configuration deleted successfully!");
      await fetchEverything();
      return true;
    } catch (err) {
      setErrorBanner("Server network error deleting product details");
      return false;
    }
  };

  const onAddCustomer = async (customer: Omit<Customer, "id">): Promise<boolean> => {
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to enroll customer profile");
        return false;
      }
      setSuccessBanner(`Customer account for '${customer.name}' is now enrolled!`);
      await fetchEverything();
      return true;
    } catch (err) {
      setErrorBanner("Server network error enrolling customer account");
      return false;
    }
  };

  const onDeleteCustomer = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Unable to delete customer account profile");
        return false;
      }
      setSuccessBanner("Customer profile deleted successfully!");
      await fetchEverything();
      return true;
    } catch (err) {
      setErrorBanner("Server network error deleting customer profile");
      return false;
    }
  };

  const onCreateOrder = async (orderData: { customerId: string; items: { productId: string; quantity: number }[] }): Promise<boolean> => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to process and confirm order elements");
        return false;
      }
      setSuccessBanner(`Transaction order invoice created and stock deducted!`);
      await fetchEverything();
      return true;
    } catch (err) {
      setErrorBanner("Server network error building transaction invoices");
      return false;
    }
  };

  const onDeleteOrder = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Unable to void purchase order");
        return false;
      }
      setSuccessBanner(`Order invoice #${id} cancelled and stock quantities restored!`);
      await fetchEverything();
      return true;
    } catch (err) {
      setErrorBanner("Server network error cancellation of order invoices");
      return false;
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "products", label: "Products catalog", icon: ShoppingBag, count: products.length },
    { id: "customers", label: "Customers list", icon: Users, count: customers.length },
    { id: "orders", label: "Order invoices", icon: FileText, count: orders.length }
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col lg:flex-row font-sans text-neutral-850 antialiased selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* Desktop Sidebar Navigation */}
      <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? "w-20 p-4" : "w-64 p-5"} bg-white border-r border-neutral-200/80 shrink-0 select-none transition-all duration-300 relative`}>
        {/* Brand identity header */}
        <div className="flex items-center gap-2.5 pb-8 pt-2 border-b border-neutral-100/60 min-w-0">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Package className="h-5 w-5" />
          </button>
          {!isSidebarCollapsed && (
            <div className="truncate">
              <span className="font-bold text-neutral-900 tracking-tight block text-sm truncate">Inventory Boss</span>
              <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5 font-mono uppercase tracking-wider truncate">
                <Activity className="h-3 w-3 animate-pulse shrink-0" /> Full sync
              </div>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 mt-8 flex-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  clearBanners();
                }}
                className={`w-full flex items-center relative rounded-xl font-medium text-xs transition-all pointer-events-auto cursor-pointer ${
                  isSidebarCollapsed 
                    ? "justify-center px-1.5 py-3" 
                    : "justify-between px-3.5 py-2.5"
                } ${
                  isActive 
                    ? "bg-indigo-600/5 text-indigo-600 shadow-3xs border border-indigo-200/30 font-semibold" 
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50/70 border border-transparent"
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconComponent className={`h-4.5 w-4.5 transition-colors shrink-0 ${isActive ? "text-indigo-600" : "text-neutral-400"}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isSidebarCollapsed && item.count !== undefined && item.count > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                    isActive ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-500"
                  }`}>
                    {item.count}
                  </span>
                )}
                {isSidebarCollapsed && item.count !== undefined && item.count > 0 && (
                  <span className="absolute top-1 right-1.5 inline-flex items-center justify-center min-w-4 h-4 text-[9px] font-bold text-white bg-indigo-600 rounded-full font-mono px-0.5 scale-90">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Brand footnote info */}
        <div className={`pt-4 border-t border-neutral-100/60 ${isSidebarCollapsed ? "text-center" : "pl-1"}`}>
          {!isSidebarCollapsed ? (
            <>
              <div className="text-[10px] text-neutral-400 font-mono">WORKSPACE ID CLOUD</div>
              <div className="text-[10px] font-bold text-neutral-600 font-mono mt-0.5">CONTAINER V2</div>
            </>
          ) : (
            <div className="text-[9px] font-bold text-neutral-400 font-mono">V2</div>
          )}
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden bg-white border-b border-neutral-200/85 px-4.5 py-4 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg text-white flex items-center justify-center font-extrabold shadow-sm">
            <Package className="h-4.5 w-4.5" />
          </div>
          <span className="font-bold text-sm text-neutral-900">Inventory Boss</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 text-neutral-500 hover:text-neutral-900 focus:outline-hidden"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Panel Drawer Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-white border-b border-neutral-200 shadow-sm overflow-hidden select-none"
          >
            <div className="p-4 space-y-1 bg-neutral-50/50">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                      clearBanners();
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold ${
                      isActive 
                        ? "bg-indigo-600 text-white" 
                        : "text-neutral-600 hover:bg-neutral-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-4.5 w-4.5" />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        isActive ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-600"
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area Container */}
      <main className="flex-1 p-4.5 sm:p-8 lg:p-10 overflow-y-auto">
        {!isDataLoaded && !errorMessage ? (
          <div className="h-[60vh] flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-indigo-400 opacity-20" />
              <div className="h-14 w-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
            <span className="text-xs text-neutral-500 font-mono font-medium mt-6">SYNCHRONIZING SECURE DATABASE STORE...</span>
          </div>
        ) : errorMessage ? (
          <div className="h-[60vh] flex flex-col items-center justify-center max-w-md mx-auto text-center p-6 bg-red-50/50 border border-red-200 rounded-2xl">
            <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
            <h3 className="font-bold text-neutral-900">Database Offline</h3>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{errorMessage}</p>
          </div>
        ) : (
          <div className="max-w-6.5xl mx-auto">
            {activeTab === "dashboard" && (
              <Dashboard 
                stats={stats} 
                products={products} 
                customers={customers} 
                orders={orders} 
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === "products" && (
              <ProductSection 
                products={products}
                onAddProduct={onAddProduct}
                onUpdateProduct={onUpdateProduct}
                onDeleteProduct={onDeleteProduct}
                errorBanner={errorBanner}
                successBanner={successBanner}
                clearBanners={clearBanners}
              />
            )}

            {activeTab === "customers" && (
              <CustomerSection 
                customers={customers}
                onAddCustomer={onAddCustomer}
                onDeleteCustomer={onDeleteCustomer}
                errorBanner={errorBanner}
                successBanner={successBanner}
                clearBanners={clearBanners}
              />
            )}

            {activeTab === "orders" && (
              <OrderSection 
                orders={orders}
                customers={customers}
                products={products}
                onCreateOrder={onCreateOrder}
                onDeleteOrder={onDeleteOrder}
                errorBanner={errorBanner}
                successBanner={successBanner}
                clearBanners={clearBanners}
              />
            )}
          </div>
        )}
      </main>

    </div>
  );
}

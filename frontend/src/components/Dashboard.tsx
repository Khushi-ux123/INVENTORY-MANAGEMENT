import React from "react";
import { 
  ShoppingBag, 
  Users, 
  FileText, 
  AlertTriangle, 
  DollarSign, 
  Plus, 
  ArrowUpRight, 
  TrendingUp,
  PackageCheck,
  Download
} from "lucide-react";
import { motion } from "motion/react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend,
  Area
} from "recharts";
import { Product, Customer, Order, DashboardStats } from "../types";
import { downloadProductsCSV, downloadCustomersCSV, downloadOrdersCSV } from "../utils/csvExport";

interface DashboardProps {
  stats: DashboardStats;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
}

export default function Dashboard({ stats, products, customers, orders, onNavigate, isDarkMode }: DashboardProps) {
  // Find low stock products
  const lowStockProducts = products.filter(p => p.quantity <= 10);
  
  // Calculate top products by sales
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.quantity * item.price;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Get 3 recent orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Compile monthly trend data for the Recharts graph
  const monthlyData = React.useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string; monthLabel: string; ordersCount: number; revenue: number; timestamp: number }> = {};
    
    // Dynamically backfill the last 6 calendar months to guarantee beautiful, seamless trendlines!
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyMap[monthKey] = {
        monthKey,
        monthLabel,
        ordersCount: 0,
        revenue: 0,
        timestamp: d.getTime()
      };
    }

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      if (monthlyMap[monthKey]) {
        monthlyMap[monthKey].ordersCount += 1;
        monthlyMap[monthKey].revenue += order.totalAmount;
      } else {
        const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthlyMap[monthKey] = {
          monthKey,
          monthLabel,
          ordersCount: 1,
          revenue: order.totalAmount,
          timestamp: new Date(year, month, 1).getTime()
        };
      }
    });

    return Object.values(monthlyMap).sort((a, b) => a.timestamp - b.timestamp);
  }, [orders]);

  // SVG Chart Calculation (Legacy fallback chart orders)
  const chartOrders = [...orders]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-6);

  const maxRevenue = chartOrders.length > 0 
    ? Math.max(...chartOrders.map(o => o.totalAmount), 100) 
    : 100;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Dashboard</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-405 mt-1">Real-time overview of your store's inventory, clients, and orders.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total Products</span>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.totalProducts}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total Customers</span>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.totalCustomers}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="h-5 w-5" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Orders Filled</span>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.totalOrders}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          onClick={() => stats.lowStockCount > 0 && onNavigate("products")}
          className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between ${
            stats.lowStockCount > 0 
              ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors" 
              : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Low Stock</span>
            <div className={`text-2xl font-bold ${stats.lowStockCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-100"}`}>
              {stats.lowStockCount}
            </div>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            stats.lowStockCount > 0 ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-450" : "bg-neutral-50 dark:bg-neutral-850 text-neutral-400 dark:text-neutral-550"
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total Revenue</span>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </motion.div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column (Revenue Trend & Quick Inventory Alert) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Monthly Trend Recharts Chart */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp className="h-4 pointer-events-none text-indigo-500" />
                  Monthly Business Growth Trend
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Dual-axis visualization of order count & gross revenue</p>
              </div>
              <button 
                onClick={() => onNavigate("orders")}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
              >
                Invoices <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {orders.length > 0 ? (
              <div className="pt-2 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyData}
                    margin={{ top: 10, right: -5, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#262626" : "#f5f5f5"} />
                    <XAxis 
                      dataKey="monthLabel" 
                      tick={{ fontSize: 10, fill: isDarkMode ? '#a3a3a3' : '#737373', fontWeight: 500 }} 
                      axisLine={{ stroke: isDarkMode ? '#404040' : '#e5e5e5' }}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      stroke="#4f46e5"
                      tick={{ fontSize: 10, fill: '#818cf8', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#10b981"
                      tick={{ fontSize: 10, fill: '#34d399', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <ChartTooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', fontWeight: 500, color: isDarkMode ? '#e5e5e5' : '#404040' }}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="ordersCount" 
                      name="Order Volume" 
                      fill="#818cf8" 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue Generation" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, stroke: '#10b981', strokeWidth: 1.5, fill: isDarkMode ? '#171717' : '#ffffff' }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: isDarkMode ? '#171717' : '#ffffff' }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center text-sm text-neutral-450 dark:text-neutral-500 p-4">
                <PackageCheck className="h-8 w-8 stroke-1 text-neutral-300 dark:text-neutral-755 mb-2" />
                No orders placed yet.
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 pointer-events-none" />
                Inventory Replenishment Warnings
              </h3>
              <span className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-medium">
                {lowStockProducts.length} items flagged
              </span>
            </div>

            {lowStockProducts.length > 0 ? (
              <div className="overflow-hidden border border-neutral-100 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-neutral-850/30 transition-colors">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{p.name}</div>
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 dark:text-neutral-500">
                        <span>SKU: {p.sku}</span>
                        <span>•</span>
                        <span>Price: ${p.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-sm font-semibold font-mono ${p.quantity === 0 ? "text-red-600" : "text-amber-600"}`}>
                          {p.quantity} left
                        </div>
                        <div className="text-[10px] text-neutral-400">in stock</div>
                      </div>
                      <button 
                        onClick={() => onNavigate("products")}
                        className="p-1 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 rounded-lg transition-all"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center text-sm text-neutral-400 flex flex-col items-center justify-center">
                <PackageCheck className="h-7 w-7 text-emerald-500 mb-2 stroke-1" />
                All product stock levels are fully optimized. Excellent!
              </div>
            )}
          </div>

          {/* Recent Orders log (Moved here for perfect layout and vertical alignment balance) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500 pointer-events-none" />
              Recent Transactions
            </h3>
            
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-medium">
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Items</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Invoice Date</th>
                      <th className="pb-3 font-semibold text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50/80 dark:divide-neutral-800/60">
                    {recentOrders.map(order => {
                      const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);
                      return (
                        <tr key={order.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="py-3.5">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{order.customerName}</span>
                          </td>
                          <td className="py-3.5 font-mono text-neutral-500 dark:text-neutral-400">
                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                          </td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              Paid
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono text-neutral-400 dark:text-neutral-500">
                            {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                            ${order.totalAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center text-sm text-neutral-450 dark:text-neutral-500">
                No transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Side Panel (Quick Lists & Actions) */}
        <div className="space-y-8">
          
          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs text-neutral-950 dark:text-white space-y-4">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-550 dark:text-neutral-400">Quick Portal</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button 
                onClick={() => onNavigate("orders")} 
                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 dark:bg-white hover:bg-indigo-700 dark:hover:bg-neutral-50 text-white dark:text-neutral-900 font-bold text-xs rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-xs dark:shadow-sm"
              >
                <span>Draft New Order</span>
                <Plus className="h-4 w-4" />
              </button>

              <button 
                onClick={() => onNavigate("products")} 
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700/50"
              >
                <span>Add Product SKU</span>
                <Plus className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button 
                onClick={() => onNavigate("customers")} 
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700/50"
              >
                <span>Enroll New Customer</span>
                <Plus className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              </button>
            </div>
          </div>

          {/* Export Reporting Center */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Download className="h-4 w-4 text-indigo-500" /> Central CSV Report Hub
            </h3>
            <p className="text-xs text-neutral-505 dark:text-neutral-400">Download system database logs in clean CSV format for spreadsheets and reporting.</p>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => downloadProductsCSV(products)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-neutral-200/60 dark:border-neutral-800"
              >
                <span>Download Master Products CSV</span>
                <Download className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              </button>
              
              <button 
                onClick={() => downloadCustomersCSV(customers)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-neutral-200/60 dark:border-neutral-800"
              >
                <span>Download Customer Accounts CSV</span>
                <Download className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button 
                onClick={() => downloadOrdersCSV(orders)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-neutral-200/60 dark:border-neutral-800"
              >
                <span>Download Order Transactions CSV</span>
                <Download className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              </button>
            </div>
          </div>

          {/* Top Products Selling section */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Leaderboard (Best Sellers)</h3>
            
            {topProducts.length > 0 ? (
              <div className="space-y-3.5">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="space-y-0.5 max-w-[150px]">
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">{p.name}</div>
                      <div className="text-neutral-450 dark:text-neutral-500 font-mono">{p.quantity} items sold</div>
                    </div>
                    <div className="text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      ${p.revenue.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-505">Order statistics will automatically populate here as soon as sales begin.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}// Custom Tooltip component for Recharts
function CustomTooltip({ active, payload, label, isDarkMode }: any) {
  if (active && payload && payload.length) {
    const bgClass = isDarkMode ? "bg-white text-neutral-900 border-neutral-200" : "bg-neutral-900 text-white border-neutral-800";
    const labelClass = isDarkMode ? "text-neutral-800 border-b border-neutral-100 pb-1.5" : "text-neutral-300 border-b border-neutral-800 pb-1.5";
    const textLabelClass = isDarkMode ? "text-neutral-500 font-medium" : "text-neutral-400 font-medium";

    return (
      <div className={`border p-3.5 rounded-xl shadow-xl font-sans text-xs space-y-2 min-w-[160px] ${bgClass}`}>
        <p className={`font-semibold ${labelClass}`}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex justify-between gap-4">
            <span className={textLabelClass}>
              {entry.name}:
            </span>
            <span className="font-mono font-bold" style={{ color: entry.color || entry.stroke || entry.fill }}>
              {entry.name.includes("Revenue") 
                ? `$${Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : Number(entry.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

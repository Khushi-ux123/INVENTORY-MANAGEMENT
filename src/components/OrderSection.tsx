import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  RotateCcw, 
  AlertTriangle,
  FileText,
  Calendar,
  User,
  DollarSign,
  Layers,
  ShoppingBag,
  Eye,
  CheckCircle,
  FileMinus,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order, Customer, Product } from "../types";
import { downloadOrdersCSV } from "../utils/csvExport";

interface OrderSectionProps {
  orders: Order[];
  customers: Customer[];
  products: Product[];
  onCreateOrder: (orderData: { customerId: string; items: { productId: string; quantity: number }[] }) => Promise<boolean>;
  onDeleteOrder: (id: string) => Promise<boolean>;
  errorBanner: string | null;
  successBanner: string | null;
  clearBanners: () => void;
}

interface DraftItem {
  productId: string;
  quantity: number;
}

export default function OrderSection({
  orders,
  customers,
  products,
  onCreateOrder,
  onDeleteOrder,
  errorBanner,
  successBanner,
  clearBanners
}: OrderSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form Fields
  const [customerId, setCustomerId] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ productId: "", quantity: 1 }]);
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setCustomerId("");
    setDraftItems([{ productId: "", quantity: 1 }]);
    setLocalValidationError(null);
    clearBanners();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setLocalValidationError(null);
    clearBanners();
  };

  // Manage Draft Items
  const handleAddDraftItem = () => {
    setDraftItems([...draftItems, { productId: "", quantity: 1 }]);
  };

  const handleRemoveDraftItem = (index: number) => {
    const updated = [...draftItems];
    updated.splice(index, 1);
    setDraftItems(updated);
  };

  const handleDraftItemChange = (index: number, field: keyof DraftItem, value: any) => {
    const updated = [...draftItems];
    if (field === "productId") {
      updated[index].productId = value;
    } else if (field === "quantity") {
      updated[index].quantity = Math.max(1, Number(value));
    }
    setDraftItems(updated);
  };

  // Live estimated total calculation for draft
  const getEstimatedTotal = () => {
    return draftItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);
    clearBanners();

    if (!customerId) {
      setLocalValidationError("Please select a customer for the order.");
      return;
    }

    if (draftItems.length === 0) {
      setLocalValidationError("Order must have at least 1 product item.");
      return;
    }

    // Verify all item selections and stocks
    const productCounters: Record<string, number> = {};
    for (let i = 0; i < draftItems.length; i++) {
      const item = draftItems[i];
      if (!item.productId) {
        setLocalValidationError(`Please select a product SKU for row number ${i + 1}.`);
        return;
      }
      productCounters[item.productId] = (productCounters[item.productId] || 0) + item.quantity;
    }

    // Stock constraint checking beforehand
    for (const [pId, requestedQty] of Object.entries(productCounters)) {
      const product = products.find(p => p.id === pId);
      if (!product) {
        setLocalValidationError("One of the selected products does not exist.");
        return;
      }
      if (product.quantity < requestedQty) {
        setLocalValidationError(`Insufficient stocks for product '${product.name}'. Available: ${product.quantity}, requested total order: ${requestedQty}`);
        return;
      }
    }

    setIsSubmitting(true);
    const apiItems = Object.entries(productCounters).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    const success = await onCreateOrder({
      customerId,
      items: apiItems
    });
    setIsSubmitting(false);

    if (success) {
      handleCloseForm();
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (confirm(`Are you sure you want to CANCEL order #${id} for ${customerName}? Doing so will restore the product stock volumes automatically.`)) {
      clearBanners();
      // If of the cancelled order is currently viewed, clear it
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(null);
      }
      await onDeleteOrder(id);
    }
  };

  // Sorting state for Orders
  const [sortField, setSortField] = useState<"id" | "createdAt" | "customerName" | "totalAmount" | "itemsCount">("createdAt");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const handleSort = (field: "id" | "createdAt" | "customerName" | "totalAmount" | "itemsCount") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort Orders list
  const sortedAndFilteredOrders = useMemo(() => {
    const filtered = orders.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return [...filtered].sort((a, b) => {
      if (sortField === "totalAmount") {
        return sortDirection === "asc" 
          ? a.totalAmount - b.totalAmount 
          : b.totalAmount - a.totalAmount;
      }
      
      if (sortField === "itemsCount") {
        const qtyA = a.items.reduce((sum, item) => sum + item.quantity, 0);
        const qtyB = b.items.reduce((sum, item) => sum + item.quantity, 0);
        return sortDirection === "asc" ? qtyA - qtyB : qtyB - qtyA;
      }

      const valA = a[sortField] || "";
      const valB = b[sortField] || "";

      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [orders, searchTerm, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Orders</h1>
          <p className="text-sm text-neutral-500 mt-1">Dispense and monitor inventory invoices, manage customer stock deductions.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={() => downloadOrdersCSV(orders)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="h-4 w-4 text-neutral-500" /> Export CSV
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Create New Order
          </button>
        </div>
      </div>

      {/* Global Message Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {successBanner}
          </span>
          <button onClick={clearBanners} className="hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium flex items-center justify-between animate-shake">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {errorBanner}
          </span>
          <button onClick={clearBanners} className="hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Database Controls (Search) */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4.5 shadow-xs flex items-center gap-3">
        <Search className="h-4 w-4 text-neutral-400 pointer-events-none" />
        <input 
          type="text"
          placeholder="Lookup orders by receipt invoice numerical reference, name, or product SKU name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-neutral-800 focus:outline-hidden placeholder-neutral-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="text-neutral-400 hover:text-neutral-600">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Orders Grid/Table Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Table Listing */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
          {sortedAndFilteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/70 text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
                    <th 
                      className="py-4 px-6 cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Order Invoice</span>
                        {sortField === "createdAt" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                      onClick={() => handleSort("customerName")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Customer Reference</span>
                        {sortField === "customerName" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 text-center cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                      onClick={() => handleSort("itemsCount")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Items count</span>
                        {sortField === "itemsCount" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 text-right cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                      onClick={() => handleSort("totalAmount")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Invoice Total</span>
                        {sortField === "totalAmount" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm">
                  {sortedAndFilteredOrders.map(order => {
                    const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
                    return (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-neutral-50/40 transition-colors cursor-pointer ${
                          selectedOrder?.id === order.id ? "bg-indigo-50/20 hover:bg-indigo-50/30" : ""
                        }`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        {/* Order ID & Date */}
                        <td className="py-4.5 px-6">
                          <div className="font-semibold text-neutral-900 font-mono text-xs">#{order.id}</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4.5 px-6 text-neutral-800">
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {order.customerId}</div>
                        </td>

                        {/* Quantity items */}
                        <td className="py-4.5 px-6 text-center font-mono text-neutral-500">
                          {totalQty} {totalQty === 1 ? "unit" : "units"}
                        </td>

                        {/* Total Amount */}
                        <td className="py-4.5 px-6 text-right font-mono font-bold text-neutral-900">
                          ${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Action buttons */}
                        <td className="py-4.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title="Review transaction details"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(order.id, order.customerName)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                              title="Cancel / Void invoice order"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-14 text-center">
              <div className="h-12 w-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <FileText className="h-6 w-6 stroke-1" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">No invoices recorded</h3>
              <p className="text-xs text-neutral-400 mt-1">Try resetting the lookup parameters, or draft a brand-new customer order invoice.</p>
            </div>
          )}
        </div>

        {/* Selected Order Receipt Showcase Sheet */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">Transaction Details Sheet</h3>
          
          {selectedOrder ? (
            <div className="space-y-6">
              {/* Receipt Header Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-mono uppercase">Log Invoice</span>
                  <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">#{selectedOrder.id}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-mono uppercase">Issued On</span>
                  <span className="font-mono text-neutral-600">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-start justify-between text-xs border-t border-neutral-100/60 pt-4">
                  <span className="text-neutral-400 font-mono uppercase mt-0.5">Purchaser</span>
                  <div className="text-right">
                    <div className="font-semibold text-neutral-900">{selectedOrder.customerName}</div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Account: {selectedOrder.customerId}</div>
                  </div>
                </div>
              </div>

              {/* Items Table details */}
              <div className="space-y-3.5 pt-2">
                <div className="text-xs font-semibold text-neutral-400 tracking-wide uppercase">Deduction Entries</div>
                
                <div className="overflow-hidden border border-neutral-100 rounded-xl divide-y divide-neutral-100 text-xs">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-neutral-50/30">
                      <div className="space-y-0.5 max-w-[170px]">
                        <div className="font-semibold text-neutral-800 truncate">{item.productName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">ID: {item.productId}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-neutral-800 font-medium">
                          {item.quantity} x ${item.price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-bold">
                          ${(item.quantity * item.price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="border-t border-dashed border-neutral-200/80 pt-4 flex items-center justify-between">
                <span className="text-neutral-800 font-bold text-sm">Invoice Balance</span>
                <span className="font-mono text-xl font-bold tracking-tight text-neutral-950">${selectedOrder.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Void active button */}
              <div className="pt-2">
                <button 
                  onClick={() => handleDelete(selectedOrder.id, selectedOrder.customerName)}
                  className="w-full py-2.5 bg-neutral-50 hover:bg-red-50 text-neutral-600 hover:text-red-700 font-bold text-xs rounded-xl transition-all border border-neutral-200/70 hover:border-red-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <FileMinus className="h-4 w-4" /> Cancel & Restore Inventory
                </button>
              </div>

            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-10 w-10 bg-neutral-100 text-neutral-400 flex items-center justify-center rounded-xl mx-auto mb-3">
                <Eye className="h-5 w-5 stroke-1" />
              </div>
              <p className="text-xs text-neutral-400 max-w-[180px] mx-auto">Select a sales receipt invoice from the list to reveal full audits.</p>
            </div>
          )}
        </div>

      </div>

      {/* Creation Dialog Builder Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-neutral-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg border border-neutral-200/80 rounded-2xl shadow-xl overflow-hidden my-8"
            >
              {/* Form head panel */}
              <div className="bg-neutral-50 border-b border-neutral-100 p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 font-sans tracking-tight">Draft Transaction Invoice</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Specify customer and add SKU deduction quantities to fill.</p>
                </div>
                <button onClick={handleCloseForm} className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Form elements */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {localValidationError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>{localValidationError}</span>
                  </div>
                )}

                {/* Purchaser selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
                    <User className="h-3 w-3 text-neutral-400" /> Purchaser Account
                  </label>
                  {customers.length > 0 ? (
                    <select 
                      required
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-800 transition-colors focus:outline-hidden"
                    >
                      <option value="">-- Choose Account --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-dashed border-amber-200 text-amber-800 text-xs flex flex-col gap-1">
                      <span>No customers are enrolled yet in the workspace database.</span>
                    </div>
                  )}
                </div>

                {/* Dynamic Item Entry rows */}
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
                      <Layers className="h-3 w-3 text-neutral-400 pointer-events-none" /> Item Entry Records
                    </label>
                    <button 
                      type="button" 
                      onClick={handleAddDraftItem}
                      disabled={products.length === 0}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Row
                    </button>
                  </div>

                  {products.length > 0 ? (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {draftItems.map((draftItem, idx) => {
                        const activeProduct = products.find(p => p.id === draftItem.productId);
                        const isOverstock = activeProduct && activeProduct.quantity < draftItem.quantity;
                        
                        return (
                          <div key={idx} className="flex gap-2 items-center">
                            
                            {/* Product dropdown catalog selector */}
                            <select 
                              required
                              value={draftItem.productId}
                              onChange={(e) => handleDraftItemChange(idx, "productId", e.target.value)}
                              className="flex-1 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-800 transition-colors focus:outline-hidden"
                            >
                              <option value="">-- Select SKU Catalog --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} - ${p.price.toFixed(2)} ({p.quantity} left)
                                </option>
                              ))}
                            </select>

                            {/* Quantity Ordered increment */}
                            <div className="w-24 relative flex items-center">
                              <input 
                                type="number"
                                required
                                min="1"
                                step="1"
                                value={draftItem.quantity}
                                onChange={(e) => handleDraftItemChange(idx, "quantity", e.target.value)}
                                className={`w-full bg-neutral-50 border rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-hidden font-mono ${
                                  isOverstock ? "border-amber-400 text-amber-700 focus:border-amber-500" : "border-neutral-200 focus:border-indigo-500"
                                }`}
                              />
                            </div>

                            {/* Remove row button */}
                            <button 
                              type="button" 
                              disabled={draftItems.length === 1}
                              onClick={() => handleRemoveDraftItem(idx)}
                              className="p-1.5 bg-neutral-50 border border-neutral-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-lg text-neutral-400 transition-colors disabled:opacity-30 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-dashed border-amber-200 text-amber-800 text-xs">
                      No products exist inside the sku catalog database yet.
                    </div>
                  )}
                </div>

                {/* Estimate total summary block */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-600">Calculated Estimate Total</div>
                    <div className="text-[10px] text-neutral-400 font-mono">Backend totals are audited dynamically</div>
                  </div>
                  <div className="text-lg font-mono font-bold text-indigo-600 flex items-center">
                    <DollarSign className="h-4.5 w-4.5 -mr-1" />{getEstimatedTotal().toFixed(2)}
                  </div>
                </div>

                {/* Form buttons */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={handleCloseForm}
                    className="px-4.5 py-2 hover:bg-neutral-100 text-xs font-semibold text-neutral-600 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || products.length === 0 || customers.length === 0}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{isSubmitting ? "Drafting..." : "Fulfill Order"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

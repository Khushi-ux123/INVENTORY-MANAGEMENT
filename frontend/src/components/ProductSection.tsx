import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  RotateCcw, 
  AlertTriangle,
  FileCheck,
  ShoppingBag,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  List
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import { downloadProductsCSV } from "../utils/csvExport";

interface ProductSectionProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, "id">) => Promise<boolean>;
  onUpdateProduct: (id: string, product: Omit<Product, "id">) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  errorBanner: string | null;
  successBanner: string | null;
  clearBanners: () => void;
}

export default function ProductSection({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  errorBanner,
  successBanner,
  clearBanners
}: ProductSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open modal for creation
  const handleOpenAdd = () => {
    setName("");
    setSku("");
    setPrice("");
    setQuantity("");
    setLocalValidationError(null);
    setEditingProduct(null);
    clearBanners();
    setIsFormOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (product: Product) => {
    setName(product.name);
    setSku(product.sku);
    setPrice(String(product.price));
    setQuantity(String(product.quantity));
    setLocalValidationError(null);
    setEditingProduct(product);
    clearBanners();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setLocalValidationError(null);
    clearBanners();
  };

  // Handle submit form (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);
    clearBanners();

    if (!name.trim() || !sku.trim() || price === "" || quantity === "") {
      setLocalValidationError("Please fill in all details.");
      return;
    }

    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);

    if (isNaN(numericPrice) || numericPrice < 0) {
      setLocalValidationError("Price cannot be negative.");
      return;
    }

    if (isNaN(numericQuantity) || numericQuantity < 0) {
      setLocalValidationError("Stock quantity cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    let success = false;

    if (editingProduct) {
      success = await onUpdateProduct(editingProduct.id, {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: numericPrice,
        quantity: Math.floor(numericQuantity)
      });
    } else {
      success = await onAddProduct({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: numericPrice,
        quantity: Math.floor(numericQuantity)
      });
    }

    setIsSubmitting(false);

    if (success) {
      handleCloseForm();
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    if (confirm(`Are you sure you want to delete product "${productName}" SKU and its active information? This action is irreversible.`)) {
      clearBanners();
      await onDeleteProduct(id);
    }
  };

  // Sorting state for Products
  const [sortField, setSortField] = useState<"name" | "sku" | "price" | "quantity">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const handleSort = (field: "name" | "sku" | "price" | "quantity") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort products
  const sortedAndFilteredProducts = useMemo(() => {
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [products, searchTerm, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Product SKUs</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Register standard catalogs, manage units, and scale SKU specifications.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={() => downloadProductsCSV(products)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-250 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="h-4 w-4 text-neutral-500 dark:text-neutral-405" /> Export CSV
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add Product SKU
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

      {/* Database Controls (Search & View Toggle) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
          <input 
            type="text"
            placeholder="Filter by product catalog name or SKU code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-neutral-800 dark:text-neutral-200 focus:outline-hidden placeholder-neutral-400 dark:placeholder-neutral-505"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-650 cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        {/* Toggle View buttons */}
        <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 border border-neutral-200 dark:border-neutral-800 p-1 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold px-3 cursor-pointer transition-all ${
              viewMode === "table" 
                ? "bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-neutral-200/50 dark:border-neutral-700 font-bold" 
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <List className="h-4 w-4" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold px-3 cursor-pointer transition-all ${
              viewMode === "grid" 
                ? "bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-neutral-200/50 dark:border-neutral-700 font-bold" 
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Content wrapper depending on viewMode state */}
      {sortedAndFilteredProducts.length > 0 ? (
        viewMode === "table" ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850/40 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider select-none">
                    <th 
                      className="py-4 px-6 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors group" 
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Product Details</span>
                        {sortField === "name" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-650" /> : <ArrowDown className="h-3 w-3 text-indigo-650" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 text-center cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors group" 
                      onClick={() => handleSort("sku")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>SKU / Code</span>
                        {sortField === "sku" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-650" /> : <ArrowDown className="h-3 w-3 text-indigo-650" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 text-right cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors group" 
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Price</span>
                        {sortField === "price" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-650" /> : <ArrowDown className="h-3 w-3 text-indigo-650" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 text-right cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-850/20 transition-colors group" 
                      onClick={() => handleSort("quantity")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Stock</span>
                        {sortField === "quantity" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-650" /> : <ArrowDown className="h-3 w-3 text-indigo-650" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th className="py-4 px-6 text-center">Indicators</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  {sortedAndFilteredProducts.map(product => {
                    const isLowStock = product.quantity <= 10;
                    return (
                      <tr key={product.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/20 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors">
                        {/* Name */}
                        <td className="py-4.5 px-6">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">{product.name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {product.id}</div>
                        </td>
                        
                        {/* SKU */}
                        <td className="py-4.5 px-6 text-center">
                          <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-2.5 py-1 rounded-md font-semibold border border-neutral-200/40 dark:border-neutral-700">
                            {product.sku}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-4.5 px-6 text-right font-mono font-medium text-neutral-800 dark:text-neutral-200">
                          ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Stock quantity */}
                        <td className={`py-4.5 px-6 text-right font-mono font-bold ${
                          product.quantity === 0 
                            ? "text-red-600 dark:text-red-400" 
                            : isLowStock 
                              ? "text-amber-600 dark:text-amber-400" 
                              : "text-neutral-800 dark:text-neutral-200"
                        }`}>
                          {product.quantity}
                        </td>

                        {/* Label status */}
                        <td className="py-4.5 px-6 text-center">
                          <div className="flex justify-center">
                            {product.quantity === 0 ? (
                              <span className="bg-red-50 dark:bg-red-950/25 text-red-705 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-100 dark:border-red-900/40">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="bg-amber-50 dark:bg-amber-955/25 text-amber-705 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-100 dark:border-amber-900/40 flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> Low Stock
                              </span>
                            ) : (
                              <span className="bg-emerald-50 dark:bg-emerald-955/25 text-emerald-705 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/40">
                                In Stock
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenEdit(product)}
                              className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/40 rounded-lg transition-all cursor-pointer"
                              title="Edit details"
                            >
                              <Edit2 className="h-4.5 w-4.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id, product.name)}
                              className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/35 border border-transparent hover:border-red-105 dark:hover:border-red-900/40 rounded-lg transition-all cursor-pointer"
                              title="Delete SKU"
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
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedAndFilteredProducts.map(product => {
              const isLowStock = product.quantity <= 10;
              return (
                <div key={product.id} className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-2.5 py-1 rounded-md font-bold border border-neutral-200/40 dark:border-neutral-700/60">
                        {product.sku}
                      </span>
                      {product.quantity === 0 ? (
                        <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-100 dark:border-red-900/30">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-100 dark:border-amber-900/40 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> Low Stock
                        </span>
                      ) : (
                        <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/40">
                          In Stock
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mt-4 leading-snug">{product.name}</h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-1">ID: {product.id}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100/85 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Unit Price</div>
                      <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5">
                        ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Stock Left</div>
                      <div className={`text-lg font-extrabold font-mono mt-0.5 ${
                        product.quantity === 0 ? "text-red-600 dark:text-red-400" : isLowStock ? "text-amber-600 dark:text-amber-400" : "text-neutral-800 dark:text-neutral-200"
                      }`}>
                        {product.quantity} units
                      </div>
                    </div>
                  </div>

                  {/* Actions drawer */}
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-neutral-100/60 dark:border-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenEdit(product)}
                      className="flex-1 py-1.5 flex items-center justify-center gap-1 text-xs text-neutral-600 dark:text-neutral-350 bg-neutral-50 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border border-neutral-200/75 dark:border-neutral-750 hover:border-indigo-200 dark:hover:border-indigo-900/40 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-1.5 text-neutral-400 dark:text-neutral-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200/75 dark:border-neutral-750 hover:border-red-200 dark:hover:border-red-900/40 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden p-14 text-center">
          <div className="h-12 w-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400 dark:text-neutral-500">
            <ShoppingBag className="h-6 w-6 stroke-1" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No product SKUs found</h3>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Try resetting your filter, or register a brand-new SKU catalog to begin.</p>
        </div>
      )}

      {/* Form Dialog Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-neutral-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-md border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Form head panel */}
              <div className="bg-neutral-50 dark:bg-neutral-850/40 border-b border-neutral-100 dark:border-neutral-800 p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    {editingProduct ? "Edit Product SKU" : "Register Product SKU"}
                  </h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Please populate the standard pricing and specifications.</p>
                </div>
                <button onClick={handleCloseForm} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Form inner details */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {localValidationError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-400 text-xs rounded-xl font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>{localValidationError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-450">Product Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mechanical Gaming Keyboard"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100/50 dark:hover:bg-neutral-750/50 focus:bg-white dark:focus:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 transition-colors focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-450">SKU / Code Code (Unique identifier)</label>
                  <input 
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. KEY-003"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100/50 dark:hover:bg-neutral-750/50 focus:bg-white dark:focus:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 transition-colors focus:outline-hidden uppercase font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-450">Unit Price ($)</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 129.99"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100/50 dark:hover:bg-neutral-750/50 focus:bg-white dark:focus:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 transition-colors focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-450">Quantity in Stock</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100/50 dark:hover:bg-neutral-750/50 focus:bg-white dark:focus:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 transition-colors focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Form interactions */}
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={handleCloseForm}
                    className="px-4.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>{isSubmitting ? "Saving..." : "Save Product"}</span>
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

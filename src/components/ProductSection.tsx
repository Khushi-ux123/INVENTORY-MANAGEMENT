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
  ArrowUpDown
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
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Product SKUs</h1>
          <p className="text-sm text-neutral-500 mt-1">Register standard catalogs, manage units, and scale SKU specifications.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={() => downloadProductsCSV(products)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="h-4 w-4 text-neutral-500" /> Export CSV
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

      {/* Database Controls (Search) */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4.5 shadow-xs flex items-center gap-3">
        <Search className="h-4 w-4 text-neutral-400 pointer-events-none" />
        <input 
          type="text"
          placeholder="Filter by product catalog name or SKU code..."
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

      {/* Products Table Container */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
        {sortedAndFilteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/70 text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
                  <th 
                    className="py-4 px-6 cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Product Details</span>
                      {sortField === "name" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-4 px-6 text-center cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                    onClick={() => handleSort("sku")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>SKU / Code</span>
                      {sortField === "sku" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-4 px-6 text-right cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Price</span>
                      {sortField === "price" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-4 px-6 text-right cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Stock</span>
                      {sortField === "quantity" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-center">Indicators</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {sortedAndFilteredProducts.map(product => {
                  const isLowStock = product.quantity <= 10;
                  return (
                    <tr key={product.id} className="hover:bg-neutral-50/40 transition-colors">
                      {/* Name */}
                      <td className="py-4.5 px-6">
                        <div className="font-semibold text-neutral-900">{product.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {product.id}</div>
                      </td>
                      
                      {/* SKU */}
                      <td className="py-4.5 px-6 text-center">
                        <span className="font-mono text-xs bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-md font-semibold border border-neutral-200/40">
                          {product.sku}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4.5 px-6 text-right font-mono font-medium text-neutral-800">
                        ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Stock quantity */}
                      <td className={`py-4.5 px-6 text-right font-mono font-bold ${
                        product.quantity === 0 
                          ? "text-red-600" 
                          : isLowStock 
                            ? "text-amber-600" 
                            : "text-neutral-800"
                      }`}>
                        {product.quantity}
                      </td>

                      {/* Label status */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex justify-center">
                          {product.quantity === 0 ? (
                            <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-100">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-100 flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> Low Stock
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-100">
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
                            className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                            title="Edit details"
                          >
                            <Edit2 className="h-4.5 w-4.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
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
        ) : (
          <div className="p-14 text-center">
            <div className="h-12 w-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
              <ShoppingBag className="h-6 w-6 stroke-1" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">No product SKUs found</h3>
            <p className="text-xs text-neutral-400 mt-1">Try resetting your filter, or register a brand-new SKU catalog to begin.</p>
          </div>
        )}
      </div>

      {/* Form Dialog Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-neutral-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md border border-neutral-200/80 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Form head panel */}
              <div className="bg-neutral-50 border-b border-neutral-100 p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    {editingProduct ? "Edit Product SKU" : "Register Product SKU"}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Please populate the standard pricing and specifications.</p>
                </div>
                <button onClick={handleCloseForm} className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Form inner details */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {localValidationError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>{localValidationError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600">Product Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mechanical Gaming Keyboard"
                    className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 transition-colors focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600">SKU / Code Code (Unique identifier)</label>
                  <input 
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. KEY-003"
                    className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 transition-colors focus:outline-hidden uppercase font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600">Unit Price ($)</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 129.99"
                      className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 transition-colors focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600">Quantity in Stock</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 transition-colors focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Form interactions */}
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

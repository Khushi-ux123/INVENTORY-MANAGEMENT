import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  RotateCcw, 
  AlertTriangle,
  Mail,
  Phone,
  UserPlus,
  UserCheck,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  List
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Customer } from "../types";
import { downloadCustomersCSV } from "../utils/csvExport";

interface CustomerSectionProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, "id">) => Promise<boolean>;
  onDeleteCustomer: (id: string) => Promise<boolean>;
  errorBanner: string | null;
  successBanner: string | null;
  clearBanners: () => void;
}

export default function CustomerSection({
  customers,
  onAddCustomer,
  onDeleteCustomer,
  errorBanner,
  successBanner,
  clearBanners
}: CustomerSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setName("");
    setEmail("");
    setPhone("");
    setLocalValidationError(null);
    clearBanners();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setLocalValidationError(null);
    clearBanners();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);
    clearBanners();

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setLocalValidationError("Please fill in all details (name, email, phone).");
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalValidationError("Please provide a valid email format.");
      return;
    }

    setIsSubmitting(true);
    const success = await onAddCustomer({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim()
    });
    setIsSubmitting(false);

    if (success) {
      handleCloseForm();
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (confirm(`Are you sure you want to enroll out or delete customer "${customerName}"? Past transaction histories will prevent deletion due to relational constraint audits.`)) {
      clearBanners();
      await onDeleteCustomer(id);
    }
  };

  // Sorting state for Customers
  const [sortField, setSortField] = useState<"name" | "id" | "email">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const handleSort = (field: "name" | "id" | "email") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort Customers list
  const sortedAndFilteredCustomers = useMemo(() => {
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );

    return [...filtered].sort((a, b) => {
      const valA = a[sortField] || "";
      const valB = b[sortField] || "";

      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [customers, searchTerm, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Customers</h1>
          <p className="text-sm text-neutral-500 mt-1">Enroll directory profiles, verify email parameters, and audit accounts.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={() => downloadCustomersCSV(customers)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="h-4 w-4 text-neutral-500" /> Export CSV
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Enroll Customer
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
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Search className="h-4 w-4 text-neutral-400 pointer-events-none" />
          <input 
            type="text"
            placeholder="Lookup customer accounts by name, email or mobile extension..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-neutral-800 focus:outline-hidden placeholder-neutral-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        {/* Toggle View buttons */}
        <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 border border-neutral-200 p-1 rounded-xl bg-neutral-50/50">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold px-3 cursor-pointer transition-all ${
              viewMode === "table" 
                ? "bg-white text-indigo-600 shadow-3xs border border-neutral-200/50 font-bold" 
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <List className="h-4 w-4" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold px-3 cursor-pointer transition-all ${
              viewMode === "grid" 
                ? "bg-white text-indigo-600 shadow-3xs border border-neutral-200/50 font-bold" 
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Content wrapper depending on viewMode state */}
      {sortedAndFilteredCustomers.length > 0 ? (
        viewMode === "table" ? (
          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/70 text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
                    <th 
                      className="py-4 px-6 cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Identity</span>
                        {sortField === "name" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 text-center cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                      onClick={() => handleSort("id")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Reference-ID</span>
                        {sortField === "id" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-6 text-center cursor-pointer hover:bg-neutral-100/50 transition-colors group" 
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Communication details</span>
                        {sortField === "email" ? (
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
                  {sortedAndFilteredCustomers.map(customer => {
                    // Get initials
                    const initials = customer.name
                      ? customer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                      : "??";
                    return (
                      <tr key={customer.id} className="hover:bg-neutral-50/40 transition-colors">
                        {/* Avatar & Name */}
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-neutral-100 text-neutral-700 flex items-center justify-center rounded-xl font-bold text-xs select-none border border-neutral-200/30">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">{customer.name}</div>
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Verified profile</div>
                            </div>
                          </div>
                        </td>

                        {/* Customer ID */}
                        <td className="py-4.5 px-6 text-center font-mono text-xs text-neutral-400">
                          {customer.id}
                        </td>

                        {/* Details row */}
                        <td className="py-4.5 px-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-x-6 gap-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
                              <Mail className="h-3.5 w-3.5 text-neutral-400" />
                              <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
                              <Phone className="h-3.5 w-3.5 text-neutral-400" />
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4.5 px-6 text-right">
                          <button 
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                            title="Delete customer record"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
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
            {sortedAndFilteredCustomers.map(customer => {
              const initials = customer.name
                ? customer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                : "??";
              return (
                <div key={customer.id} className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center rounded-2xl font-bold text-sm select-none">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-semibold text-neutral-800 truncate">{customer.name}</h4>
                      <p className="text-[10px] text-indigo-600/85 font-mono mt-0.5">ID: {customer.id}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5 pt-4.5 border-t border-neutral-100/85 text-xs">
                    <div className="flex items-center gap-2 text-neutral-600 truncate bg-neutral-50/70 p-2 rounded-xl border border-neutral-100/50">
                      <Mail className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                      <span className="font-mono truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 bg-neutral-50/70 p-2 rounded-xl border border-neutral-100/50">
                      <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                      <span className="font-mono">{customer.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-4 pt-3 border-t border-neutral-100/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDelete(customer.id, customer.name)}
                      className="py-1.5 px-4 flex items-center justify-center gap-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100/75 border border-red-200/50 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Customer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden p-14 text-center">
          <div className="h-12 w-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <UserPlus className="h-6 w-6 stroke-1" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">No customers found</h3>
          <p className="text-xs text-neutral-400 mt-1">Audit parameters, or enroll a brand-new customer account to start transactioning.</p>
        </div>
      )}

      {/* Enrollment Dialog Modal */}
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
                  <h3 className="text-base font-semibold text-neutral-900">Enroll Business Customer</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Please populate the contact fields correctly.</p>
                </div>
                <button onClick={handleCloseForm} className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Form elements */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {localValidationError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>{localValidationError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Connor McGregor"
                    className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 transition-colors focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600">Email Address (Unique)</label>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. connor@mac.com"
                    className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 transition-colors focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600">Phone Number (Mobile Extension)</label>
                  <input 
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1-555-0199"
                    className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-800 transition-colors focus:outline-hidden font-mono"
                  />
                </div>

                {/* Form controls */}
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
                    <UserCheck className="h-4 w-4" />
                    <span>{isSubmitting ? "Enrolling..." : "Enroll Customer"}</span>
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

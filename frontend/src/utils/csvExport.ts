import { Product, Customer, Order } from "../types";

// Helper function to escape CSV cell values
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) {
    return "";
  }
  let str = String(val);
  // Replace active double quotes with double-double quotes
  str = str.replace(/"/g, '""');
  // Wrap in double quotes if there are commas, newlines, or quotes
  if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

// Trigger browser download of CSV file
function triggerCSVDownload(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\r\n"); // Standard CSV row format

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadProductsCSV(products: Product[]) {
  const headers = ["ID", "Name", "SKU", "Price ($)", "Quantity"];
  const rows = products.map(p => [
    escapeCSVValue(p.id),
    escapeCSVValue(p.name),
    escapeCSVValue(p.sku),
    escapeCSVValue(p.price),
    escapeCSVValue(p.quantity)
  ]);
  triggerCSVDownload(headers, rows, `products_export_${new Date().toISOString().split("T")[0]}.csv`);
}

export function downloadCustomersCSV(customers: Customer[]) {
  const headers = ["ID", "Name", "Email", "Phone"];
  const rows = customers.map(c => [
    escapeCSVValue(c.id),
    escapeCSVValue(c.name),
    escapeCSVValue(c.email),
    escapeCSVValue(c.phone)
  ]);
  triggerCSVDownload(headers, rows, `customers_export_${new Date().toISOString().split("T")[0]}.csv`);
}

export function downloadOrdersCSV(orders: Order[]) {
  const headers = ["Order ID", "Customer ID", "Customer Name", "Items (Product Name x Qty)", "Total Amount ($)", "Created At"];
  const rows = orders.map(o => {
    const itemsDescription = o.items.map(item => `${item.productName} (x${item.quantity})`).join("; ");
    return [
      escapeCSVValue(o.id),
      escapeCSVValue(o.customerId),
      escapeCSVValue(o.customerName),
      escapeCSVValue(itemsDescription),
      escapeCSVValue(o.totalAmount),
      escapeCSVValue(o.createdAt)
    ];
  });
  triggerCSVDownload(headers, rows, `orders_export_${new Date().toISOString().split("T")[0]}.csv`);
}

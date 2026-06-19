import { Product, Customer, Order } from "../types";

// Helper to escape values for CSV
export function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Export Products to CSV
export function downloadProductsCSV(products: Product[]) {
  const headers = ["Product ID", "Name", "SKU", "Price", "Quantity", "Stock Status"];
  const rows = products.map(p => {
    let status = "In Stock";
    if (p.quantity === 0) status = "Out of Stock";
    else if (p.quantity <= 10) status = "Low Stock";

    return [
      escapeCSVValue(p.id),
      escapeCSVValue(p.name),
      escapeCSVValue(p.sku),
      p.price.toFixed(2),
      p.quantity,
      escapeCSVValue(status)
    ];
  });

  downloadCSV("products_report.csv", headers, rows);
}

// Export Customers to CSV
export function downloadCustomersCSV(customers: Customer[]) {
  const headers = ["Customer ID", "Name", "Email", "Phone"];
  const rows = customers.map(c => [
    escapeCSVValue(c.id),
    escapeCSVValue(c.name),
    escapeCSVValue(c.email),
    escapeCSVValue(c.phone)
  ]);

  downloadCSV("customers_report.csv", headers, rows);
}

// Export Orders to CSV
export function downloadOrdersCSV(orders: Order[]) {
  const headers = ["Order ID", "Customer ID", "Customer Name", "Total Amount", "Created At", "Items Count", "Items Summary"];
  const rows = orders.map(o => {
    const totalQty = o.items.reduce((sum, item) => sum + item.quantity, 0);
    const summary = o.items.map(item => `${item.quantity}x ${item.productName}`).join("; ");
    return [
      escapeCSVValue(o.id),
      escapeCSVValue(o.customerId),
      escapeCSVValue(o.customerName),
      o.totalAmount.toFixed(2),
      escapeCSVValue(new Date(o.createdAt).toLocaleString()),
      totalQty,
      escapeCSVValue(summary)
    ];
  });

  downloadCSV("orders_report.csv", headers, rows);
}

// Helper to download the generated CSV
function downloadCSV(filename: string, headers: string[], rows: any[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

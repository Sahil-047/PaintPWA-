interface PdfBillData {
  billNo: string;
  customerName: string;
  items: Array<{ name: string; qty: number; rate: number; total: number }>;
  subtotal: number;
  discount: number;
  grandTotal: number;
  date: string;
}

export async function generateBillPdf(data: PdfBillData): Promise<Buffer> {
  const html = buildBillHtml(data);
  // Puppeteer integration point — returns HTML buffer for now until puppeteer is added
  return Buffer.from(html, 'utf-8');
}

function buildBillHtml(data: PdfBillData): string {
  const rows = data.items
    .map(
      (item) =>
        `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.rate}</td><td>${item.total}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Bill ${data.billNo}</title></head>
<body>
  <h1>Bill ${data.billNo}</h1>
  <p>Customer: ${data.customerName}</p>
  <p>Date: ${data.date}</p>
  <table border="1" cellpadding="8">
    <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p>Subtotal: ${data.subtotal}</p>
  <p>Discount: ${data.discount}</p>
  <p><strong>Grand Total: ${data.grandTotal}</strong></p>
</body>
</html>`;
}

export async function generateCashMemoPdf(data: {
  memoNo: string;
  billNo: string;
  customerName: string;
  amountPaid: number;
  paymentMode: string;
  date: string;
}): Promise<Buffer> {
  const html = `<!DOCTYPE html>
<html><body>
  <h1>Receipt ${data.memoNo}</h1>
  <p>Bill: ${data.billNo}</p>
  <p>Customer: ${data.customerName}</p>
  <p>Amount Paid: ${data.amountPaid}</p>
  <p>Mode: ${data.paymentMode}</p>
  <p>Date: ${data.date}</p>
</body></html>`;
  return Buffer.from(html, 'utf-8');
}

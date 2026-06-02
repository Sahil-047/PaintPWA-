import React from 'react';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';

interface PdfBillData {
  billNo: string;
  firmName?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  billedByName?: string;
  billedByEmail?: string;
  billedByAddress?: string;
  items: Array<{ name: string; qty: number; rate: number; total: number }>;
  subtotal: number;
  gstRate?: number;
  gstAmount?: number;
  discount: number;
  grandTotal: number;
  date: string;
  dueDate?: string;
}

interface PdfCashMemoData {
  memoNo: string;
  firmName?: string;
  billNo: string;
  customerName: string;
  amountPaid: number;
  paymentMode: string;
  chequeNo?: string;
  date: string;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingVertical: 22, fontSize: 10.5, fontFamily: 'Helvetica' },
  title: { fontSize: 28, fontWeight: 700, color: '#1f2937' },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: '#6b7280' },
  strong: { fontWeight: 700, color: '#111827' },
  label: { color: '#9ca3af', fontWeight: 600, fontSize: 10.2 },
  sectionTop: { marginTop: 14 },
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return `₹ ${value.toFixed(2)}`;
}

function unitFromName(name: string): string {
  const m = name.match(/\(([^)]+)\)\s*$/);
  return m?.[1] ?? 'Unit';
}

function numberToWordsIndian(n: number): string {
  if (n <= 0) return 'Zero';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? ` ${a[x % 10]}` : ''}`);
  const three = (x: number) =>
    x > 99 ? `${a[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${two(x % 100)}` : ''}` : two(x);
  let num = Math.floor(n);
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${three(lakh)} Lakh`);
  if (thousand) parts.push(`${three(thousand)} Thousand`);
  if (num) parts.push(three(num));
  return parts.join(' ');
}

export async function generateBillPdf(data: PdfBillData): Promise<Buffer> {
  const gstRate = data.gstRate ?? 18;
  const gstAmount = data.gstAmount ?? 0;
  const pdf = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'Invoice'),
      React.createElement(
        View,
        { style: [styles.row, styles.sectionTop] },
        React.createElement(Text, { style: [styles.label, { width: 120 }] }, 'Invoice Number'),
        React.createElement(Text, { style: [styles.strong, { fontSize: 12 }] }, data.billNo)
      ),
      React.createElement(
        View,
        { style: [styles.between, { marginTop: 16 }] },
        React.createElement(
          View,
          { style: { width: '47%' } },
          React.createElement(Text, { style: styles.label }, 'Billed by:'),
          React.createElement(Text, { style: [styles.strong, { marginTop: 4 }] }, data.billedByName ?? data.firmName ?? 'paintapp'),
          React.createElement(Text, { style: styles.muted }, data.billedByEmail ?? 'hello@asthetcss.com'),
          React.createElement(Text, { style: styles.muted }, data.billedByAddress ?? 'Business address')
        ),
        React.createElement(
          View,
          { style: { width: '47%' } },
          React.createElement(Text, { style: styles.label }, 'Billed to:'),
          React.createElement(Text, { style: [styles.strong, { marginTop: 4 }] }, data.customerName),
          React.createElement(Text, { style: styles.muted }, data.customerEmail ?? 'customer@email.com'),
          React.createElement(Text, { style: styles.muted }, data.customerAddress ?? 'Customer address')
        )
      ),
      React.createElement(
        View,
        { style: [styles.between, { marginTop: 15 }] },
        React.createElement(
          View,
          { style: { width: '47%' } },
          React.createElement(Text, { style: styles.label }, 'Date Issued:'),
          React.createElement(Text, { style: [styles.strong, { marginTop: 3 }] }, formatDate(data.date))
        ),
        React.createElement(
          View,
          { style: { width: '47%' } },
          React.createElement(Text, { style: styles.label }, 'Due Date'),
          React.createElement(Text, { style: [styles.strong, { marginTop: 3 }] }, formatDate(data.dueDate ?? data.date))
        )
      ),
      React.createElement(
        View,
        { style: [styles.row, { marginTop: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 6 }] },
        React.createElement(Text, { style: [styles.label, { width: '45%' }] }, 'Description'),
        React.createElement(Text, { style: [styles.label, { width: '15%', textAlign: 'right' }] }, 'QTY'),
        React.createElement(Text, { style: [styles.label, { width: '18%', textAlign: 'right' }] }, 'Unit'),
        React.createElement(Text, { style: [styles.label, { width: '22%', textAlign: 'right' }] }, 'Amount')
      ),
      ...data.items.map((item, idx) =>
        React.createElement(
          View,
          {
            key: `${item.name}-${idx}`,
            style: [styles.row, { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 9 }],
          },
          React.createElement(
            View,
            { style: { width: '45%', paddingRight: 8 } },
            React.createElement(Text, { style: [styles.strong, { fontSize: 10.8, fontWeight: 600 }] }, item.name.replace(/\s*\([^)]+\)\s*$/, '')),
            React.createElement(Text, { style: [styles.muted, { fontSize: 9.3 }] }, `Base: ${unitFromName(item.name)}`)
          ),
          React.createElement(Text, { style: [styles.strong, { width: '15%', textAlign: 'right' }] }, String(item.qty)),
          React.createElement(Text, { style: [styles.strong, { width: '18%', textAlign: 'right' }] }, unitFromName(item.name)),
          React.createElement(Text, { style: [styles.strong, { width: '22%', textAlign: 'right' }] }, formatCurrency(item.total))
        )
      ),
      React.createElement(
        View,
        { style: { marginTop: 12, marginLeft: '55%', width: '45%', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 } },
        React.createElement(
          View,
          { style: [styles.between, { marginBottom: 5 }] },
          React.createElement(Text, { style: styles.muted }, 'Subtotal'),
          React.createElement(Text, { style: styles.muted }, formatCurrency(data.subtotal))
        ),
        React.createElement(
          View,
          { style: [styles.between, { marginBottom: 5 }] },
          React.createElement(Text, { style: styles.muted }, `G.S.T (${gstRate}%)`),
          React.createElement(Text, { style: styles.muted }, formatCurrency(gstAmount))
        ),
        React.createElement(
          View,
          { style: [styles.between, { marginBottom: 5 }] },
          React.createElement(Text, { style: styles.muted }, 'Discount'),
          React.createElement(Text, { style: styles.muted }, `- ${formatCurrency(data.discount)}`)
        ),
        React.createElement(
          View,
          { style: styles.between },
          React.createElement(Text, { style: [styles.strong, { fontSize: 12 }] }, 'Total'),
          React.createElement(Text, { style: [styles.strong, { fontSize: 12 }] }, formatCurrency(data.grandTotal))
        )
      ),
      React.createElement(
        Text,
        { style: [styles.muted, { marginTop: 28 }] },
        'Thank you for your purchase! We appreciate your business and look forward to serving you again.'
      )
    )
  );
  return renderToBuffer(pdf);
}

export async function generateCashMemoPdf(data: PdfCashMemoData): Promise<Buffer> {
  const amountWords = `${numberToWordsIndian(data.amountPaid)} only`;
  const isCheque = data.paymentMode.toLowerCase().includes('cheque');
  const pdf = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', orientation: 'landscape', style: [styles.page, { fontSize: 10 }] },
      React.createElement(
        View,
        { style: [styles.between, { alignItems: 'center', marginTop: 2 }] },
        React.createElement(Text, { style: styles.title }, 'Receipt'),
        React.createElement(
          View,
          { style: [styles.row, { width: 260, alignItems: 'center' }] },
          React.createElement(Text, { style: [styles.muted, { marginRight: 8 }] }, "Firm's Name"),
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: '#9ca3af', flex: 1, height: 12 } }),
          React.createElement(Text, { style: { marginLeft: -110, width: 108, textAlign: 'right', color: '#111827' } }, data.firmName ?? 'paintapp')
        )
      ),
      React.createElement(
        View,
        { style: { marginTop: 30, width: 280 } },
        React.createElement(
          View,
          { style: [styles.row, { marginBottom: 8, alignItems: 'center' }] },
          React.createElement(Text, { style: [styles.label, { width: 120 }] }, 'Receipt Number'),
          React.createElement(Text, { style: [styles.strong, { fontSize: 12, width: 155 }] }, data.memoNo)
        ),
        React.createElement(
          View,
          { style: [styles.row, { marginBottom: 8, alignItems: 'center' }] },
          React.createElement(Text, { style: [styles.label, { width: 120 }] }, 'Date'),
          React.createElement(Text, { style: [styles.strong, { fontSize: 12 }] }, formatDate(data.date))
        )
      ),
      React.createElement(
        View,
        { style: { marginTop: 34 } },
        React.createElement(
          View,
          { style: [styles.row, { alignItems: 'center', marginBottom: 10 }] },
          React.createElement(Text, { style: [styles.strong, { marginRight: 6 }] }, 'RECEIVED with thanks from'),
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: '#9ca3af', flex: 1, height: 14, justifyContent: 'flex-end' } }),
          React.createElement(Text, { style: { marginLeft: -460, width: 455, color: '#111827' } }, data.customerName)
        ),
        React.createElement(
          View,
          { style: [styles.row, { alignItems: 'center', marginBottom: 10 }] },
          React.createElement(Text, { style: [styles.strong, { marginRight: 6 }] }, 'the sum of Rupees'),
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: '#9ca3af', flex: 1, height: 14 } }),
          React.createElement(Text, { style: { marginLeft: -528, width: 520, color: '#111827', fontSize: 9.5 } }, amountWords)
        ),
        React.createElement(
          View,
          { style: [styles.row, { alignItems: 'center', marginBottom: 10 }] },
          React.createElement(View, { style: { width: 120, borderBottomWidth: 1, borderBottomColor: '#9ca3af', height: 14, marginRight: 8 } }),
          React.createElement(Text, { style: [styles.strong, { marginRight: 8 }] }, 'by Cheque No.'),
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: '#9ca3af', flex: 1, height: 14 } }),
          React.createElement(Text, { style: { marginLeft: -610, width: 110, color: '#111827' } }, formatCurrency(data.amountPaid)),
          isCheque
            ? React.createElement(Text, { style: { marginLeft: -410, width: 400, color: '#111827' } }, data.chequeNo ?? '—')
            : null
        ),
        React.createElement(
          View,
          { style: [styles.row, { alignItems: 'center' }] },
          React.createElement(Text, { style: [styles.strong, { marginRight: 8 }] }, 'Dated'),
          React.createElement(View, { style: { width: 210, borderBottomWidth: 1, borderBottomColor: '#9ca3af', height: 14, marginRight: 8 } }),
          React.createElement(Text, { style: [styles.strong] }, 'in part payment.'),
          React.createElement(Text, { style: { marginLeft: -505, width: 200, color: '#111827' } }, formatDate(data.date))
        )
      ),
      React.createElement(
        Text,
        { style: [styles.muted, { marginTop: 34, maxWidth: 410 }] },
        'Thank you for your purchase! We appreciate your business and look forward to serving you again.'
      ),
      React.createElement(
        View,
        { style: [styles.between, { marginTop: 88, alignItems: 'flex-end' }] },
        React.createElement(
          View,
          { style: [styles.row, { borderWidth: 1, borderColor: '#9ca3af', height: 26, width: 150 }] },
          React.createElement(Text, { style: { width: 38, backgroundColor: '#000', color: '#fff', textAlign: 'center', paddingTop: 6, fontWeight: 700 } }, 'Rs.'),
          React.createElement(Text, { style: { flex: 1, textAlign: 'right', paddingTop: 6, paddingRight: 8, fontWeight: 700 } }, data.amountPaid.toFixed(2))
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(
            View,
            { style: { width: 150, alignItems: 'center', marginRight: 28 } },
            React.createElement(View, { style: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#9ca3af', marginBottom: 6 } }),
            React.createElement(Text, { style: [styles.muted, { fontWeight: 600 }] }, 'Signature of customer')
          ),
          React.createElement(
            View,
            { style: { width: 150, alignItems: 'center' } },
            React.createElement(View, { style: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#9ca3af', marginBottom: 6 } }),
            React.createElement(Text, { style: [styles.muted, { fontWeight: 600 }] }, 'Signature of retailer')
          )
        )
      )
    )
  );
  return renderToBuffer(pdf);
}

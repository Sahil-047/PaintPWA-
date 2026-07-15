import React from 'react';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';

interface PdfBillData {
  billNo: string;
  firmName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  billedByName?: string;
  billedByEmail?: string;
  billedByAddress?: string;
  items: Array<{ name: string; qty: number; rate: number; total: number; subtitle?: string }>;
  subtotal: number;
  gstRate?: number;
  gstAmount?: number;
  discount: number;
  grandTotal: number;
  date: string;
  dueDate?: string;
  status?: 'paid' | 'partial' | 'due';
  orderRef?: string;
  soldBy?: string;
  delivery?: string;
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
  /** Invoice grand total (for challan proof). */
  billTotal?: number;
  /** Sum of all payments on this bill after this memo. */
  totalPaidOnBill?: number;
  /** Remaining balance after this memo. */
  balanceDue?: number;
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
  // Helvetica has no ₹ glyph — use Rs. so amounts don't garble in PDF
  return `Rs. ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function itemTitle(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, '').trim() || name;
}

function itemSubtitle(name: string, explicit?: string): string {
  if (explicit) return explicit;
  const m = name.match(/\(([^)]+)\)\s*$/);
  return m ? `Pack ${m[1]}` : '';
}

function statusLabel(status?: string): string {
  if (status === 'paid') return 'Paid';
  if (status === 'partial') return 'Partial';
  return 'Due';
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
  const brand = data.firmName ?? data.billedByName ?? 'Shop';
  const status = statusLabel(data.status);

  // Page height tracks content so the PDF doesn't leave a large blank bottom.
  // More line items grow the page; overflow still wraps safely.
  const baseHeight = 390;
  const perItem = 26;
  const INVOICE_PAGE = {
    width: 480,
    height: Math.min(780, baseHeight + Math.max(0, data.items.length - 1) * perItem),
  };

  const billStyles = StyleSheet.create({
    page: {
      paddingTop: 18,
      paddingBottom: 16,
      paddingHorizontal: 24,
      fontSize: 9,
      fontFamily: 'Helvetica',
      color: '#111111',
      backgroundColor: '#FFFFFF',
    },
    kicker: {
      fontSize: 7,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: '#767676',
      marginBottom: 4,
      fontWeight: 500,
    },
    wordmarkRow: { flexDirection: 'row', alignItems: 'center' },
    wordmark: {
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: -0.2,
      color: '#111111',
      marginRight: 8,
    },
    status: {
      fontSize: 7,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: '#111111',
      borderWidth: 1,
      borderColor: '#111111',
      paddingTop: 2,
      paddingBottom: 2,
      paddingHorizontal: 6,
      borderRadius: 2,
      fontWeight: 600,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderBottomWidth: 1.5,
      borderBottomColor: '#111111',
      paddingBottom: 8,
      marginBottom: 10,
    },
    headerMeta: { textAlign: 'right', fontSize: 8, color: '#767676', lineHeight: 1.45 },
    headerMetaStrong: { color: '#111111', fontWeight: 600 },
    infoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 8,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E4E4',
    },
    infoCol: { width: '48%' },
    infoLabel: {
      fontSize: 7,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: '#AFAFAF',
      marginBottom: 3,
      fontWeight: 600,
    },
    infoName: { fontSize: 9.5, fontWeight: 600, marginBottom: 2, color: '#111111' },
    muted: { fontSize: 8, color: '#767676', marginBottom: 1, lineHeight: 1.35 },
    orderStrip: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#D4D4D4',
      borderRadius: 4,
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginBottom: 10,
    },
    orderCell: { flex: 1 },
    orderCellBorder: {
      flex: 1,
      borderLeftWidth: 1,
      borderLeftColor: '#E4E4E4',
      paddingLeft: 8,
      marginLeft: 8,
    },
    orderValue: { fontSize: 8.5, fontWeight: 600, color: '#111111' },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      borderBottomColor: '#111111',
      paddingBottom: 4,
    },
    th: {
      fontSize: 7,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: '#AFAFAF',
      fontWeight: 600,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#E4E4E4',
      paddingVertical: 5,
    },
    itemTitle: { fontSize: 9, fontWeight: 600, color: '#111111' },
    itemSub: { fontSize: 7.5, color: '#767676', marginTop: 1 },
    num: { textAlign: 'right', fontSize: 8.5 },
    totalsWrap: { marginTop: 8, alignItems: 'flex-end' },
    totals: { width: 170 },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 8.5,
      paddingVertical: 1.5,
      color: '#767676',
    },
    totalsFinal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1.5,
      borderTopColor: '#111111',
      marginTop: 3,
      paddingTop: 5,
    },
    totalsFinalLabel: {
      fontSize: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: '#767676',
      fontWeight: 600,
    },
    totalsFinalAmount: { fontSize: 12, fontWeight: 700, color: '#111111' },
    footer: {
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#E4E4E4',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    footerHeading: {
      fontSize: 7,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: '#AFAFAF',
      marginBottom: 3,
      fontWeight: 600,
    },
    footerNote: { fontSize: 7.5, color: '#767676', maxWidth: 240, lineHeight: 1.4 },
    signature: { alignItems: 'flex-end', width: 130 },
    signatureLine: {
      width: 120,
      borderTopWidth: 1,
      borderTopColor: '#111111',
      marginBottom: 3,
    },
    signatureRole: { fontSize: 7.5, color: '#767676' },
  });

  const pdf = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: INVOICE_PAGE, style: billStyles.page },

      React.createElement(
        View,
        { style: billStyles.headerRow },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: billStyles.kicker }, 'Tax invoice'),
          React.createElement(
            View,
            { style: billStyles.wordmarkRow },
            React.createElement(Text, { style: billStyles.wordmark }, brand),
            React.createElement(Text, { style: billStyles.status }, status)
          )
        ),
        React.createElement(
          View,
          { style: billStyles.headerMeta },
          React.createElement(
            Text,
            null,
            React.createElement(Text, { style: billStyles.headerMetaStrong }, 'Invoice  '),
            data.billNo
          ),
          React.createElement(
            Text,
            null,
            React.createElement(Text, { style: billStyles.headerMetaStrong }, 'Issued  '),
            formatDate(data.date)
          ),
          React.createElement(
            Text,
            null,
            React.createElement(Text, { style: billStyles.headerMetaStrong }, 'Due  '),
            formatDate(data.dueDate ?? data.date)
          )
        )
      ),

      React.createElement(
        View,
        { style: billStyles.infoGrid },
        React.createElement(
          View,
          { style: billStyles.infoCol },
          React.createElement(Text, { style: billStyles.infoLabel }, 'Billed by'),
          React.createElement(Text, { style: billStyles.infoName }, data.billedByName ?? brand),
          data.billedByEmail
            ? React.createElement(Text, { style: billStyles.muted }, data.billedByEmail)
            : null,
          ...(data.billedByAddress
            ? data.billedByAddress.split('\n').map((line, i) =>
                React.createElement(Text, { key: `addr-${i}`, style: billStyles.muted }, line)
              )
            : [])
        ),
        React.createElement(
          View,
          { style: billStyles.infoCol },
          React.createElement(Text, { style: billStyles.infoLabel }, 'Billed to'),
          React.createElement(Text, { style: billStyles.infoName }, data.customerName),
          data.customerPhone
            ? React.createElement(Text, { style: billStyles.muted }, data.customerPhone)
            : null,
          data.customerEmail
            ? React.createElement(Text, { style: billStyles.muted }, data.customerEmail)
            : null,
          data.customerAddress
            ? React.createElement(Text, { style: billStyles.muted }, data.customerAddress)
            : null
        )
      ),

      React.createElement(
        View,
        { style: billStyles.orderStrip },
        React.createElement(
          View,
          { style: billStyles.orderCell },
          React.createElement(Text, { style: billStyles.infoLabel }, 'Order ref'),
          React.createElement(Text, { style: billStyles.orderValue }, data.orderRef ?? data.billNo)
        ),
        React.createElement(
          View,
          { style: billStyles.orderCellBorder },
          React.createElement(Text, { style: billStyles.infoLabel }, 'Sold by'),
          React.createElement(Text, { style: billStyles.orderValue }, data.soldBy ?? 'Counter')
        ),
        React.createElement(
          View,
          { style: billStyles.orderCellBorder },
          React.createElement(Text, { style: billStyles.infoLabel }, 'Delivery'),
          React.createElement(Text, { style: billStyles.orderValue }, data.delivery ?? 'Store pickup')
        )
      ),

      React.createElement(
        View,
        { style: billStyles.tableHeader },
        React.createElement(Text, { style: [billStyles.th, { width: '46%' }] }, 'Description'),
        React.createElement(Text, { style: [billStyles.th, billStyles.num, { width: '14%' }] }, 'Qty'),
        React.createElement(Text, { style: [billStyles.th, billStyles.num, { width: '20%' }] }, 'Rate'),
        React.createElement(Text, { style: [billStyles.th, billStyles.num, { width: '20%' }] }, 'Amount')
      ),

      ...data.items.map((item, idx) => {
        const sub = itemSubtitle(item.name, item.subtitle);
        return React.createElement(
          View,
          { key: `${item.name}-${idx}`, style: billStyles.row },
          React.createElement(
            View,
            { style: { width: '46%', paddingRight: 6 } },
            React.createElement(Text, { style: billStyles.itemTitle }, itemTitle(item.name)),
            sub ? React.createElement(Text, { style: billStyles.itemSub }, sub) : null
          ),
          React.createElement(Text, { style: [billStyles.num, { width: '14%' }] }, String(item.qty)),
          React.createElement(
            Text,
            { style: [billStyles.num, { width: '20%' }] },
            formatCurrency(item.rate)
          ),
          React.createElement(
            Text,
            { style: [billStyles.num, { width: '20%' }] },
            formatCurrency(item.total)
          )
        );
      }),

      React.createElement(
        View,
        { style: billStyles.totalsWrap },
        React.createElement(
          View,
          { style: billStyles.totals },
          React.createElement(
            View,
            { style: billStyles.totalsRow },
            React.createElement(Text, null, 'Subtotal'),
            React.createElement(Text, null, formatCurrency(data.subtotal))
          ),
          React.createElement(
            View,
            { style: billStyles.totalsRow },
            React.createElement(Text, null, `GST (${gstRate}%)`),
            React.createElement(Text, null, formatCurrency(gstAmount))
          ),
          data.discount > 0
            ? React.createElement(
                View,
                { style: billStyles.totalsRow },
                React.createElement(Text, null, 'Discount'),
                React.createElement(Text, null, `- ${formatCurrency(data.discount)}`)
              )
            : null,
          React.createElement(
            View,
            { style: billStyles.totalsFinal },
            React.createElement(Text, { style: billStyles.totalsFinalLabel }, 'Total'),
            React.createElement(
              Text,
              { style: billStyles.totalsFinalAmount },
              formatCurrency(data.grandTotal)
            )
          )
        )
      ),

      React.createElement(
        View,
        { style: billStyles.footer },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: billStyles.footerHeading }, 'Notes'),
          React.createElement(
            Text,
            { style: billStyles.footerNote },
            'Thank you for your purchase. Keep this invoice for shade-batch matching on reorders.'
          )
        ),
        React.createElement(
          View,
          { style: billStyles.signature },
          React.createElement(View, { style: billStyles.signatureLine }),
          React.createElement(Text, { style: billStyles.signatureRole }, `Signatory, ${brand}`)
        )
      )
    )
  );

  return renderToBuffer(pdf);
}

export async function generateCashMemoPdf(data: PdfCashMemoData): Promise<Buffer> {
  const amountWords = `${numberToWordsIndian(data.amountPaid)} only`;
  const isCheque = data.paymentMode.toLowerCase().includes('cheque');
  const billTotal = data.billTotal ?? 0;
  const totalPaid = data.totalPaidOnBill ?? data.amountPaid;
  const balanceDue =
    data.balanceDue ?? Math.max(0, billTotal > 0 ? billTotal - totalPaid : 0);
  const settled = balanceDue <= 0.009;
  const paymentNote = settled
    ? 'in full settlement of the invoice. This challan is proof of payment.'
    : 'in part payment of the invoice. This challan is proof of amount received.';
  const modeLabel =
    (data.paymentMode || 'cash').charAt(0).toUpperCase() +
    (data.paymentMode || 'cash').slice(1).toLowerCase();
  const firm = data.firmName ?? 'Shop';

  // Compact landscape challan — no empty A4 margins
  const CHALLAN_PAGE = { width: 640, height: 400 };

  const s = StyleSheet.create({
    page: {
      paddingTop: 22,
      paddingBottom: 18,
      paddingHorizontal: 26,
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#111111',
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1.5,
      borderBottomColor: '#111111',
      paddingBottom: 10,
      marginBottom: 12,
    },
    title: { fontSize: 18, fontWeight: 700, letterSpacing: -0.3, color: '#111111' },
    subtitle: { fontSize: 8, color: '#767676', marginTop: 3 },
    firm: { fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#111111' },
    invoiceRef: { fontSize: 8, color: '#767676', marginTop: 3, textAlign: 'right' },
    status: {
      alignSelf: 'flex-end',
      marginTop: 5,
      fontSize: 7,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      borderWidth: 1,
      borderColor: '#111111',
      paddingTop: 2,
      paddingBottom: 2,
      paddingHorizontal: 6,
      borderRadius: 2,
      fontWeight: 600,
    },
    metaStrip: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#D4D4D4',
      borderRadius: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 14,
    },
    metaCell: { flex: 1 },
    metaCellMid: {
      flex: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderLeftColor: '#E4E4E4',
      borderRightColor: '#E4E4E4',
      paddingHorizontal: 10,
      marginHorizontal: 10,
    },
    metaLabel: {
      fontSize: 7,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: '#AFAFAF',
      fontWeight: 600,
      marginBottom: 3,
    },
    metaValue: { fontSize: 9, fontWeight: 600, color: '#111111' },
    line: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 9,
    },
    lineLabel: { fontSize: 9, fontWeight: 700, color: '#111111', marginRight: 6 },
    underline: {
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: '#C4C4C4',
      paddingBottom: 2,
      minHeight: 14,
    },
    underlineText: { fontSize: 9, color: '#111111' },
    noteInline: { fontSize: 8, color: '#555555', marginLeft: 6, flexShrink: 1 },
    settleBox: {
      width: 200,
      borderWidth: 1,
      borderColor: '#D4D4D4',
      borderRadius: 4,
      padding: 10,
      backgroundColor: '#FAFAFA',
    },
    settleTitle: {
      fontSize: 8,
      fontWeight: 700,
      color: '#111111',
      marginBottom: 7,
    },
    settleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    settleLabel: { fontSize: 8, color: '#767676' },
    settleValue: { fontSize: 8, fontWeight: 600, color: '#111111' },
    settleBalance: { fontSize: 8.5, fontWeight: 700, color: '#111111' },
    tip: { fontSize: 7.5, color: '#767676', marginTop: 10, lineHeight: 1.4 },
    footer: {
      marginTop: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#E4E4E4',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    amountBox: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#111111',
      height: 24,
      width: 130,
    },
    amountPrefix: {
      width: 32,
      backgroundColor: '#111111',
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: 700,
      textAlign: 'center',
      paddingTop: 6,
    },
    amountValue: {
      flex: 1,
      textAlign: 'right',
      fontSize: 10,
      fontWeight: 700,
      paddingTop: 5,
      paddingRight: 8,
      color: '#111111',
    },
    sigRow: { flexDirection: 'row' },
    sig: { width: 120, alignItems: 'center', marginLeft: 18 },
    sigLine: {
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: '#111111',
      marginBottom: 4,
    },
    sigLabel: { fontSize: 7, color: '#767676', fontWeight: 600 },
  });

  function fillLine(label: string, value: string, trailing?: string) {
    return React.createElement(
      View,
      { style: s.line },
      React.createElement(Text, { style: s.lineLabel }, label),
      React.createElement(
        View,
        { style: s.underline },
        React.createElement(Text, { style: s.underlineText }, value)
      ),
      trailing ? React.createElement(Text, { style: s.noteInline }, trailing) : null
    );
  }

  const pdf = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: CHALLAN_PAGE, style: s.page },

      React.createElement(
        View,
        { style: s.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.title }, 'Payment Challan'),
          React.createElement(
            Text,
            { style: s.subtitle },
            'Cash Memo · Customer payment receipt'
          )
        ),
        React.createElement(
          View,
          { style: { alignItems: 'flex-end' } },
          React.createElement(Text, { style: s.firm }, firm),
          React.createElement(Text, { style: s.invoiceRef }, `Invoice ${data.billNo}`),
          React.createElement(Text, { style: s.status }, settled ? 'Settled' : 'Partial')
        )
      ),

      React.createElement(
        View,
        { style: s.metaStrip },
        React.createElement(
          View,
          { style: s.metaCell },
          React.createElement(Text, { style: s.metaLabel }, 'Challan No.'),
          React.createElement(Text, { style: s.metaValue }, data.memoNo)
        ),
        React.createElement(
          View,
          { style: s.metaCellMid },
          React.createElement(Text, { style: s.metaLabel }, 'Date'),
          React.createElement(Text, { style: s.metaValue }, formatDate(data.date))
        ),
        React.createElement(
          View,
          { style: s.metaCell },
          React.createElement(Text, { style: s.metaLabel }, 'Payment mode'),
          React.createElement(Text, { style: s.metaValue }, modeLabel)
        )
      ),

      React.createElement(
        View,
        { style: { flexDirection: 'row' } },
        React.createElement(
          View,
          { style: { flex: 1, paddingRight: 14 } },
          fillLine('RECEIVED with thanks from', data.customerName),
          fillLine('the sum of Rupees', amountWords),
          fillLine(
            isCheque ? 'by Cheque No.' : 'by',
            isCheque
              ? `${data.chequeNo ?? '—'}   ${formatCurrency(data.amountPaid)}`
              : `${modeLabel}   ${formatCurrency(data.amountPaid)}`
          ),
          fillLine('Dated', formatDate(data.date), paymentNote),
          React.createElement(
            Text,
            { style: s.tip },
            settled
              ? 'This challan is your proof of payment against the invoice above.'
              : 'Present this challan when paying the remaining balance. Each payment creates a new cash memo against the same invoice.'
          )
        ),
        billTotal > 0
          ? React.createElement(
              View,
              { style: s.settleBox },
              React.createElement(Text, { style: s.settleTitle }, 'Invoice settlement'),
              React.createElement(
                View,
                { style: s.settleRow },
                React.createElement(Text, { style: s.settleLabel }, 'Invoice total'),
                React.createElement(Text, { style: s.settleValue }, formatCurrency(billTotal))
              ),
              React.createElement(
                View,
                { style: s.settleRow },
                React.createElement(Text, { style: s.settleLabel }, 'Paid on this challan'),
                React.createElement(Text, { style: s.settleValue }, formatCurrency(data.amountPaid))
              ),
              React.createElement(
                View,
                { style: s.settleRow },
                React.createElement(Text, { style: s.settleLabel }, 'Total paid so far'),
                React.createElement(Text, { style: s.settleValue }, formatCurrency(totalPaid))
              ),
              React.createElement(
                View,
                {
                  style: [
                    s.settleRow,
                    {
                      marginTop: 4,
                      paddingTop: 5,
                      borderTopWidth: 1,
                      borderTopColor: '#E4E4E4',
                      marginBottom: 0,
                    },
                  ],
                },
                React.createElement(Text, { style: s.settleBalance }, 'Balance due'),
                React.createElement(Text, { style: s.settleBalance }, formatCurrency(balanceDue))
              )
            )
          : null
      ),

      React.createElement(
        View,
        { style: s.footer },
        React.createElement(
          View,
          { style: s.amountBox },
          React.createElement(Text, { style: s.amountPrefix }, 'Rs.'),
          React.createElement(
            Text,
            { style: s.amountValue },
            data.amountPaid.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          )
        ),
        React.createElement(
          View,
          { style: s.sigRow },
          React.createElement(
            View,
            { style: s.sig },
            React.createElement(View, { style: s.sigLine }),
            React.createElement(Text, { style: s.sigLabel }, 'Signature of customer')
          ),
          React.createElement(
            View,
            { style: s.sig },
            React.createElement(View, { style: s.sigLine }),
            React.createElement(Text, { style: s.sigLabel }, 'Signature of retailer')
          )
        )
      )
    )
  );

  return renderToBuffer(pdf);
}

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
  discount: number;
  miscAmount?: number;
  miscRemark?: string;
  grandTotal: number;
  date: string;
  dueDate?: string;
  status?: 'paid' | 'partial' | 'due';
  orderRef?: string;
  soldBy?: string;
  delivery?: string;
  amountPaid?: number;
  creditApplied?: number;
  received?: number;
  balanceDue?: number;
}

interface PdfCashMemoData {
  memoNo: string;
  firmName?: string;
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
  const received = data.received ?? ((data.amountPaid ?? 0) + (data.creditApplied ?? 0));
  const balanceDue =
    data.balanceDue ?? Math.max(0, Number((data.grandTotal - received).toFixed(2)));
  const showPaymentBreakdown = received > 0.001 || (data.status !== 'due' && data.status !== undefined);
  const amountWords = `${numberToWordsIndian(data.grandTotal)} Rupees only`;
  const miscAmt = data.miscAmount ?? 0;
  const hasDiscount = data.discount > 0;
  const hasMisc = miscAmt > 0;
  const extraRows = (hasDiscount ? 1 : 0) + (hasMisc ? 1 : 0);

  // Classic cash-memo proportions; grow with line items.
  const baseHeight = showPaymentBreakdown ? 520 : 480;
  const perItem = 28;
  const MEMO_PAGE = {
    width: 420,
    height: Math.min(780, baseHeight + Math.max(0, data.items.length + extraRows - 1) * perItem),
  };

  const s = StyleSheet.create({
    page: {
      paddingTop: 20,
      paddingBottom: 18,
      paddingHorizontal: 22,
      fontSize: 9,
      fontFamily: 'Helvetica',
      color: '#000000',
      backgroundColor: '#FFFFFF',
    },
    title: {
      fontSize: 13,
      fontWeight: 700,
      textAlign: 'center',
      letterSpacing: 1.2,
      textDecoration: 'underline',
      marginBottom: 14,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 8,
    },
    metaText: { fontSize: 9.5 },
    metaLabel: { fontWeight: 700 },
    toRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 4,
    },
    toLabel: { fontSize: 9.5, fontWeight: 700, width: 28 },
    toLine: {
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      borderStyle: 'dotted',
      paddingBottom: 2,
      fontSize: 9.5,
      fontWeight: 600,
    },
    toDetail: { fontSize: 8, color: '#333333', marginLeft: 28, marginBottom: 10 },
    table: {
      borderWidth: 1.5,
      borderColor: '#000000',
      marginTop: 4,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      borderBottomColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
    th: {
      fontSize: 8.5,
      fontWeight: 700,
      textAlign: 'center',
      paddingVertical: 5,
      paddingHorizontal: 3,
    },
    thBorder: { borderRightWidth: 1, borderRightColor: '#000000' },
    colSno: { width: '10%' },
    colPart: { width: '42%' },
    colQty: { width: '12%' },
    colRate: { width: '18%' },
    colAmt: { width: '18%' },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      minHeight: 26,
    },
    td: {
      fontSize: 8.5,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    tdCenter: { textAlign: 'center' },
    tdRight: { textAlign: 'right' },
    partTitle: { fontSize: 8.5, fontWeight: 600 },
    partSub: { fontSize: 7.5, color: '#333333', marginTop: 1 },
    totalRow: {
      flexDirection: 'row',
      minHeight: 26,
      alignItems: 'center',
    },
    totalLabelCell: {
      width: '82%',
      borderRightWidth: 1,
      borderRightColor: '#000000',
      paddingVertical: 5,
      paddingHorizontal: 6,
      textAlign: 'right',
      fontSize: 9,
      fontWeight: 700,
    },
    totalAmtCell: {
      width: '18%',
      paddingVertical: 5,
      paddingHorizontal: 4,
      textAlign: 'right',
      fontSize: 9.5,
      fontWeight: 700,
    },
    wordsRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    wordsLabel: { fontSize: 9, fontWeight: 700 },
    wordsValue: {
      flex: 1,
      fontSize: 9,
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      borderStyle: 'dotted',
      marginLeft: 4,
      paddingBottom: 2,
    },
    payBlock: { marginTop: 8 },
    payLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 9,
      marginBottom: 2,
    },
    footer: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    terms: { fontSize: 7.5, lineHeight: 1.45, maxWidth: 220 },
    eoe: { fontWeight: 700, marginBottom: 3, fontSize: 8 },
    signWrap: { alignItems: 'flex-end', width: 140 },
    signSpace: { height: 36 },
    signLine: {
      width: 130,
      borderTopWidth: 1,
      borderTopColor: '#000000',
      marginBottom: 3,
    },
    signLabel: { fontSize: 8.5, fontWeight: 600 },
  });

  const cellBorder = { borderRightWidth: 1, borderRightColor: '#000000' };

  const pdf = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: MEMO_PAGE, style: s.page },

      React.createElement(Text, { style: s.title }, 'BILL / CASH MEMO'),

      React.createElement(
        View,
        { style: s.metaRow },
        React.createElement(
          Text,
          { style: s.metaText },
          React.createElement(Text, { style: s.metaLabel }, 'Date : '),
          formatDate(data.date)
        )
      ),

      React.createElement(
        View,
        { style: s.toRow },
        React.createElement(Text, { style: s.toLabel }, 'To'),
        React.createElement(Text, { style: s.toLine }, data.customerName || ' ')
      ),
      data.customerPhone || data.customerAddress
        ? React.createElement(
            Text,
            { style: s.toDetail },
            [data.customerPhone, data.customerAddress].filter(Boolean).join('  ·  ')
          )
        : null,

      React.createElement(
        View,
        { style: s.table },
        React.createElement(
          View,
          { style: s.tableHeader },
          React.createElement(Text, { style: [s.th, s.colSno, s.thBorder] }, 'S.No.'),
          React.createElement(Text, { style: [s.th, s.colPart, s.thBorder] }, 'PARTICULARS'),
          React.createElement(Text, { style: [s.th, s.colQty, s.thBorder] }, 'Qty'),
          React.createElement(Text, { style: [s.th, s.colRate, s.thBorder] }, 'Rate'),
          React.createElement(Text, { style: [s.th, s.colAmt] }, 'Amount')
        ),

        ...data.items.map((item, idx) => {
          const sub = itemSubtitle(item.name, item.subtitle);
          return React.createElement(
            View,
            { key: `item-${idx}`, style: s.row },
            React.createElement(
              Text,
              { style: [s.td, s.tdCenter, s.colSno, cellBorder] },
              String(idx + 1)
            ),
            React.createElement(
              View,
              { style: [s.colPart, cellBorder, { paddingVertical: 4, paddingHorizontal: 4 }] },
              React.createElement(Text, { style: s.partTitle }, itemTitle(item.name)),
              sub ? React.createElement(Text, { style: s.partSub }, sub) : null
            ),
            React.createElement(
              Text,
              { style: [s.td, s.tdCenter, s.colQty, cellBorder] },
              String(item.qty)
            ),
            React.createElement(
              Text,
              { style: [s.td, s.tdRight, s.colRate, cellBorder] },
              formatCurrency(item.rate)
            ),
            React.createElement(
              Text,
              { style: [s.td, s.tdRight, s.colAmt] },
              formatCurrency(item.total)
            )
          );
        }),

        hasDiscount
          ? React.createElement(
              View,
              { key: 'discount', style: s.row },
              React.createElement(Text, { style: [s.td, s.tdCenter, s.colSno, cellBorder] }, ''),
              React.createElement(
                Text,
                { style: [s.td, s.colPart, cellBorder] },
                'Less : Discount'
              ),
              React.createElement(Text, { style: [s.td, s.colQty, cellBorder] }, ''),
              React.createElement(Text, { style: [s.td, s.colRate, cellBorder] }, ''),
              React.createElement(
                Text,
                { style: [s.td, s.tdRight, s.colAmt] },
                `- ${formatCurrency(data.discount)}`
              )
            )
          : null,

        hasMisc
          ? React.createElement(
              View,
              { key: 'misc', style: s.row },
              React.createElement(Text, { style: [s.td, s.tdCenter, s.colSno, cellBorder] }, ''),
              React.createElement(
                Text,
                { style: [s.td, s.colPart, cellBorder] },
                data.miscRemark?.trim()
                  ? `Add : Misc (${data.miscRemark.trim()})`
                  : 'Add : Miscellaneous'
              ),
              React.createElement(Text, { style: [s.td, s.colQty, cellBorder] }, ''),
              React.createElement(Text, { style: [s.td, s.colRate, cellBorder] }, ''),
              React.createElement(
                Text,
                { style: [s.td, s.tdRight, s.colAmt] },
                formatCurrency(miscAmt)
              )
            )
          : null,

        React.createElement(
          View,
          { style: s.totalRow },
          React.createElement(Text, { style: s.totalLabelCell }, 'TOTAL'),
          React.createElement(
            Text,
            { style: s.totalAmtCell },
            formatCurrency(data.grandTotal)
          )
        )
      ),

      React.createElement(
        View,
        { style: s.wordsRow },
        React.createElement(Text, { style: s.wordsLabel }, 'TOTAL AMOUNT'),
        React.createElement(Text, { style: s.wordsValue }, amountWords)
      ),

      showPaymentBreakdown
        ? React.createElement(
            View,
            { style: s.payBlock },
            (data.creditApplied ?? 0) > 0.001
              ? React.createElement(
                  View,
                  { style: s.payLine },
                  React.createElement(Text, null, 'Store credit'),
                  React.createElement(Text, null, formatCurrency(data.creditApplied ?? 0))
                )
              : null,
            (data.amountPaid ?? 0) > 0.001
              ? React.createElement(
                  View,
                  { style: s.payLine },
                  React.createElement(Text, null, 'Cash / UPI received'),
                  React.createElement(Text, null, formatCurrency(data.amountPaid ?? 0))
                )
              : null,
            React.createElement(
              View,
              { style: s.payLine },
              React.createElement(Text, null, 'Total received'),
              React.createElement(Text, null, formatCurrency(received))
            ),
            React.createElement(
              View,
              { style: s.payLine },
              React.createElement(Text, null, 'Balance due'),
              React.createElement(Text, null, formatCurrency(balanceDue))
            )
          )
        : null,

      React.createElement(
        View,
        { style: s.footer },
        React.createElement(
          View,
          { style: s.terms },
          React.createElement(Text, { style: s.eoe }, 'E. & O. E.'),
          React.createElement(Text, null, '1. Goods once sold will not be taken back.'),
          React.createElement(Text, null, '2. Keep this memo for shade / batch matching on reorders.')
        ),
        React.createElement(
          View,
          { style: s.signWrap },
          React.createElement(View, { style: s.signSpace }),
          React.createElement(View, { style: s.signLine }),
          React.createElement(Text, { style: s.signLabel }, 'Authorised Signatory')
        )
      )
    )
  );

  return renderToBuffer(pdf);
}

export async function generateCashMemoPdf(data: PdfCashMemoData): Promise<Buffer> {
  const amountWords = `${numberToWordsIndian(data.amountPaid)} only`;
  const isCheque = data.paymentMode.toLowerCase().includes('cheque');
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
          React.createElement(Text, { style: s.title }, 'Cash Memo'),
          React.createElement(
            Text,
            { style: s.subtitle },
            'Advance receipt · Token for future purchases'
          )
        ),
        React.createElement(
          View,
          { style: { alignItems: 'flex-end' } },
          React.createElement(Text, { style: s.firm }, firm),
          React.createElement(Text, { style: s.invoiceRef }, 'Customer advance token'),
          React.createElement(Text, { style: s.status }, 'Advance')
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
          fillLine('Dated', formatDate(data.date), 'as a token of amount received'),
          React.createElement(
            Text,
            { style: s.tip },
            'This cash memo is proof that the customer has deposited the amount above for future buying. Present it when billing against this credit.'
          )
        ),
        React.createElement(
          View,
          { style: s.settleBox },
          React.createElement(Text, { style: s.settleTitle }, 'Amount received'),
          React.createElement(
            View,
            { style: s.settleRow },
            React.createElement(Text, { style: s.settleLabel }, 'Received'),
            React.createElement(Text, { style: s.settleValue }, formatCurrency(data.amountPaid))
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
            React.createElement(Text, { style: s.settleBalance }, 'Credit for future buying'),
            React.createElement(Text, { style: s.settleBalance }, formatCurrency(data.amountPaid))
          )
        )
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

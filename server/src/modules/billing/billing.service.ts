import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateBillNo } from '../../utils/invoice.number.js';
import { generateBillPdf } from '../../utils/pdf.generator.js';
import { buildPdfKey, savePdfByKey } from '../../utils/pdf.storage.js';
import * as accountsService from '../accounts/accounts.service.js';
import { CustomerModel } from '../accounts/customer.model.js';
import { TenantModel, UserModel } from '../auth/auth.model.js';
import * as cashmemoService from '../cashmemo/cashmemo.service.js';
import * as inventoryService from '../inventory/inventory.service.js';
import { BillModel } from './billing.model.js';
import type { CreateBillInput } from './billing.validator.js';

/** Shop profile from Settings / tenant — used as invoice “Billed by”. */
async function getShopBillingIdentity(tenantId: Types.ObjectId) {
  const [tenant, owner] = await Promise.all([
    TenantModel.findById(tenantId).lean(),
    UserModel.findOne({ tenantId, role: 'admin' }).sort({ createdAt: 1 }).lean(),
  ]);

  const shopName = tenant?.name?.trim() || 'Shop';
  const email = owner?.email?.trim() || '';
  const phone = tenant?.phone?.trim() || '';
  const address = tenant?.address?.trim() || '';

  const addressLines = [address, phone ? `Phone: ${phone}` : ''].filter(Boolean).join('\n');

  return {
    firmName: shopName,
    billedByName: shopName,
    billedByEmail: email || undefined,
    billedByAddress: addressLines || undefined,
    soldBy: shopName,
  };
}

export async function createBill(tenantId: Types.ObjectId, input: CreateBillInput) {
  const customer = await accountsService.upsertCustomer(tenantId, input.customer);

  let subtotal = 0;
  const billItems = [];

  for (const item of input.items) {
    const product = await inventoryService.deductStock(
      tenantId,
      item.productId,
      item.qty,
      item.size
    );
    const rate = item.rate;
    if (!rate || rate <= 0) {
      throw new AppError('Unit rate is required for every bill item', 400);
    }
    const total = rate * item.qty;
    subtotal += total;
    const baseName = String((product as { name?: string }).name ?? '');
    const productName = item.size ? `${baseName} (${item.size})` : baseName;

    billItems.push({
      productId: new Types.ObjectId(String((product as { _id?: unknown })._id)),
      productName,
      qty: item.qty,
      rate,
      total,
    });
  }

  const discount = input.discount ?? 0;
  const grandTotal = Math.max(0, subtotal - discount);

  const amountPaid = input.amountPaid ?? 0;

  const bill = await BillModel.create({
    tenantId,
    billNo: generateBillNo(),
    customerId: customer._id,
    items: billItems,
    subtotal,
    discount,
    grandTotal,
    status: 'due',
  });

  const { creditApplied } = await accountsService.addBillToAccount(
    tenantId,
    customer._id as Types.ObjectId,
    bill._id as Types.ObjectId,
    grandTotal
  );

  let cashMemo = null;
  if (amountPaid > 0) {
    cashMemo = await cashmemoService.createCashMemo(tenantId, {
      billId: (bill._id as Types.ObjectId).toString(),
      customerId: (customer._id as Types.ObjectId).toString(),
      amountPaid,
      paymentMode: input.paymentMode ?? 'cash',
    });
  }

  const totalSettled = creditApplied + amountPaid;
  if (totalSettled >= grandTotal) bill.status = 'paid';
  else if (totalSettled > 0) bill.status = 'partial';
  else bill.status = 'due';
  await bill.save();

  const customerDoc = await CustomerModel.findById(customer._id);
  const shop = await getShopBillingIdentity(tenantId);
  const issuedAt = new Date().toISOString();
  const pdfBuffer = await generateBillPdf({
    billNo: bill.billNo,
    firmName: shop.firmName,
    billedByName: shop.billedByName,
    billedByEmail: shop.billedByEmail,
    billedByAddress: shop.billedByAddress,
    customerName: customerDoc?.name ?? input.customer.name,
    customerEmail: undefined,
    customerPhone: input.customer.phone ?? customerDoc?.phone ?? undefined,
    customerAddress: input.customer.address ?? customerDoc?.address ?? undefined,
    items: billItems.map((i) => ({
      name: i.productName,
      qty: i.qty,
      rate: i.rate,
      total: i.total,
    })),
    subtotal,
    discount,
    grandTotal,
    date: issuedAt,
    dueDate: issuedAt,
    status: bill.status,
    orderRef: bill.billNo,
    soldBy: shop.soldBy,
    delivery: 'Store pickup',
  });

  const pdfKey = buildPdfKey(String(tenantId), 'bill', bill.billNo);
  await savePdfByKey(pdfKey, pdfBuffer);
  bill.pdfUrl = pdfKey;
  await bill.save();

  return { bill, cashMemo, pdfBuffer, creditApplied };
}

export async function listBillingProducts(
  tenantId: Types.ObjectId,
  query: {
    page?: number;
    limit?: number;
    search?: string;
    brandId?: string;
    type?: string;
  }
) {
  return inventoryService.listProductsPaginated(tenantId, query);
}

export async function listBills(tenantId: Types.ObjectId) {
  return BillModel.find({ tenantId })
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 });
}

export async function getBill(tenantId: Types.ObjectId, billId: string) {
  const bill = await BillModel.findOne({ _id: billId, tenantId }).populate(
    'customerId',
    'name phone address gstin'
  );
  if (!bill) throw new AppError('Bill not found', 404);
  return bill;
}

export async function getBillPdf(tenantId: Types.ObjectId, billId: string) {
  const bill = await getBill(tenantId, billId);
  const customer = bill.customerId as {
    name?: string;
    address?: string;
    phone?: string;
  } | null;
  const shop = await getShopBillingIdentity(tenantId);
  const createdAt =
    (bill as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString();

  const buffer = await generateBillPdf({
    billNo: bill.billNo,
    firmName: shop.firmName,
    billedByName: shop.billedByName,
    billedByEmail: shop.billedByEmail,
    billedByAddress: shop.billedByAddress,
    customerName: customer?.name ?? 'Customer',
    customerPhone: customer?.phone,
    customerAddress: customer?.address,
    items: bill.items.map((i) => ({
      name: i.productName,
      qty: i.qty,
      rate: i.rate,
      total: i.total,
    })),
    subtotal: bill.subtotal,
    discount: bill.discount,
    grandTotal: bill.grandTotal,
    date: createdAt,
    dueDate: createdAt,
    status: bill.status,
    orderRef: bill.billNo,
    soldBy: shop.soldBy,
    delivery: 'Store pickup',
  });

  const key = bill.pdfUrl ?? buildPdfKey(String(tenantId), 'bill', bill.billNo);
  await savePdfByKey(key, buffer);
  if (!bill.pdfUrl) {
    bill.pdfUrl = key;
    await bill.save();
  }
  return buffer;
}

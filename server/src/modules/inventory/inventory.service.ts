import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { BrandModel } from './brand.model.js';
import { ProductTypeModel } from './product-type.model.js';
import { ProductModel } from './inventory.model.js';
import { PAINT_SIZES, sumSizeMap } from './inventory.constants.js';
import type {
  CreateBrandInput,
  CreateProductInput,
  CreateProductTypeInput,
} from './inventory.validator.js';

function primarySalePrice(priceBySize: Record<string, number> | undefined, price: number): number {
  if (!priceBySize) return price;
  for (const size of ['1L', '4L', '10L', '500ml', '200ml', '100ml', '50ml', '20L']) {
    const v = priceBySize[size];
    if (v && v > 0) return v;
  }
  return price;
}

export function serializeProduct(doc: Record<string, unknown>) {
  const stock = (doc.stock as number) ?? sumSizeMap(doc.stockBySize as Record<string, number>);
  const priceBySize = doc.priceBySize as Record<string, number> | undefined;
  const price = (doc.price as number) ?? 0;
  const brand = doc.brand;
  const brandName =
    brand && typeof brand === 'object' && brand !== null && 'name' in brand
      ? (brand as { name: string }).name
      : undefined;

  return {
    ...doc,
    brand: brand && typeof brand === 'object' && '_id' in brand ? String((brand as { _id: unknown })._id) : String(brand),
    brandName,
    stock,
    stockQty: stock,
    salePrice: primarySalePrice(priceBySize, price),
    lowStockAlert: doc.lowStockThreshold ?? 5,
  };
}

function mergeSizeMaps(
  existing: Record<string, number> | undefined,
  incoming: Record<string, number | undefined> | undefined
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const size of PAINT_SIZES) {
    merged[size] = existing?.[size] ?? 0;
  }
  if (incoming) {
    for (const size of PAINT_SIZES) {
      if (incoming[size] !== undefined) merged[size] = incoming[size]!;
    }
  }
  return merged;
}

// ── Brands ──

export async function listBrands(tenantId: Types.ObjectId) {
  return BrandModel.find({ tenantId }).sort({ name: 1 });
}

export async function createBrand(tenantId: Types.ObjectId, input: CreateBrandInput) {
  return BrandModel.create({ tenantId, ...input });
}

export async function updateBrand(
  tenantId: Types.ObjectId,
  brandId: string,
  input: Partial<CreateBrandInput> & { isActive?: boolean }
) {
  const brand = await BrandModel.findOneAndUpdate({ _id: brandId, tenantId }, input, {
    new: true,
    runValidators: true,
  });
  if (!brand) throw new AppError('Brand not found', 404);
  return brand;
}

export async function deleteBrand(tenantId: Types.ObjectId, brandId: string) {
  const brand = await BrandModel.findOneAndUpdate(
    { _id: brandId, tenantId },
    { isActive: false },
    { new: true }
  );
  if (!brand) throw new AppError('Brand not found', 404);
  return brand;
}

// ── Product types ──

export async function listProductTypes(tenantId: Types.ObjectId, brandId: string) {
  return ProductTypeModel.find({ tenantId, brandId }).sort({ name: 1 });
}

export async function createProductType(
  tenantId: Types.ObjectId,
  brandId: string,
  input: CreateProductTypeInput
) {
  const brand = await BrandModel.findOne({ _id: brandId, tenantId, isActive: true });
  if (!brand) throw new AppError('Brand not found', 404);
  return ProductTypeModel.create({ tenantId, brandId, ...input });
}

export async function updateProductType(
  tenantId: Types.ObjectId,
  typeId: string,
  input: Partial<CreateProductTypeInput> & { isActive?: boolean }
) {
  const type = await ProductTypeModel.findOneAndUpdate({ _id: typeId, tenantId }, input, {
    new: true,
    runValidators: true,
  });
  if (!type) throw new AppError('Product type not found', 404);
  return type;
}

export async function deleteProductType(tenantId: Types.ObjectId, typeId: string) {
  const type = await ProductTypeModel.findOneAndUpdate(
    { _id: typeId, tenantId },
    { isActive: false },
    { new: true }
  );
  if (!type) throw new AppError('Product type not found', 404);
  return type;
}

// ── Products ──

export async function listProducts(
  tenantId: Types.ObjectId,
  filters?: { brandId?: string; type?: string; search?: string }
) {
  const filter = buildProductFilter(tenantId, filters);

  const products = await ProductModel.find(filter)
    .populate('brand', 'name')
    .sort({ name: 1 })
    .lean();

  return products.map((p) => serializeProduct(p as Record<string, unknown>));
}

export function buildProductFilter(
  tenantId: Types.ObjectId,
  filters?: { brandId?: string; type?: string; search?: string }
) {
  const filter: Record<string, unknown> = { tenantId, isActive: true };
  if (filters?.brandId) filter.brand = filters.brandId;
  if (filters?.type) filter.type = filters.type;
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { productCode: { $regex: q, $options: 'i' } },
      { type: { $regex: q, $options: 'i' } },
      { base: { $regex: q, $options: 'i' } },
    ];
  }
  return filter;
}

export async function listProductsPaginated(
  tenantId: Types.ObjectId,
  options: {
    page?: number;
    limit?: number;
    brandId?: string;
    type?: string;
    search?: string;
  } = {}
) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;
  const filter = buildProductFilter(tenantId, options);

  const [products, total] = await Promise.all([
    ProductModel.find(filter)
      .populate('brand', 'name')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductModel.countDocuments(filter),
  ]);

  return {
    items: products.map((p) => serializeProduct(p as Record<string, unknown>)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getProduct(tenantId: Types.ObjectId, productId: string) {
  const product = await ProductModel.findOne({ _id: productId, tenantId })
    .populate('brand', 'name')
    .lean();
  if (!product) throw new AppError('Product not found', 404);
  return serializeProduct(product as Record<string, unknown>);
}

export async function createProduct(tenantId: Types.ObjectId, input: CreateProductInput) {
  const brand = await BrandModel.findOne({ _id: input.brand, tenantId, isActive: true });
  if (!brand) throw new AppError('Brand not found', 404);

  const stockBySize = mergeSizeMaps(undefined, input.stockBySize);
  const priceBySize = mergeSizeMaps(undefined, input.priceBySize);

  const product = await ProductModel.create({
    tenantId,
    ...input,
    brand: input.brand,
    stockBySize,
    priceBySize,
    stock: sumSizeMap(stockBySize),
  });

  return getProduct(tenantId, String(product._id));
}

export async function updateProduct(
  tenantId: Types.ObjectId,
  productId: string,
  input: Partial<CreateProductInput>
) {
  const existing = await ProductModel.findOne({ _id: productId, tenantId });
  if (!existing) throw new AppError('Product not found', 404);

  if (input.brand) {
    const brand = await BrandModel.findOne({ _id: input.brand, tenantId, isActive: true });
    if (!brand) throw new AppError('Brand not found', 404);
  }

  if (input.stockBySize) {
    existing.stockBySize = mergeSizeMaps(
      existing.stockBySize as Record<string, number>,
      input.stockBySize
    ) as typeof existing.stockBySize;
    existing.stock = sumSizeMap(existing.stockBySize as Record<string, number>);
  }
  if (input.priceBySize) {
    existing.priceBySize = mergeSizeMaps(
      existing.priceBySize as Record<string, number>,
      input.priceBySize
    ) as typeof existing.priceBySize;
  }

  const { stockBySize: _s, priceBySize: _p, ...rest } = input;
  Object.assign(existing, rest);
  await existing.save();

  return getProduct(tenantId, productId);
}

export async function deleteProduct(tenantId: Types.ObjectId, productId: string) {
  const product = await ProductModel.findOneAndUpdate(
    { _id: productId, tenantId },
    { isActive: false },
    { new: true }
  );
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

export async function updateProductStock(
  tenantId: Types.ObjectId,
  productId: string,
  size: string | undefined,
  qty: number
) {
  const product = await ProductModel.findOne({ _id: productId, tenantId, isActive: true });
  if (!product) throw new AppError('Product not found', 404);

  if (size && PAINT_SIZES.includes(size as (typeof PAINT_SIZES)[number])) {
    const current = (product.stockBySize as Record<string, number>)[size] ?? 0;
    const next = current + qty;
    if (next < 0) throw new AppError(`Insufficient stock for size ${size}`, 400);
    (product.stockBySize as Record<string, number>)[size] = next;
    product.stock = sumSizeMap(product.stockBySize as Record<string, number>);
  } else {
    const next = product.stock + qty;
    if (next < 0) throw new AppError('Insufficient stock', 400);
    product.stock = next;
  }

  await product.save();
  return getProduct(tenantId, productId);
}

export async function deductStock(
  tenantId: Types.ObjectId,
  productId: string,
  qty: number,
  size?: string
) {
  const product = await ProductModel.findOne({ _id: productId, tenantId, isActive: true });
  if (!product) throw new AppError(`Product not found: ${productId}`, 404);

  if (size && PAINT_SIZES.includes(size as (typeof PAINT_SIZES)[number])) {
    const current = (product.stockBySize as Record<string, number>)[size] ?? 0;
    if (current < qty) {
      throw new AppError(
        `Insufficient stock for ${product.name} (${size}). Available: ${current}`,
        400
      );
    }
    (product.stockBySize as Record<string, number>)[size] = current - qty;
    product.stock = sumSizeMap(product.stockBySize as Record<string, number>);
  } else {
    if (product.stock < qty) {
      throw new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        400
      );
    }
    product.stock -= qty;
  }

  await product.save();
  const serialized = serializeProduct(product.toObject() as unknown as Record<string, unknown>);
  return serialized;
}

export async function getLowStockProducts(tenantId: Types.ObjectId) {
  const products = await ProductModel.find({
    tenantId,
    isActive: true,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  })
    .populate('brand', 'name')
    .lean();

  return products.map((p) => serializeProduct(p as Record<string, unknown>));
}

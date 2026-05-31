import type { Request, Response, NextFunction } from 'express';
import { getTenantId } from '../../middlewares/tenant.middleware.js';
import { sendCreated, sendSuccess } from '../../utils/response.helper.js';
import * as inventoryService from './inventory.service.js';
import {
  createBrandSchema,
  updateBrandSchema,
  createProductTypeSchema,
  updateProductTypeSchema,
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} from './inventory.validator.js';

// ── Brands ──

export async function listBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const brands = await inventoryService.listBrands(getTenantId(req));
    sendSuccess(res, brands);
  } catch (err) {
    next(err);
  }
}

export async function createBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBrandSchema.parse(req.body);
    const brand = await inventoryService.createBrand(getTenantId(req), input);
    sendCreated(res, brand, 'Brand created');
  } catch (err) {
    next(err);
  }
}

export async function updateBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateBrandSchema.parse(req.body);
    const brand = await inventoryService.updateBrand(getTenantId(req), String(req.params.id), input);
    sendSuccess(res, brand);
  } catch (err) {
    next(err);
  }
}

export async function deleteBrand(req: Request, res: Response, next: NextFunction) {
  try {
    await inventoryService.deleteBrand(getTenantId(req), String(req.params.id));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

// ── Product types ──

export async function listTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const types = await inventoryService.listProductTypes(
      getTenantId(req),
      String(req.params.brandId)
    );
    sendSuccess(res, types);
  } catch (err) {
    next(err);
  }
}

export async function createType(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProductTypeSchema.parse(req.body);
    const type = await inventoryService.createProductType(
      getTenantId(req),
      String(req.params.brandId),
      input
    );
    sendCreated(res, type, 'Product type created');
  } catch (err) {
    next(err);
  }
}

export async function updateType(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProductTypeSchema.parse(req.body);
    const type = await inventoryService.updateProductType(
      getTenantId(req),
      String(req.params.id),
      input
    );
    sendSuccess(res, type);
  } catch (err) {
    next(err);
  }
}

export async function deleteType(req: Request, res: Response, next: NextFunction) {
  try {
    await inventoryService.deleteProductType(getTenantId(req), String(req.params.id));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

// ── Products ──

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const search = req.query.search as string | undefined;
    const brandId = req.query.brandId as string | undefined;
    const type = req.query.type as string | undefined;
    const products = await inventoryService.listProducts(tenantId, { brandId, type, search });
    sendSuccess(res, products);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await inventoryService.getProduct(getTenantId(req), String(req.params.id));
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await inventoryService.createProduct(getTenantId(req), input);
    sendCreated(res, product, 'Product created');
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProductSchema.parse(req.body);
    const product = await inventoryService.updateProduct(
      getTenantId(req),
      String(req.params.id),
      input
    );
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
}

export async function removeProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await inventoryService.deleteProduct(getTenantId(req), String(req.params.id));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function updateStock(req: Request, res: Response, next: NextFunction) {
  try {
    const { size, qty } = updateStockSchema.parse(req.body);
    const product = await inventoryService.updateProductStock(
      getTenantId(req),
      String(req.params.id),
      size,
      qty
    );
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
}

export async function lowStock(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await inventoryService.getLowStockProducts(getTenantId(req));
    sendSuccess(res, products);
  } catch (err) {
    next(err);
  }
}

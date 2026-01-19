import Product from '../models/Product.js';
import Brand from '../models/Brand.js';
import ProductType from '../models/ProductType.js';

// @desc    Get all brands
// @route   GET /api/inventory/brands
// @access  Private
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brands',
      error: error.message,
    });
  }
};

// @desc    Get products by brand
// @route   GET /api/inventory/products/:brandId
// @access  Private
export const getProductsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    const products = await Product.find({ 
      brand: brandId,
      isActive: true 
    })
    .populate('brand', 'name image')
    .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

// @desc    Update product stock
// @route   PATCH /api/inventory/products/:productId/stock
// @access  Private
export const updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock, size, stockBySize } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // If size is provided, update stockBySize
    if (size && stockBySize !== undefined) {
      const validSizes = ['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'];
      if (!validSizes.includes(size)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid size. Must be one of: 50ml, 100ml, 200ml, 500ml, 1L, 4L, 10L, 20L',
        });
      }

      if (stockBySize < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock cannot be negative',
        });
      }

      // Update stockBySize for the specific size
      const updatedStockBySize = { ...product.stockBySize };
      updatedStockBySize[size] = stockBySize;

      // Calculate total stock
      const totalStock = Object.values(updatedStockBySize).reduce((sum, val) => sum + (parseInt(val) || 0), 0);

      // Update product
      product.stockBySize = updatedStockBySize;
      product.stock = totalStock;
      await product.save();

      const populatedProduct = await Product.findById(product._id).populate('brand', 'name image');

      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: populatedProduct,
      });
    } else if (stock !== undefined) {
      // Legacy support: update total stock
      if (stock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock cannot be negative',
        });
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { stock },
        { new: true, runValidators: true }
      ).populate('brand', 'name image');

      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: updatedProduct,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either stock or size and stockBySize must be provided',
      });
    }
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stock',
      error: error.message,
    });
  }
};

// @desc    Get all products
// @route   GET /api/inventory/products
// @access  Private
export const getAllProducts = async (req, res) => {
  try {
    const { search, brand } = req.query;
    
    let query = { isActive: true };
    
    if (brand) {
      query.brand = brand;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .populate('brand', 'name image')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

// @desc    Create a new brand
// @route   POST /api/inventory/brands
// @access  Private
export const createBrand = async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Brand name is required',
      });
    }

    // Check if brand already exists
    const existingBrand = await Brand.findOne({ name: name.trim() });
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists',
      });
    }

    const brand = await Brand.create({
      name: name.trim(),
      image: image || '',
    });

    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand,
    });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating brand',
      error: error.message,
    });
  }
};

// @desc    Create a new product
// @route   POST /api/inventory/products
// @access  Private
export const createProduct = async (req, res) => {
  try {
    const { name, brand, price, stock, unit, type, description, productCode, productImage, lowStockThreshold, stockBySize, priceBySize } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Product name is required',
      });
    }

    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand is required',
      });
    }

    if (!type || type.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Product type is required',
      });
    }

    // Price is optional - no validation needed

    if (stock === undefined || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid stock quantity is required',
      });
    }

    // Check if brand exists
    const brandExists = await Brand.findById(brand);
    if (!brandExists) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    // Validate product code
    if (!productCode || productCode.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Product code is required',
      });
    }

    // Check if product with same product code already exists for this brand
    const existingProduct = await Product.findOne({
      productCode: productCode.trim(),
      brand: brand,
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this product code already exists for this brand',
      });
    }

    // Calculate total stock from stockBySize if provided
    let totalStock = stock || 0;
    if (stockBySize) {
      const sizes = ['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'];
      totalStock = sizes.reduce((sum, size) => sum + (parseInt(stockBySize[size]) || 0), 0);
    }

    // Price is optional - set to 0 if not provided
    const defaultPrice = price || 0;

    const product = await Product.create({
      name: name.trim(),
      brand,
      price: defaultPrice,
      stock: totalStock,
      unit: unit || 'L',
      productCode: productCode || '',
      productImage: productImage || '',
      lowStockThreshold: lowStockThreshold || 5,
      stockBySize: stockBySize || {
        '50ml': 0,
        '100ml': 0,
        '200ml': 0,
        '500ml': 0,
        '1L': 0,
        '4L': 0,
        '10L': 0,
        '20L': 0,
      },
      priceBySize: priceBySize || {
        '50ml': 0,
        '100ml': 0,
        '200ml': 0,
        '500ml': 0,
        '1L': 0,
        '4L': 0,
        '10L': 0,
        '20L': 0,
      },
      type: type.trim(),
      description: description || '',
    });

    const populatedProduct = await Product.findById(product._id).populate('brand', 'name image');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

// @desc    Get all product types (global for all brands)
// @route   GET /api/inventory/types
// @access  Private
export const getAllProductTypes = async (req, res) => {
  try {
    // Get all global product types
    const types = await ProductType.find({
      isActive: true,
    }).sort({ name: 1 });

    // Also get distinct types from products (for backward compatibility)
    const productTypes = await Product.distinct('type', {
      isActive: true,
    });

    // Merge: use ProductType if exists, otherwise create entry from product types
    const typeMap = new Map();
    types.forEach(type => {
      typeMap.set(type.name, { name: type.name, icon: type.icon || '' });
    });
    
    productTypes.forEach(typeName => {
      if (!typeMap.has(typeName)) {
        typeMap.set(typeName, { name: typeName, icon: '' });
      }
    });

    const result = Array.from(typeMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get product types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product types',
      error: error.message,
    });
  }
};

// @desc    Get product types by brand (for backward compatibility, but returns all types)
// @route   GET /api/inventory/types/:brandId
// @access  Private
export const getProductTypesByBrand = async (req, res) => {
  // Return all global types regardless of brand
  return getAllProductTypes(req, res);
};

// @desc    Create or update product type (global for all brands)
// @route   POST /api/inventory/types
// @access  Private
export const createOrUpdateProductType = async (req, res) => {
  try {
    const { name, icon } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Product type name is required',
      });
    }

    // Create or update global product type (no brand required)
    const productType = await ProductType.findOneAndUpdate(
      { name: name.trim() },
      { 
        name: name.trim(), 
        icon: icon || '',
        isActive: true 
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product type saved successfully',
      data: productType,
    });
  } catch (error) {
    console.error('Create/update product type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving product type',
      error: error.message,
    });
  }
};

// @desc    Get products by brand and type
// @route   GET /api/inventory/products/:brandId/:type
// @access  Private
export const getProductsByBrandAndType = async (req, res) => {
  try {
    const { brandId, type } = req.params;

    const products = await Product.find({
      brand: brandId,
      type: decodeURIComponent(type),
      isActive: true,
    })
      .populate('brand', 'name image')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get products by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

// @desc    Bulk upload products from CSV
// @route   POST /api/inventory/products/bulk
// @access  Private
export const bulkUploadProducts = async (req, res) => {
  try {
    const { products, brandId, productType } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required',
      });
    }

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required',
      });
    }

    if (!productType) {
      return res.status(400).json({
        success: false,
        message: 'Product type is required',
      });
    }

    // Check if brand exists
    const brandExists = await Brand.findById(brandId);
    if (!brandExists) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    // Process each product
    for (const productData of products) {
      try {
        const {
          name,
          productCode,
          colour,
          stockBySize,
          lowStockThreshold = 5,
          productImage = '',
          description = '',
        } = productData;

        // Validation
        if (!name || name.trim() === '') {
          results.failed.push({
            productCode: productCode || 'N/A',
            name: name || 'N/A',
            error: 'Product name is required',
          });
          continue;
        }

        if (!productCode || productCode.trim() === '') {
          results.failed.push({
            productCode: 'N/A',
            name: name || 'N/A',
            error: 'Product code is required',
          });
          continue;
        }

        // Check if product with same product code already exists
        // Since we're now sending unique product codes from frontend (code + colour),
        // we just need to check if this exact code exists
        const existingProduct = await Product.findOne({
          productCode: productCode.trim(),
          brand: brandId,
        });

        if (existingProduct) {
          results.failed.push({
            productCode: productCode.trim(),
            name: name.trim(),
            error: 'Product with this code already exists',
          });
          continue;
        }

        // Calculate total stock from stockBySize
        let totalStock = 0;
        const finalStockBySize = {
          '50ml': 0,
          '100ml': 0,
          '200ml': 0,
          '500ml': 0,
          '1L': 0,
          '4L': 0,
          '10L': 0,
          '20L': 0,
        };

        if (stockBySize) {
          Object.keys(stockBySize).forEach((size) => {
            const quantity = stockBySize[size] || 0;
            finalStockBySize[size] = quantity;
            totalStock += quantity;
          });
        }

        // Create product name with colour if provided
        const fullProductName = colour && colour.trim() !== ''
          ? `${name.trim()} - ${colour.trim()}`
          : name.trim();

        const product = await Product.create({
          name: fullProductName,
          brand: brandId,
          price: 0,
          stock: totalStock,
          unit: 'L',
          productCode: productCode.trim(),
          productImage: productImage,
          lowStockThreshold: lowStockThreshold,
          stockBySize: finalStockBySize,
          priceBySize: {
            '50ml': 0,
            '100ml': 0,
            '200ml': 0,
            '500ml': 0,
            '1L': 0,
            '4L': 0,
            '10L': 0,
            '20L': 0,
          },
          type: productType.trim(),
          description: description || (colour ? `Colour: ${colour}` : ''),
        });

        const populatedProduct = await Product.findById(product._id).populate('brand', 'name image');

        results.success.push({
          productCode: productCode.trim(),
          name: fullProductName,
          id: populatedProduct._id,
        });
      } catch (error) {
        results.failed.push({
          productCode: productData.productCode || 'N/A',
          name: productData.name || 'N/A',
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk upload completed. ${results.success.length} succeeded, ${results.failed.length} failed.`,
      data: results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during bulk upload',
      error: error.message,
    });
  }
};

// @desc    Update a product
// @route   PUT /api/inventory/products/:productId
// @access  Private
export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, productCode, productImage, lowStockThreshold, stockBySize, priceBySize, description, type } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Validate product code if provided and different
    if (productCode && productCode.trim() !== product.productCode) {
      const existingProduct = await Product.findOne({
        productCode: productCode.trim(),
        brand: product.brand,
        _id: { $ne: productId },
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this product code already exists for this brand',
        });
      }
    }

    // Update fields
    if (name !== undefined) product.name = name.trim();
    if (productCode !== undefined) product.productCode = productCode.trim();
    
    // If product image is updated, update all products with the same base product code
    if (productImage !== undefined && productImage !== product.productImage) {
      product.productImage = productImage;
      
      // Get the product code to use (either new one or existing one)
      const codeToUse = productCode ? productCode.trim() : product.productCode;
      
      // Extract base product code (before first hyphen, if any)
      // Products with colors have codes like "0026-BRILLIANT-WHITE"
      // We want to match all variants like "0026-*"
      const baseProductCode = codeToUse.split('-')[0];
      
      // Escape special regex characters in the base product code
      const escapedBaseCode = baseProductCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Update all products that start with the same base product code and same brand
      // Using regex to match product codes that start with the base code
      await Product.updateMany(
        { 
          productCode: { $regex: `^${escapedBaseCode}(-|$)` }, // Matches "0026" or "0026-*"
          brand: product.brand,
          _id: { $ne: productId }
        },
        { productImage: productImage }
      );
    } else if (productImage !== undefined) {
      product.productImage = productImage;
    }
    
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
    if (description !== undefined) product.description = description;
    if (type !== undefined) product.type = type.trim();
    if (stockBySize !== undefined) {
      product.stockBySize = stockBySize;
      // Recalculate total stock
      product.stock = Object.values(stockBySize).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    }
    if (priceBySize !== undefined) {
      product.priceBySize = priceBySize;
    }

    await product.save();

    const populatedProduct = await Product.findById(product._id).populate('brand', 'name image');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: populatedProduct,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });
  }
};

// @desc    Delete a product (soft delete)
// @route   DELETE /api/inventory/products/:productId
// @access  Private
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
};


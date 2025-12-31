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
    const { stock } = req.body;

    if (stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock cannot be negative',
      });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { stock },
      { new: true, runValidators: true }
    ).populate('brand', 'name image');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: product,
    });
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
    const { name, brand, price, stock, unit, type, description } = req.body;

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

    if (price === undefined || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required',
      });
    }

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

    // Check if product with same name already exists for this brand
    const existingProduct = await Product.findOne({
      name: name.trim(),
      brand: brand,
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists for this brand',
      });
    }

    const product = await Product.create({
      name: name.trim(),
      brand,
      price,
      stock: stock || 0,
      unit: unit || 'L',
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

// @desc    Get product types by brand
// @route   GET /api/inventory/types/:brandId
// @access  Private
export const getProductTypesByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Get types from ProductType model
    const types = await ProductType.find({
      brand: brandId,
      isActive: true,
    }).sort({ name: 1 });

    // Also get distinct types from products (for backward compatibility)
    const productTypes = await Product.distinct('type', {
      brand: brandId,
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

// @desc    Create or update product type
// @route   POST /api/inventory/types
// @access  Private
export const createOrUpdateProductType = async (req, res) => {
  try {
    const { name, brand, icon } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Product type name is required',
      });
    }

    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand is required',
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

    // Create or update product type
    const productType = await ProductType.findOneAndUpdate(
      { name: name.trim(), brand: brand },
      { 
        name: name.trim(), 
        brand: brand,
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


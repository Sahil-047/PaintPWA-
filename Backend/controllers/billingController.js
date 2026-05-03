import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

const VALID_SIZES = ['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'];

// @desc    Create invoice
// @route   POST /api/billing/invoices
// @access  Private
export const createInvoice = async (req, res) => {
  try {
    const { items, taxRate = 18 } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must have at least one item',
      });
    }

    // Calculate totals and validate products
    let subtotal = 0;
    const invoiceItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found`,
        });
      }

      const quantity = item.quantity;
      if (item.size && !VALID_SIZES.includes(item.size)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid container size in invoice item.',
        });
      }
      const size = item.size || null;

      if (size) {
        const updatedStockBySize = {};
        for (const s of VALID_SIZES) {
          updatedStockBySize[s] = parseInt(product.stockBySize?.[s], 10) || 0;
        }
        const currentSizeStock = updatedStockBySize[size];
        if (currentSizeStock < quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name} (${size}). Available: ${currentSizeStock}`,
          });
        }

        updatedStockBySize[size] = Math.max(0, currentSizeStock - quantity);
        product.stockBySize = updatedStockBySize;
        product.markModified('stockBySize');
        product.stock = Object.values(updatedStockBySize).reduce(
          (sum, val) => sum + (parseInt(val, 10) || 0),
          0
        );
      } else {
        if (product.stock < quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          });
        }
        product.stock -= quantity;
      }

      const unitPrice =
        item.price != null && Number(item.price) > 0 ? Number(item.price) : Number(product.price) || 0;
      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;

      invoiceItems.push({
        product: product._id,
        productName: product.name,
        quantity,
        price: unitPrice,
        total: itemTotal,
      });

      await product.save();
    }

    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNo = `INV-${Date.now()}-${invoiceCount + 1}`;

    const invoice = await Invoice.create({
      invoiceNo,
      user: userId,
      items: invoiceItems,
      subtotal,
      tax,
      taxRate,
      total,
      status: 'completed',
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('user', 'name email')
      .populate('items.product', 'name brand price');

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: populatedInvoice,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating invoice',
      error: error.message,
    });
  }
};

// @desc    Get all invoices
// @route   GET /api/billing/invoices
// @access  Private
export const getInvoices = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const invoices = await Invoice.find({ user: userId })
      .populate('user', 'name email')
      .populate('items.product', 'name brand price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message,
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/billing/invoices/:invoiceId
// @access  Private
export const getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.id;

    const invoice = await Invoice.findOne({ 
      _id: invoiceId,
      user: userId 
    })
      .populate('user', 'name email')
      .populate('items.product', 'name brand price');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message,
    });
  }
};


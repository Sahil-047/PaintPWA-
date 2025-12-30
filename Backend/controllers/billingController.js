import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

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

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      invoiceItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal,
      });

      // Update product stock
      product.stock -= item.quantity;
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


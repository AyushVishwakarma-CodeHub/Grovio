import Product from '../models/product.js';
import InventoryLog from '../models/inventoryLog.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * Get all inventory adjustment logs (Admin / Manager)
 */
export const getInventoryLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, product } = req.query;
    const filter = {};

    if (product) {
      filter.product = product;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const logs = await InventoryLog.find(filter)
      .populate('product', 'name slug image unit price')
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalLogs = await InventoryLog.countDocuments(filter);

    return sendSuccess(res, 200, 'Inventory logs fetched successfully', {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalLogs,
        totalPages: Math.ceil(totalLogs / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually adjust product stock levels (Admin / Manager)
 */
export const adjustStock = async (req, res, next) => {
  try {
    const { productId, adjustmentQuantity, notes } = req.body;

    if (!productId || adjustmentQuantity === undefined) {
      throw new CustomError('Product ID and adjustment quantity are required', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new CustomError('Product not found', 404);
    }

    const previousStock = product.stock;
    const quantityChange = Number(adjustmentQuantity);
    const newStock = previousStock + quantityChange;

    if (newStock < 0) {
      throw new CustomError(`Adjustment failed. Stock cannot fall below 0. Current stock is ${previousStock}`, 400);
    }

    // Update product stock
    product.stock = newStock;
    await product.save();

    // Create log entry
    const log = await InventoryLog.create({
      product: productId,
      user: req.user._id,
      changeType: 'adjustment',
      quantity: quantityChange,
      previousStock,
      newStock,
      notes: notes || 'Manual stock adjustment'
    });

    return sendSuccess(res, 200, 'Stock adjusted successfully', {
      product,
      log
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products that are running low on stock (Admin / Manager)
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    // Find products where available stock (stock - reservedStock) is less than or equal to threshold
    // Using aggregation to dynamically evaluate expression or a query
    const products = await Product.find({
      isActive: true,
      $expr: {
        $lte: [
          { $subtract: ['$stock', '$reservedStock'] },
          '$lowStockThreshold'
        ]
      }
    }).populate('category', 'name slug');

    return sendSuccess(res, 200, 'Low stock alerts fetched successfully', { products });
  } catch (error) {
    next(error);
  }
};

/**
 * Get overall inventory stats for dashboard charts
 */
export const getInventoryStats = async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    // Low stock count
    const lowStockCount = await Product.countDocuments({
      isActive: true,
      $expr: {
        $lte: [
          { $subtract: ['$stock', '$reservedStock'] },
          '$lowStockThreshold'
        ]
      }
    });

    // Aggregate total catalog value
    const valStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
          totalQuantity: { $sum: '$stock' },
          totalReserved: { $sum: '$reservedStock' }
        }
      }
    ]);

    const stats = valStats[0] || { totalValue: 0, totalQuantity: 0, totalReserved: 0 };

    return sendSuccess(res, 200, 'Inventory statistics fetched successfully', {
      totalProducts,
      lowStockCount,
      totalStock: stats.totalQuantity,
      totalReserved: stats.totalReserved,
      totalValue: stats.totalValue
    });
  } catch (error) {
    next(error);
  }
};

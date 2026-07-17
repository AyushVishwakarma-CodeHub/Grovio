import Order from '../models/order.js';
import User from '../models/user.js';
import Product from '../models/product.js';
import { sendSuccess } from '../utils/response.js';

export const getSystemAnalytics = async (req, res, next) => {
  try {
    // 1. Calculate General Financial Ratios (from paid/delivered orders)
    const financialStats = await Order.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: 'paid' },
            { orderStatus: 'delivered' }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totals.grandTotal' },
          totalSubtotal: { $sum: '$totals.subtotal' },
          totalTax: { $sum: '$totals.tax' },
          totalDeliveryCharges: { $sum: '$totals.deliveryCharges' },
          totalDiscount: { $sum: '$totals.discount' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const financials = financialStats[0] || {
      totalRevenue: 0,
      totalSubtotal: 0,
      totalTax: 0,
      totalDeliveryCharges: 0,
      totalDiscount: 0,
      totalOrders: 0
    };

    const avgOrderValue = financials.totalOrders > 0 
      ? Math.round(financials.totalRevenue / financials.totalOrders) 
      : 0;

    // 2. Monthly Revenue & Orders Count Trend (last 6 months)
    const monthlySales = await Order.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: 'paid' },
            { orderStatus: 'delivered' }
          ]
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totals.grandTotal' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySalesData = monthlySales.map(item => ({
      month: `${months[item._id.month - 1]} ${item._id.year}`,
      revenue: Math.round(item.revenue),
      orders: item.ordersCount
    }));

    // 3. Top Products Sold (grouped by item list aggregation)
    const topProducts = await Order.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: 'paid' },
            { orderStatus: 'delivered' }
          ]
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          unitsSold: { $sum: '$items.quantity' },
          totalSalesValue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 }
    ]);

    // 4. Top Customers (highest spenders)
    const topSpenders = await Order.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: 'paid' },
            { orderStatus: 'delivered' }
          ]
        }
      },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$totals.grandTotal' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 }
    ]);

    const topCustomers = await User.populate(topSpenders, {
      path: '_id',
      select: 'name email phone'
    });

    // 5. Store Category Analytics (catalog snapshot)
    const totalCatalogItems = await Product.countDocuments();
    const categoriesSnapshot = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    // 6. Delivery Partner Performance & Analytics
    const deliveryStats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const deliveryBreakdown = {
      placed: 0,
      packing: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0
    };
    deliveryStats.forEach(item => {
      if (deliveryBreakdown[item._id] !== undefined) {
        deliveryBreakdown[item._id] = item.count;
      }
    });

    return sendSuccess(res, 200, 'Analytics fetched successfully', {
      financials: {
        ...financials,
        avgOrderValue
      },
      monthlySales: monthlySalesData,
      topProducts,
      topCustomers: topCustomers.map(tc => ({
        user: tc._id,
        totalSpent: tc.totalSpent,
        ordersCount: tc.ordersCount
      })),
      store: {
        totalCatalogItems,
        categories: categoriesSnapshot.map(cs => ({
          category: cs._id,
          skuCount: cs.count,
          avgPrice: Math.round(cs.avgPrice)
        }))
      },
      delivery: deliveryBreakdown
    });
  } catch (error) {
    next(error);
  }
};

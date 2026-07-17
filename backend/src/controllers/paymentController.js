import Order from '../models/order.js';
import Product from '../models/product.js';
import InventoryLog from '../models/inventoryLog.js';
import { createRazorpayOrder, verifyRazorpaySignature, refundRazorpayPayment } from '../utils/razorpay.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * Step 1: Create Razorpay transaction order linked to e-commerce order
 */
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      throw new CustomError('Order ID is required', 400);
    }

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    if (order.paymentStatus === 'paid') {
      throw new CustomError('Order is already paid', 400);
    }

    // Call Razorpay API helper
    const razorpayOrder = await createRazorpayOrder(
      order.totals.grandTotal,
      order._id.toString()
    );

    // Save Razorpay order ID in our database
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return sendSuccess(res, 200, 'Razorpay order created successfully', {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey12345',
      razorpayOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 2: Verify Razorpay payment signature
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new CustomError('All Razorpay details and Order ID are required', 400);
    }

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    // Run cryptographic signature check
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      order.paymentStatus = 'failed';
      await order.save();
      throw new CustomError('Payment verification failed. Invalid signature.', 400);
    }

    // Capture payment details
    order.paymentStatus = 'paid';
    order.razorpayOrderId = razorpay_order_id;
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    
    // Update timeline
    order.timeline.push({ status: 'paid', timestamp: new Date() });
    await order.save();

    // Broadcast payment confirmation to customer sockets room
    req.io.to(`order_${order._id}`).emit('orderStatusChanged', { 
      orderId: order._id, 
      status: order.orderStatus, 
      timeline: order.timeline 
    });

    return sendSuccess(res, 200, 'Payment verified and captured successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 3: Refund an order & restore catalog stock (Admin / Manager)
 */
export const refundOrder = async (req, res, next) => {
  try {
    const { id } = req.params; // Order ID

    const order = await Order.findById(id);
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    if (order.paymentStatus !== 'paid') {
      throw new CustomError('Cannot refund an unpaid order', 400);
    }

    if (order.orderStatus === 'cancelled') {
      throw new CustomError('Order is already cancelled', 400);
    }

    // Call Razorpay API to process refund
    const refundDetails = await refundRazorpayPayment(
      order.razorpayPaymentId,
      order.totals.grandTotal
    );

    // Cancel order and set refunded status
    order.orderStatus = 'cancelled';
    order.paymentStatus = 'refunded';
    order.timeline.push({ status: 'cancelled_and_refunded', timestamp: new Date() });
    await order.save();

    // RESTOCK INVENTORY: Put items back into product stock and write logs
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const previousStock = product.stock;
        product.stock += item.quantity; // Restore stock
        await product.save();

        await InventoryLog.create({
          product: product._id,
          user: req.user._id,
          changeType: 'release',
          quantity: item.quantity,
          previousStock,
          newStock: product.stock,
          notes: `Restocked due to Order Cancellation & Refund (${order._id})`
        });
      }
    }

    // Broadcast status to listeners
    req.io.to(`order_${order._id}`).emit('orderStatusChanged', { 
      orderId: order._id, 
      status: 'cancelled',
      timeline: order.timeline 
    });

    return sendSuccess(res, 200, 'Order payment refunded and items restocked successfully', {
      order,
      refundDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 4: Fetch payment history logs (Admin / Manager)
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    // Fetch orders which have active payments (paid/refunded/failed)
    const payments = await Order.find({
      paymentMethod: 'card',
      paymentStatus: { $in: ['paid', 'refunded', 'failed'] }
    })
      .select('userId totals paymentStatus paymentMethod razorpayOrderId razorpayPaymentId createdAt')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Payment logs history fetched', { payments });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 5: Generate Invoice text/html for customer (Invoice Generation)
 */
export const getOrderInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('userId', 'name email phone');

    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    // Restrict access (owner or admin/manager only)
    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'store_manager') {
      throw new CustomError('Not authorized to view this invoice', 403);
    }

    // Format invoice details in response
    const invoice = {
      invoiceNumber: `INV-2026-${order._id.toString().substring(18).toUpperCase()}`,
      orderId: order._id,
      date: order.createdAt,
      customer: {
        name: order.userId.name,
        email: order.userId.email,
        phone: order.userId.phone
      },
      shippingAddress: order.deliveryAddress,
      items: order.items,
      billing: order.totals,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    };

    return sendSuccess(res, 200, 'Invoice details generated successfully', { invoice });
  } catch (error) {
    next(error);
  }
};

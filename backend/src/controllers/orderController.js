import Order from '../models/order.js';
import Cart from '../models/cart.js';
import Product from '../models/product.js';
import Address from '../models/address.js';
import InventoryLog from '../models/inventoryLog.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';
import { refundRazorpayPayment } from '../utils/razorpay.js';

/**
 * Helper to generate random 4-digit security OTP
 */
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Broadcast order status and driver details dynamically to tracking rooms
 */
const emitOrderStatusUpdate = async (req, order, status) => {
  try {
    const populated = await Order.findById(order._id).populate('deliveryPartner', 'name phone email');
    req.io.to(`order_${order._id}`).emit('orderStatusChanged', {
      orderId: order._id,
      status: status || order.orderStatus,
      timeline: order.timeline,
      deliveryPartner: populated?.deliveryPartner || null
    });
  } catch (error) {
    console.error('Socket broadcast failed:', error);
  }
};

/**
 * Place a new order
 */
export const createOrder = async (req, res, next) => {
  try {
    const { addressId, paymentMethod, coupon, discount = 0 } = req.body;

    if (!addressId || !paymentMethod) {
      throw new CustomError('Address and payment method are required', 400);
    }

    // 1. Fetch user's cart
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      throw new CustomError('Your cart is empty', 400);
    }

    // 2. Fetch shipping address details
    const address = await Address.findOne({ _id: addressId, userId: req.user._id });
    if (!address) {
      throw new CustomError('Shipping address not found', 404);
    }

    // 3. Verify stock levels for all products
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new CustomError(`Insufficient stock for "${item.product.name}". Only ${item.product.stock} left.`, 400);
      }
    }

    // 4. Process stock deduction & log transactions
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.product;
      const quantity = item.quantity;
      const activePrice = product.discountPrice || product.price;

      // Update product stock in database
      const previousStock = product.stock;
      product.stock -= quantity;
      await product.save();

      // Log stock deduction in inventory log
      await InventoryLog.create({
        product: product._id,
        user: req.user._id,
        changeType: 'sale',
        quantity: -quantity,
        previousStock,
        newStock: product.stock,
        notes: `Sold via Order checkout`
      });

      // Prepare order item snapshot
      orderItems.push({
        product: product._id,
        name: product.name,
        price: activePrice,
        quantity
      });

      subtotal += activePrice * quantity;
    }

    // 5. Calculations
    const tax = Math.round(subtotal * 0.05); // 5% GST
    const deliveryFee = subtotal > 200 ? 0 : 30;
    const grandTotal = Math.max(0, subtotal + tax + deliveryFee - Number(discount));

    // 6. Generate OTP and save Order
    const otp = generateOTP();
    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      deliveryAddress: {
        title: address.title,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        coordinates: address.coordinates.coordinates
      },
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid', // cod is pending, mock card checkout is paid
      paymentMethod,
      orderStatus: 'placed',
      totals: {
        subtotal,
        deliveryFee,
        discount: Number(discount),
        tax,
        grandTotal
      },
      timeline: [{ status: 'placed', timestamp: new Date() }],
      otp
    });

    // 7. Clear customer cart
    cart.items = [];
    await cart.save();

    // 8. Emit Socket alert for active drivers that a new delivery order is placed
    req.io.emit('newOrderAlert', { orderId: order._id, address: order.deliveryAddress.city });

    return sendSuccess(res, 201, 'Order placed successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer's order history
 */
export const getMyOrders = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'delivery_partner') {
      query = { deliveryPartner: req.user._id };
    } else {
      query = { userId: req.user._id };
    }
    const orders = await Order.find(query)
      .populate('deliveryPartner', 'name phone email')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Orders history fetched successfully', { orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders in the entire system (Admin / Manager only)
 */
export const getAllSystemOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('deliveryPartner', 'name phone email')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'All system orders fetched successfully', { orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order details by ID
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('deliveryPartner', 'name phone email');
    
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    // Restrict profile check (only customer who placed it, admin/manager, or assigned rider can view)
    const isOwner = order.userId.toString() === req.user._id.toString();
    const isRider = order.deliveryPartner?._id?.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'admin' || req.user.role === 'store_manager' || req.user.role === 'delivery_partner';

    if (!isOwner && !isRider && !isStaff) {
      throw new CustomError('Not authorized to view this order details', 403);
    }

    return sendSuccess(res, 200, 'Order details fetched successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign rider to order (Delivery Rider accepts delivery)
 */
export const assignDeliveryPartner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    if (order.deliveryPartner) {
      throw new CustomError('Order already accepted by another rider', 400);
    }

    if (order.orderStatus === 'cancelled' || order.orderStatus === 'delivered') {
      throw new CustomError('Cannot accept a cancelled or already delivered order', 400);
    }

    // Assign driver, keep status as packing/placed until picked up
    order.deliveryPartner = req.user._id;
    order.timeline.push({ status: 'assigned', timestamp: new Date() });
    await order.save();

    // Broadcast update to tracking rooms
    await emitOrderStatusUpdate(req, order, order.orderStatus);

    return sendSuccess(res, 200, 'Order accepted for delivery', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin / Manager / Assigned Rider)
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['placed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
      throw new CustomError('Invalid status update parameter', 400);
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    // Verification check for delivery partner edits
    if (req.user.role === 'delivery_partner') {
      if (order.deliveryPartner?.toString() !== req.user._id.toString()) {
        throw new CustomError('You are not assigned as the rider for this order', 403);
      }
      // Riders cannot cancel or back-date order status manually
      if (status === 'cancelled' || status === 'placed') {
        throw new CustomError('Riders are not authorized to cancel orders', 403);
      }
    }

    order.orderStatus = status;
    order.timeline.push({ status, timestamp: new Date() });
    
    if (status === 'delivered') {
      order.paymentStatus = 'paid'; // force payment capture on delivery
    }

    await order.save();

    // Emit updates to clients
    await emitOrderStatusUpdate(req, order, status);

    return sendSuccess(res, 200, 'Order status updated successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify delivery completion OTP (Delivery Rider completes drop-off)
 */
export const verifyDeliveryOtp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    if (order.deliveryPartner?.toString() !== req.user._id.toString()) {
      throw new CustomError('You are not the assigned rider for this delivery', 403);
    }

    if (order.otp !== otp) {
      throw new CustomError('Incorrect security OTP. Verification failed.', 400);
    }

    order.orderStatus = 'delivered';
    order.paymentStatus = 'paid';
    order.timeline.push({ status: 'delivered', timestamp: new Date() });
    await order.save();

    // Notify user via Socket
    await emitOrderStatusUpdate(req, order, 'delivered');

    return sendSuccess(res, 200, 'OTP verified. Order marked as delivered successfully.', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available orders needing delivery riders (Rider Feed)
 */
export const getAvailableOrdersForRiders = async (req, res, next) => {
  try {
    // Orders placed that do not have a driver assigned
    const orders = await Order.find({ 
      orderStatus: 'placed', 
      deliveryPartner: null 
    }).sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Available rider orders fetched', { orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an active order (Customer level)
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, userId: req.user._id });
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    // Only allow cancellation if order is placed or packing
    if (!['placed', 'packing'].includes(order.orderStatus)) {
      throw new CustomError(`Cannot cancel an order that is already ${order.orderStatus}`, 400);
    }

    // Handle online payment refunds
    if (order.paymentStatus === 'paid' && order.razorpayPaymentId) {
      // Trigger Razorpay refund
      await refundRazorpayPayment(order.razorpayPaymentId, order.totals.grandTotal);
      order.paymentStatus = 'refunded';
    }

    order.orderStatus = 'cancelled';
    order.timeline.push({ status: 'cancelled', timestamp: new Date() });
    await order.save();

    // Restock catalog products and log adjustments
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const previousStock = product.stock;
        product.stock += item.quantity;
        await product.save();

        await InventoryLog.create({
          product: product._id,
          user: req.user._id,
          changeType: 'release',
          quantity: item.quantity,
          previousStock,
          newStock: product.stock,
          notes: `Restocked on Customer Cancellation (${order._id})`
        });
      }
    }

    // Emit updates to sockets
    await emitOrderStatusUpdate(req, order, 'cancelled');

    return sendSuccess(res, 200, 'Order cancelled and items restocked', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm order pickup from store (Delivery Rider starts transit)
 */
export const pickupOrderDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, deliveryPartner: req.user._id });
    if (!order) {
      throw new CustomError('Order not found or not assigned to you', 404);
    }

    if (order.orderStatus !== 'placed' && order.orderStatus !== 'packing') {
      throw new CustomError('Order must be in placed/packing stage to pick up', 400);
    }

    order.orderStatus = 'out_for_delivery';
    order.timeline.push({ status: 'out_for_delivery', timestamp: new Date() });
    await order.save();

    // Broadcast update
    await emitOrderStatusUpdate(req, order, 'out_for_delivery');

    return sendSuccess(res, 200, 'Order picked up. Out for delivery!', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Release/Reject order delivery assignment (Driver releases shipment)
 */
export const releaseOrderDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, deliveryPartner: req.user._id });
    if (!order) {
      throw new CustomError('Order not found or not assigned to you', 404);
    }

    if (order.orderStatus === 'delivered' || order.orderStatus === 'cancelled') {
      throw new CustomError('Cannot release completed or cancelled orders', 400);
    }

    // Clear assignment, reset status back to placed
    order.deliveryPartner = null;
    order.timeline.push({ status: 'placed', timestamp: new Date() });
    await order.save();

    // Broadcast update
    await emitOrderStatusUpdate(req, order, 'placed');

    return sendSuccess(res, 200, 'Order delivery assignment released successfully');
  } catch (error) {
    next(error);
  }
};

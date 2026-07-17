import SupportTicket from '../models/supportTicket.js';
import Order from '../models/order.js';
import Product from '../models/product.js';
import InventoryLog from '../models/inventoryLog.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';
import { refundRazorpayPayment } from '../utils/razorpay.js';

/**
 * Open a new support ticket (Customer)
 */
export const createTicket = async (req, res, next) => {
  try {
    const { subject, category, orderId, message, refundAmount, refundReason } = req.body;

    if (!subject || !category || !message) {
      throw new CustomError('Subject, category, and initial message are required', 400);
    }

    let refundRequest = { amount: 0, reason: '', refundStatus: 'none' };
    if (category === 'refund') {
      if (!orderId) {
        throw new CustomError('Order ID is required to file a refund claim', 400);
      }
      refundRequest = {
        amount: Number(refundAmount || 0),
        reason: refundReason || 'Item quality issue',
        refundStatus: 'pending'
      };
    }

    const ticket = await SupportTicket.create({
      userId: req.user._id,
      orderId: orderId || null,
      subject,
      category,
      refundRequest,
      messages: [{
        sender: req.user._id,
        senderName: req.user.name,
        text: message
      }]
    });

    // Notify admins via global socket
    req.io.emit('newTicketAlert', {
      ticketId: ticket._id,
      subject: ticket.subject,
      category: ticket.category
    });

    return sendSuccess(res, 201, 'Support ticket created successfully', { ticket });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tickets (Customers see their own, Admin/Manager see all)
 */
export const getTickets = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin' && req.user.role !== 'store_manager') {
      query = { userId: req.user._id };
    }

    const tickets = await SupportTicket.find(query)
      .populate('userId', 'name email')
      .populate('orderId', '_id totals grandTotal')
      .sort({ updatedAt: -1 });

    return sendSuccess(res, 200, 'Tickets retrieved successfully', { tickets });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket details by ID
 */
export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findById(id)
      .populate('userId', 'name email')
      .populate('orderId');

    if (!ticket) {
      throw new CustomError('Ticket not found', 404);
    }

    // Verify ownership
    if (req.user.role !== 'admin' && req.user.role !== 'store_manager' && ticket.userId._id.toString() !== req.user._id.toString()) {
      throw new CustomError('Not authorized to access this ticket', 403);
    }

    return sendSuccess(res, 200, 'Ticket details retrieved', { ticket });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a reply in support ticket (Chat UI thread)
 */
export const replyToTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, refundStatus, ticketStatus } = req.body;

    if (!text && !refundStatus && !ticketStatus) {
      throw new CustomError('Message reply text or configuration adjustments required', 400);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      throw new CustomError('Ticket not found', 404);
    }

    // Check authorization
    const isStaff = ['admin', 'store_manager'].includes(req.user.role);
    if (!isStaff && ticket.userId.toString() !== req.user._id.toString()) {
      throw new CustomError('Not authorized to reply to this ticket', 403);
    }

    // 1. Append message if provided
    if (text) {
      ticket.messages.push({
        sender: req.user._id,
        senderName: req.user.name,
        text
      });
      // Set status to in_progress if customer replies and ticket was open
      if (!isStaff && ticket.status === 'open') {
        ticket.status = 'in_progress';
      }
    }

    // 2. Adjust ticket status (staff only)
    if (ticketStatus && isStaff) {
      if (['open', 'in_progress', 'resolved'].includes(ticketStatus)) {
        ticket.status = ticketStatus;
      }
    }

    // 3. Resolve refund request decisions (staff only)
    if (refundStatus && isStaff && ticket.category === 'refund') {
      if (['approved', 'rejected'].includes(refundStatus)) {
        ticket.refundRequest.refundStatus = refundStatus;

        // If approved, trigger database payment refund & restock items
        if (refundStatus === 'approved' && ticket.orderId) {
          const order = await Order.findById(ticket.orderId);
          if (order && order.paymentStatus === 'paid') {
            order.paymentStatus = 'failed'; // refund status
            order.orderStatus = 'cancelled';
            order.timeline.push({ status: 'cancelled', timestamp: new Date() });
            await order.save();

            // Perform automatic restocking for items
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
                  notes: `Restocked on Support Refund Approval (${order._id})`
                });
              }
            }

            // Socket broadcast customer status change
            req.io.to(`order_${order._id}`).emit('orderStatusChanged', {
              orderId: order._id,
              status: 'cancelled',
              timeline: order.timeline
            });
          }
        }
      }
    }

    await ticket.save();

    // Broadcast message over socket room
    req.io.to(`ticket_${ticket._id}`).emit('newTicketMessage', {
      ticketId: ticket._id,
      message: ticket.messages[ticket.messages.length - 1],
      status: ticket.status,
      refundRequest: ticket.refundRequest
    });

    return sendSuccess(res, 200, 'Reply posted successfully', { ticket });
  } catch (error) {
    next(error);
  }
};

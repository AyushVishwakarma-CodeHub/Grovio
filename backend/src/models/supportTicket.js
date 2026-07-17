import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['refund', 'complaint', 'query'],
      required: true,
      default: 'query'
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      required: true,
      default: 'open',
      index: true
    },
    messages: [ticketMessageSchema],
    refundRequest: {
      amount: { type: Number, default: 0 },
      reason: { type: String, default: '' },
      refundStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
      }
    }
  },
  {
    timestamps: true
  }
);

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;

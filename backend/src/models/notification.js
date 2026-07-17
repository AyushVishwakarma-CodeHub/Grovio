import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['order', 'offer', 'system', 'delivery'],
      default: 'system'
    },
    icon: {
      type: String,
      default: '🔔'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    link: {
      type: String // e.g. /order-tracking/:id
    }
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

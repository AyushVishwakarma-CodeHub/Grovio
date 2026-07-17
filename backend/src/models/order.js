import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true // Snapshot of product name at purchase time
  },
  price: {
    type: Number,
    required: true // Snapshot of product price at purchase time
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  }
});

const deliveryAddressSnapshotSchema = new mongoose.Schema({
  title: String,
  addressLine1: { type: String, required: true },
  addressLine2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  }
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: [orderItemSchema],
    deliveryAddress: {
      type: deliveryAddressSnapshotSchema,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'card', 'upi'],
      required: true
    },
    orderStatus: {
      type: String,
      enum: ['placed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    storeManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    totals: {
      subtotal: { type: Number, required: true },
      deliveryFee: { type: Number, required: true, default: 0 },
      discount: { type: Number, required: true, default: 0 },
      tax: { type: Number, required: true, default: 0 },
      grandTotal: { type: Number, required: true }
    },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    otp: {
      type: String,
      required: true
    },
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for sorting/filtering order lists
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;

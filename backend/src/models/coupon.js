import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    discountType: {
      type: String,
      required: true,
      enum: ['flat', 'percentage'],
      default: 'flat'
    },
    discountValue: {
      type: Number,
      required: true
    },
    minPurchase: {
      type: Number,
      required: true,
      default: 0
    },
    expiryDate: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index to sort coupons by expiry date
couponSchema.index({ expiryDate: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;

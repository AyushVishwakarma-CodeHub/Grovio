import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Please provide an address title (e.g. Home, Work)'],
      trim: true
    },
    addressLine1: {
      type: String,
      required: [true, 'Please provide address line 1'],
      trim: true
    },
    addressLine2: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Please provide city'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Please provide state'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'Please provide ZIP/postal code'],
      trim: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Please provide geolocation coordinates']
      }
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index coordinates for routing proximity queries
addressSchema.index({ coordinates: '2dsphere' });

const Address = mongoose.model('Address', addressSchema);
export default Address;

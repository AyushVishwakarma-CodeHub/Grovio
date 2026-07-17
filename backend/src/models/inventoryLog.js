import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changeType: {
      type: String,
      enum: ['restock', 'sale', 'adjustment', 'reservation', 'release'],
      required: true
    },
    quantity: {
      type: Number,
      required: true // e.g. +10 for restock, -2 for sale
    },
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // only need creation timestamp
  }
);

inventoryLogSchema.index({ createdAt: -1 });

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
export default InventoryLog;

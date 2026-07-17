import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      index: true
    },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Please provide product description']
    },
    image: {
      type: String,
      required: [true, 'Please provide product image URL']
    },
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: [0, 'Price cannot be negative']
    },
    discountPrice: {
      type: Number,
      validate: {
        validator: function (value) {
          // 'this' refers to the document. Only works on create/save, not update queries.
          return !value || value < this.price;
        },
        message: 'Discount price must be less than the regular price'
      }
    },
    unit: {
      type: String,
      required: [true, 'Please specify unit (e.g. 500g, 1L, 1 unit)'],
      trim: true
    },
    stock: {
      type: Number,
      required: [true, 'Please specify product stock'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    reservedStock: {
      type: Number,
      min: [0, 'Reserved stock cannot be negative'],
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      min: [0, 'Low stock threshold cannot be negative'],
      default: 10
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product must belong to a category'],
      index: true
    },
    brand: {
      type: String,
      trim: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    numReviews: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound text index for catalog-wide search functionality
productSchema.index({ name: 'text', description: 'text', brand: 'text' });

// Pre-save hook to generate slug if name changed
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000); // add random key to avoid collisons
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;

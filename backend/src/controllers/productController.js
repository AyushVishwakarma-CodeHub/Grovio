import Product from '../models/product.js';
import Category from '../models/category.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * Get paginated list of products with filters, sorting, and search (public)
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      sortBy
    } = req.query;

    const query = { isActive: true };

    // 1. Full text search
    if (search) {
      query.$text = { $search: search };
    }

    // 2. Category Filter (can be name, ID, or slug)
    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const catObj = await Category.findOne({ slug: category });
        if (catObj) {
          query.category = catObj._id;
        } else {
          // If category not found, return empty set quickly
          return sendSuccess(res, 200, 'Products fetched successfully', {
            products: [],
            pagination: { page: Number(page), limit: Number(limit), totalProducts: 0, totalPages: 0 }
          });
        }
      }
    }

    // 3. Brand Filter
    if (brand) {
      query.brand = { $regex: new RegExp(brand, 'i') };
    }

    // 4. Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // 5. Stock status filter
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Determine Sort Options
    let sortOptions = {};
    if (sortBy === 'price_asc') {
      sortOptions.price = 1;
    } else if (sortBy === 'price_desc') {
      sortOptions.price = -1;
    } else if (sortBy === 'discount_desc') {
      // Sort by absolute discount or simply discount price existence
      sortOptions.discountPrice = 1;
    } else if (sortBy === 'newest') {
      sortOptions.createdAt = -1;
    } else if (search) {
      // If searching and no sort specified, sort by text match relevance
      sortOptions = { score: { $meta: 'textScore' } };
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }

    // Pagination calculations
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const products = await Product.find(query)
      .select(search ? { score: { $meta: 'textScore' } } : {})
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const totalProducts = await Product.countDocuments(query);

    return sendSuccess(res, 200, 'Products fetched successfully', {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalProducts,
        totalPages: Math.ceil(totalProducts / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured products / top discounts (public)
 */
export const getFeaturedProducts = async (req, res, next) => {
  try {
    // Select products that have a discount price (on sale)
    const products = await Product.find({ 
      isActive: true, 
      discountPrice: { $exists: true, $ne: null } 
    })
      .populate('category', 'name slug')
      .limit(10)
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Featured products fetched successfully', { products });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product details by slug (public)
 */
export const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, isActive: true }).populate('category', 'name slug');
    if (!product) {
      throw new CustomError('Product not found', 404);
    }
    return sendSuccess(res, 200, 'Product details fetched successfully', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new product (Admin / Manager)
 */
export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, discountPrice, unit, stock, category, brand } = req.body;

    let imageUrl = '';
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'products');
      imageUrl = uploadResult.secure_url;
    } else {
      throw new CustomError('Please provide a product image file', 400);
    }

    const product = await Product.create({
      name,
      description,
      image: imageUrl,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : undefined,
      unit,
      stock: Number(stock),
      category,
      brand
    });

    return sendSuccess(res, 201, 'Product created successfully', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Admin / Manager)
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, discountPrice, unit, stock, category, brand, isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new CustomError('Product not found', 404);
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = Number(price);
    
    // Explicitly handle clearing discountPrice
    if (discountPrice === '' || discountPrice === null) {
      product.discountPrice = undefined;
    } else if (discountPrice !== undefined) {
      product.discountPrice = Number(discountPrice);
    }

    if (unit) product.unit = unit;
    if (stock !== undefined) product.stock = Number(stock);
    if (category) product.category = category;
    if (brand !== undefined) product.brand = brand;
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'products');
      product.image = uploadResult.secure_url;
    }

    await product.save();

    return sendSuccess(res, 200, 'Product updated successfully', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete product (Admin / Manager)
 */
export const toggleProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      throw new CustomError('Product not found', 404);
    }

    product.isActive = !product.isActive;
    await product.save();

    const statusMessage = product.isActive ? 'activated' : 'deactivated';
    return sendSuccess(res, 200, `Product ${statusMessage} successfully`, { product });
  } catch (error) {
    next(error);
  }
};

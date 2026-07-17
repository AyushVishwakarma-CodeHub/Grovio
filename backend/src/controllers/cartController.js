import Cart from '../models/cart.js';
import Product from '../models/product.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * Get user's cart (populated)
 */
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate({
      path: 'items.product',
      select: 'name price discountPrice image unit stock slug'
    });

    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    return sendSuccess(res, 200, 'Cart fetched successfully', { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or update item quantity in cart
 */
export const addToCart = async (req, res, next) => {
  try {
    const { product: productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      throw new CustomError('Product not found', 404);
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    // Check if product already exists in cart
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      // Product exists, update quantity
      cart.items[itemIndex].quantity = Number(quantity);
    } else {
      // Product does not exist, push new item
      cart.items.push({ product: productId, quantity: Number(quantity) });
    }

    await cart.save();
    
    // Fetch and populate updated cart
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price discountPrice image unit stock slug'
    });

    return sendSuccess(res, 200, 'Product added to cart', { cart: updatedCart });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove or decrement item from cart
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.body;

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      throw new CustomError('Cart not found', 404);
    }

    // Filter out item
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    // Fetch and populate updated cart
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price discountPrice image unit stock slug'
    });

    return sendSuccess(res, 200, 'Product removed from cart', { cart: updatedCart });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all items from cart
 */
export const clearCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    cart.items = [];
    await cart.save();

    return sendSuccess(res, 200, 'Cart cleared successfully', { cart });
  } catch (error) {
    next(error);
  }
};

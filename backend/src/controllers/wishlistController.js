import Wishlist from '../models/wishlist.js';
import { sendSuccess, sendError } from '../utils/response.js';

// GET /api/wishlist — get current user's wishlist
export const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('products', 'name slug image price discountPrice unit stock brand category');

    return sendSuccess(res, 200, 'Wishlist fetched', {
      wishlist: wishlist ? wishlist.products : []
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/wishlist/:productId — toggle product in wishlist
export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    const index = wishlist.products.indexOf(productId);
    let added;
    if (index === -1) {
      wishlist.products.push(productId);
      added = true;
    } else {
      wishlist.products.splice(index, 1);
      added = false;
    }

    await wishlist.save();

    return sendSuccess(res, 200, added ? 'Added to wishlist' : 'Removed from wishlist', {
      added,
      wishlist: wishlist.products
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/wishlist — clear entire wishlist
export const clearWishlist = async (req, res, next) => {
  try {
    await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { products: [] }
    );
    return sendSuccess(res, 200, 'Wishlist cleared');
  } catch (err) {
    next(err);
  }
};

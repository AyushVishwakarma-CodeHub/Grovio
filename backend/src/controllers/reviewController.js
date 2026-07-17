import Review from '../models/review.js';
import Order from '../models/order.js';
import { sendSuccess, sendError } from '../utils/response.js';

// GET /api/reviews/product/:productId — get all reviews for a product
export const getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    return sendSuccess(res, 200, 'Reviews fetched', {
      reviews,
      avgRating,
      totalReviews: reviews.length
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/reviews/:productId — create or update review
export const createReview = async (req, res, next) => {
  try {
    const { rating, title, comment, orderId } = req.body;
    const { productId } = req.params;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 400, 'Rating must be between 1 and 5');
    }

    // Check if user already reviewed
    const existing = await Review.findOne({ user: req.user._id, product: productId });

    let review;
    if (existing) {
      existing.rating = rating;
      existing.title = title;
      existing.comment = comment;
      review = await existing.save();
    } else {
      review = await Review.create({
        user: req.user._id,
        product: productId,
        order: orderId,
        rating,
        title,
        comment
      });
    }

    await review.populate('user', 'name');

    return sendSuccess(res, 201, existing ? 'Review updated' : 'Review submitted', { review });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/reviews/:reviewId — delete own review
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.reviewId, user: req.user._id });
    if (!review) return sendError(res, 404, 'Review not found');

    await Review.findOneAndDelete({ _id: req.params.reviewId });
    return sendSuccess(res, 200, 'Review deleted');
  } catch (err) {
    next(err);
  }
};

// GET /api/reviews/my — get all reviews by current user
export const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'name image slug')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Your reviews fetched', { reviews });
  } catch (err) {
    next(err);
  }
};

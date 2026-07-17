import express from 'express';
import {
  getProductReviews,
  createReview,
  deleteReview,
  getMyReviews
} from '../controllers/reviewController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/product/:productId', getProductReviews); // public
router.use(protect);
router.get('/my', getMyReviews);
router.post('/:productId', createReview);
router.delete('/:reviewId', deleteReview);

export default router;

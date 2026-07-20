import express from 'express';
import { 
  getCoupons, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon, 
  validateCouponCode 
} from '../controllers/couponController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Public routes for customers
router.get('/', getCoupons);
router.post('/validate', validateCouponCode);

// Admin / Store Manager protected routes
router.use(protect);
router.post('/', restrictTo('admin', 'store_manager'), createCoupon);
router.put('/:id', restrictTo('admin', 'store_manager'), updateCoupon);
router.delete('/:id', restrictTo('admin', 'store_manager'), deleteCoupon);

export default router;

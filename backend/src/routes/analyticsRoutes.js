import express from 'express';
import { getSystemAnalytics } from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'store_manager'));

router.get('/', getSystemAnalytics);

export default router;

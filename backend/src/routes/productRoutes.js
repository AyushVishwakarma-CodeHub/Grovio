import express from 'express';
import { 
  getProducts, 
  getFeaturedProducts, 
  getProductBySlug, 
  createProduct, 
  updateProduct, 
  toggleProductStatus 
} from '../controllers/productController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Public Routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', getProductBySlug);

// Protected Admin / Manager Routes
router.post('/', protect, restrictTo('admin', 'store_manager'), upload.single('image'), createProduct);
router.put('/:id', protect, restrictTo('admin', 'store_manager'), upload.single('image'), updateProduct);
router.patch('/:id/toggle', protect, restrictTo('admin', 'store_manager'), toggleProductStatus);

export default router;

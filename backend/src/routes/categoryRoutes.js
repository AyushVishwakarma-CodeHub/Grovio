import express from 'express';
import { 
  getCategories, 
  getAllCategoriesAdmin, 
  createCategory, 
  updateCategory, 
  toggleCategoryStatus 
} from '../controllers/categoryController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Public Routes
router.get('/', getCategories);

// Protected Admin / Manager Routes
router.get('/admin', protect, restrictTo('admin', 'store_manager'), getAllCategoriesAdmin);
router.post('/', protect, restrictTo('admin', 'store_manager'), upload.single('image'), createCategory);
router.put('/:id', protect, restrictTo('admin', 'store_manager'), upload.single('image'), updateCategory);
router.patch('/:id/toggle', protect, restrictTo('admin', 'store_manager'), toggleCategoryStatus);

export default router;

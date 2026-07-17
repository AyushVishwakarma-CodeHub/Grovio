import express from 'express';
import { getWishlist, toggleWishlist, clearWishlist } from '../controllers/wishlistController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', getWishlist);
router.post('/:productId', toggleWishlist);
router.delete('/', clearWishlist);

export default router;

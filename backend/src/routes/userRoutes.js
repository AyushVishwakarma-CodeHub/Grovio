import express from 'express';
import { 
  getAllUsers, 
  updateUserRole, 
  toggleUserSuspension,
  deleteUser
} from '../controllers/userController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Secure all endpoints behind Admin validations
router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getAllUsers);
router.put('/:id/role', updateUserRole);
router.patch('/:id/toggle-status', toggleUserSuspension);
router.delete('/:id', deleteUser);

export default router;

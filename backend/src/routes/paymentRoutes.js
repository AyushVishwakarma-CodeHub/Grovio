import express from 'express';
import { 
  createPaymentOrder, 
  verifyPayment, 
  refundOrder, 
  getPaymentHistory, 
  getOrderInvoice 
} from '../controllers/paymentController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Secure all payment endpoints under authentication
router.use(protect);

router.post('/create', createPaymentOrder);
router.post('/verify', verifyPayment);
router.get('/history', restrictTo('admin', 'store_manager'), getPaymentHistory);
router.get('/:id/invoice', getOrderInvoice);
router.post('/:id/refund', restrictTo('admin', 'store_manager'), refundOrder);

export default router;

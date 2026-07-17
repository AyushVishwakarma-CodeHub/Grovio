import express from 'express';
import { 
  createOrder, 
  getMyOrders, 
  getOrderById, 
  assignDeliveryPartner, 
  updateOrderStatus, 
  verifyDeliveryOtp,
  getAvailableOrdersForRiders,
  cancelOrder,
  pickupOrderDelivery,
  releaseOrderDelivery,
  getAllSystemOrders
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Secure all endpoints to authenticated sessions
router.use(protect);

// Customer order history & checkout
router.get('/', getMyOrders);
router.get('/admin/all', restrictTo('admin', 'store_manager'), getAllSystemOrders);
router.post('/', createOrder);
router.post('/:id/cancel', cancelOrder);

// Rider specific order feeds
router.get('/rider/feed', restrictTo('delivery_partner'), getAvailableOrdersForRiders);

// Detailed order views & modifications
router.get('/:id', getOrderById);
router.post('/:id/assign', restrictTo('delivery_partner'), assignDeliveryPartner);
router.post('/:id/pickup', restrictTo('delivery_partner'), pickupOrderDelivery);
router.post('/:id/release', restrictTo('delivery_partner'), releaseOrderDelivery);
router.put('/:id/status', restrictTo('admin', 'store_manager', 'delivery_partner'), updateOrderStatus);
router.post('/:id/verify-otp', restrictTo('delivery_partner'), verifyDeliveryOtp);

export default router;

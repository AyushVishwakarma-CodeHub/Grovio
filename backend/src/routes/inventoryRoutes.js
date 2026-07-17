import express from 'express';
import { 
  getInventoryLogs, 
  adjustStock, 
  getLowStockAlerts, 
  getInventoryStats 
} from '../controllers/inventoryController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Secure all inventory management endpoints to Admin and Store Manager
router.use(protect);
router.use(restrictTo('admin', 'store_manager'));

router.get('/logs', getInventoryLogs);
router.post('/adjust', adjustStock);
router.get('/low-stock', getLowStockAlerts);
router.get('/stats', getInventoryStats);

export default router;

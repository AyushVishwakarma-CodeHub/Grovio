import express from 'express';
import { 
  getAddresses, 
  createAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '../controllers/addressController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { addressSchema } from '../validators/schemas.js';

const router = express.Router();

// Secure all endpoints to authenticated users
router.use(protect);

router.get('/', getAddresses);
router.post('/', validate(addressSchema), createAddress);
router.put('/:id', validate(addressSchema), updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;

import express from 'express';
import { 
  createTicket, 
  getTickets, 
  getTicketById, 
  replyToTicket 
} from '../controllers/supportController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createTicket);
router.get('/', getTickets);
router.get('/:id', getTicketById);
router.post('/:id/reply', replyToTicket);

export default router;

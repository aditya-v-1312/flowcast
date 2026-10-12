import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  streamInvoicePDF,
  sendInvoiceToClient,
} from '../controllers/invoiceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { emailSendLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);

// Email dispatch (rate-limited to prevent abuse)
router.post('/:id/send', emailSendLimiter, sendInvoiceToClient);

// Payment recording
router.post('/:id/payments', recordPayment);

// PDF streaming
router.get('/:id/pdf', streamInvoicePDF);

export default router;

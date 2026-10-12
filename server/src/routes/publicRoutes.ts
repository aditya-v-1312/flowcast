import { Router } from 'express';
import {
  getPublicInvoice,
  markPublicInvoiceViewed,
  streamPublicInvoicePDF,
} from '../controllers/invoiceController.js';

const router = Router();

// Public client portal routes (tokenized, no user login required)
router.get('/invoices/:token', getPublicInvoice);
router.post('/invoices/:token/viewed', markPublicInvoiceViewed);
router.get('/invoices/:token/pdf', streamPublicInvoicePDF);

export default router;

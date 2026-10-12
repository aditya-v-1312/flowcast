import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { User } from '../models/User.js';
import { PaymentRecord } from '../models/PaymentRecord.js';
import { AuthRequest, ILineItem } from '../types/index.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { sendInvoiceEmail } from '../services/emailService.js';

// Helper to compute line item and invoice totals
const computeInvoiceTotals = (lineItems: ILineItem[], amountPaid: number = 0) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  const processedItems = lineItems.map((item) => {
    const base = item.quantity * item.unitPrice;
    const discountVal = (base * (item.discount || 0)) / 100;
    const discountedBase = base - discountVal;
    const taxVal = (discountedBase * (item.taxRate || 0)) / 100;
    const finalAmount = discountedBase + taxVal;

    subtotal += base;
    discountTotal += discountVal;
    taxTotal += taxVal;

    return {
      ...item,
      amount: Math.round(finalAmount * 100) / 100,
    };
  });

  const totalAmount = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;
  const balanceDue = Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100);

  return {
    lineItems: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    totalAmount,
    balanceDue,
  };
};

export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, clientId, search } = req.query;
    const query: any = { userId: req.user?.userId };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (clientId) {
      query.clientId = clientId;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name companyName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user?.userId,
    })
      .populate('clientId')
      .populate('projectId', 'name');

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    const payments = await PaymentRecord.find({ invoiceId: invoice._id }).sort({ paymentDate: -1 });

    res.json({ success: true, invoice, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      clientId,
      projectId,
      invoiceNumber,
      issueDate,
      dueDate,
      lineItems,
      currency,
      notes,
      paymentInstructions,
      status,
    } = req.body;

    if (!clientId || !invoiceNumber || !dueDate || !lineItems || !lineItems.length) {
      res.status(400).json({
        success: false,
        message: 'Client, invoice number, due date, and at least one line item are required.',
      });
      return;
    }

    const client = await Client.findOne({ _id: clientId, userId: req.user?.userId });
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const totals = computeInvoiceTotals(lineItems, 0);

    const invoice = await Invoice.create({
      userId: req.user?.userId,
      clientId,
      projectId: projectId || null,
      invoiceNumber,
      status: status || 'DRAFT',
      issueDate: issueDate || new Date(),
      dueDate: new Date(dueDate),
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      totalAmount: totals.totalAmount,
      amountPaid: 0,
      balanceDue: totals.balanceDue,
      currency: currency || client.defaultCurrency || 'USD',
      notes: notes || '',
      paymentInstructions: paymentInstructions || '',
    });

    res.status(201).json({ success: true, message: 'Invoice created successfully.', invoice });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: `Invoice number "${req.body.invoiceNumber}" already exists. Please use a unique invoice number.`,
      });
      return;
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user?.userId });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    const {
      clientId,
      projectId,
      invoiceNumber,
      issueDate,
      dueDate,
      lineItems,
      currency,
      notes,
      paymentInstructions,
      status,
    } = req.body;

    if (clientId) invoice.clientId = clientId;
    if (projectId !== undefined) invoice.projectId = projectId;
    if (invoiceNumber) invoice.invoiceNumber = invoiceNumber;
    if (issueDate) invoice.issueDate = new Date(issueDate);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (currency) invoice.currency = currency;
    if (notes !== undefined) invoice.notes = notes;
    if (paymentInstructions !== undefined) invoice.paymentInstructions = paymentInstructions;
    if (status) invoice.status = status;

    if (lineItems && lineItems.length) {
      const totals = computeInvoiceTotals(lineItems, invoice.amountPaid);
      invoice.lineItems = totals.lineItems as any;
      invoice.subtotal = totals.subtotal;
      invoice.taxTotal = totals.taxTotal;
      invoice.discountTotal = totals.discountTotal;
      invoice.totalAmount = totals.totalAmount;
      invoice.balanceDue = totals.balanceDue;
    }

    await invoice.save();

    res.json({ success: true, message: 'Invoice updated successfully.', invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user?.userId });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    await PaymentRecord.deleteMany({ invoiceId: req.params.id });

    res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, paymentDate, paymentMethod, transactionReference, notes } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
      return;
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user?.userId });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    // Create payment record
    const payment = await PaymentRecord.create({
      invoiceId: invoice._id,
      userId: req.user?.userId,
      amount: paymentAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      transactionReference: transactionReference || '',
      notes: notes || '',
    });

    // Update invoice totals and status
    const newAmountPaid = Math.round((invoice.amountPaid + paymentAmount) * 100) / 100;
    const newBalanceDue = Math.max(0, Math.round((invoice.totalAmount - newAmountPaid) * 100) / 100);

    invoice.amountPaid = newAmountPaid;
    invoice.balanceDue = newBalanceDue;

    if (newBalanceDue === 0) {
      invoice.status = 'PAID';
    } else {
      invoice.status = 'PARTIAL';
    }

    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      payment,
      invoice,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const streamInvoicePDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user?.userId });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    const client = await Client.findById(invoice.clientId);
    const user = await User.findById(req.user?.userId);

    if (!client || !user) {
      res.status(404).json({ success: false, message: 'Client or User profile not found.' });
      return;
    }

    const pdfBuffer = await generateInvoicePDF(invoice, user, client);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendInvoiceToClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user?.userId });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    const client = await Client.findById(invoice.clientId);
    const user = await User.findById(req.user?.userId);

    if (!client || !user) {
      res.status(404).json({ success: false, message: 'Client or User profile not found.' });
      return;
    }

    if (!client.email) {
      res.status(400).json({ success: false, message: 'Client does not have a registered billing email.' });
      return;
    }

    const emailResult = await sendInvoiceEmail(invoice, user, client);

    // If invoice was DRAFT, advance to SENT
    if (invoice.status === 'DRAFT') {
      invoice.status = 'SENT';
    }
    invoice.remindersSentCount = (invoice.remindersSentCount || 0) + 1;
    invoice.lastReminderDate = new Date();
    await invoice.save();

    res.json({
      success: true,
      message: `Invoice email successfully dispatched to ${client.email} with PDF attached!`,
      previewUrl: emailResult.previewUrl,
      invoice,
    });
  } catch (error: any) {
    console.error('[Send Email Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to dispatch email.' });
  }
};

// --- Public Client Portal Endpoints (Tokenized) ---

export const getPublicInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const invoice = await Invoice.findOne({ publicAccessToken: token })
      .populate('clientId', 'name companyName email phone billingAddress')
      .populate('userId', 'name businessName businessAddress logoUrl currency bankDetails taxId');

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found or link expired.' });
      return;
    }

    const payments = await PaymentRecord.find({ invoiceId: invoice._id }).sort({ paymentDate: -1 });

    res.json({ success: true, invoice, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markPublicInvoiceViewed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const invoice = await Invoice.findOne({ publicAccessToken: token });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    // Auto update status to VIEWED if currently SENT
    if (invoice.status === 'SENT') {
      invoice.status = 'VIEWED';
      await invoice.save();
    }

    res.json({ success: true, message: 'Marked as viewed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const streamPublicInvoicePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const invoice = await Invoice.findOne({ publicAccessToken: token });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found.' });
      return;
    }

    const client = await Client.findById(invoice.clientId);
    const user = await User.findById(invoice.userId);

    if (!client || !user) {
      res.status(404).json({ success: false, message: 'Client or User profile not found.' });
      return;
    }

    const pdfBuffer = await generateInvoicePDF(invoice, user, client);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

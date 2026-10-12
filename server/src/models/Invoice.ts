import { Schema, model } from 'mongoose';
import { IInvoice, ILineItem } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const lineItemSchema = new Schema<ILineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    invoiceNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    issueDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, required: true, index: true },
    lineItems: [lineItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    taxTotal: { type: Number, required: true, default: 0 },
    discountTotal: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, required: true, default: 0 },
    balanceDue: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },
    notes: { type: String, default: '' },
    paymentInstructions: { type: String, default: '' },
    publicAccessToken: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    remindersSentCount: { type: Number, default: 0 },
    lastReminderDate: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, status: 1, dueDate: 1 });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);

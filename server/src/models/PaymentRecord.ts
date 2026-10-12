import { Schema, model } from 'mongoose';
import { IPaymentRecord } from '../types/index.js';

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, default: Date.now, index: true },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE', 'PAYPAL', 'STRIPE', 'OTHER'],
      default: 'BANK_TRANSFER',
    },
    transactionReference: { type: String, default: '' },
    notes: { type: String, default: '' },
    recordedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

paymentRecordSchema.index({ invoiceId: 1, paymentDate: -1 });

export const PaymentRecord = model<IPaymentRecord>('PaymentRecord', paymentRecordSchema);

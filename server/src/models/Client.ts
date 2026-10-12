import { Schema, model } from 'mongoose';
import { IClient } from '../types/index.js';

const clientSchema = new Schema<IClient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, default: '', trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    billingAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    defaultCurrency: { type: String, default: 'INR' },
    customPaymentTerms: { type: Number, default: 30 },
    notes: { type: String, default: '' },
    reliabilityScore: { type: Number, default: 100 }, // 0 - 100 score
    avgPaymentDelayDays: { type: Number, default: 0 }, // +days late, -days early
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

clientSchema.index({ userId: 1, email: 1 });

export const Client = model<IClient>('Client', clientSchema);

import { Schema, model } from 'mongoose';
import { IUser } from '../types/index.js';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    businessName: { type: String, default: '' },
    businessAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    logoUrl: { type: String, default: '' },
    taxId: { type: String, default: '' }, // GSTIN
    currency: { type: String, default: 'INR', uppercase: true },
    defaultPaymentTerms: { type: Number, default: 30 }, // in days
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      routingOrIfsc: { type: String, default: '' },
      upiId: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      swiftOrBic: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);

import { Schema, model } from 'mongoose';
import { IRecurringExpense } from '../types/index.js';

const recurringExpenseSchema = new Schema<IRecurringExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    frequency: {
      type: String,
      enum: ['MONTHLY', 'YEARLY', 'QUARTERLY'],
      default: 'MONTHLY',
    },
    billingDayOfMonth: { type: Number, required: true, min: 1, max: 28 },
    category: {
      type: String,
      enum: ['SOFTWARE', 'OFFICE', 'EQUIPMENT', 'TAXES', 'MARKETING', 'OTHER'],
      default: 'SOFTWARE',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const RecurringExpense = model<IRecurringExpense>('RecurringExpense', recurringExpenseSchema);

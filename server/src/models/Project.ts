import { Schema, model } from 'mongoose';
import { IProject, IMilestone } from '../types/index.js';

const milestoneSchema = new Schema<IMilestone>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    targetDate: { type: Date },
    isBilled: { type: Boolean, default: false },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { _id: true }
);

const projectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    billingType: {
      type: String,
      enum: ['HOURLY', 'FIXED_FEE', 'RETAINER'],
      default: 'FIXED_FEE',
    },
    rate: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'],
      default: 'IN_PROGRESS',
    },
    milestones: [milestoneSchema],
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ userId: 1, status: 1 });

export const Project = model<IProject>('Project', projectSchema);

import { Request } from 'express';
import { Types } from 'mongoose';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CHEQUE' | 'PAYPAL' | 'STRIPE' | 'OTHER';

export type BillingType = 'HOURLY' | 'FIXED_FEE' | 'RETAINER';

export type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export type ExpenseFrequency = 'MONTHLY' | 'YEARLY' | 'QUARTERLY';

export type ExpenseCategory = 'SOFTWARE' | 'OFFICE' | 'EQUIPMENT' | 'TAXES' | 'MARKETING' | 'OTHER';

export interface IUserAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IBankDetails {
  bankName?: string;
  accountNumber?: string;
  routingOrIfsc?: string;
  upiId?: string;
  accountHolderName?: string;
  swiftOrBic?: string;
  notes?: string;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  businessName?: string;
  businessAddress?: IUserAddress;
  logoUrl?: string;
  taxId?: string;
  currency: string;
  defaultPaymentTerms: number;
  bankDetails?: IBankDetails;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  billingAddress?: IUserAddress;
  defaultCurrency?: string;
  customPaymentTerms?: number;
  notes?: string;
  reliabilityScore: number;
  avgPaymentDelayDays: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMilestone {
  _id?: Types.ObjectId;
  name: string;
  amount: number;
  targetDate?: Date;
  isBilled: boolean;
  invoiceId?: Types.ObjectId;
}

export interface IProject {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  clientId: Types.ObjectId;
  name: string;
  description?: string;
  billingType: BillingType;
  rate: number;
  status: ProjectStatus;
  milestones: IMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ILineItem {
  _id?: Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 18 for 18%
  discount: number; // e.g. 10 for 10%
  amount: number; // computed
}

export interface IInvoice {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  lineItems: ILineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  notes?: string;
  paymentInstructions?: string;
  publicAccessToken: string;
  remindersSentCount: number;
  lastReminderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentRecord {
  _id: Types.ObjectId;
  invoiceId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  recordedAt: Date;
}

export interface IRecurringExpense {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  amount: number;
  frequency: ExpenseFrequency;
  billingDayOfMonth: number;
  category: ExpenseCategory;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Authenticated Request interface
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

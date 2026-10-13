export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CHEQUE' | 'PAYPAL' | 'STRIPE' | 'OTHER';

export type BillingType = 'HOURLY' | 'FIXED_FEE' | 'RETAINER';

export type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export interface IUser {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  currency: string;
  taxId?: string;
  defaultPaymentTerms?: number;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    routingOrIfsc?: string;
    upiId?: string;
    accountHolderName?: string;
    swiftOrBic?: string;
    notes?: string;
  };
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface IClient {
  _id: string;
  userId: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  defaultCurrency?: string;
  customPaymentTerms?: number;
  notes?: string;
  reliabilityScore: number;
  avgPaymentDelayDays: number;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt?: string;
}

export interface IMilestone {
  _id?: string;
  name: string;
  amount: number;
  targetDate?: string;
  isBilled: boolean;
  invoiceId?: string;
}

export interface IProject {
  _id: string;
  name: string;
  description?: string;
  billingType: BillingType;
  rate: number;
  status: ProjectStatus;
  clientId: string | { _id: string; name: string; companyName?: string; email: string };
  milestones: IMilestone[];
  createdAt?: string;
}

export interface ILineItem {
  _id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  amount: number;
}

export interface IInvoice {
  _id: string;
  userId: string;
  clientId: string | IClient;
  projectId?: string | IProject;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
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
  remindersSentCount?: number;
  createdAt: string;
}

export interface IPaymentRecord {
  _id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface IRecurringExpense {
  _id: string;
  title: string;
  amount: number;
  frequency: 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
  billingDayOfMonth: number;
  category: string;
  isActive: boolean;
}

export interface IDashboardAnalytics {
  summary: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    overdueAmount: number;
    totalInvoicesCount: number;
    paidCount: number;
    overdueCount: number;
    draftCount: number;
  };
  statusBreakdown: {
    _id: InvoiceStatus;
    count: number;
    totalValue: number;
    balanceValue: number;
  }[];
  revenueTrend: {
    _id: string;
    revenue: number;
    invoiceCount: number;
  }[];
  taxSummary: {
    totalTaxCollected: number;
    taxableIncome: number;
  };
}

export interface ICashFlowForecast {
  monthlyExpenseTotal: number;
  totalCollected?: number;
  projections: {
    period: string;
    projectedInflow: number;
    scheduledInflow: number;
    recurringExpenses: number;
    netCashFlow: number;
    openingBalance?: number;
    cumulativeRunway?: number;
  }[];
  projectedInvoices: {
    invoiceNumber: string;
    clientName: string;
    companyName?: string;
    totalAmount?: number;
    amountPaid?: number;
    balanceDue: number;
    originalDueDate: string;
    adjustedPaymentDate: string;
    clientDelayDays: number;
    status: InvoiceStatus;
  }[];
}

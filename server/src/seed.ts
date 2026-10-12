import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { Client } from './models/Client.js';
import { Project } from './models/Project.js';
import { Invoice } from './models/Invoice.js';
import { PaymentRecord } from './models/PaymentRecord.js';
import { RecurringExpense } from './models/RecurringExpense.js';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance_invoice_db';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // Wipe all old data clean
    await User.deleteMany({});
    await Client.deleteMany({});
    await Project.deleteMany({});
    await Invoice.deleteMany({});
    await PaymentRecord.deleteMany({});
    await RecurringExpense.deleteMany({});

    console.log('[Seed] Cleared all old invoices, payments, and clients.');

    // 1. Create Indian Freelancer Profile
    const passwordHash = await bcrypt.hash('Aditya@13122005', 10);
    const user = await User.create({
      name: 'Aditya Chandiramani',
      email: 'adityadevbuilds@gmail.com',
      passwordHash,
      businessName: 'Aditya Chandiramani Web Solutions',
      currency: 'INR',
      defaultPaymentTerms: 30,
      businessAddress: {
        street: '404 Innovate Hub, Sayajigunj',
        city: 'Vadodara',
        state: 'Gujarat',
        postalCode: '390005',
        country: 'India',
      },
      bankDetails: {
        bankName: 'HDFC Bank Ltd',
        accountHolderName: 'Aditya Chandiramani',
        accountNumber: '50100234981122',
        routingOrIfsc: 'HDFC0001234',
        upiId: 'aditya.chandiramani@okhdfcbank',
        swiftOrBic: 'HDFCINBB',
        notes: 'Please mention Invoice Number in payment remark or NEFT/IMPS description.',
      },
      taxId: '24AAACG1234F1Z8', // GSTIN format
    });

    console.log('[Seed] Created Freelancer Profile: Aditya Chandiramani (adityadevbuilds@gmail.com) with INR (₹) & GSTIN 24AAACG1234F1Z8');

    // 2. Create 2 Ready-to-Bill Indian Clients (Zero Invoices)
    await Client.create([
      {
        userId: user._id,
        name: 'Rahul Sharma',
        companyName: 'Infosys Infotech Pvt Ltd',
        email: 'rahul.sharma@infosys.com',
        phone: '+91 98250 12345',
        defaultCurrency: 'INR',
        customPaymentTerms: 30,
        reliabilityScore: 100,
        avgPaymentDelayDays: 0,
        billingAddress: {
          street: 'Electronic City, Phase 1',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560100',
          country: 'India',
        },
      },
      {
        userId: user._id,
        name: 'Priya Patel',
        companyName: 'Zomato Media India',
        email: 'priya.patel@zomato.com',
        phone: '+91 99090 67890',
        defaultCurrency: 'INR',
        customPaymentTerms: 15,
        reliabilityScore: 100,
        avgPaymentDelayDays: 0,
        billingAddress: {
          street: 'Udyog Vihar, Phase V',
          city: 'Gurugram',
          state: 'Haryana',
          postalCode: '122016',
          country: 'India',
        },
      },
    ]);

    console.log('[Seed] Created 2 clean Indian client profiles (Rahul Sharma & Priya Patel)');

    // 3. Indian Recurring Business Expenses (for cash flow runway calculations)
    await RecurringExpense.create([
      {
        userId: user._id,
        title: 'High-Speed Broadband Internet',
        amount: 1499,
        frequency: 'MONTHLY',
        billingDayOfMonth: 1,
        category: 'OFFICE',
      },
      {
        userId: user._id,
        title: 'Cloud VPS & Hosting Staging',
        amount: 2500,
        frequency: 'MONTHLY',
        billingDayOfMonth: 10,
        category: 'SOFTWARE',
      },
      {
        userId: user._id,
        title: 'GST & CA Accounting Retainer',
        amount: 3000,
        frequency: 'MONTHLY',
        billingDayOfMonth: 5,
        category: 'TAXES',
      },
    ]);

    console.log('[Seed] Created monthly recurring expenses in INR (₹6,999/month)');
    console.log('[Seed] ZERO dummy invoices created. Ready for fresh test invoices!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();

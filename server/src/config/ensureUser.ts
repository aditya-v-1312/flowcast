import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Client } from '../models/Client.js';
import { RecurringExpense } from '../models/RecurringExpense.js';

export const ensureDefaultUser = async (): Promise<void> => {
  try {
    // 1. Clean up any legacy development backdoor accounts
    await User.deleteMany({ email: { $in: ['alex@freelance.dev', 'aditya@chandiramani.dev'] } });

    // 2. Ensure Primary Production User: adityadevbuilds@gmail.com
    const primaryEmail = 'adityadevbuilds@gmail.com';
    let primaryUser = await User.findOne({ email: primaryEmail });

    if (!primaryUser) {
      const saltPrimary = await bcrypt.genSalt(10);
      const hashPrimary = await bcrypt.hash('Aditya@13122005', saltPrimary);

      primaryUser = await User.create({
        name: 'Aditya Chandiramani',
        email: primaryEmail,
        passwordHash: hashPrimary,
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
          notes: 'Please quote invoice number in payment remarks.',
        },
        taxId: '24AAACG1234F1Z8',
      });
      console.log(`[Security] Initialized verified owner account: ${primaryEmail}`);
    }

    // Ensure default Indian clients exist for primary user account
    if (primaryUser) {
      const clientCount = await Client.countDocuments({ userId: primaryUser._id, isArchived: false });
      if (clientCount === 0) {
        await Client.create([
          {
            userId: primaryUser._id,
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
            userId: primaryUser._id,
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
        console.log(`[Init] Created default clients for ${primaryUser.email}`);
      }
    }
  } catch (err) {
    console.error('[Init] Error in ensureDefaultUser:', err);
  }
};

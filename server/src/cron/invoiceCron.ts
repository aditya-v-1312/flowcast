import cron from 'node-cron';
import { Invoice } from '../models/Invoice.js';

export const runOverdueCheck = async (): Promise<{ updatedCount: number }> => {
  try {
    const now = new Date();
    // Query for invoices that are past due, have unpaid balance, and are currently SENT or VIEWED
    const result = await Invoice.updateMany(
      {
        dueDate: { $lt: now },
        balanceDue: { $gt: 0 },
        status: { $in: ['SENT', 'VIEWED'] },
      },
      {
        $set: { status: 'OVERDUE' },
      }
    );

    console.log(`[Cron Job] Overdue check completed. Updated ${result.modifiedCount} invoices to OVERDUE.`);
    return { updatedCount: result.modifiedCount };
  } catch (error) {
    console.error('[Cron Job Error] Failed to update overdue invoices:', error);
    return { updatedCount: 0 };
  }
};

export const initCronJobs = (): void => {
  // Run everyday at 00:00 (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron Job] Running scheduled daily overdue invoice check...');
    await runOverdueCheck();
  });

  console.log('[Cron Scheduler] Daily overdue invoice check initialized (00:00 every day).');
};

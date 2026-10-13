import { Response } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { RecurringExpense } from '../models/RecurringExpense.js';
import { AuthRequest } from '../types/index.js';
import {
  buildDashboardPipeline,
  buildClientReliabilityPipeline,
  buildCashFlowForecastPipeline,
} from '../pipelines/analyticsPipelines.js';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const pipeline = buildDashboardPipeline(userId);
    const result = await Invoice.aggregate(pipeline);

    const data = result[0] || {};
    const summary = data.summaryKPIs?.[0] || {
      totalInvoiced: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
      totalInvoicesCount: 0,
      paidCount: 0,
      overdueCount: 0,
      draftCount: 0,
    };

    const statusBreakdown = data.statusBreakdown || [];
    const revenueTrend = data.revenueTrend || [];
    const taxSummary = data.taxSummary?.[0] || { totalTaxCollected: 0, taxableIncome: 0 };

    res.json({
      success: true,
      summary,
      statusBreakdown,
      revenueTrend,
      taxSummary,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCashFlowForecast = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // 1. Run pipeline to fetch pending invoices with adjusted payment dates
    const pipeline = buildCashFlowForecastPipeline(userId);
    const projectedInvoices = await Invoice.aggregate(pipeline);

    // 2. Fetch recurring expenses and total payments already collected
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [recurringExpenses, collectedAgg] = await Promise.all([
      RecurringExpense.find({ userId, isActive: true }),
      Invoice.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, totalCollected: { $sum: '$amountPaid' } } },
      ]),
    ]);

    const totalCollected = collectedAgg[0]?.totalCollected || 0;

    const monthlyExpenseTotal = recurringExpenses.reduce((sum, exp) => {
      if (exp.frequency === 'MONTHLY') return sum + exp.amount;
      if (exp.frequency === 'YEARLY') return sum + exp.amount / 12;
      if (exp.frequency === 'QUARTERLY') return sum + exp.amount / 3;
      return sum + exp.amount;
    }, 0);

    // 3. Bucket calculations (30, 60, 90 days)
    const now = new Date();
    const d30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const d90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    let inflow30 = 0;
    let inflow60 = 0;
    let inflow90 = 0;

    let originalInflow30 = 0;
    let originalInflow60 = 0;
    let originalInflow90 = 0;

    projectedInvoices.forEach((inv) => {
      const adjDate = new Date(inv.adjustedPaymentDate);
      const origDate = new Date(inv.originalDueDate);

      // Adjusted Inflows (predictive)
      if (adjDate <= d30) inflow30 += inv.balanceDue;
      else if (adjDate <= d60) inflow60 += inv.balanceDue;
      else if (adjDate <= d90) inflow90 += inv.balanceDue;

      // Original Inflows (nominal)
      if (origDate <= d30) originalInflow30 += inv.balanceDue;
      else if (origDate <= d60) originalInflow60 += inv.balanceDue;
      else if (origDate <= d90) originalInflow90 += inv.balanceDue;
    });

    // 4. Construct monthly projection comparison with cumulative runway carryover
    const p1Net = inflow30 - monthlyExpenseTotal;
    const p1Runway = totalCollected + p1Net;

    const p2Net = inflow60 - monthlyExpenseTotal;
    const p2Runway = p1Runway + p2Net;

    const p3Net = inflow90 - monthlyExpenseTotal;
    const p3Runway = p2Runway + p3Net;

    const projections = [
      {
        period: '0-30 Days',
        projectedInflow: Math.round(inflow30),
        scheduledInflow: Math.round(originalInflow30),
        recurringExpenses: Math.round(monthlyExpenseTotal),
        netCashFlow: Math.round(p1Net),
        openingBalance: Math.round(totalCollected),
        cumulativeRunway: Math.round(p1Runway),
      },
      {
        period: '31-60 Days',
        projectedInflow: Math.round(inflow60),
        scheduledInflow: Math.round(originalInflow60),
        recurringExpenses: Math.round(monthlyExpenseTotal),
        netCashFlow: Math.round(p2Net),
        openingBalance: Math.round(p1Runway),
        cumulativeRunway: Math.round(p2Runway),
      },
      {
        period: '61-90 Days',
        projectedInflow: Math.round(inflow90),
        scheduledInflow: Math.round(originalInflow90),
        recurringExpenses: Math.round(monthlyExpenseTotal),
        netCashFlow: Math.round(p3Net),
        openingBalance: Math.round(p2Runway),
        cumulativeRunway: Math.round(p3Runway),
      },
    ];

    res.json({
      success: true,
      totalCollected: Math.round(totalCollected),
      monthlyExpenseTotal: Math.round(monthlyExpenseTotal),
      projections,
      projectedInvoices,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const syncClientReliability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const pipeline = buildClientReliabilityPipeline(userId);
    const reliabilityStats = await Invoice.aggregate(pipeline);

    // Update each client document with the calculated metrics
    const updatePromises = reliabilityStats.map((stat) =>
      Client.updateOne(
        { _id: stat.clientId, userId },
        {
          $set: {
            reliabilityScore: stat.reliabilityScore,
            avgPaymentDelayDays: stat.avgDelayDays,
          },
        }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Updated reliability metrics for ${reliabilityStats.length} clients.`,
      stats: reliabilityStats,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

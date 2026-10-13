import mongoose, { PipelineStage } from 'mongoose';

/**
 * Pipeline 1: Single-Round-Trip Dashboard KPI & Trends via $facet
 */
export const buildDashboardPipeline = (userId: string): PipelineStage[] => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  return [
    { $match: { userId: userObjectId } },
    {
      $facet: {
        // 1. High-level KPI aggregations
        summaryKPIs: [
          {
            $group: {
              _id: null,
              totalInvoiced: { $sum: '$totalAmount' },
              totalCollected: { $sum: '$amountPaid' },
              totalOutstanding: { $sum: '$balanceDue' },
              overdueAmount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ['$balanceDue', 0] },
                        { $lt: ['$dueDate', now] },
                        { $ne: ['$status', 'CANCELLED'] },
                      ],
                    },
                    '$balanceDue',
                    0,
                  ],
                },
              },
              totalInvoicesCount: { $sum: 1 },
              paidCount: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
              overdueCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ['$balanceDue', 0] },
                        { $lt: ['$dueDate', now] },
                        { $ne: ['$status', 'CANCELLED'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              draftCount: { $sum: { $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0] } },
            },
          },
        ],

        // 2. Status distribution
        statusBreakdown: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalValue: { $sum: '$totalAmount' },
              balanceValue: { $sum: '$balanceDue' },
            },
          },
        ],

        // 3. Trailing 6 Months Collected Revenue Trend
        revenueTrend: [
          {
            $match: {
              status: { $in: ['PAID', 'PARTIAL'] },
              updatedAt: {
                $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } },
              revenue: { $sum: '$amountPaid' },
              invoiceCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],

        // 4. Tax Estimations
        taxSummary: [
          {
            $match: {
              status: { $in: ['PAID', 'PARTIAL'] },
            },
          },
          {
            $group: {
              _id: null,
              totalTaxCollected: { $sum: '$taxTotal' },
              taxableIncome: { $sum: '$subtotal' },
            },
          },
        ],
      },
    },
  ];
};

/**
 * Pipeline 2: Client Reliability & Average Delay Aggregator
 */
export const buildClientReliabilityPipeline = (userId: string): PipelineStage[] => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return [
    {
      $match: {
        userId: userObjectId,
        status: 'PAID',
        amountPaid: { $gt: 0 },
      },
    },
    {
      $lookup: {
        from: 'paymentrecords',
        localField: '_id',
        foreignField: 'invoiceId',
        as: 'payments',
      },
    },
    {
      $addFields: {
        finalPaymentDate: {
          $ifNull: [{ $max: '$payments.paymentDate' }, '$updatedAt'],
        },
      },
    },
    {
      $project: {
        clientId: 1,
        dueDate: 1,
        finalPaymentDate: 1,
        // Delay in days = (finalPaymentDate - dueDate) in ms / (1000 * 60 * 60 * 24)
        delayDays: {
          $round: [
            {
              $divide: [
                { $subtract: ['$finalPaymentDate', '$dueDate'] },
                1000 * 60 * 60 * 24,
              ],
            },
            1,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$clientId',
        paidInvoicesCount: { $sum: 1 },
        avgDelayDays: { $avg: '$delayDays' },
        maxDelayDays: { $max: '$delayDays' },
        minDelayDays: { $min: '$delayDays' },
      },
    },
    {
      $project: {
        clientId: '$_id',
        paidInvoicesCount: 1,
        avgDelayDays: { $round: ['$avgDelayDays', 1] },
        maxDelayDays: 1,
        minDelayDays: 1,
        // Reliability Score: 100 - (avgDelayDays * 2.5), bounded between 0 and 100
        reliabilityScore: {
          $max: [
            0,
            {
              $min: [
                100,
                {
                  $round: [
                    {
                      $subtract: [100, { $multiply: [{ $max: [0, '$avgDelayDays'] }, 2.5] }],
                    },
                    0,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  ];
};

/**
 * Pipeline 3: Cash Flow Forecast Engine
 * Calculates projected cash inflows adjusted for client historical delays
 */
export const buildCashFlowForecastPipeline = (userId: string): PipelineStage[] => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return [
    {
      $match: {
        userId: userObjectId,
        balanceDue: { $gt: 0 },
        status: { $in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] },
      },
    },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'clientDoc',
      },
    },
    {
      $unwind: { path: '$clientDoc', preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        clientDelayDays: { $ifNull: ['$clientDoc.avgPaymentDelayDays', 0] },
        adjustedPaymentDate: {
          $add: [
            '$dueDate',
            {
              $multiply: [
                { $max: [0, { $ifNull: ['$clientDoc.avgPaymentDelayDays', 0] }] },
                24 * 60 * 60 * 1000,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        invoiceNumber: 1,
        clientName: '$clientDoc.name',
        companyName: '$clientDoc.companyName',
        totalAmount: 1,
        amountPaid: 1,
        balanceDue: 1,
        originalDueDate: '$dueDate',
        adjustedPaymentDate: 1,
        clientDelayDays: 1,
        status: 1,
      },
    },
    {
      $sort: { adjustedPaymentDate: 1 },
    },
  ];
};

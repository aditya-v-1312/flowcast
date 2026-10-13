import { Router } from 'express';
import {
  getDashboardAnalytics,
  getCashFlowForecast,
  syncClientReliability,
} from '../controllers/analyticsController.js';
import { runOverdueCheck } from '../cron/invoiceCron.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', getDashboardAnalytics);
router.get('/cashflow', getCashFlowForecast);
router.get('/forecast', getCashFlowForecast);
router.post('/sync-reliability', syncClientReliability);

// On-demand trigger for testing cron job logic during viva/evaluation
router.post('/trigger-cron-check', async (req, res) => {
  const result = await runOverdueCheck();
  res.json({
    success: true,
    message: `Manual overdue scan executed. Updated ${result.updatedCount} invoices.`,
    ...result,
  });
});

export default router;

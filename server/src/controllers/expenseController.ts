import { Response } from 'express';
import { RecurringExpense } from '../models/RecurringExpense.js';
import { AuthRequest } from '../types/index.js';

export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expenses = await RecurringExpense.find({ userId: req.user?.userId }).sort({ title: 1 });
    res.json({ success: true, expenses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, amount, frequency, billingDayOfMonth, category } = req.body;

    if (!title || amount === undefined || !billingDayOfMonth) {
      res.status(400).json({ success: false, message: 'Title, amount, and billingDayOfMonth are required.' });
      return;
    }

    const expense = await RecurringExpense.create({
      userId: req.user?.userId,
      title,
      amount,
      frequency: frequency || 'MONTHLY',
      billingDayOfMonth,
      category: category || 'SOFTWARE',
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Recurring expense added.', expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expense = await RecurringExpense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?.userId },
      { $set: req.body },
      { new: true }
    );

    if (!expense) {
      res.status(404).json({ success: false, message: 'Expense not found.' });
      return;
    }

    res.json({ success: true, message: 'Expense updated.', expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expense = await RecurringExpense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?.userId,
    });

    if (!expense) {
      res.status(404).json({ success: false, message: 'Expense not found.' });
      return;
    }

    res.json({ success: true, message: 'Expense removed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

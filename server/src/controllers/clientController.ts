import { Response } from 'express';
import { Client } from '../models/Client.js';
import { Invoice } from '../models/Invoice.js';
import { AuthRequest } from '../types/index.js';

export const getClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await Client.find({
      userId: req.user?.userId,
      isArchived: false,
    }).sort({ createdAt: -1 });

    res.json({ success: true, clients });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      userId: req.user?.userId,
    });

    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const invoices = await Invoice.find({
      clientId: client._id,
      userId: req.user?.userId,
    }).sort({ issueDate: -1 });

    res.json({ success: true, client, invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, companyName, email, phone, billingAddress, defaultCurrency, customPaymentTerms, notes } = req.body;

    if (!name || !email) {
      res.status(400).json({ success: false, message: 'Name and email are required.' });
      return;
    }

    const client = await Client.create({
      userId: req.user?.userId,
      name,
      companyName,
      email,
      phone,
      billingAddress,
      defaultCurrency: defaultCurrency || 'USD',
      customPaymentTerms: customPaymentTerms || 30,
      notes,
      reliabilityScore: 100,
      avgPaymentDelayDays: 0,
    });

    res.status(201).json({ success: true, message: 'Client created successfully.', client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?.userId },
      { $set: req.body },
      { new: true }
    );

    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    res.json({ success: true, message: 'Client updated successfully.', client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Soft delete
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?.userId },
      { isArchived: true },
      { new: true }
    );

    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    res.json({ success: true, message: 'Client archived successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

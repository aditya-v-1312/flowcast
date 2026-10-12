import { Response } from 'express';
import { Project } from '../models/Project.js';
import { Invoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { AuthRequest } from '../types/index.js';

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({ userId: req.user?.userId })
      .populate('clientId', 'name companyName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user?.userId,
    }).populate('clientId', 'name companyName email defaultCurrency');

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId, name, description, billingType, rate, status, milestones } = req.body;

    if (!clientId || !name || rate === undefined) {
      res.status(400).json({ success: false, message: 'Client ID, name, and rate are required.' });
      return;
    }

    const client = await Client.findOne({ _id: clientId, userId: req.user?.userId });
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const project = await Project.create({
      userId: req.user?.userId,
      clientId,
      name,
      description,
      billingType: billingType || 'FIXED_FEE',
      rate,
      status: status || 'IN_PROGRESS',
      milestones: milestones || [],
    });

    res.status(201).json({ success: true, message: 'Project created successfully.', project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?.userId },
      { $set: req.body },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    res.json({ success: true, message: 'Project updated successfully.', project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?.userId,
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

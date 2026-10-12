import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/index.js';
import { User } from '../models/User.js';

interface JwtPayload {
  userId: string;
  email: string;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // Verify user actually exists in MongoDB (handles re-seeded or deleted DB states)
    const userExists = await User.findById(decoded.userId).select('_id');
    if (!userExists) {
      res.status(401).json({ success: false, message: 'User session expired or user no longer exists. Please log in again.' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    return;
  }
};

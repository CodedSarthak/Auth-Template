// Use this as a middleware in routes that need to be protected.
// These routes can then access the userId via `req.user.id`

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token missing' });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
        return res.status(403).json({ message: 'Invalid or expired access token' });
    }

    req.user = {
        id: decoded.userId
    };

    next();
};
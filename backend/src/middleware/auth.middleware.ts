// Use this as a middleware in routes, that needs to be protected. 
// These routes, then can get userId from `req.user.id`

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../utils/jwt.js';
import { env } from '../config/getEnvVars.js';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token missing' });
    }

    try {
        const decoded: TokenPayload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

        req.user = {
            id: decoded.userId
        };

        next();

    }
    catch (error) {
        return res.status(403).json({ message: 'Invalid or expired access token' });
    }
};
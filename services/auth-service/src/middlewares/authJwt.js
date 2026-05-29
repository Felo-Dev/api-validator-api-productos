import jwt from 'jsonwebtoken';
import { loadConfig } from '@ecommerce/shared';

const config = loadConfig();

export const generateAccessToken = (userId, role = 'user') => {
    return jwt.sign({ id: userId, role, type: 'access' }, config.JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId, type: 'refresh' }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.JWT_REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

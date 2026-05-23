import jwt from "jsonwebtoken";
import config from "../config.js";
import * as usersRepo from "../repositories/users.repository.js";

export const verifyToken = async (req, res, next) => {
    try {
        let token = null;
        if (req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1];
            }
        }

        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, config.SECRET);
        req.userId = decoded.id;

        const user = await usersRepo.findUserById(req.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.deleted_at) {
            return res.status(401).json({ message: "User account is deactivated" });
        }

        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
};

export const isModerator = async (req, res, next) => {
    const roles = await usersRepo.getUserRoles(req.userId);
    if (roles.includes("moderator") || roles.includes("admin")) return next();
    return res.status(403).json({ message: "Require moderator role" });
};

export const isAdmin = async (req, res, next) => {
    const roles = await usersRepo.getUserRoles(req.userId);
    if (roles.includes("admin")) return next();
    return res.status(403).json({ message: "Require admin role" });
};

export const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId, type: 'access' }, config.SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId, type: 'refresh' }, config.REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

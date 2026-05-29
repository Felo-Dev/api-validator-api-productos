import jwt from "jsonwebtoken";
import config from "../config.js";
import * as usersRepo from "../repositories/users.repository.js";

/**
 * @descripción Verifica que el token JWT de acceso sea válido y que el usuario exista y no esté desactivado.
 * @param {import('express').Request} req - Objeto de solicitud Express
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Promise<void>} - Llama a next() si el token es válido, o responde con error 401/403
 */
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

/**
 * @descripción Verifica que el usuario autenticado tenga rol de moderador o admin.
 * @param {import('express').Request} req - Objeto de solicitud Express
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Promise<void>} - Llama a next() si tiene rol adecuado, o responde con error 403
 */
export const isModerator = async (req, res, next) => {
    const roles = await usersRepo.getUserRoles(req.userId);
    if (roles.includes("moderator") || roles.includes("admin")) return next();
    return res.status(403).json({ message: "Require moderator role" });
};

/**
 * @descripción Verifica que el usuario autenticado tenga rol de admin.
 * @param {import('express').Request} req - Objeto de solicitud Express
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Promise<void>} - Llama a next() si es admin, o responde con error 403
 */
export const isAdmin = async (req, res, next) => {
    const roles = await usersRepo.getUserRoles(req.userId);
    if (roles.includes("admin")) return next();
    return res.status(403).json({ message: "Require admin role" });
};

/**
 * @descripción Genera un token JWT de acceso con duración de 15 minutos.
 * @param {number} userId - ID del usuario para el que se genera el token
 * @returns {string} - Token JWT de acceso firmado
 */
export const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId, type: 'access' }, config.SECRET, { expiresIn: '15m' });
};

/**
 * @descripción Genera un token JWT de refresco con duración de 7 días.
 * @param {number} userId - ID del usuario para el que se genera el token
 * @returns {string} - Token JWT de refresco firmado
 */
export const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId, type: 'refresh' }, config.REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * @descripción Verifica la validez de un token de refresco JWT.
 * @param {string} token - Token de refresco a verificar
 * @returns {object|null} - El payload decodificado del token si es válido, o null si no lo es
 */
export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

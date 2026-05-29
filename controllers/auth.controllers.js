import jwt from 'jsonwebtoken';
import config from '../config.js';
import * as usersRepo from '../repositories/users.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middlewares/authJwt.js';
import { pool } from '../db/connection.js';

/**
 * @descripción Registra un nuevo usuario en el sistema. Crea el usuario, asigna roles, registra en auditoría y genera tokens de acceso y refresco.
 * @param {import('express').Request} req - Objeto de solicitud Express
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Promise<void>} - Responde con el usuario creado y los tokens
 * @throws {Error} - Error en la transacción de base de datos
 */
export const signup = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { username, email, password, roles } = req.body;
        const passwordHash = await hashPassword(password);
        const savedUser = await client.query(
            `INSERT INTO users (username, email, password) VALUES ($1, $2, $3)
             RETURNING id, username, email, created_at, updated_at`,
            [username, email, passwordHash]
        );
        const user = savedUser.rows[0];

        const rolesToAssign = (roles && roles.length > 0) ? roles : ['user'];
        const rolesResult = await client.query(`SELECT id, name FROM roles WHERE name = ANY($1)`, [rolesToAssign]);
        const roleIds = rolesResult.rows.map(r => r.id);
        if (roleIds.length > 0) {
            const values = roleIds.map((roleId, i) => `($1, $${i + 2})`).join(', ');
            await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ${values} ON CONFLICT DO NOTHING`, [user.id, ...roleIds]);
        }

        await client.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [user.id, 'signup', 'user', user.id]);

        await client.query('COMMIT');

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        res.status(201).json({
            user: { id: user.id, username: user.username, email: user.email },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

/**
 * @descripción Inicia sesión de un usuario existente. Verifica credenciales, registra en auditoría y genera tokens.
 * @param {import('express').Request} req - Objeto de solicitud Express con email y password en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con los tokens de acceso y refresco
 */
export const signin = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const userFound = email
            ? await usersRepo.findUserByEmail(email)
            : await usersRepo.findUserByUsername(username);

        if (!userFound) {
            return res.status(404).json({ message: 'User not found' });
        }

        const matchPassword = await comparePassword(password, userFound.password);

        if (!matchPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(userFound.id);
        const refreshToken = generateRefreshToken(userFound.id);

        await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [userFound.id, 'signin', 'user', userFound.id]);

        res.json({ accessToken, refreshToken });
    } catch (error) {
        next(error);
    }
};

/**
 * @descripción Renueva el token de acceso usando un token de refresco válido.
 * @param {import('express').Request} req - Objeto de solicitud Express con refreshToken en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con un nuevo par de tokens
 */
export const refresh = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
        return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await usersRepo.findUserById(decoded.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
};

/**
 * @descripción Cierra la sesión del usuario invalidando el token de refresco (lo agrega a una lista negra).
 * @param {import('express').Request} req - Objeto de solicitud Express con refreshToken en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde confirmando el cierre de sesión
 */
export const logout = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded) {
        const expiresAt = new Date(decoded.exp * 1000);
        await usersRepo.blacklistToken(refreshToken, expiresAt);
    }

    res.json({ message: 'Logged out successfully' });
};

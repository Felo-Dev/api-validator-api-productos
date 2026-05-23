import jwt from 'jsonwebtoken';
import config from '../config.js';
import * as usersRepo from '../repositories/users.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middlewares/authJwt.js';
import { pool } from '../db/connection.js';

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

export const signin = async (req, res) => {
    const userFound = await usersRepo.findUserByEmail(req.body.email);

    if (!userFound) {
        return res.status(404).json({ message: 'User not found' });
    }

    const matchPassword = await comparePassword(req.body.password, userFound.password);

    if (!matchPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(userFound.id);
    const refreshToken = generateRefreshToken(userFound.id);

    await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [userFound.id, 'signin', 'user', userFound.id]);

    res.json({ accessToken, refreshToken });
};

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

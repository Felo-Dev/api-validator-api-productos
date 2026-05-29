import bcrypt from 'bcryptjs';
import * as usersRepo from '../repositories/users.repository.js';

export const list = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const result = await usersRepo.listUsers({ page: Number(page), limit: Number(limit), search });
        res.json({ success: true, data: result.data, pagination: { page: Number(page), limit: Number(limit), total: result.total, pages: Math.ceil(result.total / Number(limit)) } });
    } catch (error) {
        next(error);
    }
};

export const get = async (req, res, next) => {
    try {
        const user = await usersRepo.findUserById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const roles = await usersRepo.getUserRoles(user.id);
        const { password, ...safe } = user;
        res.json({ success: true, data: { ...safe, roles } });
    } catch (error) {
        next(error);
    }
};

export const create = async (req, res, next) => {
    try {
        const { username, email, password, roles } = req.body;

        const existingUsername = await usersRepo.findUserByUsername(username);
        if (existingUsername) return res.status(400).json({ success: false, message: 'Username already exists' });

        const existingEmail = await usersRepo.findUserByEmail(email);
        if (existingEmail) return res.status(400).json({ success: false, message: 'Email already exists' });

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await usersRepo.createUser({ username, email, password: passwordHash });

        const rolesToAssign = (roles && roles.length > 0) ? roles : ['user'];
        await usersRepo.assignRolesToUser(user.id, rolesToAssign);

        const result = { ...user, roles: rolesToAssign };
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const update = async (req, res, next) => {
    try {
        const user = await usersRepo.findUserById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { username, email, password, roles } = req.body;
        const updates = {};

        if (username !== undefined && username !== user.username) {
            const existing = await usersRepo.findUserByUsername(username);
            if (existing) return res.status(400).json({ success: false, message: 'Username already exists' });
            updates.username = username;
        }

        if (email !== undefined && email !== user.email) {
            const existing = await usersRepo.findUserByEmail(email);
            if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
            updates.email = email;
        }

        if (password !== undefined && password) {
            const salt = await bcrypt.genSalt(12);
            updates.password = await bcrypt.hash(password, salt);
        }

        if (roles !== undefined) updates.roles = roles;

        const updated = await usersRepo.updateUser(Number(req.params.id), updates);
        const finalRoles = roles !== undefined ? roles : await usersRepo.getUserRoles(updated.id);

        res.json({ success: true, data: { ...updated, roles: finalRoles } });
    } catch (error) {
        next(error);
    }
};

export const remove = async (req, res, next) => {
    try {
        const deleted = await usersRepo.deleteUser(Number(req.params.id));
        if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: { message: 'User deleted successfully' } });
    } catch (error) {
        next(error);
    }
};

import * as usersRepo from '../repositories/users.repository.js'
import { hashPassword } from '../utils/password.js'

export const createUser = async (req, res) => {
    const { username, email, password, roles } = req.body;
    const hashed = await hashPassword(password);
    const savedUser = await usersRepo.createUser({ username, email, password: hashed });
    if (roles && Array.isArray(roles) && roles.length > 0) {
        await usersRepo.assignRolesToUser(savedUser.id, roles);
    }
    res.status(201).json(savedUser);
};

export const getUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await usersRepo.listUsers(page, limit);
    res.json({
        data: result.data,
        pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: Math.ceil(result.total / result.limit),
        },
    });
};

export const getUser = async (req, res) => {
    const user = await usersRepo.findUserById(req.params.userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    const roles = await usersRepo.getUserRoles(user.id);
    res.json({ ...user, roles });
};

export const updateUser = async (req, res) => {
    const fields = { ...req.body };
    if (fields.password) {
        fields.password = await hashPassword(fields.password);
    }
    const updated = await usersRepo.updateUser(req.params.userId, fields);
    if (!updated) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(updated);
}

export const deleteUser = async (req, res) => {
    const deleted = await usersRepo.softDeleteUser(req.params.userId);
    if (!deleted) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
}

import * as usersRepo from '../repositories/users.repository.js'
import { hashPassword } from '../utils/password.js'

/**
 * @descripción Crea un nuevo usuario con contraseña hasheada y roles opcionales.
 * @param {import('express').Request} req - Objeto de solicitud Express con username, email, password y roles en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con el usuario creado (código 201)
 */
export const createUser = async (req, res) => {
    const { username, email, password, roles } = req.body;
    const hashed = await hashPassword(password);
    const savedUser = await usersRepo.createUser({ username, email, password: hashed });
    if (roles && Array.isArray(roles) && roles.length > 0) {
        await usersRepo.assignRolesToUser(savedUser.id, roles);
    }
    res.status(201).json(savedUser);
};

/**
 * @descripción Obtiene una lista paginada de usuarios.
 * @param {import('express').Request} req - Objeto de solicitud Express con query params page y limit
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con la lista de usuarios y metadatos de paginación
 */
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

/**
 * @descripción Obtiene un usuario por su ID, incluyendo sus roles.
 * @param {import('express').Request} req - Objeto de solicitud Express con userId en los parámetros de ruta
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con el usuario y sus roles, o error 404 si no existe
 */
export const getUser = async (req, res) => {
    const user = await usersRepo.findUserById(req.params.userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    const roles = await usersRepo.getUserRoles(user.id);
    res.json({ ...user, roles });
};

/**
 * @descripción Actualiza los datos de un usuario existente. Hashea la contraseña si se proporciona.
 * @param {import('express').Request} req - Objeto de solicitud Express con userId en ruta y datos en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con el usuario actualizado o error 404 si no existe
 */
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

/**
 * @descripción Elimina un usuario de forma lógica (soft delete).
 * @param {import('express').Request} req - Objeto de solicitud Express con userId en los parámetros de ruta
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde confirmando la eliminación o error 404 si no existe
 */
export const deleteUser = async (req, res) => {
    const deleted = await usersRepo.softDeleteUser(req.params.userId);
    if (!deleted) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
}

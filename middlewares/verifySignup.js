import * as usersRepo from "../repositories/users.repository.js";

/**
 * @descripción Verifica que el username y el email del registro no existan ya en la base de datos.
 * @param {import('express').Request} req - Objeto de solicitud Express con username y email en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Promise<void>} - Llama a next() si no hay duplicados, o responde con error 400
 */
const checkDuplicateUsernameOrEmail = async (req, res, next) => {
    try {
        const existingUsername = await usersRepo.findUserByUsername(req.body.username);
        if (existingUsername) {
            return res.status(400).json({ message: "The username already exists" });
        }
        const existingEmail = await usersRepo.findUserByEmail(req.body.email);
        if (existingEmail) {
            return res.status(400).json({ message: "The email already exists" });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @descripción Verifica que los roles proporcionados en la solicitud sean válidos (user, moderator, admin).
 * @param {import('express').Request} req - Objeto de solicitud Express con roles en el cuerpo (opcional)
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Promise<void>} - Llama a next() si los roles son válidos, o responde con error 400
 */
const checkRolesExisted = async (req, res, next) => {
    if (req.body.roles && Array.isArray(req.body.roles)) {
        const allowed = ["user", "moderator", "admin"];
        for (const role of req.body.roles) {
            if (!allowed.includes(role)) {
                return res.status(400).json({ message: `Role '${role}' does not exist` });
            }
        }
    }
    next();
};

export { checkDuplicateUsernameOrEmail, checkRolesExisted };

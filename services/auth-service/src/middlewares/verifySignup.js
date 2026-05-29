import * as usersRepo from '../repositories/users.repository.js';

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
    try {
        const existingUsername = await usersRepo.findUserByUsername(req.body.username);
        if (existingUsername) {
            return res.status(400).json({ message: 'The username already exists' });
        }
        const existingEmail = await usersRepo.findUserByEmail(req.body.email);
        if (existingEmail) {
            return res.status(400).json({ message: 'The email already exists' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const checkRolesExisted = async (req, res, next) => {
    if (req.body.roles && Array.isArray(req.body.roles)) {
        const allowed = ['user', 'moderator', 'admin'];
        for (const role of req.body.roles) {
            if (!allowed.includes(role)) {
                return res.status(400).json({ message: `Role '${role}' does not exist` });
            }
        }
    }
    next();
};

export { checkDuplicateUsernameOrEmail, checkRolesExisted };

import { Router } from 'express';
import { z } from 'zod';
import * as authCtrl from '../controllers/auth.controllers.js';
import { checkDuplicateUsernameOrEmail, checkRolesExisted } from '../middlewares/verifySignup.js';

const router = Router();

const validate = (schema) => (req, res, next) => {
    try {
        req.validated = schema.parse(req.body);
        next();
    } catch (error) {
        const messages = error.issues?.map(e => `${e.path?.join('.') || 'body'}: ${e.message}`) || [];
        res.status(400).json({ message: 'Validation error', errors: messages });
    }
};

const signupSchema = z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    roles: z.array(z.enum(['user', 'moderator', 'admin'])).optional(),
});

const signinSchema = z.object({
    email: z.string().optional(),
    username: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
}).refine(data => data.email || data.username, {
    message: 'Email or username is required',
});

router.post('/signup', [validate(signupSchema), checkDuplicateUsernameOrEmail, checkRolesExisted], authCtrl.signup);
router.post('/signin', validate(signinSchema), authCtrl.signin);
router.post('/refresh', authCtrl.refresh);
router.post('/logout', authCtrl.logout);

export default router;

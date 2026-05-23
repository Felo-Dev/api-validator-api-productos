import { z } from 'zod';

export const signupSchema = z.object({
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

export const signinSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const productSchema = z.object({
    name: z.string().min(1).max(200),
    category: z.string().max(100).optional(),
    price: z.coerce.number().positive('Price must be a positive number'),
    imgURL: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

export const updateProductSchema = productSchema.partial();

export const userSchema = z.object({
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

export const updateUserSchema = z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores').optional(),
    email: z.string().email('Invalid email format').optional(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
        .optional(),
});

export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.string().optional(),
    search: z.string().optional(),
});

function formatErrors(error) {
    const issues = error.issues || error.errors || [];
    return issues.map(e => `${e.path?.join('.') || 'body'}: ${e.message}`);
}

export const validate = (schema) => (req, res, next) => {
    try {
        req.validated = schema.parse(req.body);
        next();
    } catch (error) {
        const messages = formatErrors(error);
        res.status(400).json({ message: 'Validation error', errors: messages });
    }
};

export const validateQuery = (schema) => (req, res, next) => {
    try {
        req.query = schema.parse(req.query);
        next();
    } catch (error) {
        const messages = formatErrors(error);
        res.status(400).json({ message: 'Validation error', errors: messages });
    }
};

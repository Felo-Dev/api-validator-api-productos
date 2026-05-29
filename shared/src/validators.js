import { z } from 'zod';

/**
 * @descripción Esquema Zod para validar parámetros de paginación
 */
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * @descripción Esquema Zod para validar la creación de productos
 */
export const createProductSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    category: z.string().max(100),
    price: z.coerce.number().positive(),
    compareAtPrice: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0).default(0),
    sku: z.string().max(50).optional(),
    images: z.array(z.string().url()).optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().default(true),
    taxRate: z.coerce.number().min(0).max(100).default(16.00),
});

/**
 * @descripción Esquema Zod para validar la actualización parcial de productos (todos los campos opcionales)
 */
export const updateProductSchema = createProductSchema.partial();

/**
 * @descripción Esquema Zod para validar la creación de órdenes con items y dirección de envío
 */
export const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive(),
        price: z.coerce.number().positive(),
    })).min(1),
    shippingAddress: z.object({
        street: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zipCode: z.string().min(1),
        country: z.string().min(1),
    }),
    paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'transfer']),
    notes: z.string().max(1000).optional(),
});

/**
 * @descripción Esquema Zod para validar el registro de nuevos usuarios
 */
export const signupSchema = z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    password: z.string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
});

/**
 * @descripción Esquema Zod para validar el inicio de sesión de usuarios
 */
export const signinSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

/**
 * @descripción Esquema Zod para validar la creación de categorías
 */
export const createCategorySchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    parentId: z.coerce.number().int().positive().optional(),
});

/**
 * @descripción Esquema Zod para validar la adición de items al carrito
 */
export const addCartItemSchema = z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive().max(999),
});

/**
 * @descripción Esquema Zod para validar la actualización completa del carrito
 */
export const updateCartSchema = z.object({
    items: z.array(z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(0).max(999),
    })),
});

// --- Billing / Invoice Schemas ---

/**
 * @descripción Esquema Zod para validar la creación de facturas CFDI
 */
export const createInvoiceSchema = z.object({
    orderId: z.coerce.number().int().positive().optional(),
    invoiceType: z.enum(['I', 'E', 'T', 'N']).default('I'),
    paymentForm: z.enum(['01', '03', '04', '05', '06', '08', '12', '13', '14', '15', '17', '23', '24', '25', '26', '27', '28', '29', '30', '31', '99']).default('99'),
    paymentMethod: z.enum(['PUE', 'PPD']).default('PPD'),
    cfdiUsage: z.string().length(3).default('G03'),
    currency: z.string().length(3).default('MXN'),
    exchangeRate: z.coerce.number().positive().default(1),
    notes: z.string().max(500).optional(),
    items: z.array(z.object({
        productId: z.coerce.number().int().positive().optional(),
        description: z.string().min(1).max(1000),
        quantity: z.coerce.number().positive(),
        unit: z.string().max(50).default('pieza'),
        unitPrice: z.coerce.number().min(0),
        discount: z.coerce.number().min(0).default(0),
        ivaRate: z.coerce.number().default(16.00),
        iepsRate: z.coerce.number().default(0),
        satProductCode: z.string().max(8).default('01010101'),
        satUnitCode: z.string().max(3).default('H87'),
    })).min(1),
});

/**
 * @descripción Esquema Zod para validar la actualización parcial de facturas
 */
export const updateInvoiceSchema = z.object({
    paymentForm: z.enum(['01', '03', '04', '05', '06', '08', '12', '13', '14', '15', '17', '23', '24', '25', '26', '27', '28', '29', '30', '31', '99']).optional(),
    paymentMethod: z.enum(['PUE', 'PPD']).optional(),
    cfdiUsage: z.string().length(3).optional(),
    notes: z.string().max(500).optional(),
    items: z.array(z.object({
        productId: z.coerce.number().int().positive().optional(),
        description: z.string().min(1).max(1000),
        quantity: z.coerce.number().positive(),
        unit: z.string().max(50).default('pieza'),
        unitPrice: z.coerce.number().min(0),
        discount: z.coerce.number().min(0).default(0),
        ivaRate: z.coerce.number().default(16.00),
        iepsRate: z.coerce.number().default(0),
        satProductCode: z.string().max(8).default('01010101'),
        satUnitCode: z.string().max(3).default('H87'),
    })).min(1).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' });

/**
 * @descripción Esquema Zod para validar datos fiscales (RFC y dirección)
 */
export const fiscalDataSchema = z.object({
    rfc: z.string().regex(/^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/, 'RFC inválido'),
    legalName: z.string().min(1).max(300),
    taxRegime: z.string().min(1).max(10),
    cfdiUsage: z.string().length(3).default('G03'),
    taxEmail: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(20).optional().or(z.literal('')),
    address: z.object({
        street: z.string().min(1),
        exteriorNumber: z.string().optional().or(z.literal('')),
        interiorNumber: z.string().optional().or(z.literal('')),
        neighborhood: z.string().optional().or(z.literal('')),
        city: z.string().min(1),
        municipality: z.string().optional().or(z.literal('')),
        state: z.string().min(1),
        zipCode: z.string().regex(/^[0-9]{5}$/, 'Código postal inválido'),
        country: z.string().default('México'),
    }).optional(),
});

/**
 * @descripción Esquema Zod para validar la cancelación de facturas
 */
export const cancelInvoiceSchema = z.object({
    reason: z.enum(['01', '02', '03', '04']),
    substituteUuid: z.string().uuid().optional(),
});

/**
 * @descripción Esquema Zod para validar filtros de consulta de facturas
 */
export const invoiceFiltersSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['pending', 'stamped', 'canceled']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * @descripción Middleware de Express que valida el cuerpo de la petición con un esquema Zod
 * @param {Object} schema - Esquema Zod para validar req.body
 * @returns {Function} - Middleware de Express para validación
 */
export function validate(schema) {
    return (req, res, next) => {
        try {
            req.validated = schema.parse(req.body);
            next();
        } catch (error) {
            const issues = error.issues || error.errors || [];
            const errors = issues.map(e => `${e.path?.join('.') || 'body'}: ${e.message}`);
            res.status(400).json({ message: 'Validation error', errors });
        }
    };
}

/**
 * @descripción Middleware de Express que valida los query parameters con un esquema Zod
 * @param {Object} schema - Esquema Zod para validar req.query
 * @returns {Function} - Middleware de Express para validación
 */
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            const issues = error.issues || error.errors || [];
            const errors = issues.map(e => `${e.path?.join('.') || 'query'}: ${e.message}`);
            res.status(400).json({ message: 'Validation error', errors });
        }
    };
}

/**
 * @descripción Middleware de Express que valida los parámetros de ruta con un esquema Zod
 * @param {Object} schema - Esquema Zod para validar req.params
 * @returns {Function} - Middleware de Express para validación
 */
export function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.validatedParams = schema.parse(req.params);
            next();
        } catch (error) {
            const issues = error.issues || error.errors || [];
            const errors = issues.map(e => `${e.path?.join('.') || 'params'}: ${e.message}`);
            res.status(400).json({ message: 'Validation error', errors });
        }
    };
}

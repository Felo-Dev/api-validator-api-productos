/**
 * @descripción Clase base para errores operacionales de la aplicación
 * @param {string} message - Mensaje descriptivo del error
 * @param {number} [statusCode=500] - Código de estado HTTP
 * @param {string} [code='INTERNAL_ERROR'] - Código interno del error
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * @descripción Error para datos de entrada inválidos
 * @param {string} message - Mensaje descriptivo del error
 * @param {Array} [errors=[]] - Lista de errores de validación específicos
 */
export class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

/**
 * @descripción Error para recursos no encontrados
 * @param {string} [message='Resource not found'] - Mensaje descriptivo del error
 */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

/**
 * @descripción Error para autenticación fallida
 * @param {string} [message='Unauthorized'] - Mensaje descriptivo del error
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

/**
 * @descripción Error para acceso denegado
 * @param {string} [message='Forbidden'] - Mensaje descriptivo del error
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

/**
 * @descripción Error para conflictos de recursos duplicados
 * @param {string} [message='Resource already exists'] - Mensaje descriptivo del error
 */
export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * @descripción Error para fallos en el procesamiento de pagos
 * @param {string} [message='Payment failed'] - Mensaje descriptivo del error
 */
export class PaymentError extends AppError {
    constructor(message = 'Payment failed') {
        super(message, 402, 'PAYMENT_ERROR');
    }
}

/**
 * @descripción Error para límite de peticiones excedido
 * @param {string} [message='Too many requests'] - Mensaje descriptivo del error
 */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

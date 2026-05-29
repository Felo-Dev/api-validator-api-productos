import sanitizeHtml from 'sanitize-html';

const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
};

/**
 * @descripción Elimina etiquetas HTML de un string y recorta espacios
 * @param {*} value - Valor a sanitizar
 * @returns {*} - El string sanitizado sin HTML, o el valor original si no es string
 */
export function sanitizeString(value) {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, sanitizeOptions).trim();
}

/**
 * @descripción Sanitiza todos los valores de tipo string dentro de un objeto
 * @param {Object} obj - Objeto cuyos valores string serán sanitizados
 * @returns {Object} - Nuevo objeto con los valores string sanitizados
 */
export function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = typeof value === 'string' ? sanitizeString(value) : value;
    }
    return sanitized;
}

/**
 * @descripción Middleware de Express que sanitiza req.body y req.query eliminando HTML
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para continuar el flujo
 */
export function sanitizeMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    next();
}

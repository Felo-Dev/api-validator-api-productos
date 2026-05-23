import sanitizeHtml from 'sanitize-html';

const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
};

export function sanitizeString(value) {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, sanitizeOptions).trim();
}

export function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = typeof value === 'string' ? sanitizeString(value) : value;
    }
    return sanitized;
}

export function sanitizeMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    next();
}

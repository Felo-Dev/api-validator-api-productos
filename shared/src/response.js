export function success(res, data, statusCode = 200) {
    return res.status(statusCode).json({ success: true, data });
}

export function paginated(res, { data, total, page, limit }) {
    return res.json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    });
}

export function created(res, data) {
    return success(res, data, 201);
}

export function error(res, message, statusCode = 500, code = 'INTERNAL_ERROR') {
    return res.status(statusCode).json({ success: false, message, code });
}

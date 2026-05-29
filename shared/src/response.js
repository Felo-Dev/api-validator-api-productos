/**
 * @descripción Envía una respuesta HTTP exitosa con código de estado y datos JSON
 * @param {Object} res - Objeto de respuesta de Express
 * @param {*} data - Datos a incluir en el cuerpo de la respuesta
 * @param {number} [statusCode=200] - Código de estado HTTP
 * @returns {Object} - Respuesta JSON con la propiedad success en true y los datos
 */
export function success(res, data, statusCode = 200) {
    return res.status(statusCode).json({ success: true, data });
}

/**
 * @descripción Envía una respuesta HTTP con datos paginados y metadatos de paginación
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Object} params - Parámetros de paginación
 * @param {Array} params.data - Lista de elementos de la página actual
 * @param {number} params.total - Total de elementos en todas las páginas
 * @param {number} params.page - Número de página actual
 * @param {number} params.limit - Cantidad máxima de elementos por página
 * @returns {Object} - Respuesta JSON con datos y metadatos de paginación
 */
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

/**
 * @descripción Envía una respuesta HTTP de recurso creado exitosamente (código 201)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {*} data - Datos del recurso creado
 * @returns {Object} - Respuesta JSON con código de estado 201
 */
export function created(res, data) {
    return success(res, data, 201);
}

/**
 * @descripción Envía una respuesta HTTP de error con mensaje y código interno
 * @param {Object} res - Objeto de respuesta de Express
 * @param {string} message - Mensaje descriptivo del error
 * @param {number} [statusCode=500] - Código de estado HTTP
 * @param {string} [code='INTERNAL_ERROR'] - Código interno del error
 * @returns {Object} - Respuesta JSON con la propiedad success en false
 */
export function error(res, message, statusCode = 500, code = 'INTERNAL_ERROR') {
    return res.status(statusCode).json({ success: false, message, code });
}

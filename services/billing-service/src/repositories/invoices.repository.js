import { query, pool } from '../db/index.js';

/**
 * @descripción Crea una factura y sus partidas en una transacción, retornando la factura completa con items.
 * @param {Object} params - Datos de la factura.
 * @param {number} params.userId - ID del usuario.
 * @param {number} [params.orderId] - ID de la orden asociada.
 * @param {string} [params.invoiceType='I'] - Tipo de comprobante (I, E, T).
 * @param {string} params.serie - Serie de la factura.
 * @param {number} params.folio - Folio de la factura.
 * @param {string} params.rfcEmisor - RFC del emisor.
 * @param {string} params.rfcReceptor - RFC del receptor.
 * @param {string} params.legalName - Razón social del receptor.
 * @param {string} params.taxRegime - Régimen fiscal del receptor.
 * @param {string} params.cfdiUsage - Uso del CFDI.
 * @param {string} params.paymentForm - Forma de pago.
 * @param {string} params.paymentMethod - Método de pago.
 * @param {string} params.currency - Moneda.
 * @param {number} params.exchangeRate - Tipo de cambio.
 * @param {number} params.subtotal - Subtotal.
 * @param {number} params.discount - Descuento.
 * @param {number} params.iva - IVA.
 * @param {number} params.ieps - IEPS.
 * @param {number} params.ivaRetained - IVA retenido.
 * @param {number} params.isrRetained - ISR retenido.
 * @param {number} params.total - Total.
 * @param {Array} params.items - Partidas de la factura.
 * @param {string} [params.notes] - Notas.
 * @returns {Promise<Object>} Factura creada con sus partidas.
 * @throws {Error} Si falla la transacción.
 */
export async function createInvoice({
    userId, orderId, invoiceType, serie, folio,
    rfcEmisor, rfcReceptor, legalName, taxRegime, cfdiUsage,
    paymentForm, paymentMethod, currency, exchangeRate,
    subtotal, discount, iva, ieps, ivaRetained, isrRetained, total,
    items, notes,
}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const invoiceResult = await client.query(`
            INSERT INTO invoices (
                user_id, order_id, invoice_type, invoice_serie, invoice_folio,
                rfc_emisor, rfc_receptor, legal_name, tax_regime, cfdi_usage,
                payment_form, payment_method, currency, exchange_rate,
                subtotal, discount, iva, ieps, iva_retained, isr_retained, total,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *
        `, [
            userId, orderId || null, invoiceType, serie, folio,
            rfcEmisor, rfcReceptor, legalName, taxRegime, cfdiUsage,
            paymentForm, paymentMethod, currency, exchangeRate,
            subtotal, discount, iva, ieps, ivaRetained || 0, isrRetained || 0, total,
            notes || null,
        ]);
        const invoice = invoiceResult.rows[0];

        for (const item of items) {
            await client.query(`
                INSERT INTO invoice_items (
                    invoice_id, product_id, sat_product_code, sat_unit_code,
                    description, quantity, unit, unit_price,
                    discount, subtotal, iva_rate, iva_amount, ieps_rate, ieps_amount, total
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                invoice.id,
                item.productId || null,
                item.satProductCode || '01010101',
                item.satUnitCode || 'H87',
                item.description,
                item.quantity,
                item.unit || 'pieza',
                item.unitPrice,
                item.discount || 0,
                item.netSubtotal || item.subtotal,
                item.ivaRate !== null && item.ivaRate !== undefined ? item.ivaRate : 16.00,
                item.iva || 0,
                item.iepsRate || 0,
                item.ieps || 0,
                item.total,
            ]);
        }

        await client.query('COMMIT');

        const itemsResult = await client.query(
            `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`, [invoice.id]
        );
        return { ...invoice, items: itemsResult.rows };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * @descripción Lista facturas con filtros opcionales (usuario, estado, fechas) y paginación.
 * @param {Object} filters - Filtros de búsqueda.
 * @param {number} filters.userId - ID del usuario.
 * @param {number} [filters.page=1] - Número de página.
 * @param {number} [filters.limit=20] - Resultados por página.
 * @param {string} [filters.status] - Filtro por estado del CFDI.
 * @param {string} [filters.dateFrom] - Fecha inicial (ISO).
 * @param {string} [filters.dateTo] - Fecha final (ISO).
 * @param {string} [filters.sortBy='created_at'] - Campo de ordenamiento.
 * @param {string} [filters.sortOrder='desc'] - Dirección del ordenamiento.
 * @returns {Promise<{data: Array, total: number}>} Lista de facturas y total de registros.
 */
export async function listInvoices({ userId, page = 1, limit = 20, status, dateFrom, dateTo, sortBy = 'created_at', sortOrder = 'desc' }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (userId) { conditions.push(`i.user_id = $${idx}`); values.push(userId); idx++; }
    if (status) { conditions.push(`i.cfdi_status = $${idx}`); values.push(status); idx++; }
    if (dateFrom) { conditions.push(`i.created_at >= $${idx}`); values.push(dateFrom); idx++; }
    if (dateTo) { conditions.push(`i.created_at <= $${idx}`); values.push(dateTo); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSort = ['created_at', 'folio', 'total', 'cfdi_status'];
    const sortField = allowedSort.includes(sortBy) ? `i.${sortBy}` : 'i.created_at';

    const result = await query(`
        SELECT i.*, COUNT(*) OVER() as total_count
        FROM invoices i
        ${where}
        ORDER BY ${sortField} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
        LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]);

    const data = result.rows.map(({ total_count, ...inv }) => inv);
    return { data, total: result.rows[0]?.total_count ? Number(result.rows[0].total_count) : 0 };
}

/**
 * @descripción Obtiene una factura por su ID, opcionalmente filtrando por usuario.
 * @param {number} id - ID de la factura.
 * @param {number} [userId=null] - ID del usuario para filtrar.
 * @returns {Promise<Object|null>} Datos de la factura o null si no existe.
 */
export async function getInvoiceById(id, userId = null) {
    const conditions = ['i.id = $1'];
    const values = [id];
    if (userId) { conditions.push('i.user_id = $2'); values.push(userId); }

    const result = await query(`
        SELECT i.* FROM invoices i WHERE ${conditions.join(' AND ')}
    `, values);
    return result.rows[0] || null;
}

/**
 * @descripción Obtiene todas las partidas (items) de una factura.
 * @param {number} invoiceId - ID de la factura.
 * @returns {Promise<Array>} Lista de partidas.
 */
export async function getInvoiceItems(invoiceId) {
    const result = await query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`, [invoiceId]
    );
    return result.rows;
}

/**
 * @descripción Actualiza campos permitidos de una factura pendiente (payment_form, payment_method, cfdi_usage, notes).
 * @param {number} id - ID de la factura.
 * @param {Object} updates - Campos a actualizar.
 * @returns {Promise<Object|null>} Factura actualizada o null si no hay cambios.
 */
export async function updateInvoice(id, updates) {
    const fields = {};
    const allowedFields = ['payment_form', 'payment_method', 'cfdi_usage', 'notes'];

    for (const key of allowedFields) {
        if (updates[key] !== undefined) {
            fields[key] = updates[key];
        }
    }

    if (Object.keys(fields).length === 0) return null;

    fields.updated_at = new Date();
    const setClauses = Object.keys(fields).map((k, i) => `${k} = $${i + 1}`);
    const values = Object.values(fields).concat(id);

    const result = await query(
        `UPDATE invoices SET ${setClauses.join(', ')} WHERE id = $${values.length} AND cfdi_status = 'pending' RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

/**
 * @descripción Reemplaza todas las partidas de una factura: elimina las existentes e inserta las nuevas en una transacción.
 * @param {number} invoiceId - ID de la factura.
 * @param {Array} items - Nuevas partidas a insertar.
 * @returns {Promise<Array>} Lista de partidas actualizadas.
 * @throws {Error} Si falla la transacción.
 */
export async function updateInvoiceItems(invoiceId, items) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

        for (const item of items) {
            await client.query(`
                INSERT INTO invoice_items (
                    invoice_id, product_id, sat_product_code, sat_unit_code,
                    description, quantity, unit, unit_price,
                    discount, subtotal, iva_rate, iva_amount, ieps_rate, ieps_amount, total
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                invoiceId,
                item.productId || null,
                item.satProductCode || '01010101',
                item.satUnitCode || 'H87',
                item.description,
                item.quantity,
                item.unit || 'pieza',
                item.unitPrice,
                item.discount || 0,
                item.subtotal,
                item.ivaRate !== null && item.ivaRate !== undefined ? item.ivaRate : 16.00,
                item.iva || 0,
                item.iepsRate || 0,
                item.ieps || 0,
                item.total,
            ]);
        }

        await client.query('COMMIT');

        const result = await client.query(
            `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`, [invoiceId]
        );
        return result.rows;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * @descripción Marca una factura como timbrada, guardando UUID, XML y fecha de timbrado.
 * @param {number} id - ID de la factura.
 * @param {Object} stampData - Datos del timbrado.
 * @param {string} stampData.uuid - UUID del CFDI.
 * @param {string} stampData.xml - XML del CFDI timbrado.
 * @param {string} stampData.stampedAt - Fecha de timbrado (ISO).
 * @returns {Promise<Object|null>} Factura actualizada o null.
 */
export async function stampInvoice(id, { uuid, xml, stampedAt }) {
    const result = await query(`
        UPDATE invoices SET
            cfdi_uuid = $2,
            cfdi_xml = $3,
            cfdi_stamped_at = $4,
            cfdi_status = 'stamped',
            updated_at = now()
        WHERE id = $1 AND cfdi_status = 'pending'
        RETURNING *
    `, [id, uuid, xml, stampedAt]);
    return result.rows[0] || null;
}

/**
 * @descripción Marca una factura timbrada como cancelada, registrando la fecha de cancelación.
 * @param {number} id - ID de la factura a cancelar.
 * @returns {Promise<Object|null>} Factura actualizada o null.
 */
export async function cancelInvoice(id) {
    const result = await query(`
        UPDATE invoices SET
            cfdi_status = 'canceled',
            cfdi_canceled_at = now(),
            updated_at = now()
        WHERE id = $1 AND cfdi_status = 'stamped'
        RETURNING *
    `, [id]);
    return result.rows[0] || null;
}

/**
 * @descripción Obtiene todas las facturas asociadas a una orden.
 * @param {number} orderId - ID de la orden.
 * @returns {Promise<Array>} Lista de facturas de la orden.
 */
export async function getInvoicesByOrder(orderId) {
    const result = await query(
        `SELECT * FROM invoices WHERE order_id = $1 ORDER BY created_at DESC`, [orderId]
    );
    return result.rows;
}

import { query, pool } from '../db/index.js';

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

export async function getInvoiceById(id, userId = null) {
    const conditions = ['i.id = $1'];
    const values = [id];
    if (userId) { conditions.push('i.user_id = $2'); values.push(userId); }

    const result = await query(`
        SELECT i.* FROM invoices i WHERE ${conditions.join(' AND ')}
    `, values);
    return result.rows[0] || null;
}

export async function getInvoiceItems(invoiceId) {
    const result = await query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`, [invoiceId]
    );
    return result.rows;
}

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

export async function getInvoicesByOrder(orderId) {
    const result = await query(
        `SELECT * FROM invoices WHERE order_id = $1 ORDER BY created_at DESC`, [orderId]
    );
    return result.rows;
}

import { query } from '../db/index.js';

/**
 * @descripción Obtiene los datos fiscales de un usuario por su ID.
 * @param {number} userId - ID del usuario.
 * @returns {Promise<Object|null>} Datos fiscales del usuario o null si no existen.
 */
export async function getFiscalData(userId) {
    const result = await query(`SELECT * FROM user_fiscal_data WHERE user_id = $1`, [userId]);
    return result.rows[0] || null;
}

/**
 * @descripción Crea o actualiza los datos fiscales de un usuario (upsert).
 * @param {number} userId - ID del usuario.
 * @param {Object} data - Datos fiscales a guardar.
 * @param {string} data.rfc - RFC del usuario.
 * @param {string} data.legalName - Razón social.
 * @param {string} data.taxRegime - Régimen fiscal.
 * @param {string} [data.cfdiUsage='G03'] - Uso del CFDI.
 * @param {string} [data.taxEmail] - Correo fiscal.
 * @param {string} [data.phone] - Teléfono.
 * @param {Object} [data.address] - Dirección (objeto JSON).
 * @returns {Promise<Object>} Datos fiscales creados o actualizados.
 */
export async function upsertFiscalData(userId, data) {
    const result = await query(`
        INSERT INTO user_fiscal_data (user_id, rfc, legal_name, tax_regime, cfdi_usage, tax_email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
            rfc = EXCLUDED.rfc,
            legal_name = EXCLUDED.legal_name,
            tax_regime = EXCLUDED.tax_regime,
            cfdi_usage = EXCLUDED.cfdi_usage,
            tax_email = EXCLUDED.tax_email,
            phone = EXCLUDED.phone,
            address = COALESCE(EXCLUDED.address, user_fiscal_data.address),
            updated_at = now()
        RETURNING *
    `, [
        userId,
        data.rfc,
        data.legalName,
        data.taxRegime,
        data.cfdiUsage || 'G03',
        data.taxEmail || null,
        data.phone || null,
        data.address ? JSON.stringify(data.address) : null,
    ]);
    return result.rows[0];
}

/**
 * @descripción Elimina los datos fiscales de un usuario.
 * @param {number} userId - ID del usuario.
 * @returns {Promise<Object|null>} Datos fiscales eliminados o null.
 */
export async function deleteFiscalData(userId) {
    const result = await query(`DELETE FROM user_fiscal_data WHERE user_id = $1 RETURNING *`, [userId]);
    return result.rows[0] || null;
}

/**
 * @descripción Obtiene el siguiente folio disponible para una serie y año, incrementando el contador atómicamente.
 * @param {string} [serie='F'] - Serie de la factura.
 * @returns {Promise<number>} Número de folio siguiente.
 */
export async function getNextFolio(serie = 'F') {
    const year = new Date().getFullYear();
    const result = await query(`
        INSERT INTO invoice_series (serie, year, current_folio)
        VALUES ($1, $2, 1)
        ON CONFLICT (serie, year) DO UPDATE SET
            current_folio = invoice_series.current_folio + 1
        RETURNING current_folio
    `, [serie, year]);
    return result.rows[0].current_folio;
}

import { query } from '../db/connection.js';

/**
 * @descripción Inserta los roles base (user, moderator, admin) en la base de datos si no existen
 * @returns {Promise<void>}
 */
export async function ensureBaseRoles() {
    await query(`INSERT INTO roles (name) VALUES ('user'), ('moderator'), ('admin') ON CONFLICT (name) DO NOTHING`);
}

/**
 * @descripción Obtiene los roles filtrados por una lista de nombres
 * @param {string[]} roleNames - Lista de nombres de roles a buscar
 * @returns {Promise<Object[]>} - Lista de roles encontrados con id y name
 */
export async function getRolesByNames(roleNames) {
    const result = await query(`SELECT id, name FROM roles WHERE name = ANY($1)`, [roleNames]);
    return result.rows;
}

/**
 * @descripción Obtiene todos los roles existentes ordenados alfabéticamente
 * @returns {Promise<Object[]>} - Lista de todos los roles con id y name
 */
export async function getAllRoles() {
    const result = await query(`SELECT id, name FROM roles ORDER BY name`);
    return result.rows;
}

import { query } from '../db/connection.js';

const USER_SELECT = `SELECT id, username, email, password, created_at, updated_at FROM users`;

/**
 * @descripción Crea un nuevo usuario en la base de datos
 * @param {Object} params - Datos del usuario
 * @param {string} params.username - Nombre de usuario
 * @param {string} params.email - Correo electrónico del usuario
 * @param {string} params.password - Contraseña hasheada del usuario
 * @returns {Promise<Object>} - El usuario creado con id, username, email, created_at, updated_at
 */
export async function createUser({ username, email, password }) {
    const created = await query(
        `INSERT INTO users (username, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, created_at, updated_at`,
        [username, email, password]
    );
    return created.rows[0];
}

/**
 * @descripción Busca un usuario por su correo electrónico
 * @param {string} email - Correo electrónico del usuario
 * @returns {Promise<Object|null>} - El usuario encontrado o null si no existe
 */
export async function findUserByEmail(email) {
    const result = await query(
        `${USER_SELECT} WHERE email = $1 AND deleted_at IS NULL`,
        [email]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Busca un usuario por su ID
 * @param {number} id - ID del usuario
 * @returns {Promise<Object|null>} - El usuario encontrado o null si no existe
 */
export async function findUserById(id) {
    const result = await query(
        `${USER_SELECT} WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Busca un usuario por su nombre de usuario
 * @param {string} username - Nombre de usuario
 * @returns {Promise<Object|null>} - El usuario encontrado o null si no existe
 */
export async function findUserByUsername(username) {
    const result = await query(
        `${USER_SELECT} WHERE username = $1 AND deleted_at IS NULL`,
        [username]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Obtiene una lista paginada de usuarios activos (no eliminados)
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=20] - Cantidad de usuarios por página
 * @returns {Promise<{data: Object[], total: number, page: number, limit: number}>} - Lista paginada de usuarios con metadatos
 */
export async function listUsers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await query(
        `${USER_SELECT.replace('SELECT', 'SELECT COUNT(*) OVER() as total_count,').replace('FROM users', 'FROM users')} 
         WHERE deleted_at IS NULL
         ORDER BY id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return {
        data: result.rows.map(({ total_count, ...user }) => user),
        total: result.rows[0]?.total_count ? Number(result.rows[0].total_count) : 0,
        page,
        limit,
    };
}

const ALLOWED_UPDATE_FIELDS = ['username', 'email', 'password'];

/**
 * @descripción Actualiza los campos permitidos de un usuario (username, email, password)
 * @param {number} id - ID del usuario a actualizar
 * @param {Object} fields - Objeto con los campos a actualizar
 * @returns {Promise<Object|null>} - El usuario actualizado o null si no hay campos válidos o no existe
 */
export async function updateUser(id, fields) {
    const allowed = Object.entries(fields).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key));
    if (allowed.length === 0) return null;

    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of allowed) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(value);
    }
    values.push(id);
    const result = await query(
        `UPDATE users SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${idx} AND deleted_at IS NULL
         RETURNING id, username, email, created_at, updated_at`,
        values
    );
    return result.rows[0] || null;
}

/**
 * @descripción Realiza un borrado lógico de un usuario estableciendo la fecha de eliminación
 * @param {number} id - ID del usuario a eliminar lógicamente
 * @returns {Promise<Object|null>} - El usuario marcado como eliminado o null si no existe
 */
export async function softDeleteUser(id) {
    const result = await query(
        `UPDATE users SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, username, email`,
        [id]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Elimina un usuario de forma permanente de la base de datos
 * @param {number} id - ID del usuario a eliminar
 * @returns {Promise<void>}
 */
export async function deleteUser(id) {
    await query(`DELETE FROM users WHERE id = $1`, [id]);
}

/**
 * @descripción Asigna una lista de roles a un usuario omitiendo duplicados
 * @param {number} userId - ID del usuario
 * @param {string[]} roleNames - Lista de nombres de roles a asignar
 * @returns {Promise<void>}
 */
export async function assignRolesToUser(userId, roleNames) {
    if (!roleNames || roleNames.length === 0) return;
    const result = await query(`SELECT id, name FROM roles WHERE name = ANY($1)`, [roleNames]);
    const roleIds = result.rows.map(r => r.id);
    if (roleIds.length === 0) return;
    const values = roleIds.map((roleId, i) => `($1, $${i + 2})`).join(', ');
    await query(`INSERT INTO user_roles (user_id, role_id) VALUES ${values} ON CONFLICT DO NOTHING`, [userId, ...roleIds]);
}

/**
 * @descripción Obtiene los nombres de los roles asignados a un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<string[]>} - Lista de nombres de roles del usuario
 */
export async function getUserRoles(userId) {
    const result = await query(
        `SELECT r.name FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = $1`,
        [userId]
    );
    return result.rows.map(r => r.name);
}

/**
 * @descripción Elimina todos los roles asignados a un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<void>}
 */
export async function removeUserRoles(userId) {
    await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
}

/**
 * @descripción Busca un token en la lista negra para verificar si ha sido invalidado
 * @param {string} token - Token JWT a buscar
 * @returns {Promise<Object|null>} - El registro del token en la lista negra o null si no existe
 */
export async function getTokenBlacklistByToken(token) {
    const result = await query(`SELECT * FROM token_blacklist WHERE token = $1`, [token]);
    return result.rows[0] || null;
}

/**
 * @descripción Agrega un token JWT a la lista negra para invalidarlo antes de su expiración
 * @param {string} token - Token JWT a invalidar
 * @param {Date} expiresAt - Fecha de expiración del token
 * @returns {Promise<void>}
 */
export async function blacklistToken(token, expiresAt) {
    await query(
        `INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING`,
        [token, expiresAt]
    );
}

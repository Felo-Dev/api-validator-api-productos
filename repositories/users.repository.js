import { query } from '../db/connection.js';

const USER_SELECT = `SELECT id, username, email, password, created_at, updated_at FROM users`;

export async function createUser({ username, email, password }) {
    const created = await query(
        `INSERT INTO users (username, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, created_at, updated_at`,
        [username, email, password]
    );
    return created.rows[0];
}

export async function findUserByEmail(email) {
    const result = await query(
        `${USER_SELECT} WHERE email = $1 AND deleted_at IS NULL`,
        [email]
    );
    return result.rows[0] || null;
}

export async function findUserById(id) {
    const result = await query(
        `${USER_SELECT} WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );
    return result.rows[0] || null;
}

export async function findUserByUsername(username) {
    const result = await query(
        `${USER_SELECT} WHERE username = $1 AND deleted_at IS NULL`,
        [username]
    );
    return result.rows[0] || null;
}

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

export async function softDeleteUser(id) {
    const result = await query(
        `UPDATE users SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, username, email`,
        [id]
    );
    return result.rows[0] || null;
}

export async function deleteUser(id) {
    await query(`DELETE FROM users WHERE id = $1`, [id]);
}

export async function assignRolesToUser(userId, roleNames) {
    if (!roleNames || roleNames.length === 0) return;
    const result = await query(`SELECT id, name FROM roles WHERE name = ANY($1)`, [roleNames]);
    const roleIds = result.rows.map(r => r.id);
    if (roleIds.length === 0) return;
    const values = roleIds.map((roleId, i) => `($1, $${i + 2})`).join(', ');
    await query(`INSERT INTO user_roles (user_id, role_id) VALUES ${values} ON CONFLICT DO NOTHING`, [userId, ...roleIds]);
}

export async function getUserRoles(userId) {
    const result = await query(
        `SELECT r.name FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = $1`,
        [userId]
    );
    return result.rows.map(r => r.name);
}

export async function removeUserRoles(userId) {
    await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
}

export async function getTokenBlacklistByToken(token) {
    const result = await query(`SELECT * FROM token_blacklist WHERE token = $1`, [token]);
    return result.rows[0] || null;
}

export async function blacklistToken(token, expiresAt) {
    await query(
        `INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING`,
        [token, expiresAt]
    );
}

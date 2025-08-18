import { query } from '../db/connection.js';

export async function createUser({ username, email, password }) {
    const result = await query(
        `INSERT INTO users (username, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, created_at, updated_at`,
        [username, email, password]
    );
    return result.rows[0];
}

export async function findUserByEmail(email) {
    const result = await query(
        `SELECT id, username, email, password FROM users WHERE email = $1`,
        [email]
    );
    return result.rows[0] || null;
}

export async function findUserById(id) {
    const result = await query(
        `SELECT id, username, email, password FROM users WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

export async function listUsers() {
    const result = await query(`SELECT id, username, email, created_at, updated_at FROM users ORDER BY id DESC`);
    return result.rows;
}

export async function updateUser(id, fields) {
    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(value);
    }
    values.push(id);
    const result = await query(
        `UPDATE users SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${idx}
         RETURNING id, username, email, created_at, updated_at`,
        values
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



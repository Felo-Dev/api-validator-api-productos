import { query } from '../db/index.js';

const USER_SELECT = 'SELECT id, username, email, password, created_at, updated_at FROM users';

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

export async function blacklistToken(token, expiresAt) {
    await query(
        'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
        [token, expiresAt]
    );
}

export async function assignRolesToUser(userId, roleNames) {
    if (!roleNames || roleNames.length === 0) return;
    const result = await query('SELECT id, name FROM roles WHERE name = ANY($1)', [roleNames]);
    const roleIds = result.rows.map(r => r.id);
    if (roleIds.length === 0) return;
    const values = roleIds.map((_, i) => `($1, $${i + 2})`).join(', ');
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

const PUBLIC_USER = 'id, username, email, created_at, updated_at';

export async function listUsers({ page = 1, limit = 20, search } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let idx = 1;

    if (search) {
        conditions.push(`(username ILIKE $${idx} OR email ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await query(`SELECT COUNT(*) as total FROM users ${where}`, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const result = await query(
        `SELECT ${PUBLIC_USER} FROM users ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
    );

    const userIds = result.rows.map(u => u.id);
    const rolesMap = {};
    if (userIds.length > 0) {
        const rolesResult = await query(
            `SELECT ur.user_id, r.name FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = ANY($1)`,
            [userIds]
        );
        for (const row of rolesResult.rows) {
            if (!rolesMap[row.user_id]) rolesMap[row.user_id] = [];
            rolesMap[row.user_id].push(row.name);
        }
    }

    const data = result.rows.map(u => ({
        ...u,
        roles: rolesMap[u.id] || ['user'],
    }));

    return { data, total };
}

export async function updateUser(id, { username, email, password, roles }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (username !== undefined) { fields.push(`username = $${idx++}`); values.push(username); }
    if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
    if (password !== undefined) { fields.push(`password = $${idx++}`); values.push(password); }

    if (fields.length > 0) {
        values.push(id);
        await query(
            `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx} AND deleted_at IS NULL`,
            values
        );
    }

    if (roles !== undefined) {
        await query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        if (roles.length > 0) {
            await assignRolesToUser(id, roles);
        }
    }

    return findUserById(id);
}

export async function deleteUser(id) {
    const result = await query(
        `UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [id]
    );
    return result.rows[0] || null;
}

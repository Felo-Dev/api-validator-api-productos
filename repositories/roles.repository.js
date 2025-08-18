import { query } from '../db/connection.js';

export async function ensureBaseRoles() {
    await query(`INSERT INTO roles (name) VALUES ('user'), ('moderator'), ('admin') ON CONFLICT (name) DO NOTHING`);
}

export async function getRolesByNames(roleNames) {
    const result = await query(`SELECT id, name FROM roles WHERE name = ANY($1)`, [roleNames]);
    return result.rows;
}



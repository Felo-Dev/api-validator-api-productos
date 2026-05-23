import { pool } from '../db/connection.js';
import { hashPassword } from '../utils/password.js';

async function seed() {
    try {
        console.log('Starting seed...');

        await pool.query(`INSERT INTO roles (name) VALUES ('user'), ('moderator'), ('admin') ON CONFLICT (name) DO NOTHING`);

        const adminPassword = await hashPassword('Admin123!');
        const modPassword = await hashPassword('Mod123!');
        const userPassword = await hashPassword('User123!');

        const admin = await pool.query(`INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', $1) ON CONFLICT (email) DO NOTHING RETURNING id`, [adminPassword]);
        const mod = await pool.query(`INSERT INTO users (username, email, password) VALUES ('moderator', 'mod@example.com', $1) ON CONFLICT (email) DO NOTHING RETURNING id`, [modPassword]);
        const user = await pool.query(`INSERT INTO users (username, email, password) VALUES ('testuser', 'user@example.com', $1) ON CONFLICT (email) DO NOTHING RETURNING id`, [userPassword]);

        if (admin.rows.length > 0) {
            const adminId = admin.rows[0].id;
            const adminRole = await pool.query(`SELECT id FROM roles WHERE name = 'admin'`);
            await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [adminId, adminRole.rows[0].id]);
        }

        if (mod.rows.length > 0) {
            const modId = mod.rows[0].id;
            const modRole = await pool.query(`SELECT id FROM roles WHERE name = 'moderator'`);
            await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [modId, modRole.rows[0].id]);
        }

        if (user.rows.length > 0) {
            const userId = user.rows[0].id;
            const userRole = await pool.query(`SELECT id FROM roles WHERE name = 'user'`);
            await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, userRole.rows[0].id]);
        }

        const existingProducts = await pool.query(`SELECT COUNT(*) FROM products`);
        if (Number(existingProducts.rows[0].count) === 0) {
            const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
            const productNames = [
                ['Laptop Pro 15', 'Smartphone X', 'Wireless Headphones', '4K Monitor', 'Tablet Ultra'],
                ['Cotton T-Shirt', 'Denim Jeans', 'Running Shoes', 'Winter Jacket', 'Silk Scarf'],
                ['JavaScript Guide', 'Node.js Cookbook', 'PostgreSQL Mastery', 'React Patterns', 'Express in Action'],
                ['Smart Lamp', 'Coffee Maker', 'Robot Vacuum', 'Air Purifier', 'Blender Pro'],
                ['Yoga Mat', 'Dumbbells Set', 'Running Belt', 'Water Bottle', 'Fitness Tracker'],
            ];

            for (let catIdx = 0; catIdx < categories.length; catIdx++) {
                for (const name of productNames[catIdx]) {
                    const price = (Math.random() * 200 + 10).toFixed(2);
                    await pool.query(`INSERT INTO products (name, category, price, img_url) VALUES ($1, $2, $3, $4)`, [name, categories[catIdx], price, `https://picsum.photos/seed/${name.replace(/\s/g, '')}/400/300`]);
                }
            }
        }

        console.log('Seed completed successfully');
    } catch (error) {
        console.error('Seed failed:', error.message);
    } finally {
        await pool.end();
    }
}

seed();

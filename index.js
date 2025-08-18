// index.js
import app from './app.js';
import { pool } from './db/connection.js';
import { createRoles } from './libs/initSteup.js';

const PORT = process.env.PORT || 4000;

async function start() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        await createRoles();
        app.listen(PORT, () => {
            console.log(`El servidor esta corriendo en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to the database:', error);
        process.exit(1);
    }
}

start();

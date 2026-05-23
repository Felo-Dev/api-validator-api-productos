import app from './app.js';
import { pool } from './db/connection.js';
import { createRoles } from './libs/initSetup.js';
import config from './config.js';

const PORT = config.PORT;

async function start() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        await createRoles();

        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        async function gracefulShutdown(signal) {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                console.log('HTTP server closed.');
                try {
                    await pool.end();
                    console.log('Database connections closed.');
                } catch (err) {
                    console.error('Error closing database:', err);
                    process.exit(1);
                }
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Forced shutdown after timeout.');
                process.exit(1);
            }, 10000);
        }

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

start();

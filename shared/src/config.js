import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
console.log('DEBUG: .env path:', envPath, 'JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'not set');

/**
 * @descripción Carga y congela la configuración de la aplicación desde variables de entorno
 * @param {Object} [defaults={}] - Valores por defecto para propiedades de configuración
 * @returns {Object} - Objeto de configuración congelado con valores de entorno
 * @throws {Error} - Si faltan variables de entorno requeridas
 */
export const loadConfig = (defaults = {}) => {
    const required = ['JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }

    return Object.freeze({
        ...defaults,
        PORT: Number(process.env.PORT) || 4000,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`,
        NODE_ENV: process.env.NODE_ENV || 'development',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
    });
};

/**
 * @descripción Carga la configuración de base de datos desde variables de entorno con un prefijo dado
 * @param {string} [prefix='PG'] - Prefijo para las variables de entorno de la base de datos
 * @returns {Object} - Objeto con configuración de conexión a base de datos
 */
export const loadDbConfig = (prefix = 'PG') => {
    const env = (suffix) => process.env[`${prefix}_${suffix}`] || process.env[`${prefix}${suffix}`];
    return {
        host: env('HOST') || '127.0.0.1',
        port: Number(env('PORT') || 5432),
        user: env('USER') || 'postgres',
        password: env('PASSWORD') || 'postgres',
        database: env('DATABASE') || 'ecommerce_db',
        max: Number(env('MAX_CONNECTIONS') || 10),
    };
};

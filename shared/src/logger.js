/**
 * @descripción Crea un logger con prefijo del nombre del servicio para identificar las trazas
 * @param {string} serviceName - Nombre del servicio que aparecerá en los mensajes de log
 * @returns {Object} - Objeto con métodos info, warn, error y debug para realizar logs
 */
export function createLogger(serviceName) {
    const prefix = `[${serviceName}]`;
    return {
        info: (...args) => console.log(prefix, '[INFO]', ...args),
        warn: (...args) => console.warn(prefix, '[WARN]', ...args),
        error: (...args) => console.error(prefix, '[ERROR]', ...args),
        debug: (...args) => {
            if (process.env.NODE_ENV !== 'production') {
                console.log(prefix, '[DEBUG]', ...args);
            }
        },
    };
}

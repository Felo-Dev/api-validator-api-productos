import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * @descripción Genera un hash seguro de una contraseña usando bcrypt
 * @param {string} plainPassword - Contraseña en texto plano
 * @returns {Promise<string>} - Contraseña hasheada
 * @throws {Error} - Si bcrypt falla al generar el hash
 */
export async function hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(plainPassword, salt);
}

/**
 * @descripción Compara una contraseña en texto plano con su hash
 * @param {string} plainPassword - Contraseña en texto plano
 * @param {string} hashedPassword - Hash de la contraseña a comparar
 * @returns {Promise<boolean>} - true si coinciden, false en caso contrario
 */
export async function comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}



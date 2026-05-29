import { ensureBaseRoles } from '../repositories/roles.repository.js'

/**
 * @descripción Crea los roles base (user, moderator, admin) si no existen en la base de datos.
 * @returns {Promise<void>} - No retorna valor, imprime error en consola si falla
 */
export const createRoles = async () => {
    try {
        await ensureBaseRoles();
    } catch (error) {
        console.error('Error creating roles:', error);
    }
}

import { ensureBaseRoles } from '../repositories/roles.repository.js'
export const createRoles = async () => {
    try {
        await ensureBaseRoles();
    } catch (error) {
        console.log(error);
    }
}

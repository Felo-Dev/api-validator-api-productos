import * as fiscalRepo from '../repositories/fiscal.repository.js';
import { success, created, createLogger } from '@ecommerce/shared';

const logger = createLogger('billing-service');

export async function getFiscalData(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const data = await fiscalRepo.getFiscalData(userId);
    success(res, data || {});
}

export async function upsertFiscalData(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const data = req.validated || req.body;
    const result = await fiscalRepo.upsertFiscalData(userId, data);
    created(res, result);
}

export async function deleteFiscalData(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    await fiscalRepo.deleteFiscalData(userId);
    success(res, { message: 'Fiscal data deleted' });
}

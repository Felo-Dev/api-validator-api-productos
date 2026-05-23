import { success, createLogger } from '@ecommerce/shared';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = createLogger('billing-service');

function loadJson(filename) {
    const filePath = join(__dirname, '..', 'data', filename);
    if (!existsSync(filePath)) {
        logger.warn(`Catalog file not found: ${filePath}`);
        return [];
    }
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (err) {
        logger.error(`Error loading catalog ${filename}:`, err);
        return [];
    }
}

export function getTaxRegimes(req, res) {
    const regimes = loadJson('tax-regimes.json');
    success(res, regimes);
}

export function getCfdiUsages(req, res) {
    const usages = loadJson('cfdi-usages.json');
    success(res, usages);
}

export function getSatProductCodes(req, res) {
    const codes = loadJson('sat-codes.json');
    const { search, page = 1, limit = 50 } = req.query;
    let filtered = codes;

    if (search) {
        const term = search.toLowerCase();
        filtered = codes.filter(c =>
            c.code?.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term)
        );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    success(res, {
        data,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
}

export function getSatUnitCodes(req, res) {
    const codes = [
        { code: 'H87', name: 'Pieza', description: 'Pieza (unidad)' },
        { code: 'KGM', name: 'Kilogramo', description: 'Kilogramo' },
        { code: 'LTR', name: 'Litro', description: 'Litro' },
        { code: 'MTR', name: 'Metro', description: 'Metro' },
        { code: 'MTK', name: 'Metro cuadrado', description: 'Metro cuadrado' },
        { code: 'C62', name: 'Ciento', description: 'Ciento de piezas' },
        { code: 'DZN', name: 'Docena', description: 'Docena de piezas' },
        { code: 'GRM', name: 'Gramo', description: 'Gramo' },
        { code: 'EA', name: 'Cada uno', description: 'Cada uno' },
        { code: 'SER', name: 'Servicio', description: 'Servicio profesional' },
        { code: 'ACT', name: 'Actividad', description: 'Actividad' },
        { code: 'E48', name: 'Unidad de servicio', description: 'Unidad de servicio' },
        { code: 'DAY', name: 'Día', description: 'Día (servicio)' },
        { code: 'MON', name: 'Mes', description: 'Mes (servicio)' },
        { code: 'XNG', name: 'Horas', description: 'Horas de servicio' },
    ];
    success(res, codes);
}

import * as invoiceRepo from '../repositories/invoices.repository.js';
import * as fiscalRepo from '../repositories/fiscal.repository.js';
import * as taxService from '../services/tax.service.js';
import * as cfdiService from '../services/cfdi.service.js';
import { generateInvoiceHtml } from '../services/pdf.service.js';
import { eventBus, EVENTS, success, created, paginated, createLogger } from '@ecommerce/shared';

const logger = createLogger('billing-service');

const EMISOR_CONFIG = {
    rfc: process.env.BILLING_EMISOR_RFC || 'XAXX010101000',
    nombre: process.env.BILLING_EMISOR_NOMBRE || 'Mi Empresa S.A. de C.V.',
    regimenFiscal: process.env.BILLING_EMISOR_REGIMEN || '601',
    codigoPostal: process.env.BILLING_EMISOR_CP || '00000',
};

/**
 * @descripción Crea una nueva factura: valida datos fiscales del usuario, calcula totales, asigna folio y publica evento INVOICE_CREATED.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function createInvoice(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const data = req.validated || req.body;

    const fiscalData = await fiscalRepo.getFiscalData(userId);
    if (!fiscalData) {
        return res.status(400).json({ success: false, message: 'Complete tus datos fiscales primero (RFC, régimen, etc.)' });
    }

    const totals = taxService.calculateInvoiceTotals(data.items, {
        ivaRate: 16.00,
    });

    const folio = await fiscalRepo.getNextFolio('F');

    const invoiceData = {
        userId,
        orderId: data.orderId || null,
        invoiceType: data.invoiceType || 'I',
        serie: 'F',
        folio,
        rfcEmisor: EMISOR_CONFIG.rfc,
        rfcReceptor: fiscalData.rfc,
        legalName: fiscalData.legal_name,
        taxRegime: fiscalData.tax_regime,
        cfdiUsage: data.cfdiUsage || fiscalData.cfdi_usage || 'G03',
        paymentForm: data.paymentForm || '99',
        paymentMethod: data.paymentMethod || 'PPD',
        currency: data.currency || 'MXN',
        exchangeRate: data.exchangeRate || 1,
        subtotal: totals.subtotal,
        discount: totals.discount,
        iva: totals.iva,
        ieps: totals.ieps,
        ivaRetained: totals.ivaRetained,
        isrRetained: totals.isrRetained,
        total: totals.total,
        items: totals.items.map(item => ({
            ...item,
            description: item.description,
            unitPrice: item.unitPrice || item.unit_price,
        })),
        notes: data.notes || null,
    };

    const invoice = await invoiceRepo.createInvoice(invoiceData);

    await eventBus.publish(EVENTS.INVOICE_CREATED, {
        invoiceId: invoice.id,
        userId,
        total: invoice.total,
        folio: `${invoice.invoice_serie}${String(invoice.invoice_folio).padStart(6, '0')}`,
    });

    created(res, invoice);
}

/**
 * @descripción Lista las facturas del usuario con filtros opcionales (estado, fechas) y paginación.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function listInvoices(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { page, limit, status, dateFrom, dateTo, sortBy, sortOrder } = req.query;

    const result = await invoiceRepo.listInvoices({
        userId,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        status,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
    });

    paginated(res, { ...result, page: Number(page) || 1, limit: Number(limit) || 20 });
}

/**
 * @descripción Obtiene una factura por su ID junto con sus partidas (items).
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function getInvoice(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const invoice = await invoiceRepo.getInvoiceById(req.params.id, userId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

    const items = await invoiceRepo.getInvoiceItems(invoice.id);
    success(res, { ...invoice, items });
}

/**
 * @descripción Actualiza una factura pendiente: permite modificar datos generales y/o recalcular totales si se envían items.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function updateInvoice(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const invoice = await invoiceRepo.getInvoiceById(req.params.id, userId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    if (invoice.cfdi_status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Solo se pueden editar facturas pendientes de timbrar' });
    }

    const data = req.validated || req.body;

    if (data.items) {
        const totals = taxService.calculateInvoiceTotals(data.items);
        const updatedItems = await invoiceRepo.updateInvoiceItems(invoice.id, totals.items);
        await invoiceRepo.updateInvoice(invoice.id, {
            subtotal: totals.subtotal,
            discount: totals.discount,
            iva: totals.iva,
            ieps: totals.ieps,
            ivaRetained: totals.ivaRetained,
            isrRetained: totals.isrRetained,
            total: totals.total,
        });

        const updated = await invoiceRepo.getInvoiceById(invoice.id);
        success(res, { ...updated, items: updatedItems });
    } else {
        const updated = await invoiceRepo.updateInvoice(invoice.id, data);
        const items = await invoiceRepo.getInvoiceItems(invoice.id);
        success(res, { ...updated, items });
    }
}

/**
 * @descripción Timbra una factura pendiente: genera el XML del CFDI, lo envía al PAC y actualiza el registro.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function stampInvoice(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const invoice = await invoiceRepo.getInvoiceById(req.params.id, userId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    if (invoice.cfdi_status !== 'pending') {
        return res.status(400).json({ success: false, message: `La factura ya está ${invoice.cfdi_status === 'stamped' ? 'timbrda' : 'cancelada'}` });
    }

    const items = await invoiceRepo.getInvoiceItems(invoice.id);
    const { xml, uuid } = cfdiService.generateCfdiXml(invoice, items, EMISOR_CONFIG);
    const stampResult = await cfdiService.stampCfdi(xml, uuid);

    const updated = await invoiceRepo.stampInvoice(invoice.id, stampResult);

    await eventBus.publish(EVENTS.INVOICE_STAMPED, {
        invoiceId: invoice.id,
        uuid,
        userId,
        total: invoice.total,
        folio: `${invoice.invoice_serie}${String(invoice.invoice_folio).padStart(6, '0')}`,
    });

    success(res, { ...updated, items });
}

/**
 * @descripción Cancela una factura previamente timbrada y publica el evento INVOICE_CANCELLED.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function cancelInvoice(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const invoice = await invoiceRepo.getInvoiceById(req.params.id, userId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    if (invoice.cfdi_status !== 'stamped') {
        return res.status(400).json({ success: false, message: 'Solo se pueden cancelar facturas timbradas' });
    }

    const updated = await invoiceRepo.cancelInvoice(invoice.id);

    await eventBus.publish(EVENTS.INVOICE_CANCELLED, {
        invoiceId: invoice.id,
        uuid: invoice.cfdi_uuid,
        userId,
    });

    const items = await invoiceRepo.getInvoiceItems(invoice.id);
    success(res, { ...updated, items });
}

/**
 * @descripción Descarga el XML del CFDI de una factura timbrada.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function getInvoiceXml(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const invoice = await invoiceRepo.getInvoiceById(req.params.id, userId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    if (!invoice.cfdi_xml) {
        return res.status(400).json({ success: false, message: 'La factura no tiene XML, debe timbrarse primero' });
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="CFDI-${invoice.invoice_serie}${String(invoice.invoice_folio).padStart(6, '0')}.xml"`);
    res.send(invoice.cfdi_xml);
}

/**
 * @descripción Genera y retorna la representación HTML de la factura para su impresión/PDF.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Promise<void>}
 */
export async function getInvoicePdf(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const invoice = await invoiceRepo.getInvoiceById(req.params.id, userId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

    const items = await invoiceRepo.getInvoiceItems(invoice.id);

    const fiscalData = await fiscalRepo.getFiscalData(userId);

    const html = generateInvoiceHtml(invoice, items, fiscalData, {
        businessName: EMISOR_CONFIG.nombre,
        businessRfc: EMISOR_CONFIG.rfc,
        businessTaxRegime: EMISOR_CONFIG.regimenFiscal,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
}

/**
 * @descripción Crea automáticamente una factura a partir de los datos de una orden pagada. Utilizada por el suscriptor del evento ORDER_PAID.
 * @param {Object} orderData - Datos de la orden pagada.
 * @param {number} orderData.userId - ID del usuario.
 * @param {number} orderData.orderId - ID de la orden.
 * @param {Array} orderData.items - Lista de productos de la orden.
 * @returns {Promise<Object|null>} La factura creada o null si no se pudo crear.
 */
export async function autoCreateFromOrder(orderData) {
    try {
        const userId = orderData.userId;
        const fiscalData = await fiscalRepo.getFiscalData(userId);
        if (!fiscalData) {
            logger.warn(`Cannot auto-create invoice: user ${userId} has no fiscal data`);
            return null;
        }

        const items = (orderData.items || []).map(item => ({
            description: item.name || item.description || `Producto #${item.productId}`,
            quantity: item.quantity,
            unitPrice: item.price,
            unit: 'pieza',
            ivaRate: 16.00,
            iepsRate: 0,
            discount: 0,
            satProductCode: '01010101',
            satUnitCode: 'H87',
            productId: item.productId,
        }));

        if (items.length === 0) return null;

        const totals = taxService.calculateInvoiceTotals(items);
        const folio = await fiscalRepo.getNextFolio('F');

        const invoiceData = {
            userId,
            orderId: orderData.orderId,
            invoiceType: 'I',
            serie: 'F',
            folio,
            rfcEmisor: EMISOR_CONFIG.rfc,
            rfcReceptor: fiscalData.rfc,
            legalName: fiscalData.legal_name,
            taxRegime: fiscalData.tax_regime,
            cfdiUsage: fiscalData.cfdi_usage || 'G03',
            paymentForm: '99',
            paymentMethod: 'PPD',
            currency: 'MXN',
            exchangeRate: 1,
            subtotal: totals.subtotal,
            discount: totals.discount,
            iva: totals.iva,
            ieps: totals.ieps,
            ivaRetained: totals.ivaRetained,
            isrRetained: totals.isrRetained,
            total: totals.total,
            items: totals.items,
            notes: `Factura generada automáticamente de la orden #${orderData.orderId}`,
        };

        const invoice = await invoiceRepo.createInvoice(invoiceData);

        await eventBus.publish(EVENTS.INVOICE_CREATED, {
            invoiceId: invoice.id,
            userId,
            orderId: orderData.orderId,
            total: invoice.total,
            folio: `${invoice.invoice_serie}${String(invoice.invoice_folio).padStart(6, '0')}`,
        });

        logger.info(`Auto-created invoice #${invoice.id} for order #${orderData.orderId}`);
        return invoice;
    } catch (err) {
        logger.error('Failed to auto-create invoice:', err);
        return null;
    }
}

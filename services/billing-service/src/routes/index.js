import { Router } from 'express';
import * as invoiceCtl from '../controllers/invoices.controller.js';
import * as fiscalCtl from '../controllers/fiscal.controller.js';
import * as catalogsCtl from '../controllers/catalogs.controller.js';
import { validate, fiscalDataSchema, createInvoiceSchema, updateInvoiceSchema, invoiceFiltersSchema, cancelInvoiceSchema } from '@ecommerce/shared';

const router = Router();

router.get('/fiscal-data', fiscalCtl.getFiscalData);
router.put('/fiscal-data', validate(fiscalDataSchema), fiscalCtl.upsertFiscalData);
router.post('/fiscal-data', validate(fiscalDataSchema), fiscalCtl.upsertFiscalData);
router.delete('/fiscal-data', fiscalCtl.deleteFiscalData);

router.post('/invoices', validate(createInvoiceSchema), invoiceCtl.createInvoice);
router.get('/invoices', invoiceCtl.listInvoices);
router.get('/invoices/:id', invoiceCtl.getInvoice);
router.put('/invoices/:id', validate(updateInvoiceSchema), invoiceCtl.updateInvoice);
router.post('/invoices/:id/stamp', invoiceCtl.stampInvoice);
router.post('/invoices/:id/cancel', validate(cancelInvoiceSchema), invoiceCtl.cancelInvoice);
router.get('/invoices/:id/xml', invoiceCtl.getInvoiceXml);
router.get('/invoices/:id/pdf', invoiceCtl.getInvoicePdf);

router.get('/catalogs/tax-regimes', catalogsCtl.getTaxRegimes);
router.get('/catalogs/cfdi-usages', catalogsCtl.getCfdiUsages);
router.get('/catalogs/sat-products', catalogsCtl.getSatProductCodes);
router.get('/catalogs/sat-units', catalogsCtl.getSatUnitCodes);

export default router;

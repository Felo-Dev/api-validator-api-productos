import crypto from 'crypto';

/**
 * @descripción Genera un UUID aleatorio usando crypto.randomUUID.
 * @returns {string} UUID versión 4.
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * @descripción Genera el XML de un CFDI versión 4.0 con los datos de la factura, partidas, emisor y receptor, incluyendo el timbre fiscal digital simulado.
 * @param {Object} invoice - Datos de la factura.
 * @param {Array} items - Partidas de la factura.
 * @param {Object} emisor - Datos del emisor (rfc, nombre, regimenFiscal, codigoPostal).
 * @param {Object} [config] - Configuración adicional.
 * @returns {{xml: string, uuid: string}} Objeto con el XML generado y el UUID asignado.
 */
export function generateCfdiXml(invoice, items, emisor, config = {}) {
    const uuid = generateUUID();
    const now = new Date();
    const fecha = now.toISOString().slice(0, 19).replace('T', 'T');
    const folio = String(invoice.invoice_folio || '').padStart(6, '0');
    const serie = invoice.invoice_serie || 'F';
    const uuidStr = uuid;

    const itemsXml = items.map((item, i) => {
        const ivaTraslado = item.iva_amount > 0 ? `
                <cfdi:Traslado Base="${item.subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${(item.iva_rate / 100).toFixed(6)}" Importe="${item.iva_amount.toFixed(2)}"/>` : '';

        const iepsTraslado = item.ieps_amount > 0 ? `
                <cfdi:Traslado Base="${item.subtotal.toFixed(2)}" Impuesto="003" TipoFactor="Tasa" TasaOCuota="${(item.ieps_rate / 100).toFixed(6)}" Importe="${item.ieps_amount.toFixed(2)}"/>` : '';

        const traslados = (ivaTraslado || iepsTraslado) ? `
            <cfdi:Impuestos>
                <cfdi:Traslados>${ivaTraslado}${iepsTraslado}
                </cfdi:Traslados>
            </cfdi:Impuestos>` : '';

        const descuento = item.discount > 0 ? ` Descuento="${item.discount.toFixed(2)}"` : '';

        return `
        <cfdi:Concepto ClaveProdServ="${item.sat_product_code || '01010101'}" NoIdentificacion="${item.product_id || ''}" Cantidad="${item.quantity}" ClaveUnidad="${item.sat_unit_code || 'H87'}" Unidad="${item.unit || 'pieza'}" Descripcion="${escapeXml(item.description)}" ValorUnitario="${item.unit_price.toFixed(6)}" Importe="${item.subtotal.toFixed(2)}"${descuento} ObjetoImp="${item.iva_rate !== null ? '02' : '01'}">${traslados}
        </cfdi:Concepto>`;
    }).join('\n');

    const totalIvaTraslado = items.filter(i => i.iva_amount > 0).reduce((s, i) => s + i.iva_amount, 0);
    const totalIepsTraslado = items.filter(i => i.ieps_amount > 0).reduce((s, i) => s + i.ieps_amount, 0);

    const trasladosXml = (totalIvaTraslado > 0 || totalIepsTraslado > 0) ? `
            <cfdi:Impuestos TotalImpuestosTrasladados="${(totalIvaTraslado + totalIepsTraslado).toFixed(2)}">
                <cfdi:Traslados>
                    ${totalIvaTraslado > 0 ? `<cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${totalIvaTraslado.toFixed(2)}"/>` : ''}
                    ${totalIepsTraslado > 0 ? `<cfdi:Traslado Impuesto="003" TipoFactor="Tasa" TasaOCuota="0.080000" Importe="${totalIepsTraslado.toFixed(2)}"/>` : ''}
                </cfdi:Traslados>
            </cfdi:Impuestos>` : '';

    const retencionesXml = (invoice.iva_retained > 0 || invoice.isr_retained > 0) ? `
            <cfdi:Impuestos TotalImpuestosRetenidos="${(invoice.iva_retained + invoice.isr_retained).toFixed(2)}">
                <cfdi:Retenciones>
                    ${invoice.isr_retained > 0 ? `<cfdi:Retencion Impuesto="001" Importe="${invoice.isr_retained.toFixed(2)}"/>` : ''}
                    ${invoice.iva_retained > 0 ? `<cfdi:Retencion Impuesto="002" Importe="${invoice.iva_retained.toFixed(2)}"/>` : ''}
                </cfdi:Retenciones>
            </cfdi:Impuestos>` : '';

    const complementoXml = `
                <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="${uuidStr}" FechaTimbrado="${fecha}" RfcProvCertif="${emisor.rfc}" SelloCFD="simulacion_sello_${uuidStr.slice(0, 8)}" NoCertificadoSAT="00001000000000000000" SelloSAT="simulacion_sat_${uuidStr.slice(0, 8)}"/>`;

    const informacionGlobal = invoice.invoice_type === 'P' ? `
    <cfdi:InformacionGlobal>
        <cfdi:Anio>${now.getFullYear()}</cfdi:Anio>
        <cfdi:Meses>${String(now.getMonth() + 1).padStart(2, '0')}</cfdi:Meses>
        <cfdi:Dia>${String(now.getDate()).padStart(2, '0')}</cfdi:Dia>
    </cfdi:InformacionGlobal>` : '';

    const receptorName = invoice.legal_name && !/^\d+$/.test(invoice.legal_name) ? invoice.legal_name : '';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${serie}" Folio="${folio}" Fecha="${fecha}" FormaPago="${invoice.payment_form}" NoCertificado="00001000000000000000" SubTotal="${invoice.subtotal.toFixed(2)}" Moneda="${invoice.currency || 'MXN'}" Total="${invoice.total.toFixed(2)}" TipoDeComprobante="${invoice.invoice_type}" Exportacion="01" MetodoPago="${invoice.payment_method}" LugarExpedicion="${emisor.codigoPostal || '00000'}">${informacionGlobal}
    <cfdi:Emisor Rfc="${escapeXml(emisor.rfc)}" Nombre="${escapeXml(emisor.nombre)}" RegimenFiscal="${emisor.regimenFiscal}"/>
    <cfdi:Receptor Rfc="${escapeXml(invoice.rfc_receptor)}" Nombre="${escapeXml(receptorName)}" DomicilioFiscalReceptor="${emisor.codigoPostal || '00000'}" RegimenFiscalReceptor="${invoice.tax_regime}" UsoCFDI="${invoice.cfdi_usage}"/>
    <cfdi:Conceptos>${itemsXml}
    </cfdi:Conceptos>${trasladosXml}${retencionesXml}
    <cfdi:Complemento>${complementoXml}
    </cfdi:Complemento>
</cfdi:Comprobante>`;

    return { xml, uuid: uuidStr };
}

/**
 * @descripción Simula el timbrado de un CFDI ante el PAC. En esta implementación retorna los datos sin llamar a un PAC real.
 * @param {string} xml - XML del CFDI a timbrar.
 * @param {string} uuid - UUID asignado al CFDI.
 * @returns {Object} Resultado del timbrado simulado con uuid, stampedAt, xml, pacRfc, satCertificate.
 */
export function stampCfdi(xml, uuid) {
    const fecha = new Date().toISOString();
    return {
        uuid,
        stampedAt: fecha,
        xml,
        pacRfc: 'SIMULACION',
        satCertificate: '00001000000000000000',
    };
}

/**
 * @descripción Simula la cancelación de un CFDI ante el SAT, generando un acuse de cancelación.
 * @param {string} uuid - UUID del CFDI a cancelar.
 * @param {string} reason - Motivo de la cancelación.
 * @returns {Object} Resultado de la cancelación simulada con uuid, cancellationUuid, canceledAt, reason, acuse.
 */
export function cancelCfdi(uuid, reason) {
    const fecha = new Date().toISOString();
    return {
        uuid,
        cancellationUuid: generateUUID(),
        canceledAt: fecha,
        reason,
        acuse: `<?xml version="1.0" encoding="UTF-8"?><AcuseCancelacion><UUID>${uuid}</UUID><Fecha>${fecha}</Fecha></AcuseCancelacion>`,
    };
}

/**
 * @descripción Escapa caracteres especiales XML en una cadena de texto.
 * @param {string} str - Cadena a escapar.
 * @returns {string} Cadena con caracteres XML escapados.
 */
function escapeXml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

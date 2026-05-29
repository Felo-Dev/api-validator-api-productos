const TAX_RATES = {
    GENERAL: 16.00,
    BORDER: 8.00,
    ZERO: 0.00,
    EXEMPT: null,
};

/**
 * @descripción Calcula el IVA sobre un subtotal aplicando la tasa especificada.
 * @param {number} subtotal - Subtotal sobre el cual calcular el IVA.
 * @param {number|null} [rate=TAX_RATES.GENERAL] - Tasa de IVA (16, 8, 0, o null para exento).
 * @returns {number} Monto del IVA calculado y redondeado a 2 decimales.
 */
export function calculateIva(subtotal, rate = TAX_RATES.GENERAL) {
    if (rate === null) return 0;
    return Math.round((subtotal * rate / 100) * 100) / 100;
}

/**
 * @descripción Calcula la retención de IVA (2/3 del IVA generado).
 * @param {number} subtotal - Subtotal base para el cálculo.
 * @param {number|null} [ivaRate=TAX_RATES.GENERAL] - Tasa de IVA aplicada.
 * @returns {number} Monto del IVA retenido redondeado a 2 decimales.
 */
export function calculateIvaRetained(subtotal, ivaRate = TAX_RATES.GENERAL) {
    if (ivaRate === null) return 0;
    const iva = calculateIva(subtotal, ivaRate);
    return Math.round((iva * (2 / 3)) * 100) / 100;
}

/**
 * @descripción Calcula la retención de ISR sobre un subtotal.
 * @param {number} subtotal - Subtotal base para el cálculo.
 * @param {number} [rate=10] - Porcentaje de retención de ISR.
 * @returns {number} Monto del ISR retenido redondeado a 2 decimales.
 */
export function calculateIsrRetained(subtotal, rate = 10) {
    return Math.round((subtotal * rate / 100) * 100) / 100;
}

/**
 * @descripción Calcula el IEPS sobre un subtotal.
 * @param {number} subtotal - Subtotal base.
 * @param {number} [rate=0] - Tasa de IEPS.
 * @returns {number} Monto del IEPS redondeado a 2 decimales.
 */
export function calculateIeps(subtotal, rate = 0) {
    if (rate === 0) return 0;
    return Math.round((subtotal * rate / 100) * 100) / 100;
}

/**
 * @descripción Calcula todos los totales de una factura a partir de sus partidas: subtotal, descuento, IVA, IEPS, retenciones y total general.
 * @param {Array} items - Lista de partidas con quantity, unitPrice, discount, ivaRate, iepsRate.
 * @param {Object} [options] - Opciones de cálculo.
 * @param {number} [options.ivaRate=16.00] - Tasa de IVA general.
 * @param {boolean} [options.applyIvaRetention=false] - Si aplica retención de IVA.
 * @param {boolean} [options.applyIsrRetention=false] - Si aplica retención de ISR.
 * @param {number} [options.isrRetentionRate=10] - Tasa de retención de ISR.
 * @returns {Object} Objeto con items calculados, subtotal, discount, iva, ieps, ivaRetained, isrRetained, total.
 */
export function calculateInvoiceTotals(items, options = {}) {
    const {
        ivaRate = TAX_RATES.GENERAL,
        applyIvaRetention = false,
        applyIsrRetention = false,
        isrRetentionRate = 10,
    } = options;

    const computedItems = items.map(item => {
        const itemSubtotal = Math.round((item.quantity * item.unitPrice) * 100) / 100;
        const itemDiscount = Math.round((item.discount || 0) * 100) / 100;
        const netSubtotal = Math.round((itemSubtotal - itemDiscount) * 100) / 100;

        const itemIvaRate = item.ivaRate !== undefined ? item.ivaRate : ivaRate;
        const itemIepsRate = item.iepsRate || 0;

        const itemIva = calculateIva(netSubtotal, itemIvaRate);
        const itemIeps = calculateIeps(netSubtotal, itemIepsRate);
        const itemTotal = Math.round((netSubtotal + itemIva + itemIeps) * 100) / 100;

        return {
            ...item,
            subtotal: itemSubtotal,
            netSubtotal,
            itemDiscount,
            ivaRate: itemIvaRate,
            iva: itemIva,
            iepsRate: itemIepsRate,
            ieps: itemIeps,
            total: itemTotal,
        };
    });

    const subtotal = Math.round(computedItems.reduce((s, i) => s + i.netSubtotal, 0) * 100) / 100;
    const discount = Math.round(computedItems.reduce((s, i) => s + i.itemDiscount, 0) * 100) / 100;
    const iva = Math.round(computedItems.reduce((s, i) => s + i.iva, 0) * 100) / 100;
    const ieps = Math.round(computedItems.reduce((s, i) => s + i.ieps, 0) * 100) / 100;
    const ivaRetained = applyIvaRetention
        ? Math.round(computedItems.reduce((s, i) => s + (i.iva * 2 / 3), 0) * 100) / 100
        : 0;
    const isrRetained = applyIsrRetention ? calculateIsrRetained(subtotal, isrRetentionRate) : 0;
    const total = Math.round((subtotal + iva + ieps - ivaRetained - isrRetained) * 100) / 100;

    return {
        items: computedItems,
        subtotal,
        discount,
        iva,
        ieps,
        ivaRetained,
        isrRetained,
        total,
    };
}

/**
 * @descripción Obtiene la representación textual de una tasa de impuesto.
 * @param {number|null} rate - Tasa de impuesto (16, 8, 0, null para exento).
 * @returns {string} Cadena con el formato de tasa (ej. '16%', 'EXENTO').
 */
export function getTaxRateDisplay(rate) {
    if (rate === null) return 'EXENTO';
    if (rate === 0) return '0%';
    if (rate === 8) return '8%';
    if (rate === 16) return '16%';
    return `${rate}%`;
}

export { TAX_RATES };

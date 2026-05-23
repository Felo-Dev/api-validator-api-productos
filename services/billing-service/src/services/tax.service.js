const TAX_RATES = {
    GENERAL: 16.00,
    BORDER: 8.00,
    ZERO: 0.00,
    EXEMPT: null,
};

export function calculateIva(subtotal, rate = TAX_RATES.GENERAL) {
    if (rate === null) return 0;
    return Math.round((subtotal * rate / 100) * 100) / 100;
}

export function calculateIvaRetained(subtotal, ivaRate = TAX_RATES.GENERAL) {
    if (ivaRate === null) return 0;
    const iva = calculateIva(subtotal, ivaRate);
    return Math.round((iva * (2 / 3)) * 100) / 100;
}

export function calculateIsrRetained(subtotal, rate = 10) {
    return Math.round((subtotal * rate / 100) * 100) / 100;
}

export function calculateIeps(subtotal, rate = 0) {
    if (rate === 0) return 0;
    return Math.round((subtotal * rate / 100) * 100) / 100;
}

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
    const ivaRetained = applyIvaRetention ? calculateIvaRetained(subtotal, ivaRate) : 0;
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

export function getTaxRateDisplay(rate) {
    if (rate === null) return 'EXENTO';
    if (rate === 0) return '0%';
    if (rate === 8) return '8%';
    if (rate === 16) return '16%';
    return `${rate}%`;
}

export { TAX_RATES };

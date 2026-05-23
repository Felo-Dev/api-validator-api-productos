export function generateInvoiceHtml(invoice, items, fiscalData, config = {}) {
    const {
        businessName = 'Mi Empresa S.A. de C.V.',
        businessRfc = 'RFC123456XYZ',
        businessAddress = 'Calle Principal 123, Col. Centro, Ciudad, Estado, CP 00000',
        businessTaxRegime = '601',
        businessLogo = '',
    } = config;

    const statusMap = {
        pending: 'Pendiente de timbrar',
        stamped: 'Timbre fiscal',
        canceled: 'Cancelado',
    };

    const itemsRows = items.map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${item.description}</td>
            <td>${item.sat_unit_code || 'H87'}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">$${item.unit_price.toFixed(2)}</td>
            <td class="right">$${Number(item.discount || 0).toFixed(2)}</td>
            <td class="right">$${item.subtotal.toFixed(2)}</td>
            <td class="right">${item.iva_rate !== null ? item.iva_rate + '%' : 'EXENTO'}</td>
            <td class="right">$${Number(item.iva_amount || 0).toFixed(2)}</td>
            <td class="right">$${item.total.toFixed(2)}</td>
        </tr>
    `).join('');

    const hasDiscount = Number(invoice.discount || 0) > 0;
    const hasIeps = Number(invoice.ieps || 0) > 0;
    const hasRetainedIva = Number(invoice.iva_retained || 0) > 0;
    const hasRetainedIsr = Number(invoice.isr_retained || 0) > 0;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura ${invoice.invoice_serie}${String(invoice.invoice_folio || '').padStart(6, '0')}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 12px; color: #333; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; }
        .business-info h1 { color: #1a73e8; font-size: 22px; margin-bottom: 5px; }
        .business-info p { font-size: 11px; color: #666; line-height: 1.5; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { color: #333; font-size: 18px; margin-bottom: 5px; }
        .invoice-info .folio { font-size: 24px; font-weight: bold; color: #1a73e8; }
        .invoice-info .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-stamped { background: #d4edda; color: #155724; }
        .status-canceled { background: #f8d7da; color: #721c24; }
        .section { margin-bottom: 20px; }
        .section h3 { font-size: 14px; color: #1a73e8; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-grid .label { color: #666; font-size: 11px; }
        .info-grid .value { font-weight: bold; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #1a73e8; color: white; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; }
        td { padding: 6px; border-bottom: 1px solid #eee; font-size: 11px; }
        .right { text-align: right; }
        .totals { margin-left: auto; width: 350px; }
        .totals table { width: 100%; }
        .totals td { padding: 4px 8px; }
        .totals .label { color: #666; }
        .totals .grand-total { font-size: 16px; font-weight: bold; color: #1a73e8; background: #f0f4ff; }
        .cfdi-info { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px; font-size: 11px; }
        .cfdi-info p { margin: 3px 0; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="business-info">
            <h1>${businessName}</h1>
            <p><strong>RFC:</strong> ${businessRfc}</p>
            <p>${businessAddress}</p>
            <p><strong>Régimen:</strong> ${businessTaxRegime}</p>
        </div>
        <div class="invoice-info">
            <h2>FACTURA</h2>
            <div class="folio">${invoice.invoice_serie || 'F'}${String(invoice.invoice_folio || '').padStart(6, '0')}</div>
            <p>Tipo: ${invoice.invoice_type === 'I' ? 'Ingreso' : invoice.invoice_type === 'E' ? 'Egreso' : 'Traslado'}</p>
            <span class="status-${invoice.cfdi_status || 'pending'}">${statusMap[invoice.cfdi_status || 'pending']}</span>
        </div>
    </div>

    <div class="section">
        <h3>DATOS DEL RECEPTOR</h3>
        <div class="info-grid">
            <div><span class="label">RFC:</span> <span class="value">${invoice.rfc_receptor}</span></div>
            <div><span class="label">Razón Social:</span> <span class="value">${invoice.legal_name}</span></div>
            <div><span class="label">Régimen Fiscal:</span> <span class="value">${invoice.tax_regime}</span></div>
            <div><span class="label">Uso CFDI:</span> <span class="value">${invoice.cfdi_usage}</span></div>
            <div><span class="label">Forma de Pago:</span> <span class="value">${invoice.payment_form}</span></div>
            <div><span class="label">Método de Pago:</span> <span class="value">${invoice.payment_method}</span></div>
        </div>
    </div>

    <div class="section">
        <h3>CONCEPTOS</h3>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Descripción</th>
                    <th>Clave</th>
                    <th class="right">Cant.</th>
                    <th class="right">P. Unitario</th>
                    <th class="right">Descuento</th>
                    <th class="right">Subtotal</th>
                    <th class="right">IVA</th>
                    <th class="right">Importe IVA</th>
                    <th class="right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
    </div>

    <div class="totals">
        <table>
            <tr><td class="label">Subtotal</td><td class="right">$${Number(invoice.subtotal).toFixed(2)}</td></tr>
            ${hasDiscount ? `<tr><td class="label">Descuento</td><td class="right">-$${Number(invoice.discount).toFixed(2)}</td></tr>` : ''}
            <tr><td class="label">IVA</td><td class="right">$${Number(invoice.iva).toFixed(2)}</td></tr>
            ${hasIeps ? `<tr><td class="label">IEPS</td><td class="right">$${Number(invoice.ieps).toFixed(2)}</td></tr>` : ''}
            ${hasRetainedIva ? `<tr><td class="label">Retención IVA</td><td class="right">-$${Number(invoice.iva_retained).toFixed(2)}</td></tr>` : ''}
            ${hasRetainedIsr ? `<tr><td class="label">Retención ISR</td><td class="right">-$${Number(invoice.isr_retained).toFixed(2)}</td></tr>` : ''}
            <tr class="grand-total"><td>Total</td><td class="right">$${Number(invoice.total).toFixed(2)}</td></tr>
            <tr><td class="label">Moneda</td><td class="right">${invoice.currency || 'MXN'}</td></tr>
        </table>
    </div>

    ${invoice.cfdi_uuid ? `
    <div class="cfdi-info">
        <h3>DATOS DEL CFDI</h3>
        <p><strong>UUID:</strong> ${invoice.cfdi_uuid}</p>
        <p><strong>Fecha de timbrado:</strong> ${new Date(invoice.cfdi_stamped_at).toLocaleString('es-MX')}</p>
        <p><strong>RFC del PAC:</strong> Simulación</p>
        <p><strong>No. de Serie del SAT:</strong> SIMULACION</p>
    </div>` : ''}

    ${invoice.notes ? `<div class="section"><p><strong>Notas:</strong> ${invoice.notes}</p></div>` : ''}

    <div class="footer">
        <p>Este documento es una representación impresa del CFDI. Generado el ${new Date().toLocaleString('es-MX')}.</p>
        <p>${businessName} &bull; RFC ${businessRfc}</p>
    </div>
</body>
</html>`;
}

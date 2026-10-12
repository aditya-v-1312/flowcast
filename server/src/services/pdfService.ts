import PDFDocument from 'pdfkit';
import { IInvoice, IUser, IClient } from '../types/index.js';

export const generateInvoicePDF = (
  invoice: IInvoice,
  user: IUser,
  client: IClient
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0f172a'; // slate-900
      const accentColor = '#10b981'; // emerald-500
      const mutedColor = '#64748b'; // slate-500
      const lightBg = '#f8fafc'; // slate-50
      const safeCurrency = (invoice.currency === 'INR' || invoice.currency === '₹') ? 'INR' : (invoice.currency || 'INR');

      // --- Header ---
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(user.businessName || user.name, 40, 40);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(mutedColor)
        .text(user.email, 40, 68)
        .text(user.businessAddress?.street || '', 40, 80)
        .text(
          `${user.businessAddress?.city || ''} ${user.businessAddress?.state || ''} ${user.businessAddress?.postalCode || ''}`,
          40,
          92
        );

      if (user.taxId) {
        doc.text(`GSTIN: ${user.taxId}`, 40, 104);
      }

      // Invoice Info (Top Right)
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('INVOICE', 350, 40, { align: 'right' });

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(`Invoice #: ${invoice.invoiceNumber}`, 350, 68, { align: 'right' })
        .font('Helvetica')
        .fillColor(mutedColor)
        .text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 350, 82, { align: 'right' })
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 350, 96, { align: 'right' })
        .text(`Status: ${invoice.status}`, 350, 110, { align: 'right' });

      // Horizontal Divider
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 130).lineTo(555, 130).stroke();

      // --- Bill To Section ---
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(mutedColor)
        .text('BILLED TO:', 40, 145);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(client.companyName ? `${client.name} (${client.companyName})` : client.name, 40, 160)
        .fontSize(9)
        .font('Helvetica')
        .fillColor(mutedColor)
        .text(client.email, 40, 175)
        .text(client.phone || '', 40, 187)
        .text(client.billingAddress?.street || '', 40, 199)
        .text(
          `${client.billingAddress?.city || ''} ${client.billingAddress?.state || ''} ${client.billingAddress?.postalCode || ''}`,
          40,
          211
        );

      // --- Line Items Table ---
      const tableTop = 240;
      doc.rect(40, tableTop, 515, 24).fill(lightBg);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('DESCRIPTION', 50, tableTop + 7)
        .text('QTY', 300, tableTop + 7, { width: 40, align: 'right' })
        .text('UNIT PRICE', 350, tableTop + 7, { width: 60, align: 'right' })
        .text('TAX', 420, tableTop + 7, { width: 40, align: 'right' })
        .text('AMOUNT', 470, tableTop + 7, { width: 75, align: 'right' });

      let currentY = tableTop + 30;

      invoice.lineItems.forEach((item, index) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(primaryColor)
          .text(item.description, 50, currentY, { width: 240 })
          .text(item.quantity.toString(), 300, currentY, { width: 40, align: 'right' })
          .text(`${safeCurrency} ${item.unitPrice.toFixed(2)}`, 350, currentY, { width: 60, align: 'right' })
          .text(item.taxRate > 0 ? `${item.taxRate}%` : '-', 420, currentY, { width: 40, align: 'right' })
          .font('Helvetica-Bold')
          .text(`${safeCurrency} ${item.amount.toFixed(2)}`, 470, currentY, { width: 75, align: 'right' });

        currentY += 22;
        // subtle row divider
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, currentY - 5).lineTo(555, currentY - 5).stroke();
      });

      currentY += 10;

      // --- Totals Section ---
      const totalsX = 350;
      const valuesX = 470;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(mutedColor)
        .text('Subtotal:', totalsX, currentY)
        .text(`${safeCurrency} ${invoice.subtotal.toFixed(2)}`, valuesX, currentY, { width: 75, align: 'right' });

      currentY += 16;

      if (invoice.taxTotal > 0) {
        doc
          .text('Tax Total:', totalsX, currentY)
          .text(`${safeCurrency} ${invoice.taxTotal.toFixed(2)}`, valuesX, currentY, { width: 75, align: 'right' });
        currentY += 16;
      }

      if (invoice.discountTotal > 0) {
        doc
          .text('Discount:', totalsX, currentY)
          .text(`-${safeCurrency} ${invoice.discountTotal.toFixed(2)}`, valuesX, currentY, { width: 75, align: 'right' });
        currentY += 16;
      }

      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(totalsX, currentY).lineTo(555, currentY).stroke();
      currentY += 8;

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(primaryColor)
        .text('Total Amount:', totalsX, currentY)
        .text(`${safeCurrency} ${invoice.totalAmount.toFixed(2)}`, valuesX, currentY, { width: 75, align: 'right' });

      currentY += 18;

      if (invoice.amountPaid > 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(mutedColor)
          .text('Amount Paid:', totalsX, currentY)
          .text(`${safeCurrency} ${invoice.amountPaid.toFixed(2)}`, valuesX, currentY, { width: 75, align: 'right' });
        currentY += 16;
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(invoice.balanceDue > 0 ? '#dc2626' : '#16a34a')
        .text('Balance Due:', totalsX, currentY)
        .text(`${safeCurrency} ${invoice.balanceDue.toFixed(2)}`, valuesX, currentY, { width: 75, align: 'right' });

      // --- Payment Instructions / Bank Details ---
      currentY = Math.max(currentY + 40, 560);

      doc.rect(40, currentY, 515, 80).fill('#f8fafc');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(primaryColor)
        .text('PAYMENT INSTRUCTIONS & BANK DETAILS', 55, currentY + 10);

      let bankInfo = [];
      if (user.bankDetails?.bankName) bankInfo.push(`Bank: ${user.bankDetails.bankName}`);
      if (user.bankDetails?.accountHolderName) bankInfo.push(`Account Holder: ${user.bankDetails.accountHolderName}`);
      if (user.bankDetails?.accountNumber) bankInfo.push(`Account Number: ${user.bankDetails.accountNumber}`);
      if (user.bankDetails?.routingOrIfsc) bankInfo.push(`Routing / IFSC / Sort Code: ${user.bankDetails.routingOrIfsc}`);
      if (user.bankDetails?.upiId) bankInfo.push(`UPI ID: ${user.bankDetails.upiId}`);
      if (user.bankDetails?.swiftOrBic) bankInfo.push(`SWIFT / BIC: ${user.bankDetails.swiftOrBic}`);

      const bankText = bankInfo.length > 0 ? bankInfo.join('  |  ') : 'Please contact freelancer for manual payment options.';

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(mutedColor)
        .text(bankText, 55, currentY + 28, { width: 485 });

      if (invoice.notes) {
        doc.text(`Note: ${invoice.notes}`, 55, currentY + 52, { width: 485 });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Generated via FlowCast — Freelance Invoicing & Financial Forecast Suite', 40, 780, {
          align: 'center',
          width: 515,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

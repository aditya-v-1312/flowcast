import nodemailer from 'nodemailer';
import { IInvoice, IUser, IClient } from '../types/index.js';
import { generateInvoicePDF } from './pdfService.js';

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

const createFallbackTransporter = async (): Promise<nodemailer.Transporter> => {
  const testAccount = await nodemailer.createTestAccount();
  console.log(`[Email Service] Using Ethereal test inbox: ${testAccount.user}`);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    connectionTimeout: 4000,
    greetingTimeout: 3000,
    socketTimeout: 5000,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    // If SMTP credentials configured in .env, use them with strict connection timeouts
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return nodemailer.createTransport({
        service: 'gmail',
        connectionTimeout: 4000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
        },
      });
    }

    // Otherwise, generate a free local test account on Ethereal
    return createFallbackTransporter();
  })();

  return transporterPromise;
};

export interface SendInvoiceEmailResult {
  success: boolean;
  messageId: string;
  previewUrl: string | false;
  recipientEmail: string;
}

export const sendInvoiceEmail = async (
  invoice: IInvoice,
  user: IUser,
  client: IClient
): Promise<SendInvoiceEmailResult> => {
  const transporter = await getTransporter();

  // Generate the official PDF attachment
  const pdfBuffer = await generateInvoicePDF(invoice, user, client);

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const publicViewUrl = `${clientUrl}/pay/${invoice.publicAccessToken}`;

  const safeCurrency = (invoice.currency === 'INR' || invoice.currency === '₹') ? 'INR' : invoice.currency;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 32px 28px; color: #ffffff; }
          .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
          .header p { margin: 0; font-size: 13px; color: #94a3b8; }
          .content { padding: 28px; }
          .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
          .amount-box span { font-size: 12px; text-transform: uppercase; color: #166534; font-weight: 600; display: block; margin-bottom: 4px; }
          .amount-box h2 { margin: 0; font-size: 28px; color: #15803d; font-weight: 800; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
          .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .details-table td.label { color: #64748b; font-weight: 500; }
          .details-table td.value { text-align: right; font-weight: 600; color: #0f172a; }
          .btn-container { text-align: center; margin: 30px 0 10px 0; }
          .btn { background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; }
          .bank-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 12px; color: #475569; }
          .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice from ${user.businessName || user.name}</h1>
            <p>Invoice #${invoice.invoiceNumber} &bull; Issued: ${new Date(invoice.issueDate).toLocaleDateString()}</p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${client.name}</strong>,</p>
            <p>Please find attached invoice <strong>#${invoice.invoiceNumber}</strong> for recent services rendered. The full breakdown is also attached as a PDF to this email.</p>
            
            <div class="amount-box">
              <span>Total Balance Due</span>
              <h2>${safeCurrency} ${invoice.balanceDue.toLocaleString()}</h2>
            </div>
            
            <table class="details-table">
              <tr>
                <td class="label">Invoice Number</td>
                <td class="value">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td class="label">Due Date</td>
                <td class="value">${new Date(invoice.dueDate).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td class="label">Total Amount</td>
                <td class="value">${safeCurrency} ${invoice.totalAmount.toLocaleString()}</td>
              </tr>
              ${user.taxId ? `<tr><td class="label">GSTIN</td><td class="value">${user.taxId}</td></tr>` : ''}
            </table>
            
            <div class="btn-container">
              <a href="${publicViewUrl}" class="btn">View & Pay Online</a>
            </div>
            
            ${user.bankDetails?.bankName ? `
            <div class="bank-box">
              <strong style="display:block; margin-bottom: 6px; color: #0f172a;">Direct Bank / UPI Transfer Details:</strong>
              <div>Bank: <strong>${user.bankDetails.bankName}</strong> | A/C: <strong>${user.bankDetails.accountNumber}</strong></div>
              <div>IFSC Code: <strong>${user.bankDetails.routingOrIfsc}</strong></div>
              ${user.bankDetails.upiId ? `<div>UPI ID: <strong style="color: #0d9488;">${user.bankDetails.upiId}</strong></div>` : ''}
            </div>` : ''}
          </div>
          
          <div class="footer">
            Sent via FlowCast by ${user.businessName || user.name} &bull; Vadodara, Gujarat
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: `"${user.businessName || user.name}" <${process.env.FROM_EMAIL || process.env.SMTP_USER || 'invoices@aditya.dev'}>`,
    to: client.email,
    subject: `Invoice #${invoice.invoiceNumber} from ${user.businessName || user.name} - ${safeCurrency} ${invoice.balanceDue.toLocaleString()}`,
    html: htmlContent,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  // 1. If Resend API Key configured, dispatch via HTTPS (Port 443, never blocked by cloud firewalls)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[Email Service] Dispatching via Resend HTTPS API to ${client.email}...`);
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'FlowCast Invoices <onboarding@resend.dev>',
          to: [client.email],
          subject: mailOptions.subject,
          html: htmlContent,
          attachments: [
            {
              filename: `${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer.toString('base64'),
            },
          ],
        }),
      });

      const resendData = (await resendRes.json()) as any;
      if (!resendRes.ok) {
        throw new Error(resendData?.message || 'Resend API error');
      }

      console.log(`[Email Sent via Resend] ID: ${resendData.id}`);
      return {
        success: true,
        messageId: resendData.id,
        previewUrl: false,
        recipientEmail: client.email,
      };
    } catch (err: any) {
      console.warn(`[Email Service] Resend dispatch failed (${err.message}). Trying SMTP fallback...`);
    }
  }

  // 2. Otherwise attempt standard SMTP / Ethereal with fast failover
  let info: any;
  try {
    const transporter = await getTransporter();
    info = await transporter.sendMail(mailOptions);
  } catch (err: any) {
    console.warn(`[Email Service] Primary SMTP failed (${err.message}). Trying fallback test inbox...`);
    const fallbackTransporter = await createFallbackTransporter();
    info = await fallbackTransporter.sendMail(mailOptions);
  }

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`[Email Sent] Message ID: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[Email Preview URL]: ${previewUrl}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl,
    recipientEmail: client.email,
  };
};

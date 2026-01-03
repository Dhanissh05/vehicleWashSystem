import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as htmlPdf from 'html-pdf-node';

const prisma = new PrismaClient();

interface EstimationData {
  id: string;
  estimationNumber: string;
  customerName: string;
  customerMobile: string;
  vehicleNumber?: string;
  vehicleType?: string;
  preparedByName: string;
  preparedByRole: string;
  termsAndConditions?: string;
  notes?: string;
  status: string;
  totalAmount: number;
  validUntil?: Date;
  createdAt: Date;
  items: EstimationItem[];
  center?: {
    id: string;
    name: string;
    address: string;
    mobile: string;
    email?: string;
    logoUrl?: string;
  };
}

interface SystemSettings {
  companyName: string;
  logoUrl: string;
  address: string;
  phoneNumber: string;
}

interface EstimationItem {
  serviceName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Fetch system settings for wash center details
 * Uses center data from estimation with SystemConfig as fallback
 */
export async function getSystemSettings(estimation: EstimationData): Promise<SystemSettings> {
  // If estimation has center data, use it (preferred - set by admin in company app)
  if (estimation.center) {
    return {
      companyName: estimation.center.name,
      logoUrl: estimation.center.logoUrl || '',
      address: estimation.center.address,
      phoneNumber: estimation.center.mobile,
    };
  }

  // Fallback to SystemConfig if no center data
  const [companyName, logoUrl, address, phoneNumber] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'COMPANY_NAME' } }),
    prisma.systemConfig.findUnique({ where: { key: 'LOGO_URL' } }),
    prisma.systemConfig.findUnique({ where: { key: 'COMPANY_ADDRESS' } }),
    prisma.systemConfig.findUnique({ where: { key: 'PHONE_NUMBER' } }),
  ]);

  return {
    companyName: companyName?.value || 'Wash Center',
    logoUrl: logoUrl?.value || '',
    address: address?.value || '',
    phoneNumber: phoneNumber?.value || '',
  };
}

/**
 * Generate HTML template for estimation
 */
export function generateEstimationHTML(estimation: EstimationData, systemSettings: SystemSettings): string {
  const date = new Date(estimation.createdAt).toLocaleDateString('en-IN');
  const validUntilDate = estimation.validUntil 
    ? new Date(estimation.validUntil).toLocaleDateString('en-IN')
    : 'N/A';

  // Always show company name, with logo above if available
  const logoHtml = systemSettings.logoUrl 
    ? `<div style="text-align: center;">
        <img src="${systemSettings.logoUrl}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 10px;" />
        <h2 style="color: #3B82F6; margin: 0;">${systemSettings.companyName}</h2>
      </div>`
    : `<h2 style="color: #3B82F6; margin: 0;">${systemSettings.companyName}</h2>`;

  let itemsHtml = '';
  estimation.items.forEach((item, index) => {
    itemsHtml += `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 12px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px;">
          <strong>${item.serviceName}</strong>
          ${item.description ? `<br/><small style="color: #6B7280;">${item.description}</small>` : ''}
        </td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right;">₹${item.totalPrice.toFixed(2)}</td>
      </tr>
    `;
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estimation ${estimation.estimationNumber}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #3B82F6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .company-info {
      flex: 1;
    }
    .logo {
      text-align: right;
    }
    .estimation-title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #1F2937;
      margin: 20px 0 10px;
    }
    .estimation-number {
      text-align: center;
      font-size: 14px;
      color: #6B7280;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
      padding: 20px;
      background-color: #F9FAFB;
      border-radius: 8px;
    }
    .info-item {
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: 600;
      color: #4B5563;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      color: #1F2937;
      font-size: 14px;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #3B82F6;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    td {
      font-size: 14px;
    }
    .total-section {
      text-align: right;
      margin-top: 20px;
      padding: 20px;
      background-color: #F9FAFB;
      border-radius: 8px;
    }
    .total-label {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
    }
    .total-amount {
      font-size: 28px;
      font-weight: bold;
      color: #3B82F6;
      margin-top: 5px;
    }
    .terms {
      margin-top: 40px;
      padding: 20px;
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      border-radius: 4px;
    }
    .terms h3 {
      margin: 0 0 10px 0;
      color: #92400E;
      font-size: 16px;
    }
    .terms p {
      margin: 5px 0;
      color: #78350F;
      font-size: 13px;
      line-height: 1.6;
    }
    .notes {
      margin-top: 20px;
      padding: 15px;
      background-color: #EFF6FF;
      border-left: 4px solid #3B82F6;
      border-radius: 4px;
    }
    .notes h3 {
      margin: 0 0 10px 0;
      color: #1E40AF;
      font-size: 16px;
    }
    .notes p {
      margin: 0;
      color: #1E3A8A;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div class="company-info">
          ${logoHtml}
          <p style="margin: 10px 0 5px; font-size: 14px; color: #6B7280;">
            ${systemSettings.address}
          </p>
          <p style="margin: 5px 0; font-size: 14px; color: #6B7280;">
            Phone: ${systemSettings.phoneNumber}
          </p>
        </div>
      </div>
      <div class="estimation-title">SERVICE ESTIMATION</div>
      <div class="estimation-number">Estimation No: ${estimation.estimationNumber}</div>
    </div>

    <div class="info-section">
      <div>
        <div class="info-item">
          <div class="info-label">Customer Name</div>
          <div class="info-value">${estimation.customerName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Mobile Number</div>
          <div class="info-value">${estimation.customerMobile}</div>
        </div>
        ${estimation.vehicleNumber ? `
        <div class="info-item">
          <div class="info-label">Vehicle Number</div>
          <div class="info-value">${estimation.vehicleNumber}</div>
        </div>
        ` : ''}
      </div>
      <div>
        <div class="info-item">
          <div class="info-label">Estimation Date</div>
          <div class="info-value">${date}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Valid Until</div>
          <div class="info-value">${validUntilDate}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Prepared By</div>
          <div class="info-value">${estimation.preparedByName} (${estimation.preparedByRole})</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: center; width: 50px;">Sr.</th>
          <th>Service Description</th>
          <th style="text-align: center; width: 80px;">Qty</th>
          <th style="text-align: right; width: 120px;">Unit Price</th>
          <th style="text-align: right; width: 120px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-label">Total Amount</div>
      <div class="total-amount">₹${estimation.totalAmount.toFixed(2)}</div>
    </div>

    ${estimation.termsAndConditions ? `
    <div class="terms">
      <h3>Terms & Conditions</h3>
      <p>${estimation.termsAndConditions.replace(/\n/g, '<br/>')}</p>
    </div>
    ` : ''}

    ${estimation.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${estimation.notes.replace(/\n/g, '<br/>')}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>This is a computer-generated estimation and does not require a signature.</p>
      <p>For any queries, please contact us at ${systemSettings.phoneNumber}.</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Generate CSV data for Excel export
 */
export function generateEstimationCSV(estimation: EstimationData, systemSettings: SystemSettings): string {
  let csv = `${systemSettings.companyName}\n`;
  csv += `${systemSettings.address}\n`;
  csv += `Phone: ${systemSettings.phoneNumber}\n`;
  csv += `\n`;
  csv += `SERVICE ESTIMATION\n`;
  csv += `Estimation No: ${estimation.estimationNumber}\n`;
  csv += `\n`;
  csv += `Customer Information:\n`;
  csv += `Name,${estimation.customerName}\n`;
  csv += `Mobile,${estimation.customerMobile}\n`;
  if (estimation.vehicleNumber) {
    csv += `Vehicle Number,${estimation.vehicleNumber}\n`;
  }
  if (estimation.vehicleType) {
    csv += `Vehicle Type,${estimation.vehicleType}\n`;
  }
  csv += `\n`;
  csv += `Estimation Details:\n`;
  csv += `Date,${new Date(estimation.createdAt).toLocaleDateString('en-IN')}\n`;
  csv += `Valid Until,${estimation.validUntil ? new Date(estimation.validUntil).toLocaleDateString('en-IN') : 'N/A'}\n`;
  csv += `Prepared By,${estimation.preparedByName} (${estimation.preparedByRole})\n`;
  csv += `\n`;
  csv += `Sr.,Service Description,Description,Quantity,Unit Price,Total\n`;
  
  estimation.items.forEach((item, index) => {
    csv += `${index + 1},"${item.serviceName}","${item.description || ''}",${item.quantity},${item.unitPrice.toFixed(2)},${item.totalPrice.toFixed(2)}\n`;
  });
  
  csv += `\n`;
  csv += `Total Amount,,,,,${estimation.totalAmount.toFixed(2)}\n`;
  
  if (estimation.termsAndConditions) {
    csv += `\n`;
    csv += `Terms & Conditions:\n`;
    csv += `"${estimation.termsAndConditions}"\n`;
  }
  
  if (estimation.notes) {
    csv += `\n`;
    csv += `Notes:\n`;
    csv += `"${estimation.notes}"\n`;
  }
  
  return csv;
}

/**
 * Fetch estimation data by ID
 */
export async function getEstimationData(estimationId: string): Promise<EstimationData> {
  const estimation = await prisma.estimation.findUnique({
    where: { id: estimationId },
    include: {
      items: true,
      center: true,
    },
  });

  if (!estimation) {
    throw new Error('Estimation not found');
  }

  return estimation as any;
}

/**
 * Generate PDF from estimation HTML
 */
export async function generateEstimationPDF(estimation: EstimationData): Promise<Buffer> {
  const systemSettings = await getSystemSettings(estimation);
  const html = generateEstimationHTML(estimation, systemSettings);
  
  const options = {
    format: 'A4' as const,
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px',
    },
  };

  const file = { content: html };
  
  try {
    // @ts-ignore - html-pdf-node doesn't have proper TypeScript definitions
    const pdfBuffer: Buffer = await htmlPdf.generatePdf(file, options);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

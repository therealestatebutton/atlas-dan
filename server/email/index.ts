import nodemailer from 'nodemailer';
import { Lead } from '../types/index.js';

let transporter: nodemailer.Transporter | null = null;

export function initializeEmailService() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('Email service not configured - skipping initialization');
    return;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendDailyReport(leads: Lead[], county: string): Promise<boolean> {
  if (!transporter) {
    console.warn('Email transporter not initialized');
    return false;
  }

  const recipients = process.env.EMAIL_RECIPIENTS || '';
  if (!recipients) {
    console.warn('No email recipients configured');
    return false;
  }

  const htmlContent = generateReportHtml(leads, county);
  const csvContent = generateReportCsv(leads);

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@atlasleads.example.com',
      to: recipients,
      subject: `${county} County - Daily Lead Report (${leads.length} new leads)`,
      html: htmlContent,
      attachments: [
        {
          filename: `leads-${county}-${new Date().toISOString().split('T')[0]}.csv`,
          content: csvContent,
        },
      ],
    });

    console.log(`✓ Daily report sent to ${recipients}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendTestEmail(testEmail: string): Promise<boolean> {
  if (!transporter) {
    console.warn('Email transporter not initialized');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@atlasleads.example.com',
      to: testEmail,
      subject: 'Atlas Leads - Test Email',
      html: '<p>This is a test email from Atlas Leads. If you received this, your email configuration is working correctly.</p>',
    });

    console.log(`✓ Test email sent to ${testEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
}

function generateReportHtml(leads: Lead[], county: string): string {
  const byType = leads.reduce((acc, lead) => {
    acc[lead.lead_type] = (acc[lead.lead_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeRows = Object.entries(byType)
    .map(
      ([type, count]) =>
        `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">${type}</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${count}</td></tr>`
    )
    .join('');

  return `
    <h2>${county} County - Daily Lead Report</h2>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p><strong>Total New Leads: ${leads.length}</strong></p>
    
    <h3>Breakdown by Lead Type</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
      <thead>
        <tr style="background-color: #f0f0f0;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Lead Type</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Count</th>
        </tr>
      </thead>
      <tbody>
        ${typeRows}
      </tbody>
    </table>
    
    <p style="margin-top: 20px; color: #666; font-size: 12px;">
      See attached CSV for full lead details.
    </p>
  `;
}

function generateReportCsv(leads: Lead[]): string {
  const headers = [
    'Lead Type',
    'County',
    'State',
    'Owner Name',
    'Property Address',
    'City',
    'Zip',
    'Mailing Address',
    'Mailing City',
    'Mailing State',
    'Mailing Zip',
    'Case Number',
    'Filing Date',
    'Assessed Value',
    'Tax Year',
    'Lender',
    'Loan Amount',
    'Sale Date',
    'Sale Amount',
    'Description',
    'Source URL',
    'Status',
    'Skip Traced',
    'Phone',
    'Email',
    'Mailing',
  ];

  const rows = leads.map(lead => [
    lead.lead_type,
    lead.county,
    lead.state,
    lead.owner_name || '',
    lead.address || '',
    lead.city || '',
    lead.zip || '',
    lead.mailing_address || '',
    lead.mailing_city || '',
    lead.mailing_state || '',
    lead.mailing_zip || '',
    lead.case_number || '',
    lead.filing_date || '',
    lead.assessed_value || '',
    lead.tax_year || '',
    lead.lender || '',
    lead.loan_amount || '',
    lead.sale_date || '',
    lead.sale_amount || '',
    lead.description || '',
    lead.source_url || '',
    lead.status,
    lead.skip_traced ? 'Yes' : 'No',
    lead.st_phone || '',
    lead.st_email || '',
    lead.st_mailing || '',
  ]);

  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csv;
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACT_DIR = path.resolve(__dirname, '../data/artifacts');

let browser = null;

function stripHtmlToLines(htmlContent) {
  const plain = String(htmlContent || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  const words = plain.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (`${current} ${word}`.trim().length > 95) {
      if (current.trim()) {
        lines.push(current.trim());
      }
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current.trim()) {
    lines.push(current.trim());
  }

  return lines.slice(0, 120);
}

function escapePdfText(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildFallbackPDFBuffer(htmlContent) {
  const lines = stripHtmlToLines(htmlContent);
  const textCommands = lines.map((line) => `(${escapePdfText(line)}) Tj`).join(' T*\n');
  const stream = `BT\n/F1 10 Tf\n40 800 Td\n14 TL\n${textCommands}\nET`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let offset = 0;
  const chunks = [];
  const xref = ['0000000000 65535 f '];

  const header = '%PDF-1.4\n';
  chunks.push(header);
  offset += Buffer.byteLength(header, 'utf8');

  for (const obj of objects) {
    xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
    chunks.push(obj);
    offset += Buffer.byteLength(obj, 'utf8');
  }

  const xrefOffset = offset;
  const xrefBlock = `xref\n0 ${objects.length + 1}\n${xref.join('\n')}\n`;
  chunks.push(xrefBlock);
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(''), 'utf8');
}

export async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

export async function generatePDF(htmlContent) {
  try {
    const b = await getBrowser();
    const page = await b.newPage();
    try {
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      return await page.pdf({
        format: 'A4',
        margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
        printBackground: true,
      });
    } finally {
      await page.close();
    }
  } catch (err) {
    console.warn('[pdf] Puppeteer unavailable, using fallback PDF generator:', err.message);
    return buildFallbackPDFBuffer(htmlContent);
  }
}

export async function generateAndSavePDF({ sessionId, formType, htmlContent }) {
  const pdfBuffer = await generatePDF(htmlContent);
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const fileName = `${sessionId}_${formType}_${Date.now()}.pdf`;
  const diskPath = path.join(ARTIFACT_DIR, fileName);
  fs.writeFileSync(diskPath, pdfBuffer);
  return {
    buffer: pdfBuffer,
    fileName,
    absolutePath: diskPath,
    publicPath: `/api/artifacts/${fileName}`,
  };
}

process.on('exit', async () => {
  if (browser) {
    try {
      await browser.close();
    } catch {
      // no-op
    }
  }
});

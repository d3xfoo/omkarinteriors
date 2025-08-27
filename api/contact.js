// Vercel Serverless Function: /api/contact
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

function validateBody(body) {
  const errors = [];
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim();
  const message = String(body?.message || '').trim();
  const phone = String(body?.phone || '').trim();
  if (name.length < 2 || name.length > 200) errors.push({ path: 'name', msg: 'Invalid name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ path: 'email', msg: 'Invalid email' });
  if (message.length < 5 || message.length > 5000) errors.push({ path: 'message', msg: 'Invalid message' });
  if (phone && phone.length > 50) errors.push({ path: 'phone', msg: 'Invalid phone' });
  return { errors, data: { name, email, message, phone } };
}

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP credentials not configured');
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

async function ensureSheetHeader(sheets, sheetId) {
  const headers = ['Timestamp', 'Name', 'Email', 'Phone', 'Message', 'IP', 'User Agent'];
  const read = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Sheet1!A1:G1' }).catch(() => null);
  const row = read?.data?.values?.[0] || [];
  const ok = headers.every((h, i) => (row[i] || '').toString().trim().toLowerCase() === h.toLowerCase());
  if (!ok) {
    await sheets.spreadsheets.values.update({ spreadsheetId: sheetId, range: 'Sheet1!A1:G1', valueInputOption: 'RAW', requestBody: { values: [headers] } });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          { repeatCell: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 } } }, fields: 'userEnteredFormat(textFormat,backgroundColor)' } },
          { updateSheetProperties: { properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
          { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length } } },
        ],
      },
    });
  }
}

function formatIstTimestamp(date = new Date()) {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const s = new Intl.DateTimeFormat('en-IN', options).format(date);
  const [d, tPart] = s.split(', ');
  const ts = tPart?.toUpperCase?.() || '';
  return `${d.replaceAll('/', '-')} ${ts} IST`;
}

async function appendToSheet({ name, email, message, phone, ip, userAgent }) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!sheetId || !clientEmail || !privateKey) return { appended: false, reason: 'Google Sheets not configured' };

  const jwt = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth: jwt });
  await ensureSheetHeader(sheets, sheetId);
  const nowIst = formatIstTimestamp();
  const values = [[nowIst, name, email, phone || '', message, ip || '', userAgent || '']];
  await sheets.spreadsheets.values.append({ spreadsheetId: sheetId, range: 'Sheet1!A1', valueInputOption: 'RAW', requestBody: { values } });
  return { appended: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const { errors, data } = validateBody(req.body || {});
  if (errors.length) return res.status(400).json({ ok: false, errors });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const transporter = createTransporter();
    const to = process.env.MAIL_TO || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `Website Contact <${process.env.SMTP_USER}>`,
      to,
      subject: `New Inquiry from ${data.name}`,
      replyTo: data.email,
      text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || ''}\nMessage: ${data.message}\nIP: ${ip}\nUA: ${userAgent}`,
      html: `<p><strong>Name:</strong> ${data.name}</p>
             <p><strong>Email:</strong> ${data.email}</p>
             <p><strong>Phone:</strong> ${data.phone || ''}</p>
             <p><strong>Message:</strong><br/>${String(data.message).replace(/\n/g, '<br/>')}</p>
             <hr/>
             <p><small>IP: ${ip} · UA: ${userAgent}</small></p>`,
    });

    try { await appendToSheet({ ...data, ip, userAgent }); } catch {}
    return res.json({ ok: true });
  } catch (err) {
    const detail = String(err?.message || err);
    return res.status(500).json({ ok: false, error: 'Failed to send message', ...(process.env.NODE_ENV !== 'production' ? { detail } : {}) });
  }
}



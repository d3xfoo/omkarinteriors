import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { body, validationResult } from 'express-validator';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// CORS
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
];
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

// Nodemailer transporter
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP credentials not configured');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function ensureSheetHeader(sheets, sheetId) {

  // sheet header
  const headers = ['Timestamp', 'Name', 'Email', 'Phone', 'Message', 'IP', 'User Agent'];

  const read = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1:G1',
  }).catch(() => null);

  const row = read?.data?.values?.[0] || [];
  const headersAlreadySet = headers.every((h, i) => (row[i] || '').toString().trim().toLowerCase() === h.toLowerCase());

  if (!headersAlreadySet) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:G1',
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          { updateSheetProperties: { properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
          { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length } } },
        ],
      },
    });
  }
}

function formatIstTimestamp(date = new Date()) {
  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };

  //Time
  const s = new Intl.DateTimeFormat('en-IN', options).format(date);
  const [d, tPart] = s.split(', ');
  const ts = tPart?.toUpperCase?.() || '';
  return `${d.replaceAll('/', '-')} ${ts}`;
}

async function appendToSheet({ name, email, message, phone, ip, userAgent }) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!sheetId || !clientEmail || !privateKey) {
    return { appended: false, reason: 'Google Sheets not configured' };
  }

  const jwt = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth: jwt });

  await ensureSheetHeader(sheets, sheetId);

  const nowIst = formatIstTimestamp();
  const values = [[nowIst, name, email, phone || '', message, ip || '', userAgent || '']];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  return { appended: true };
}

app.post(
  '/api/contact',
  [
    body('name').isString().trim().isLength({ min: 2, max: 200 }),
    body('email').isEmail().normalizeEmail(),
    body('message').isString().trim().isLength({ min: 5, max: 5000 }),
    body('phone').optional().isString().trim().isLength({ max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { name, email, message, phone } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      // Send email
      const transporter = createTransporter();
      const to = process.env.MAIL_TO || process.env.SMTP_USER;

      await transporter.sendMail({
        from: `Omkar Interiors<${process.env.SMTP_USER}>`,
        to,
        subject: `New Inquiry from ${name}`,
        replyTo: email,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || ''}\nMessage: ${message}\nIP: ${ip}\nUA: ${userAgent}`,
        html: `<p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Phone:</strong> ${phone || ''}</p>
               <p><strong>Message:</strong><br/>${String(message).replace(/\n/g, '<br/>')}</p>
               <hr/>
               <p><small>IP: ${ip} · UA: ${userAgent}</small></p>`,
      });

      try {
        await appendToSheet({ name, email, message, phone, ip, userAgent });
      } catch (sheetErr) {
        console.error('Sheets append failed:', sheetErr?.message || sheetErr);
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('Contact error:', err?.message || err);
      if (process.env.NODE_ENV !== 'production') {
        return res.status(500).json({ ok: false, error: 'Failed to send message', detail: String(err?.message || err) });
      }
      return res.status(500).json({ ok: false, error: 'Failed to send message' });
    }
  }
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'contact', time: new Date().toISOString() });
});


app.listen(port, () => {
  console.log(`Contact server listening on http://localhost:${port}`);
});



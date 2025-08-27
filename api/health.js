export default function handler(_req, res) {
  res.json({ ok: true, service: 'contact', time: new Date().toISOString() });
}



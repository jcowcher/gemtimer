// Vercel serverless function — POST { message, user_id? }
// Records feedback in Supabase (service role bypasses RLS) then emails Jeremy via Resend.
// Email failure is logged but does NOT fail the request — the row was captured.

const ALLOWED_ORIGINS = new Set([
  'https://gemtimer.com',
  'https://www.gemtimer.com',
  'https://preseason.gemtimer.com',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
]);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const body = req.body || {};
  const rawMessage = typeof body.message === 'string' ? body.message : '';
  const message = rawMessage.trim();
  const userId = typeof body.user_id === 'string' && body.user_id ? body.user_id : null;

  if (!message) { res.status(400).json({ error: 'Message is required' }); return; }
  if (message.length > 2000) { res.status(400).json({ error: 'Message exceeds 2000 character limit' }); return; }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Feedback API: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  // Insert feedback row via service role — bypasses RLS for guest submissions.
  try {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ message, user_id: userId })
    });
    if (!insertRes.ok) {
      const errBody = await insertRes.text();
      console.error('Feedback API: Supabase insert failed', insertRes.status, errBody);
      res.status(500).json({ error: 'Failed to record feedback' });
      return;
    }
  } catch (e) {
    console.error('Feedback API: Supabase insert threw', e);
    res.status(500).json({ error: 'Failed to record feedback' });
    return;
  }

  // Send notification email via Resend REST API — non-blocking on failure (row already saved).
  if (!RESEND_API_KEY) {
    console.error('Feedback API: RESEND_API_KEY missing — row saved, no email sent');
    res.status(200).json({ ok: true, emailed: false });
    return;
  }

  try {
    const emailText = `New GemTimer feedback received.\n\nUser ID: ${userId || '(anonymous)'}\n\nMessage:\n${message}`;
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'GemTimer Feedback <feedback@gemka.co>',
        to: ['jeremy@gemka.co'],
        subject: 'GemTimer feedback',
        text: emailText
      })
    });
    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('Feedback API: Resend send failed', emailRes.status, errBody);
      res.status(200).json({ ok: true, emailed: false });
      return;
    }
  } catch (e) {
    console.error('Feedback API: Resend threw', e);
    res.status(200).json({ ok: true, emailed: false });
    return;
  }

  res.status(200).json({ ok: true, emailed: true });
};

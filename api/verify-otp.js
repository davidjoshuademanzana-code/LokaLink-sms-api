// Import shared OTP store — same module, same instance
import { otpStore } from './send-otp.js';

function formatPhone(phone) {
  phone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('09')) return '+63' + phone.slice(1);
  if (phone.startsWith('9') && phone.length === 10) return '+63' + phone;
  if (phone.startsWith('+63')) return phone;
  return phone;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });

  const formatted = formatPhone(phone);
  const record = otpStore[formatted];

  if (!record) return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
  if (Date.now() > record.expiry) {
    delete otpStore[formatted];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.attempts >= 3) {
    delete otpStore[formatted];
    return res.status(400).json({ error: 'Too many attempts. Please request a new OTP.' });
  }
  if (record.otp !== otp.trim()) {
    record.attempts++;
    return res.status(400).json({ error: 'Incorrect OTP. ' + (3 - record.attempts) + ' attempt(s) remaining.' });
  }

  delete otpStore[formatted];
  return res.status(200).json({ success: true, message: 'Phone number verified.' });
}

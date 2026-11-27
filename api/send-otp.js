const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

// Store OTPs temporarily (in-memory, resets on cold start)
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhone(phone) {
  // Convert 09XXXXXXXXX to +639XXXXXXXXX
  phone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('09')) return '+63' + phone.slice(1);
  if (phone.startsWith('9') && phone.length === 10) return '+63' + phone;
  if (phone.startsWith('+63')) return phone;
  return phone;
}

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://lokalink-project.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  const formatted = formatPhone(phone);
  if (!/^\+639\d{9}$/.test(formatted)) {
    return res.status(400).json({ error: 'Enter a valid Philippine mobile number.' });
  }

  const otp = generateOTP();
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore[formatted] = { otp, expiry, attempts: 0 };

  try {
    const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEXTBEE_API_KEY
      },
      body: JSON.stringify({
        recipients: [formatted],
        message: `Your LokaLink verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Textbee error:', data);
      return res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
    }

    return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
  }
}

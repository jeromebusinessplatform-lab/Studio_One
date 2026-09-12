import crypto from 'crypto';

export function generatePrimeMemberId(): string {
  // 12-character alphanumeric code, formatted like PRM-XXXX-XXXX
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 'PRM';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // 12-character alphanumeric
}

export function validateTelegramInitData(initData: string, botToken?: string): { valid: boolean; user?: any } {
  if (!initData) return { valid: false };

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return { valid: false };

    urlParams.delete('hash');
    const params: string[] = [];
    urlParams.forEach((val, key) => {
      params.push(`${key}=${val}`);
    });
    params.sort();
    const dataCheckString = params.join('\n');

    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      // If no bot token configured, permit development validation if valid user JSON exists
      const userRaw = urlParams.get('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      return { valid: Boolean(user), user };
    }

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash === hash) {
      const userRaw = urlParams.get('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      return { valid: true, user };
    }
  } catch (err) {
    console.error('Error validating telegram initData:', err);
  }

  return { valid: false };
}

export function generateSessionToken(tgUserId: string): string {
  const secret = process.env.SESSION_SECRET || 'prime-secure-session-key-2026';
  const timestamp = Date.now();
  const payload = `${tgUserId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function verifySessionToken(token: string): { valid: boolean; tgUserId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [tgUserId, timestamp, signature] = decoded.split(':');
    if (!tgUserId || !timestamp || !signature) return { valid: false };

    const secret = process.env.SESSION_SECRET || 'prime-secure-session-key-2026';
    const payload = `${tgUserId}:${timestamp}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (expected === signature) {
      // Token valid for 7 days
      if (Date.now() - parseInt(timestamp, 10) < 7 * 24 * 60 * 60 * 1000) {
        return { valid: true, tgUserId };
      }
    }
  } catch {
    // ignore
  }
  return { valid: false };
}

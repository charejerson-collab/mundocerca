/**
 * PASSWORD RESET BACKEND IMPLEMENTATION
 * 
 * Add this code to server.js after the existing auth routes
 * 
 * Prerequisites:
 *   npm install nodemailer
 *   Add to .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from 'nodemailer';

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESET_CONFIG = {
  OTP_LENGTH: 6,                    // 6-digit code
  OTP_TTL_MINUTES: 10,              // Expires after 10 minutes
  RESEND_COOLDOWN_SECONDS: 60,      // 60 seconds between resend requests
  MAX_VERIFY_ATTEMPTS: 5,           // Max wrong attempts per OTP
  MAX_REQUESTS_PER_EMAIL_HOUR: 3,   // Rate limit per email
  MAX_REQUESTS_PER_IP_HOUR: 10,     // Rate limit per IP
};

// ============================================================================
// DATABASE SCHEMA (add to existing db.exec block)
// ============================================================================

db.exec(`
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
`);

// ============================================================================
// EMAIL TRANSPORTER
// ============================================================================

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@mundocerca.com',
    to: email,
    subject: 'Password Reset Code - MundoCerca',
    text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset Request</h2>
        <p>Your verification code is:</p>
        <div style="background: #F3F4F6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1F2937;">${otp}</span>
        </div>
        <p style="color: #6B7280;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #6B7280;">If you did not request this password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #9CA3AF; font-size: 12px;">MundoCerca - Your trusted marketplace</p>
      </div>
    `,
  };

  if (NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    console.log('📧 [DEV] OTP Email would be sent:');
    console.log(`   To: ${email}`);
    console.log(`   Code: ${otp}`);
    return { messageId: 'dev-mock' };
  }

  return emailTransporter.sendMail(mailOptions);
}

// ============================================================================
// SECURE OTP GENERATION
// ============================================================================

function generateSecureOtp() {
  // crypto.randomInt is cryptographically secure
  return crypto.randomInt(100000, 999999).toString();
}

// ============================================================================
// RATE LIMITERS
// ============================================================================

// Per-IP rate limiter for reset requests
const resetIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RESET_CONFIG.MAX_REQUESTS_PER_IP_HOUR,
  message: { error: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// ============================================================================
// HELPER: Check per-email rate limit and cooldown
// ============================================================================

function checkEmailRateLimit(email) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const stmt = db.prepare(`
    SELECT COUNT(*) as count, MAX(created_at) as last_request
    FROM password_resets
    WHERE email = ? AND created_at > ?
  `);
  const result = stmt.get(email, oneHourAgo);
  
  return {
    requestsInLastHour: result.count,
    lastRequestAt: result.last_request ? new Date(result.last_request) : null,
  };
}

function checkCooldown(email) {
  const stmt = db.prepare(`
    SELECT created_at FROM password_resets
    WHERE email = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const lastRequest = stmt.get(email);
  
  if (!lastRequest) return { allowed: true, waitSeconds: 0 };
  
  const lastTime = new Date(lastRequest.created_at).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastTime) / 1000);
  const waitSeconds = Math.max(0, RESET_CONFIG.RESEND_COOLDOWN_SECONDS - elapsedSeconds);
  
  return {
    allowed: waitSeconds === 0,
    waitSeconds,
  };
}

// ============================================================================
// HELPER: Audit logging
// ============================================================================

function logSecurityEvent(event, details) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} | ${event} | ${JSON.stringify(details)}`);
  // In production, send to logging service (e.g., CloudWatch, Datadog)
}

// ============================================================================
// ENDPOINT 1: Request Password Reset
// POST /api/auth/forgot-password
// ============================================================================

app.post('/api/auth/forgot-password', resetIpLimiter, async (req, res) => {
  const { email } = req.body;
  const clientIp = req.ip;

  // Always return success to prevent email enumeration
  const genericResponse = { 
    ok: true, 
    message: 'If this email is registered, you will receive a reset code.',
    cooldownSeconds: RESET_CONFIG.RESEND_COOLDOWN_SECONDS,
  };

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check 60-second cooldown (SERVER-SIDE ENFORCEMENT)
    const cooldown = checkCooldown(normalizedEmail);
    if (!cooldown.allowed) {
      logSecurityEvent('RESET_COOLDOWN_BLOCKED', { email: normalizedEmail, ip: clientIp, waitSeconds: cooldown.waitSeconds });
      return res.status(429).json({ 
        error: `Please wait ${cooldown.waitSeconds} seconds before requesting another code.`,
        waitSeconds: cooldown.waitSeconds,
      });
    }

    // Check hourly rate limit per email
    const rateCheck = checkEmailRateLimit(normalizedEmail);
    if (rateCheck.requestsInLastHour >= RESET_CONFIG.MAX_REQUESTS_PER_EMAIL_HOUR) {
      logSecurityEvent('RESET_RATE_LIMIT_EMAIL', { email: normalizedEmail, ip: clientIp, count: rateCheck.requestsInLastHour });
      return res.status(429).json({ error: 'Too many reset requests for this email. Please try again in 1 hour.' });
    }

    // Check if user exists
    const userStmt = db.prepare('SELECT id, email, name FROM users WHERE email = ?');
    const user = userStmt.get(normalizedEmail);

    if (!user) {
      // Log but return generic response (prevent enumeration)
      logSecurityEvent('RESET_UNKNOWN_EMAIL', { email: normalizedEmail, ip: clientIp });
      return res.json(genericResponse);
    }

    // Invalidate all previous unused OTPs for this user
    const invalidateStmt = db.prepare('UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0');
    invalidateStmt.run(normalizedEmail);

    // Generate secure OTP
    const otp = generateSecureOtp();
    const otpHash = bcrypt.hashSync(otp, 10);
    const expiresAt = new Date(Date.now() + RESET_CONFIG.OTP_TTL_MINUTES * 60 * 1000).toISOString();

    // Store OTP
    const insertStmt = db.prepare(`
      INSERT INTO password_resets (user_id, email, otp_hash, expires_at, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(user.id, normalizedEmail, otpHash, expiresAt, clientIp);

    // Send email
    try {
      await sendOtpEmail(normalizedEmail, otp);
      logSecurityEvent('RESET_OTP_SENT', { email: normalizedEmail, ip: clientIp });
    } catch (emailErr) {
      logSecurityEvent('RESET_EMAIL_FAILED', { email: normalizedEmail, ip: clientIp, error: emailErr.message });
      // Still return success to prevent enumeration
    }

    return res.json(genericResponse);

  } catch (err) {
    logSecurityEvent('RESET_ERROR', { email: normalizedEmail, ip: clientIp, error: err.message });
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// ============================================================================
// ENDPOINT 2: Verify OTP
// POST /api/auth/verify-otp
// ============================================================================

app.post('/api/auth/verify-otp', authLimiter, async (req, res) => {
  const { email, otp } = req.body;
  const clientIp = req.ip;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Get the latest unused, non-expired OTP for this email
    const stmt = db.prepare(`
      SELECT * FROM password_resets
      WHERE email = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const resetRecord = stmt.get(normalizedEmail);

    if (!resetRecord) {
      logSecurityEvent('VERIFY_NO_VALID_OTP', { email: normalizedEmail, ip: clientIp });
      return res.status(400).json({ error: 'No valid reset request found. Please request a new code.' });
    }

    // Check attempt limit
    if (resetRecord.attempts >= RESET_CONFIG.MAX_VERIFY_ATTEMPTS) {
      // Invalidate this OTP
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);
      logSecurityEvent('VERIFY_MAX_ATTEMPTS', { email: normalizedEmail, ip: clientIp, attempts: resetRecord.attempts });
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    // Verify OTP
    const isValid = bcrypt.compareSync(otp, resetRecord.otp_hash);

    if (!isValid) {
      // Increment attempt counter
      db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?').run(resetRecord.id);
      const remainingAttempts = RESET_CONFIG.MAX_VERIFY_ATTEMPTS - resetRecord.attempts - 1;
      logSecurityEvent('VERIFY_FAILED', { email: normalizedEmail, ip: clientIp, attempts: resetRecord.attempts + 1 });
      return res.status(400).json({ 
        error: `Invalid code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts,
      });
    }

    // OTP is valid! Generate a short-lived reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = bcrypt.hashSync(resetToken, 10);
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Update the record with the reset token
    db.prepare(`
      UPDATE password_resets 
      SET otp_hash = ?, expires_at = ?
      WHERE id = ?
    `).run(resetTokenHash, tokenExpiresAt, resetRecord.id);

    logSecurityEvent('VERIFY_SUCCESS', { email: normalizedEmail, ip: clientIp });

    return res.json({ 
      ok: true, 
      resetToken,
      expiresIn: 300, // 5 minutes in seconds
    });

  } catch (err) {
    logSecurityEvent('VERIFY_ERROR', { email: normalizedEmail, ip: clientIp, error: err.message });
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// ============================================================================
// ENDPOINT 3: Reset Password
// POST /api/auth/reset-password
// ============================================================================

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  const clientIp = req.ip;

  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ error: 'Email, reset token, and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Get the reset record
    const stmt = db.prepare(`
      SELECT * FROM password_resets
      WHERE email = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const resetRecord = stmt.get(normalizedEmail);

    if (!resetRecord) {
      logSecurityEvent('RESET_EXPIRED_TOKEN', { email: normalizedEmail, ip: clientIp });
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    // Verify reset token
    const isValid = bcrypt.compareSync(resetToken, resetRecord.otp_hash);

    if (!isValid) {
      logSecurityEvent('RESET_INVALID_TOKEN', { email: normalizedEmail, ip: clientIp });
      return res.status(400).json({ error: 'Invalid reset token.' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update user password
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, resetRecord.user_id);

    // Mark reset as used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

    // Invalidate all other pending resets for this user
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(resetRecord.user_id);

    logSecurityEvent('RESET_PASSWORD_CHANGED', { email: normalizedEmail, ip: clientIp, userId: resetRecord.user_id });

    return res.json({ ok: true, message: 'Password has been reset successfully.' });

  } catch (err) {
    logSecurityEvent('RESET_ERROR', { email: normalizedEmail, ip: clientIp, error: err.message });
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

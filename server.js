import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
dotenv.config();

// If Supabase env vars are not configured we'll keep a null guard so
// server code that checks `if (supabase)` doesn't throw a ReferenceError.
const supabase = null;

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// JWT_SECRET: Required in production, auto-generated for development
let JWT_SECRET;
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (NODE_ENV === 'production') {
  console.error('❌ FATAL: JWT_SECRET environment variable is required in production!');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  process.exit(1);
} else {
  // Development only: auto-generate a secret (will change on restart)
  JWT_SECRET = crypto.randomBytes(32).toString('base64');
  console.warn('⚠️  WARNING: Using auto-generated JWT_SECRET. Set JWT_SECRET env var for persistent sessions.');
}

const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^/, ''));
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false, // Disable CSP in dev for hot reload
  crossOriginEmbedderPolicy: false // Allow loading external images
}));
app.use(cors());
app.use(express.json());

// Rate limiting for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// PASSWORD RESET CONFIGURATION
// ============================================================================

const RESET_CONFIG = {
  OTP_LENGTH: 6,
  OTP_TTL_MINUTES: parseInt(process.env.OTP_TTL_MINUTES || '10'),
  RESEND_COOLDOWN_SECONDS: parseInt(process.env.RESEND_COOLDOWN_SECONDS || '60'),
  MAX_VERIFY_ATTEMPTS: parseInt(process.env.MAX_VERIFY_ATTEMPTS || '5'),
  MAX_REQUESTS_PER_EMAIL_HOUR: parseInt(process.env.MAX_RESET_REQUESTS_PER_EMAIL_HOUR || '3'),
  MAX_REQUESTS_PER_IP_HOUR: parseInt(process.env.MAX_RESET_REQUESTS_PER_IP_HOUR || '10'),
};

// Per-IP rate limiter for reset requests
const resetIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RESET_CONFIG.MAX_REQUESTS_PER_IP_HOUR,
  message: { error: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send OTP email
async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@mundocerca.com',
    to: email,
    subject: 'Password Reset Code - MundoCerca',
    text: `Your password reset code is: ${otp}\n\nThis code expires in ${RESET_CONFIG.OTP_TTL_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset Request</h2>
        <p>Your verification code is:</p>
        <div style="background: #F3F4F6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1F2937;">${otp}</span>
        </div>
        <p style="color: #6B7280;">This code expires in <strong>${RESET_CONFIG.OTP_TTL_MINUTES} minutes</strong>.</p>
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

// Generate secure OTP
function generateSecureOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// Security event logging
function logSecurityEvent(event, details) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} | ${event} | ${JSON.stringify(details)}`);
}

// Check per-email rate limit and cooldown
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

// uploads folder
const uploadsDir = path.join(__dirname, 'data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${unique}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

// DB init
const dbFile = path.join(__dirname, 'data', 'app.db');
const seedFile = path.join(__dirname, 'data', 'seed.json');
const needSeed = !fs.existsSync(dbFile);
const db = new Database(dbFile);

// create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY,
  title TEXT,
  price INTEGER,
  city_id TEXT,
  category TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  description TEXT,
  image TEXT
);

CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  name TEXT,
  title TEXT,
  category TEXT,
  city_id TEXT,
  rating REAL,
  verified INTEGER
);

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

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  free_month_applied INTEGER DEFAULT 1,
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  free_month_ends DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
`);

// seed
if (needSeed && fs.existsSync(seedFile)) {
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const insertListing = db.prepare('INSERT INTO listings (id,title,price,city_id,category,bedrooms,bathrooms,description,image) VALUES (?,?,?,?,?,?,?,?,?)');
  const insertPro = db.prepare('INSERT OR REPLACE INTO professionals (id,name,title,category,city_id,rating,verified) VALUES (?,?,?,?,?,?,?)');
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (name,email,password) VALUES (?,?,?)');

  const insertMany = db.transaction(() => {
    seed.listings.forEach(l => insertListing.run(l.id, l.title, l.price, l.city_id, l.category, l.bedrooms || 0, l.bathrooms || 0, l.description || '', l.image || ''));
    (seed.professionals || []).forEach(p => insertPro.run(p.id, p.name, p.title, p.category, p.city_id, p.rating || 0, p.verified ? 1 : 0));
    // create a test user: test@example.com / password
    const pw = bcrypt.hashSync('password', 10);
    insertUser.run('Test User','test@example.com', pw);
  });
  insertMany();
  console.log('DB seeded');
}

// API Routes
app.get('/api/ping', (req,res) => res.json({ok:true}));

app.get('/api/listings', async (req,res) => {
  if (supabase) {
    const { data, error } = await supabase.from('listings').select('*').order('id', { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }
  const stmt = db.prepare('SELECT * FROM listings ORDER BY id DESC LIMIT 100');
  const rows = stmt.all();
  res.json(rows);
});

app.get('/api/pros', async (req,res) => {
  if (supabase) {
    const { data, error } = await supabase.from('professionals').select('*').limit(100);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }
  const stmt = db.prepare('SELECT * FROM professionals LIMIT 100');
  res.json(stmt.all());
});

app.post('/api/auth/register', authLimiter, async (req,res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  const hashed = bcrypt.hashSync(password, 10);
  try {
    if (supabase) {
      const { data, error } = await supabase.from('users').insert({ name: name||'', email, password: hashed }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      const user = { id: data.id, name: data.name, email: data.email };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ user, token });
    }
    const stmt = db.prepare('INSERT INTO users (name,email,password) VALUES (?,?,?)');
    const info = stmt.run(name || '', email, hashed);
    const user = { id: info.lastInsertRowid, name, email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: 'email already in use' });
  }
});

app.post('/api/auth/login', authLimiter, async (req,res) => {
  const { email, password } = req.body;
  if (supabase) {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1).single();
    if (error || !data) return res.status(400).json({ error: 'invalid credentials' });
    const ok = bcrypt.compareSync(password, data.password);
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: data.id, email: data.email, name: data.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user: { id: data.id, email: data.email, name: data.name }, token });
  }
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email);
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(400).json({ error: 'invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
});

// ============================================================================
// PASSWORD RESET ENDPOINTS
// ============================================================================

// ENDPOINT 1: Request Password Reset
app.post('/api/auth/forgot-password', resetIpLimiter, async (req, res) => {
  const { email } = req.body;
  const clientIp = req.ip;

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
    }

    return res.json(genericResponse);

  } catch (err) {
    logSecurityEvent('RESET_ERROR', { email: normalizedEmail, ip: clientIp, error: err.message });
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// ENDPOINT 2: Verify OTP
app.post('/api/auth/verify-otp', authLimiter, async (req, res) => {
  const { email, otp } = req.body;
  const clientIp = req.ip;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
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

    if (resetRecord.attempts >= RESET_CONFIG.MAX_VERIFY_ATTEMPTS) {
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);
      logSecurityEvent('VERIFY_MAX_ATTEMPTS', { email: normalizedEmail, ip: clientIp, attempts: resetRecord.attempts });
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    const isValid = bcrypt.compareSync(otp, resetRecord.otp_hash);

    if (!isValid) {
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
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE password_resets 
      SET otp_hash = ?, expires_at = ?
      WHERE id = ?
    `).run(resetTokenHash, tokenExpiresAt, resetRecord.id);

    logSecurityEvent('VERIFY_SUCCESS', { email: normalizedEmail, ip: clientIp });

    return res.json({ 
      ok: true, 
      resetToken,
      expiresIn: 300,
    });

  } catch (err) {
    logSecurityEvent('VERIFY_ERROR', { email: normalizedEmail, ip: clientIp, error: err.message });
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// ENDPOINT 3: Reset Password
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

    const isValid = bcrypt.compareSync(resetToken, resetRecord.otp_hash);

    if (!isValid) {
      logSecurityEvent('RESET_INVALID_TOKEN', { email: normalizedEmail, ip: clientIp });
      return res.status(400).json({ error: 'Invalid reset token.' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, resetRecord.user_id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(resetRecord.user_id);

    logSecurityEvent('RESET_PASSWORD_CHANGED', { email: normalizedEmail, ip: clientIp, userId: resetRecord.user_id });

    return res.json({ ok: true, message: 'Password has been reset successfully.' });

  } catch (err) {
    logSecurityEvent('RESET_ERROR', { email: normalizedEmail, ip: clientIp, error: err.message });
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// Verification upload endpoint (accepts multipart/form-data 'file')
app.post('/api/verification-upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  // In a real app, store metadata in DB, associate with user, and trigger review workflow
  const publicPath = `/uploads/${req.file.filename}`;
  res.json({ ok: true, path: publicPath, filename: req.file.filename });
});

// ============================================================================
// SUBSCRIPTION ENDPOINTS
// ============================================================================

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Activate subscription
app.post('/api/subscription/activate', authMiddleware, (req, res) => {
  const { plan } = req.body;
  const userId = req.user.id;
  
  const validPlans = ['basic', 'pro', 'business'];
  if (!plan || !validPlans.includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  
  try {
    // Check if user already has an active subscription
    const existingSub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? AND status = ?').get(userId, 'active');
    if (existingSub) {
      return res.status(400).json({ error: 'You already have an active subscription' });
    }
    
    // Calculate free month end date (30 days from now)
    const freeMonthEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Create subscription
    const stmt = db.prepare(`
      INSERT INTO subscriptions (user_id, plan, status, free_month_applied, start_date, free_month_ends)
      VALUES (?, ?, 'active', 1, datetime('now'), ?)
    `);
    const info = stmt.run(userId, plan, freeMonthEnds);
    
    const subscription = {
      id: info.lastInsertRowid,
      userId,
      plan,
      status: 'active',
      freeMonthApplied: true,
      startDate: new Date().toISOString(),
      freeMonthEnds,
    };
    
    logSecurityEvent('SUBSCRIPTION_ACTIVATED', { userId, plan });
    
    res.json({ 
      ok: true, 
      subscription,
      user: {
        ...req.user,
        subscriptionActive: true,
        subscriptionPlan: plan,
        subscriptionStartDate: subscription.startDate,
        freeMonthEnds,
      }
    });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

// Get user subscription
app.get('/api/subscription', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  try {
    const subscription = db.prepare(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);
    
    if (!subscription) {
      return res.json({ subscription: null });
    }
    
    res.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        freeMonthApplied: !!subscription.free_month_applied,
        startDate: subscription.start_date,
        freeMonthEnds: subscription.free_month_ends,
      }
    });
  } catch (err) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Serve frontend in production (after `npm run build`)
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req,res) => {
  // fall back to index.html
  const index = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(404).send('Not found');
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

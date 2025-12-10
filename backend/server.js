// =============================================================================
// MundoCerca Backend Server - Production Ready
// =============================================================================
// Architecture: Vercel (Frontend) → Railway (Backend) → Supabase (Database)
// =============================================================================

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

// Load environment variables
dotenv.config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Check if Supabase is configured
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY;

// Supabase client (lazy import if configured)
let supabase = null;
if (isSupabaseConfigured) {
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  console.log('✅ Supabase connected - using PostgreSQL');
} else {
  console.log('ℹ️  Supabase not configured - using SQLite fallback');
}

// JWT_SECRET: Required in production, auto-generated for development
let JWT_SECRET;
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (NODE_ENV === 'production') {
  console.error('❌ FATAL: JWT_SECRET environment variable is required in production!');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  process.exit(1);
} else {
  JWT_SECRET = crypto.randomBytes(32).toString('base64');
  console.warn('⚠️  WARNING: Using auto-generated JWT_SECRET. Set JWT_SECRET env var for persistent sessions.');
}

// Export for use in route modules
export { supabase, JWT_SECRET, NODE_ENV };

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration for Vercel frontend
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [FRONTEND_URL, /\.vercel\.app$/] 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// AUTH MIDDLEWARE (exported for routes)
// =============================================================================

export function authMiddleware(req, res, next) {
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

// =============================================================================
// PASSWORD RESET CONFIGURATION
// =============================================================================

const RESET_CONFIG = {
  OTP_LENGTH: 6,
  OTP_TTL_MINUTES: parseInt(process.env.OTP_TTL_MINUTES || '10'),
  RESEND_COOLDOWN_SECONDS: parseInt(process.env.RESEND_COOLDOWN_SECONDS || '60'),
  MAX_VERIFY_ATTEMPTS: parseInt(process.env.MAX_VERIFY_ATTEMPTS || '5'),
  MAX_REQUESTS_PER_EMAIL_HOUR: parseInt(process.env.MAX_RESET_REQUESTS_PER_EMAIL_HOUR || '3'),
  MAX_REQUESTS_PER_IP_HOUR: parseInt(process.env.MAX_RESET_REQUESTS_PER_IP_HOUR || '10'),
};

const resetIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
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
    text: `Your password reset code is: ${otp}\n\nThis code expires in ${RESET_CONFIG.OTP_TTL_MINUTES} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset Request</h2>
        <p>Your verification code is:</p>
        <div style="background: #F3F4F6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1F2937;">${otp}</span>
        </div>
        <p style="color: #6B7280;">This code expires in <strong>${RESET_CONFIG.OTP_TTL_MINUTES} minutes</strong>.</p>
        <p style="color: #6B7280;">If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #9CA3AF; font-size: 12px;">MundoCerca - Your trusted marketplace</p>
      </div>
    `,
  };

  if (NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    console.log('📧 [DEV] OTP Email:', email, 'Code:', otp);
    return { messageId: 'dev-mock' };
  }

  return emailTransporter.sendMail(mailOptions);
}

function generateSecureOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function logSecurityEvent(event, details) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} | ${event} | ${JSON.stringify(details)}`);
}

// =============================================================================
// FILE UPLOADS
// =============================================================================

const uploadsDir = path.join(__dirname, 'data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${unique}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

// =============================================================================
// SQLITE DATABASE (Fallback for local development)
// =============================================================================

const dbFile = path.join(__dirname, 'data', 'app.db');
const seedFile = path.join(__dirname, 'data', 'seed.json');
const needSeed = !fs.existsSync(dbFile);

// Ensure data directory exists
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const db = new Database(dbFile);

// Create tables
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

// Seed database
if (needSeed && fs.existsSync(seedFile)) {
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const insertListing = db.prepare('INSERT INTO listings (id,title,price,city_id,category,bedrooms,bathrooms,description,image) VALUES (?,?,?,?,?,?,?,?,?)');
  const insertPro = db.prepare('INSERT OR REPLACE INTO professionals (id,name,title,category,city_id,rating,verified) VALUES (?,?,?,?,?,?,?)');
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (name,email,password) VALUES (?,?,?)');

  db.transaction(() => {
    seed.listings.forEach(l => insertListing.run(l.id, l.title, l.price, l.city_id, l.category, l.bedrooms || 0, l.bathrooms || 0, l.description || '', l.image || ''));
    (seed.professionals || []).forEach(p => insertPro.run(p.id, p.name, p.title, p.category, p.city_id, p.rating || 0, p.verified ? 1 : 0));
    const pw = bcrypt.hashSync('password', 10);
    insertUser.run('Test User', 'test@example.com', pw);
  })();
  console.log('✅ SQLite DB seeded');
}

// Helper functions for SQLite fallback
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
  
  return { allowed: waitSeconds === 0, waitSeconds };
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/api/ping', (req, res) => res.json({ ok: true, mode: isSupabaseConfigured ? 'supabase' : 'sqlite' }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', env: NODE_ENV }));

// =============================================================================
// LISTINGS API
// =============================================================================

app.get('/api/listings', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.json(data || []);
    }
    const stmt = db.prepare('SELECT * FROM listings ORDER BY id DESC LIMIT 100');
    res.json(stmt.all());
  } catch (err) {
    console.error('Listings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// =============================================================================
// PROFESSIONALS API
// =============================================================================

app.get('/api/pros', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .limit(100);
      if (error) throw error;
      return res.json(data || []);
    }
    const stmt = db.prepare('SELECT * FROM professionals LIMIT 100');
    res.json(stmt.all());
  } catch (err) {
    console.error('Professionals error:', err);
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
});

// =============================================================================
// AUTH API
// =============================================================================

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  
  const hashed = bcrypt.hashSync(password, 10);
  
  try {
    if (supabase) {
      // Use Supabase Auth for production
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || '' }
      });
      
      if (authError) return res.status(400).json({ error: authError.message });
      
      // Also store in users table for app data
      await supabase.from('users').insert({
        id: authData.user.id,
        name: name || '',
        email,
        created_at: new Date().toISOString()
      });
      
      const user = { id: authData.user.id, name, email };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ user, token });
    }
    
    // SQLite fallback
    const stmt = db.prepare('INSERT INTO users (name,email,password) VALUES (?,?,?)');
    const info = stmt.run(name || '', email, hashed);
    const user = { id: info.lastInsertRowid, name, email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: 'email already in use' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    if (supabase) {
      // Use Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) return res.status(400).json({ error: 'invalid credentials' });
      
      const user = { 
        id: authData.user.id, 
        email: authData.user.email, 
        name: authData.user.user_metadata?.name || ''
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ user, token });
    }
    
    // SQLite fallback
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    
    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ error: 'invalid credentials' });
  }
});

// Session verification
app.get('/api/auth/session', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// =============================================================================
// PASSWORD RESET API
// =============================================================================

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Check per-email rate limit
    const { requestsInLastHour } = checkEmailRateLimit(normalizedEmail);
    if (requestsInLastHour >= RESET_CONFIG.MAX_REQUESTS_PER_EMAIL_HOUR) {
      logSecurityEvent('RESET_RATE_LIMIT_EMAIL', { email: normalizedEmail, ip: clientIp });
      return res.json(genericResponse);
    }

    // Check cooldown
    const { allowed, waitSeconds } = checkCooldown(normalizedEmail);
    if (!allowed) {
      return res.json({
        ok: true,
        message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        waitSeconds,
      });
    }

    // Find user
    let user;
    if (supabase) {
      const { data } = await supabase.from('users').select('id, email').eq('email', normalizedEmail).single();
      user = data;
    } else {
      user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(normalizedEmail);
    }

    if (!user) {
      logSecurityEvent('RESET_UNKNOWN_EMAIL', { email: normalizedEmail, ip: clientIp });
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      return res.json(genericResponse);
    }

    // Generate and store OTP
    const otp = generateSecureOtp();
    const otpHash = bcrypt.hashSync(otp, 10);
    const expiresAt = new Date(Date.now() + RESET_CONFIG.OTP_TTL_MINUTES * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO password_resets (user_id, email, otp_hash, expires_at, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, normalizedEmail, otpHash, expiresAt, clientIp);

    // Send email
    await sendOtpEmail(normalizedEmail, otp);
    logSecurityEvent('RESET_OTP_SENT', { email: normalizedEmail, ip: clientIp });

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    logSecurityEvent('RESET_ERROR', { email: normalizedEmail, ip: clientIp, error: err.message });
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

app.post('/api/auth/verify-otp', authLimiter, async (req, res) => {
  const { email, otp } = req.body;
  const clientIp = req.ip;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const record = db.prepare(`
      SELECT * FROM password_resets 
      WHERE email = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `).get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ error: 'No valid reset request found. Please request a new code.' });
    }

    if (record.attempts >= RESET_CONFIG.MAX_VERIFY_ATTEMPTS) {
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);
      logSecurityEvent('RESET_MAX_ATTEMPTS', { email: normalizedEmail, ip: clientIp });
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    const isValid = bcrypt.compareSync(otp.trim(), record.otp_hash);
    
    if (!isValid) {
      db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?').run(record.id);
      const remaining = RESET_CONFIG.MAX_VERIFY_ATTEMPTS - record.attempts - 1;
      logSecurityEvent('RESET_INVALID_OTP', { email: normalizedEmail, ip: clientIp, remaining });
      return res.status(400).json({ 
        error: 'Invalid code',
        attemptsRemaining: remaining
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = bcrypt.hashSync(resetToken, 10);
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE password_resets SET used = 1, reset_token_hash = ?, reset_token_expires = ?
      WHERE id = ?
    `).run(resetTokenHash, resetExpires, record.id);

    logSecurityEvent('RESET_OTP_VERIFIED', { email: normalizedEmail, ip: clientIp });

    res.json({ ok: true, resetToken });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

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
    const record = db.prepare(`
      SELECT * FROM password_resets 
      WHERE email = ? AND used = 1 AND reset_token_expires > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `).get(normalizedEmail);

    if (!record || !record.reset_token_hash) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const isValid = bcrypt.compareSync(resetToken, record.reset_token_hash);
    if (!isValid) {
      logSecurityEvent('RESET_INVALID_TOKEN', { email: normalizedEmail, ip: clientIp });
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    if (supabase) {
      await supabase.from('users').update({ password: hashedPassword }).eq('email', normalizedEmail);
    } else {
      db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, normalizedEmail);
    }

    // Invalidate reset token
    db.prepare('UPDATE password_resets SET reset_token_hash = NULL WHERE id = ?').run(record.id);

    logSecurityEvent('RESET_PASSWORD_CHANGED', { email: normalizedEmail, ip: clientIp });

    res.json({ ok: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// =============================================================================
// VERIFICATION UPLOAD
// =============================================================================

app.post('/api/verification-upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const publicPath = `/uploads/${req.file.filename}`;
  res.json({ ok: true, path: publicPath, filename: req.file.filename });
});

// =============================================================================
// SUBSCRIPTION API
// =============================================================================

app.post('/api/subscription/activate', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  const userId = req.user.id;
  
  const validPlans = ['basic', 'pro', 'business'];
  if (!plan || !validPlans.includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  
  try {
    if (supabase) {
      // Check existing subscription
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (existing) {
        return res.status(400).json({ error: 'You already have an active subscription' });
      }
      
      const freeMonthEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: plan, // Adjust to match your schema
          status: 'active',
          start_date: new Date().toISOString(),
          free_month_ends: freeMonthEnds,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      logSecurityEvent('SUBSCRIPTION_ACTIVATED', { userId, plan });
      return res.json({ ok: true, subscription });
    }
    
    // SQLite fallback
    const existingSub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? AND status = ?').get(userId, 'active');
    if (existingSub) {
      return res.status(400).json({ error: 'You already have an active subscription' });
    }
    
    const freeMonthEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
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
    res.json({ ok: true, subscription });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

app.get('/api/subscription', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    if (supabase) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return res.json({ subscription: subscription || null });
    }
    
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

// =============================================================================
// PROPERTIES API (Supabase only - full CRUD)
// =============================================================================

if (isSupabaseConfigured) {
  app.get('/api/properties', async (req, res) => {
    try {
      const { city_id, category, min_price, max_price, limit = 50, offset = 0 } = req.query;
      
      let query = supabase
        .from('properties')
        .select('*, landlords(id, business_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
      
      if (city_id) query = query.eq('city_id', city_id);
      if (category) query = query.eq('category', category);
      if (min_price) query = query.gte('price', parseInt(min_price));
      if (max_price) query = query.lte('price', parseInt(max_price));
      
      const { data, error } = await query;
      if (error) throw error;
      
      res.json({ properties: data || [], count: data?.length || 0 });
    } catch (err) {
      console.error('Properties error:', err);
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  });

  app.get('/api/properties/:id', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, landlords(id, business_name, verified)')
        .eq('id', req.params.id)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      res.json({ property: data });
    } catch (err) {
      console.error('Property error:', err);
      res.status(500).json({ error: 'Failed to fetch property' });
    }
  });

  app.post('/api/properties', authMiddleware, async (req, res) => {
    try {
      const { title, description, price, city_id, category, bedrooms, bathrooms, image_url, whatsapp } = req.body;
      
      if (!title || !price || !city_id || !category) {
        return res.status(400).json({ error: 'Title, price, city_id, and category are required' });
      }
      
      // Get or create landlord
      let { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      
      if (!landlord) {
        const { data: newLandlord, error } = await supabase
          .from('landlords')
          .insert({ user_id: req.user.id, business_name: req.user.name })
          .select('id')
          .single();
        
        if (error) throw error;
        landlord = newLandlord;
      }
      
      const { data: property, error } = await supabase
        .from('properties')
        .insert({
          landlord_id: landlord.id,
          title,
          description: description || '',
          price: parseInt(price),
          city_id,
          category,
          bedrooms: parseInt(bedrooms || 0),
          bathrooms: parseInt(bathrooms || 0),
          image_url,
          whatsapp,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json({ property, message: 'Property created successfully' });
    } catch (err) {
      console.error('Create property error:', err);
      res.status(500).json({ error: 'Failed to create property' });
    }
  });

  app.put('/api/properties/:id', authMiddleware, async (req, res) => {
    try {
      // Get landlord
      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      
      if (!landlord) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      // Check ownership
      const { data: existing } = await supabase
        .from('properties')
        .select('landlord_id')
        .eq('id', req.params.id)
        .single();
      
      if (!existing || existing.landlord_id !== landlord.id) {
        return res.status(403).json({ error: 'Not authorized to update this property' });
      }
      
      const allowedFields = ['title', 'description', 'price', 'city_id', 'category', 'bedrooms', 'bathrooms', 'image_url', 'whatsapp', 'is_active'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      updates.updated_at = new Date().toISOString();
      
      const { data: property, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ property, message: 'Property updated successfully' });
    } catch (err) {
      console.error('Update property error:', err);
      res.status(500).json({ error: 'Failed to update property' });
    }
  });

  app.delete('/api/properties/:id', authMiddleware, async (req, res) => {
    try {
      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      
      if (!landlord) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      const { data: existing } = await supabase
        .from('properties')
        .select('landlord_id')
        .eq('id', req.params.id)
        .single();
      
      if (!existing || existing.landlord_id !== landlord.id) {
        return res.status(403).json({ error: 'Not authorized to delete this property' });
      }
      
      // Soft delete
      const { error } = await supabase
        .from('properties')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', req.params.id);
      
      if (error) throw error;
      
      res.json({ message: 'Property deleted successfully' });
    } catch (err) {
      console.error('Delete property error:', err);
      res.status(500).json({ error: 'Failed to delete property' });
    }
  });
}

// =============================================================================
// FAVORITES API
// =============================================================================

app.get('/api/favorites', authMiddleware, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          property_id,
          created_at,
          properties (id, title, price, image, city_id, category)
        `)
        .eq('user_id', req.user.id);
      
      if (error) throw error;
      return res.json({ favorites: data || [] });
    }
    
    // SQLite fallback - no favorites table yet
    res.json({ favorites: [] });
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

app.post('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const { property_id } = req.body;
    
    if (!property_id) {
      return res.status(400).json({ error: 'property_id is required' });
    }
    
    if (supabase) {
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: req.user.id, property_id })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          return res.status(400).json({ error: 'Already in favorites' });
        }
        throw error;
      }
      return res.status(201).json({ favorite: data });
    }
    
    res.status(501).json({ error: 'Favorites not available in SQLite mode' });
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:propertyId', authMiddleware, async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    if (supabase) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', req.user.id)
        .eq('property_id', propertyId);
      
      if (error) throw error;
      return res.json({ message: 'Removed from favorites' });
    }
    
    res.status(501).json({ error: 'Favorites not available in SQLite mode' });
  } catch (err) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// =============================================================================
// INQUIRIES API
// =============================================================================

app.post('/api/inquiries', async (req, res) => {
  try {
    const { property_id, name, email, phone, message } = req.body;
    
    if (!property_id || !name || !email || !message) {
      return res.status(400).json({ error: 'property_id, name, email, and message are required' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (supabase) {
      // Get user_id if authenticated
      let user_id = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
          user_id = decoded.id;
        } catch (e) { /* ignore invalid token */ }
      }
      
      const { data, error } = await supabase
        .from('inquiries')
        .insert({ property_id, user_id, name, email, phone: phone || null, message })
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json({ inquiry: data, message: 'Inquiry sent successfully' });
    }
    
    // SQLite fallback - just acknowledge
    res.status(201).json({ message: 'Inquiry sent successfully (demo mode)' });
  } catch (err) {
    console.error('Send inquiry error:', err);
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
});

app.get('/api/inquiries', authMiddleware, async (req, res) => {
  try {
    if (supabase) {
      // Get inquiries for properties owned by this user
      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      
      if (!landlord) {
        return res.json({ inquiries: [] });
      }
      
      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          id,
          name,
          email,
          phone,
          message,
          status,
          created_at,
          properties (id, title)
        `)
        .in('property_id', supabase.from('properties').select('id').eq('landlord_id', landlord.id));
      
      if (error) throw error;
      return res.json({ inquiries: data || [] });
    }
    
    res.json({ inquiries: [] });
  } catch (err) {
    console.error('Get inquiries error:', err);
    res.status(500).json({ error: 'Failed to get inquiries' });
  }
});

// =============================================================================
// SUBSCRIPTION CANCEL
// =============================================================================

app.post('/api/subscription/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (supabase) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled', 
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single();
      
      if (error) throw error;
      
      if (!data) {
        return res.status(404).json({ error: 'No active subscription found' });
      }
      
      logSecurityEvent('SUBSCRIPTION_CANCELLED', { userId });
      return res.json({ message: 'Subscription cancelled', subscription: data });
    }
    
    // SQLite fallback
    const result = db.prepare(`
      UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now')
      WHERE user_id = ? AND status = 'active'
    `).run(userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    logSecurityEvent('SUBSCRIPTION_CANCELLED', { userId });
    res.json({ message: 'Subscription cancelled' });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

app.post('/api/upload/image', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    // Delete the uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' });
  }
  
  const publicPath = `/uploads/${req.file.filename}`;
  res.json({ 
    ok: true, 
    url: publicPath, 
    filename: req.file.filename,
    size: req.file.size
  });
});

// =============================================================================
// STATIC FILES & SPA FALLBACK
// =============================================================================

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  const index = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(404).send('Not found');
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} (${NODE_ENV})`);
  console.log(`   Database: ${isSupabaseConfigured ? 'Supabase PostgreSQL' : 'SQLite fallback'}`);
  if (NODE_ENV === 'development') {
    console.log(`   Frontend: ${FRONTEND_URL}`);
  }
});

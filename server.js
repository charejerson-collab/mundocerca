import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase client initialized');
} else {
  console.log('No Supabase credentials found — using local SQLite');
}

const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const app = express();
app.use(cors());
app.use(express.json());

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

// DB init (SQLite fallback if Supabase not configured)
const dbFile = path.join(__dirname, 'data', 'app.db');
const seedFile = path.join(__dirname, 'data', 'seed.json');
let db = null;
if (!supabase) {
  const needSeed = !fs.existsSync(dbFile);
  db = new Database(dbFile);

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

app.post('/api/auth/register', async (req,res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
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

app.post('/api/auth/login', async (req,res) => {
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

// Verification upload endpoint (accepts multipart/form-data 'file')
app.post('/api/verification-upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  // In a real app, store metadata in DB, associate with user, and trigger review workflow
  const publicPath = `/uploads/${req.file.filename}`;
  res.json({ ok: true, path: publicPath, filename: req.file.filename });
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

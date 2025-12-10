// =============================================================================
// Auth Routes - Backend API (Railway)
// =============================================================================
// POST /api/auth/signup
// POST /api/auth/login
// GET  /api/auth/session
// POST /api/auth/logout
// =============================================================================

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from './supabaseClient.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

// =============================================================================
// Middleware: Verify JWT Token
// =============================================================================
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}

// =============================================================================
// POST /api/auth/signup
// =============================================================================
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone, user_type = 'tenant' } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user in Supabase
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || email.split('@')[0],
        phone: phone || null,
        user_type: user_type,
        created_at: new Date().toISOString(),
      })
      .select('id, email, name, user_type, created_at')
      .single();
    
    if (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name,
        user_type: newUser.user_type,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      user: newUser,
      token,
      message: 'Account created successfully',
    });
    
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// POST /api/auth/login
// =============================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, password_hash, user_type, created_at')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        user_type: user.user_type,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful',
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// GET /api/auth/session
// =============================================================================
router.get('/session', authMiddleware, async (req, res) => {
  try {
    // Get fresh user data from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, user_type, phone, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ user });
    
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// POST /api/auth/logout
// =============================================================================
router.post('/logout', authMiddleware, (req, res) => {
  // JWT is stateless, so logout is handled client-side
  // This endpoint exists for consistency and future session management
  res.json({ message: 'Logged out successfully' });
});

export default router;

/**
 * PASSWORD RESET FLOW - UNIT TESTS
 * 
 * Test framework: Jest + Supertest
 * Install: npm install --save-dev jest supertest
 * 
 * Run: npm test -- --testPathPattern=password-reset
 */

const request = require('supertest');
const app = require('../server'); // Adjust path as needed

// Mock email sending
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

describe('Password Reset Flow', () => {
  const testEmail = 'test@example.com';
  let resetToken = null;

  beforeAll(async () => {
    // Ensure test user exists (or create one)
  });

  // =========================================================================
  // TEST 1: Request Password Reset
  // =========================================================================

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email and return success', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.cooldownSeconds).toBe(60);
      expect(res.body.message).toContain('If this email');
    });

    it('should return same response for non-existent email (prevent enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(res.body.ok).toBe(true);
      // Same response as valid email
    });

    it('should enforce 60-second cooldown', async () => {
      // First request
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      // Immediate second request should be blocked
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(429);

      expect(res.body.error).toContain('wait');
      expect(res.body.waitSeconds).toBeGreaterThan(0);
      expect(res.body.waitSeconds).toBeLessThanOrEqual(60);
    });

    it('should allow request after 60 seconds', async () => {
      // This test uses mock time
      jest.useFakeTimers();
      
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      // Advance time by 61 seconds
      jest.advanceTimersByTime(61000);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(res.body.ok).toBe(true);
      
      jest.useRealTimers();
    });

    it('should enforce hourly rate limit per email (3 requests)', async () => {
      jest.useFakeTimers();
      
      // Make 3 requests with 61s gaps
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);
        jest.advanceTimersByTime(61000);
      }

      // 4th request should be rate limited
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(429);

      expect(res.body.error).toContain('Too many reset requests');
      
      jest.useRealTimers();
    });

    it('should reject request without email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(res.body.error).toContain('Email is required');
    });
  });

  // =========================================================================
  // TEST 2: OTP Verification
  // =========================================================================

  describe('POST /api/auth/verify-otp', () => {
    let validOtp = null;

    beforeEach(async () => {
      // Get OTP from test database (in real tests, mock the OTP generation)
      // For this example, assume OTP is logged in dev mode
    });

    it('should reject invalid OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testEmail, otp: '000000' })
        .expect(400);

      expect(res.body.error).toContain('Invalid');
      expect(res.body.remainingAttempts).toBeDefined();
    });

    it('should block after 5 failed attempts', async () => {
      // Make 5 wrong attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/verify-otp')
          .send({ email: testEmail, otp: '000000' });
      }

      // 6th attempt should say "request new code"
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testEmail, otp: '000000' })
        .expect(400);

      expect(res.body.error).toContain('request a new code');
    });

    it('should return reset token for valid OTP', async () => {
      // This requires access to the actual OTP
      // In integration tests, extract from DB or mock
      const correctOtp = '123456'; // Mocked value

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testEmail, otp: correctOtp })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.resetToken).toBeDefined();
      expect(res.body.expiresIn).toBe(300); // 5 minutes

      resetToken = res.body.resetToken;
    });

    it('should reject expired OTP', async () => {
      jest.useFakeTimers();
      
      // Advance time past TTL (10 minutes)
      jest.advanceTimersByTime(11 * 60 * 1000);

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testEmail, otp: '123456' })
        .expect(400);

      expect(res.body.error).toContain('No valid reset request');
      
      jest.useRealTimers();
    });
  });

  // =========================================================================
  // TEST 3: Password Reset
  // =========================================================================

  describe('POST /api/auth/reset-password', () => {
    it('should reject short passwords', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          resetToken: resetToken,
          newPassword: 'short',
        })
        .expect(400);

      expect(res.body.error).toContain('8 characters');
    });

    it('should reject invalid reset token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          resetToken: 'invalid-token',
          newPassword: 'newSecurePassword123',
        })
        .expect(400);

      expect(res.body.error).toContain('Invalid');
    });

    it('should successfully reset password with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          resetToken: resetToken,
          newPassword: 'newSecurePassword123',
        })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.message).toContain('successfully');
    });

    it('should invalidate token after use', async () => {
      // Try to use the same token again
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          resetToken: resetToken,
          newPassword: 'anotherPassword123',
        })
        .expect(400);

      expect(res.body.error).toContain('expired');
    });

    it('should allow login with new password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'newSecurePassword123',
        })
        .expect(200);

      expect(res.body.token).toBeDefined();
    });
  });

  // =========================================================================
  // TEST 4: Security Tests
  // =========================================================================

  describe('Security', () => {
    it('should invalidate old OTPs when new one is requested', async () => {
      // Request first OTP
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      const oldOtp = '111111'; // First OTP (mocked)

      // Wait 61 seconds and request new OTP
      jest.useFakeTimers();
      jest.advanceTimersByTime(61000);

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      jest.useRealTimers();

      // Old OTP should not work
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testEmail, otp: oldOtp })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should log security events', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]')
      );

      consoleSpy.mockRestore();
    });
  });
});

// ============================================================================
// INTEGRATION TEST: Full Flow
// ============================================================================

describe('Full Password Reset Flow (Integration)', () => {
  const email = 'integrationtest@example.com';

  it('should complete full reset flow', async () => {
    // Step 1: Request reset
    const step1 = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(200);

    expect(step1.body.ok).toBe(true);

    // Step 2: Get OTP from database (in real test, mock or extract)
    // For this example, assume we have access to the test OTP
    const otp = '123456';

    // Step 3: Verify OTP
    const step2 = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp })
      .expect(200);

    expect(step2.body.resetToken).toBeDefined();

    // Step 4: Reset password
    const step3 = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email,
        resetToken: step2.body.resetToken,
        newPassword: 'myNewSecurePassword123',
      })
      .expect(200);

    expect(step3.body.ok).toBe(true);

    // Step 5: Verify login works with new password
    const step4 = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'myNewSecurePassword123',
      })
      .expect(200);

    expect(step4.body.token).toBeDefined();
  });
});

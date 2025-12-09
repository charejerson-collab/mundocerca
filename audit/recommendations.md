# Password Reset - Recommended Configuration Values

## Quick Reference Table

| Setting | Recommended Value | Range | Rationale |
|---------|------------------|-------|-----------|
| OTP Length | 6 digits | 6-8 | 6 is standard, provides 1M combinations |
| OTP TTL | 10 minutes | 5-15 min | Balances security with email delivery delays |
| Resend Cooldown | 60 seconds | 30-120s | Prevents spam while allowing quick retry |
| Max Resend per Hour | 3 | 2-5 | Prevents email bombing |
| Max Resend per Day | 10 | 5-15 | Daily safety net |
| Max Verify Attempts | 5 | 3-5 | Blocks brute-force while allowing typos |
| Reset Token TTL | 5 minutes | 3-10 min | Short window after OTP verified |
| Account Lockout | 1 hour | 30m-24h | After max failed attempts |

---

## Detailed Configuration

### 1. OTP Length: 6 digits

**Recommended:** `6`

**Why:**
- 6 digits = 1,000,000 possible combinations
- With 5 max attempts, brute-force probability = 0.0005%
- Industry standard (banks, Google, Apple)
- 8 digits harder for users to type correctly

**Alternatives:**
- 8 digits: Higher security, lower usability
- Alphanumeric: Much higher entropy, but harder to type

```javascript
const OTP_LENGTH = 6;
const otp = crypto.randomInt(100000, 999999).toString();
```

---

### 2. OTP TTL (Time-to-Live): 10 minutes

**Recommended:** `600000` ms (10 minutes)

**Why:**
- Email delivery can take 30-60 seconds
- Users may need to switch apps/devices
- 10 minutes is NIST-recommended for OTP expiry
- Shorter = more secure, but frustrates users

**Alternatives:**
- 5 minutes: High security, may frustrate slow email
- 15 minutes: More lenient, slightly higher risk

```javascript
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const expiresAt = new Date(Date.now() + OTP_TTL_MS);
```

---

### 3. Resend Cooldown: 60 seconds

**Recommended:** `60000` ms (60 seconds)

**Why:**
- Prevents rapid email bombing
- Gives email time to arrive
- Standard UX pattern
- Must be enforced server-side AND client-side

**Server Enforcement (CRITICAL):**
```javascript
const RESEND_COOLDOWN_MS = 60 * 1000;

// Check last request time
const lastRequest = getLastResetRequest(email);
if (Date.now() - lastRequest.time < RESEND_COOLDOWN_MS) {
  return res.status(429).json({ 
    error: 'Please wait before requesting another code',
    waitSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
  });
}
```

**Client Enforcement (UX):**
```javascript
const [countdown, setCountdown] = useState(60);
const [canResend, setCanResend] = useState(false);

useEffect(() => {
  if (countdown > 0) {
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  } else {
    setCanResend(true);
  }
}, [countdown]);
```

---

### 4. Hourly Rate Limit per Email: 3 requests

**Recommended:** `3` per hour

**Why:**
- Normal user needs 1-2 attempts max
- 3 allows for legitimate retries
- Prevents spam/harassment via password reset emails
- Separate from IP-based limiting

```javascript
const MAX_REQUESTS_PER_EMAIL_HOUR = 3;
```

---

### 5. Hourly Rate Limit per IP: 10 requests

**Recommended:** `10` per hour per IP

**Why:**
- Single IP might have multiple legitimate users (office, school)
- Higher than per-email limit
- Prevents enumeration attacks
- Blocks scripted attacks

```javascript
const resetIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.ip,
});
```

---

### 6. Max Verification Attempts: 5

**Recommended:** `5` attempts per OTP

**Why:**
- Users may mistype (especially on mobile)
- 5 attempts for 6-digit code = 0.0005% brute-force success
- After 5 failures, OTP is invalidated
- User must request new code

**Security Math:**
```
6-digit OTP = 10^6 = 1,000,000 combinations
5 attempts / 1,000,000 = 0.0005% success rate
```

```javascript
const MAX_VERIFY_ATTEMPTS = 5;

if (resetRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
  invalidateOtp(resetRecord.id);
  return res.status(400).json({ error: 'Too many attempts. Request a new code.' });
}
```

---

### 7. Reset Token TTL: 5 minutes

**Recommended:** `300000` ms (5 minutes)

**Why:**
- Only needed for the few seconds between OTP verification and password submission
- User is actively on the page
- Short window minimizes risk if token is intercepted
- Longer than typical page response time

```javascript
const RESET_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

---

### 8. Account Lockout: 1 hour

**Recommended:** `3600000` ms (1 hour) after repeated failures

**When to Lock:**
- After 3 OTPs expire due to max failed attempts
- After 10 total failed verification attempts in 24 hours

**Why:**
- Stops persistent attackers
- Not too punishing for legitimate users
- Can unlock manually via support

```javascript
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const MAX_LOCKOUTS_BEFORE_LONG_LOCK = 3;
const LONG_LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
```

---

## Daily Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Password resets per email per day | 10 | Prevent abuse |
| Failed OTP attempts per email per day | 15 | Stop persistent attacks |
| Successful resets per email per day | 3 | Flag suspicious activity |

---

## Logging & Alerting Thresholds

| Event | Log Level | Alert Threshold |
|-------|-----------|-----------------|
| Reset requested | INFO | > 100/hour globally |
| OTP sent | INFO | N/A |
| OTP verified successfully | INFO | N/A |
| OTP verification failed | WARN | > 3 failures for same email |
| Rate limit triggered (email) | WARN | Any |
| Rate limit triggered (IP) | WARN | > 5 times from same IP |
| Password changed | INFO | Alert if > 3/day for same user |
| Account locked | ALERT | Always |

---

## Environment Variables

Add to `.env`:

```bash
# Password Reset Configuration
OTP_TTL_MINUTES=10
RESEND_COOLDOWN_SECONDS=60
MAX_VERIFY_ATTEMPTS=5
MAX_RESET_REQUESTS_PER_EMAIL_HOUR=3
MAX_RESET_REQUESTS_PER_IP_HOUR=10

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=noreply@mundocerca.com
```

---

## Security Checklist

Before deploying password reset:

- [ ] OTP generated with `crypto.randomInt()`, not `Math.random()`
- [ ] OTP hashed with bcrypt before storage
- [ ] OTP expires after 10 minutes
- [ ] OTP invalidated after successful use
- [ ] Previous OTPs invalidated when new one generated
- [ ] 60-second cooldown enforced SERVER-SIDE
- [ ] Rate limit per email (3/hour)
- [ ] Rate limit per IP (10/hour)
- [ ] Max 5 verification attempts per OTP
- [ ] Generic response for non-existent emails
- [ ] All security events logged
- [ ] Email contains no sensitive data beyond OTP
- [ ] Reset token short-lived (5 min)
- [ ] Password minimum 8 characters enforced

# Password Reset Flow - Security Issues

## Severity Legend
- 🔴 **CRITICAL**: Must fix before production
- 🟠 **HIGH**: Should fix before production  
- 🟡 **MEDIUM**: Fix soon after launch
- 🟢 **LOW**: Nice to have

---

## Issue #1: Entire Flow Missing
**Severity:** 🔴 CRITICAL

**Location:** Entire codebase

**Description:**  
The password reset flow does not exist. Users cannot recover their accounts.

**Current State:**
- `Auth.jsx:153` has a placeholder link: `<a href="#">Forgot your password?</a>`
- No backend endpoints exist
- No database table for OTPs
- No email service configured

**Impact:**
- Users permanently locked out if they forget password
- Support burden for manual password resets
- Poor user experience

**Fix:** Implement complete flow (see patches/)

---

## Issue #2: No 60-Second Cooldown (Server-Side)
**Severity:** 🔴 CRITICAL

**Location:** N/A (not implemented)

**Description:**  
The 60-second resend cooldown must be enforced server-side, not just on the UI.

**Why Critical:**
- Attackers can bypass client-side restrictions
- Without server enforcement, an attacker could flood emails
- Could be used for email bombing / harassment

**Current State:** No implementation exists

**Required Fix:**
```javascript
// Server must track last_otp_sent_at per email
// Reject requests if Date.now() - last_otp_sent_at < 60000ms
```

---

## Issue #3: No OTP Table / Storage
**Severity:** 🔴 CRITICAL

**Location:** `server.js` (database schema)

**Description:**  
No database table exists to store OTPs/reset tokens.

**Required Schema:**
```sql
CREATE TABLE password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0
);
```

---

## Issue #4: No OTP Generation
**Severity:** 🔴 CRITICAL

**Location:** N/A (not implemented)

**Description:**  
No code exists to generate cryptographically secure OTPs.

**Bad Practice (DO NOT USE):**
```javascript
// ❌ INSECURE: Math.random() is predictable
const otp = Math.floor(100000 + Math.random() * 900000);
```

**Correct Implementation:**
```javascript
// ✅ SECURE: crypto.randomInt is cryptographically secure
import crypto from 'crypto';
const otp = crypto.randomInt(100000, 999999).toString();
```

---

## Issue #5: OTP Would Be Stored in Plaintext
**Severity:** 🟠 HIGH

**Location:** N/A (not implemented, but must be designed correctly)

**Description:**  
OTPs must be hashed before storage, just like passwords.

**Why:**
- Database breach would expose all active reset codes
- Attacker could reset any account with pending request

**Required:**
```javascript
const otpHash = await bcrypt.hash(otp, 10);
// Store otpHash, not otp
```

---

## Issue #6: No Rate Limiting for Password Reset
**Severity:** 🟠 HIGH

**Location:** `server.js:48-54`

**Description:**  
While `authLimiter` exists for login/register, there's no specific rate limiter for password reset.

**Current authLimiter:**
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
});
```

**Required Additional Limiters:**
1. `resetRequestLimiter`: 3 requests per email per hour
2. `resetIpLimiter`: 10 requests per IP per hour
3. `otpVerifyLimiter`: 5 attempts per OTP

---

## Issue #7: No Brute-Force Protection for OTP Verification
**Severity:** 🟠 HIGH

**Location:** N/A (not implemented)

**Description:**  
6-digit OTPs have only 1,000,000 combinations. Without attempt limiting, an attacker could brute-force in minutes.

**Required:**
- Max 5 attempts per OTP
- After 5 failures, invalidate the OTP
- Optionally: exponential backoff between attempts

---

## Issue #8: No OTP Expiration (TTL)
**Severity:** 🟠 HIGH

**Location:** N/A (not implemented)

**Description:**  
OTPs must expire after a reasonable time (5-15 minutes).

**Recommended:** 10 minutes TTL

**Implementation:**
```javascript
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
```

---

## Issue #9: No Email Service Integration
**Severity:** 🟠 HIGH

**Location:** `package.json`, `server.js`

**Description:**  
No email sending capability exists.

**Required:**
```bash
npm install nodemailer
```

Or use: SendGrid, AWS SES, Mailgun, Postmark

---

## Issue #10: Race Condition - Multiple Valid OTPs
**Severity:** 🟡 MEDIUM

**Location:** N/A (not implemented)

**Description:**  
If user requests reset multiple times, multiple valid OTPs could exist.

**Risk:** Increases attack surface (more valid codes to guess)

**Fix:**
- Invalidate all previous OTPs when generating new one
- Or: Only allow one active OTP per user

---

## Issue #11: Email Enumeration Vulnerability
**Severity:** 🟡 MEDIUM

**Location:** N/A (not implemented, but must be designed correctly)

**Description:**  
Different responses for "email exists" vs "email not found" allow attackers to enumerate valid emails.

**Bad:**
```javascript
// ❌ Reveals if email exists
if (!user) return res.json({ error: "Email not found" });
return res.json({ message: "Code sent" });
```

**Good:**
```javascript
// ✅ Same response regardless
return res.json({ message: "If this email exists, a code was sent" });
```

---

## Issue #12: No Audit Logging
**Severity:** 🟡 MEDIUM

**Location:** `server.js`

**Description:**  
Security events should be logged for monitoring and incident response.

**Events to Log:**
- Reset requested (email, IP, timestamp)
- OTP sent (success/failure)
- OTP verification attempt (success/failure, attempts count)
- Password changed (user_id, IP, timestamp)
- Rate limit triggered

---

## Issue #13: No Account Lockout
**Severity:** 🟡 MEDIUM

**Location:** N/A (not implemented)

**Description:**  
After N failed reset attempts, account should be temporarily locked.

**Recommended:**
- Lock for 1 hour after 5 failed OTP verifications
- Lock for 24 hours after 3 lockouts

---

## Issue #14: UI "Forgot Password" Link Non-Functional
**Severity:** 🟡 MEDIUM

**Location:** `src/components/Auth.jsx:153`

**Current Code:**
```jsx
<a href="#" className="...">Forgot your password?</a>
```

**Issue:** Link does nothing - confusing UX

**Fix:** Either implement flow or remove link

---

## Issue #15: No Email Delivery Delay Handling
**Severity:** 🟢 LOW

**Location:** N/A (not implemented)

**Description:**  
Emails can take 30-60 seconds to arrive. UI should:
- Show "Check your spam folder"
- Explain potential delay
- Allow resend after 60s (not immediately)

---

## Summary Table

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Entire flow missing | 🔴 CRITICAL | Not implemented |
| 2 | No server-side 60s cooldown | 🔴 CRITICAL | Not implemented |
| 3 | No OTP table | 🔴 CRITICAL | Not implemented |
| 4 | No secure OTP generation | 🔴 CRITICAL | Not implemented |
| 5 | Plaintext OTP storage risk | 🟠 HIGH | Design needed |
| 6 | No reset-specific rate limiting | 🟠 HIGH | Not implemented |
| 7 | No brute-force protection | 🟠 HIGH | Not implemented |
| 8 | No OTP TTL/expiration | 🟠 HIGH | Not implemented |
| 9 | No email service | 🟠 HIGH | Not implemented |
| 10 | Race condition (multiple OTPs) | 🟡 MEDIUM | Design needed |
| 11 | Email enumeration | 🟡 MEDIUM | Design needed |
| 12 | No audit logging | 🟡 MEDIUM | Not implemented |
| 13 | No account lockout | 🟡 MEDIUM | Not implemented |
| 14 | Non-functional UI link | 🟡 MEDIUM | Placeholder only |
| 15 | No email delay handling | 🟢 LOW | UX improvement |

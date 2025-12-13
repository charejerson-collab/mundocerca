// Minimal Stripe routes stub for backend
export const PLANS = [
  { id: 'basic', name: 'Basic', price: 0 },
  { id: 'pro', name: 'Pro', price: 1000 },
  { id: 'business', name: 'Business', price: 2000 }
];

export function createCheckoutSession(req, res) {
  res.json({ ok: true, sessionId: 'test-session' });
}

export function createPortalSession(req, res) {
  res.json({ ok: true, url: 'https://portal.example.com' });
}

export function getSubscriptionStatus(req, res) {
  res.json({ ok: true, status: 'active' });
}

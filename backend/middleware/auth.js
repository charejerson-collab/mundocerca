// Minimal auth middleware for backend
export function authMiddleware(req, res, next) {
  // Accept all requests as authenticated for test/demo
  req.user = { id: 1, email: 'test@example.com', name: 'Test User' };
  next();
}

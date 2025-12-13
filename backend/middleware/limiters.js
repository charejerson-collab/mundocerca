// Minimal rate limiter stubs for backend
export function authLimiter(req, res, next) {
  next();
}

export function resetIpLimiter(req, res, next) {
  next();
}

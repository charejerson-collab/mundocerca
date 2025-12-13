// Minimal v2 API router for backend
import express from "express";

const router = express.Router();

// Example health endpoint
router.get("/health", (req, res) => {
  res.json({ ok: true, version: 2 });
});

export { router as v2Routes };
import express from "express";
import jwt from "jsonwebtoken";

export const authRouter = express.Router();

const users = new Map();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// SIGNUP
authRouter.post("/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (users.has(email)) {
    return res.status(200).json({ message: "User already exists" });
  }

  users.set(email, { email, password });
  return res.status(201).json({ message: "User registered" });
});

// LOGIN
authRouter.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: "1h" });
  return res.status(200).json({ token });
});

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, refresh } from "../controllers/authController.js";

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  message: { error: "Too many login/registration attempts. Please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);

export default router;

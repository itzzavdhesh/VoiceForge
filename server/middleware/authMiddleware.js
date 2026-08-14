import { verifyAccessToken } from "../utils/auth.js";

/**
 * Express middleware to verify authorization headers containing a Bearer JWT.
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers?.authorization || (typeof req.get === "function" ? req.get("authorization") : undefined);
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const isExpired = error.name === "TokenExpiredError" || error.message?.includes("expired");
    return res.status(401).json({
      error: isExpired ? "Token expired" : "Invalid token",
      code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
    });
  }
};

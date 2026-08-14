import crypto from "crypto";

/**
 * Express middleware to generate or propagate unique correlation IDs for request tracing.
 */
export const requestId = (req, res, next) => {
  const existingId = req.headers["x-request-id"];
  const id = existingId && typeof existingId === "string" ? existingId : crypto.randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};

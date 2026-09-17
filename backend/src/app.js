const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { allowedOrigin, frontendDirectory } = require("./config/app.config");
const {
  formLimiter,
  authLimiter,
  adminLoginLimiter,
} = require("./middleware/rate-limit.middleware");
const { errorHandler } = require("./middleware/error.middleware");
const contactRoutes = require("./routes/contact.routes");
const newsletterRoutes = require("./routes/newsletter.routes");
const checkoutRoutes = require("./routes/checkout.routes");
const authRoutes = require("./routes/auth.routes");
const ordersRoutes = require("./routes/orders.routes");
const returnsRoutes = require("./routes/returns.routes");
const adminRoutes = require("./routes/admin.routes");
const { meHandler } = require("./controllers/auth.controller");

const app = express();

// Captures the raw request body alongside Express's normal JSON
// parsing — the webhook route needs the exact raw bytes to verify
// Razorpay's HMAC signature; every other route just uses req.body
// as before.
app.use(
  express.json({
    limit: "100kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(cookieParser());

// credentials:true is required for the session cookie to be sent/set
// on cross-origin requests (e.g. the API on a subdomain) — it also
// means ALLOWED_ORIGIN can't be '*', it must be a real origin.
app.use(cors({ origin: allowedOrigin, credentials: true }));

// Resolve frontend absolute path relative to backend/src
const frontendPath = path.resolve(
  __dirname,
  "../../",
  frontendDirectory || "frontend/public",
);

// Serve static frontend assets (HTML, CSS, JS, images)
app.use(express.static(frontendPath, { dotfiles: "ignore" }));

// API Routes
app.get("/api/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() }),
);
app.get("/api/me", meHandler);

app.use("/api/contact", formLimiter, contactRoutes);
app.use("/api/newsletter", formLimiter, newsletterRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/orders", formLimiter, ordersRoutes);
app.use("/api/returns", formLimiter, returnsRoutes);
app.use("/api/admin/login", adminLoginLimiter);
app.use("/api/admin", adminRoutes);

// Global Error Handler for API routes
app.use(errorHandler);

// Serve index.html for page navigation requests (bypasses non-existent API routes)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

module.exports = app;

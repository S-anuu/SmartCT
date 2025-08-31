const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-change-in-production";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d"; // 7 days

// ✅ Generate new tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

// ✅ Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ Load fresh user from DB
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== "Active") {
      return res.status(403).json({ message: "Account is not active" });
    }

    // ✅ Attach user data to request
    req.user = {
      userId: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED" // Add specific code for client-side handling
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Middleware to verify refresh token
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      userId: user._id,
      email: user.email
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Refresh token expired" });
    }
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

// ✅ Middleware to check for admin role
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// ✅ Middleware to allow user or admin
const requireOwnershipOrAdmin = (resourceUserIdField = "userId") => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (req.user.isAdmin || req.user.userId.toString() === resourceUserId) {
      return next();
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  };
};

module.exports = {
  generateTokens,
  authenticateToken,
  verifyRefreshToken,
  requireAdmin,
  requireOwnershipOrAdmin,
};

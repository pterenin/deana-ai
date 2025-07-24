// Server constants
export const PORT = process.env.PORT || 3001;
export const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Database constants
export const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://localhost:5432/deana_ai";

// Google OAuth constants
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const REDIRECT_URI = process.env.REDIRECT_URI;

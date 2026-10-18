import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPathInCwd = path.resolve(process.cwd(), '.env');
const envPathInBackend = path.resolve(process.cwd(), 'backend', '.env');

if (fs.existsSync(envPathInCwd)) {
  dotenv.config({ path: envPathInCwd });
} else if (fs.existsSync(envPathInBackend)) {
  dotenv.config({ path: envPathInBackend });
} else {
  dotenv.config();
}

export const ENV = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ||
    'casa-hybrid-erp-better-auth-secret-key-2026',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET,
  EXP_TOKEN: process.env.EXP_TOKEN,
};

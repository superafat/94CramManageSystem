// JWT Auth utilities
import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = process.env.JWT_SECRET || '94cram-secret-change-in-prod';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  systems: string[]; // ['94manage', '94inclass', '94stock']
}

export function sign(payload: JWTPayload, secret: string = DEFAULT_SECRET): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verify(token: string, secret: string = DEFAULT_SECRET): JWTPayload {
  return jwt.verify(token, secret) as JWTPayload;
}

export function decode(token: string): JWTPayload | null {
  const decoded = jwt.decode(token);
  return decoded as JWTPayload | null;
}

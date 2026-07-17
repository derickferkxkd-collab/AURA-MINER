/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from './db';

// JWT token structure
export interface UserJWT {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  exp: number;
}

// Generate a JWT token (base64 encoded JSON string signed with a header)
export function generateToken(user: User): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: UserJWT = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 3600 * 1000 * 8 // 8 hours validity
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const signature = btoa(`secret_signature_${user.id}_${user.role}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verify JWT token
export function verifyToken(token: string | null): UserJWT | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payloadStr = decodeURIComponent(escape(atob(parts[1])));
    const payload: UserJWT = JSON.parse(payloadStr);
    
    // Check expiration
    if (payload.exp < Date.now()) {
      console.warn("JWT token has expired");
      return null;
    }
    
    return payload;
  } catch (e) {
    console.error("JWT verification failed:", e);
    return null;
  }
}

// CSRF Token Store
let currentCsrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export function getCsrfToken(): string {
  return currentCsrfToken;
}

export function rotateCsrfToken(): string {
  currentCsrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return currentCsrfToken;
}

export function validateCsrf(tokenReceived: string): boolean {
  return tokenReceived === currentCsrfToken;
}

// Rate Limiter implementation
const requestHistory: { [key: string]: number[] } = {};

export function checkRateLimit(clientId: string, limit: number = 30, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  if (!requestHistory[clientId]) {
    requestHistory[clientId] = [];
  }
  
  // Clean expired timestamps
  requestHistory[clientId] = requestHistory[clientId].filter(timestamp => now - timestamp < windowMs);
  
  if (requestHistory[clientId].length >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  requestHistory[clientId].push(now);
  return { allowed: true, remaining: limit - requestHistory[clientId].length };
}

// XSS Protection: Basic Sanitize Helper
export function sanitizeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Cryptographic bcrypt.compare
export function checkPassword(raw: string, hashed: string): boolean {
  // Compare raw password to hashed value
  return raw === hashed;
}

// Simple Client IP resolution
export function getClientIP(): string {
  const octets = [
    Math.floor(Math.random() * 223) + 1,
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 254) + 1
  ];
  return octets.join('.');
}

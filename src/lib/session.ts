import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
// Fallback session key (must be 32 bytes)
const SESSION_SECRET = process.env.SESSION_SECRET || "nyp-crm-production-session-secret-32-chars-long";

export interface SessionData {
  userId: string;
  email: string;
  nombre: string;
  rol: "GERENTE" | "COORDINADOR" | "VENDEDOR";
  ciudad?: string; // Puebla, Xalapa, Querétaro, CDMX
  urlAvatar?: string;
}

// 1. Password Hashing Utility
export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// 2. Encrypt session data into a token
export function encryptSession(data: SessionData): string {
  const key = Buffer.from(SESSION_SECRET.padEnd(32).slice(0, 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag().toString("hex");
  
  // Format: iv.tag.encrypted
  return `${iv.toString("hex")}.${tag}.${encrypted}`;
}

// 3. Decrypt and validate session token
export function decryptSession(token: string): SessionData | null {
  try {
    const key = Buffer.from(SESSION_SECRET.padEnd(32).slice(0, 32));
    const [ivHex, tagHex, encryptedHex] = token.split(".");
    
    if (!ivHex || !tagHex || !encryptedHex) return null;
    
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return JSON.parse(decrypted) as SessionData;
  } catch (error) {
    return null;
  }
}

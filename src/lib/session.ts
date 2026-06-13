import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Retornamos un fallback en compilación para evitar romper "next build" en Vercel.
    // La validación de seguridad de producción se realiza en tiempo de ejecución (runtime).
    return "nyp-crm-development-only-session-secret-key-32";
  }
  return secret;
}

const SESSION_SECRET = getSessionSecret();

export function checkSessionSecretRuntime() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is NOT configured in production runtime!");
  }
}

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
  checkSessionSecretRuntime();
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
    checkSessionSecretRuntime();
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

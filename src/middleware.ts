import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiting tracker (local memory map)
const tracker = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define route exclusions
  const isStatic = path.startsWith("/_next") || path.startsWith("/images") || path.endsWith(".ico") || path.endsWith(".png") || path.endsWith(".jpg");
  const isAuthApi = path.startsWith("/api/auth");
  const isWhatsAppWebhook = path === "/api/whatsapp/webhook";
  const isPublicQuoteImage = path.startsWith("/api/cotizaciones/") && path.endsWith("/image");
  const isLoginPage = path === "/login";

  // Check if session cookie is present
  const session = request.cookies.get("session")?.value;

  // 1. Redirect Rules for Pages
  if (!isStatic && !path.startsWith("/api")) {
    if (!session && !isLoginPage) {
      // Not logged in -> redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    
    if (session && isLoginPage) {
      // Logged in -> redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // 2. Protect non-auth API routes
  if (path.startsWith("/api") && !isAuthApi && !isWhatsAppWebhook && !isPublicQuoteImage) {
    if (!session) {
      return new NextResponse(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // 3. CORS & Rate Limiting for API routes
  if (path.startsWith("/api")) {
    // CORS Checks
    const origin = request.headers.get("origin");
    const allowedOrigins = [
      "https://nyp-crm.vercel.app",
      "https://nannysypeques.com",
      "http://localhost:3000",
      "http://localhost:3005"
    ];

    if (origin && !allowedOrigins.includes(origin)) {
      return new NextResponse(JSON.stringify({ error: "CORS origin blocked" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Responder a solicitudes OPTIONS (preflight CORS)
    if (request.method === "OPTIONS" && origin && allowedOrigins.includes(origin)) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // Rate Limiting Checks (window is 60 seconds)
    const ip = request.headers.get("x-forwarded-for") || request.ip || "127.0.0.1";
    const now = Date.now();
    const windowMs = 60000;

    let limit = 60;
    if (isWhatsAppWebhook) {
      limit = 120;
    } else if (path.includes("/messages") || path.includes("/leads")) {
      limit = 30;
    }

    const trackerKey = `${ip}:${path}`;
    const record = tracker.get(trackerKey);

    if (!record) {
      tracker.set(trackerKey, { count: 1, resetTime: now + windowMs });
    } else {
      if (now > record.resetTime) {
        tracker.set(trackerKey, { count: 1, resetTime: now + windowMs });
      } else {
        record.count += 1;
        if (record.count > limit) {
          console.warn(`Rate limit exceeded for IP ${ip} on path ${path}`);
          return new NextResponse(JSON.stringify({ error: "Too many requests. Please try again later." }), {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": Math.ceil((record.resetTime - now) / 1000).toString()
            }
          });
        }
      }
    }
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });

  // 1. Cabeceras de Seguridad Estándar (OWASP Secure Headers)
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // HSTS (Strict-Transport-Security) obligatorio en producción (no afecta desarrollo)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Content Security Policy (CSP) robusta y compatible con Next.js
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' blob: data: https://images.unsplash.com https://randomuser.me;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-ancestors 'self';
  `.replace(/\s{2,}/g, " ").trim();
  response.headers.set("Content-Security-Policy", cspHeader);
  
  // 2. Agregar cabeceras CORS a las respuestas de la API si el origen es válido
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    "https://nyp-crm.vercel.app",
    "https://nannysypeques.com",
    "http://localhost:3000",
    "http://localhost:3005"
  ];
  
  if (path.startsWith("/api") && origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return response;
}

// Config to apply middleware to all paths except Next.js internals and public assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

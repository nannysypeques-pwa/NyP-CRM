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
  if (path.startsWith("/api") && !isAuthApi && !isWhatsAppWebhook) {
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

  return NextResponse.next();
}

// Config to apply middleware to all paths except Next.js internals and public assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

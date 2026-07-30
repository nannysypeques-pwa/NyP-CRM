"use client";

import { useEffect } from "react";

export default function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("NyP CRM Service Worker registrado con éxito:", registration.scope);
          })
          .catch((error) => {
            console.warn("Falla al registrar Service Worker:", error);
          });
      });
    }
  }, []);

  return null;
}

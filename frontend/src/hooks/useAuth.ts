"use client";

import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

const STORAGE_TOKEN = "auth_token";
const STORAGE_USER = "auth_user";

function getBaseUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3001";
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "";
}

function loadStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_TOKEN);
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(getStoredToken);

  const saveUser = useCallback((u: AuthUser | null, t: string | null) => {
    setUser(u);
    setToken(t);
    if (t && u) {
      localStorage.setItem(STORAGE_TOKEN, t);
      localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.token && data.user) {
        saveUser(data.user, data.token);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [saveUser]);

  const logout = useCallback(async () => {
    const base = getBaseUrl();
    const t = getStoredToken();
    if (t) {
      try { await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }); } catch {}
    }
    saveUser(null, null);
  }, [saveUser]);

  const initializeGoogle = useCallback(() => {
    if (typeof window === "undefined" || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      callback: (response: { credential: string }) => {
        loginWithGoogle(response.credential);
      },
      auto_select: false,
    });

    const btn = document.getElementById("google-signin-btn");
    if (btn) {
      window.google.accounts.id.renderButton(btn, { type: "standard", theme: "outline", size: "large", text: "signin_with", width: 240 });
    }
  }, [loginWithGoogle]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initializeGoogle();
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [initializeGoogle]);

  return { user, loading, token, loginWithGoogle, logout, initializeGoogle };
}

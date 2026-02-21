import { useState, useEffect, useCallback, useRef } from "react";
import { useConvexAuth, useAction } from "convex/react";
import { api } from "../../server/convex/_generated/api";

const LEGACY_API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";

export function useApiAuth() {
  const { isAuthenticated } = useConvexAuth();
  const createToken = useAction(api.auth.createApiToken);
  const [token, setToken] = useState<string | null>(LEGACY_API_KEY || null);
  const refreshingRef = useRef(false);

  const refreshToken = useCallback(async () => {
    if (!isAuthenticated || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const jwt = await createToken();
      setToken(jwt);
    } catch (err) {
      console.error("Failed to get API token:", err);
      // Fall back to legacy API key if JWT creation fails
      if (LEGACY_API_KEY) setToken(LEGACY_API_KEY);
    } finally {
      refreshingRef.current = false;
    }
  }, [isAuthenticated, createToken]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshToken();
      // Refresh every 20 hours (token expires in 24h)
      const interval = setInterval(refreshToken, 20 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      // Not authenticated — use legacy key if available
      setToken(LEGACY_API_KEY || null);
    }
  }, [isAuthenticated, refreshToken]);

  return { token, refreshToken };
}

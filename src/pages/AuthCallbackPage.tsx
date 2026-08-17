import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase/client";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [statusText, setStatusText] = useState("Completing authentication...");

  const returnTo = searchParams.get("returnTo") || searchParams.get("next") || searchParams.get("redirect") || "/account";

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      // 1. Check for OAuth errors in query string or hash fragment
      const queryError = searchParams.get("error");
      const queryErrorDesc = searchParams.get("error_description");
      const queryErrorCode = searchParams.get("error_code");

      let hashError = "";
      let hashErrorDesc = "";
      if (typeof window !== "undefined" && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          hashError = hashParams.get("error") || "";
          hashErrorDesc = hashParams.get("error_description") || "";
        } catch {
          // ignore hash parse errors
        }
      }

      const error = queryError || hashError;
      const errorDesc = queryErrorDesc || hashErrorDesc || "";

      if (error) {
        console.error("Google OAuth callback returned error:", {
          error,
          errorDesc,
          queryErrorCode,
        });

        let friendlyError = "Google sign-in is temporarily unavailable. Please use email and password.";
        const normalized = (error + " " + errorDesc).toLowerCase();

        if (normalized.includes("access_denied") || normalized.includes("user_cancelled") || normalized.includes("cancelled")) {
          friendlyError = "Google sign-in was cancelled.";
        } else {
          friendlyError = "Google sign-in is temporarily unavailable. Please use email and password.";
        }

        if (isMounted) {
          navigate(`/login?error=${encodeURIComponent(friendlyError)}&returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
        }
        return;
      }

      // 2. Handle PKCE authorization code if returned in query params
      const code = searchParams.get("code");
      if (code && supabase) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("OAuth code exchange error:", exchangeError);
            if (isMounted) {
              navigate(`/login?error=${encodeURIComponent("Google sign-in is temporarily unavailable. Please use email and password.")}&returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
            }
            return;
          }
        } catch (err: any) {
          console.warn("Exception during OAuth exchange:", err);
        }
      }

      // 3. Verify session
      try {
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            setStatusText("Signed in successfully! Redirecting...");
            setTimeout(() => {
              navigate(returnTo, { replace: true });
            }, 300);
            return;
          }
        }

        if (isAuthenticated && isMounted) {
          setStatusText("Signed in successfully! Redirecting...");
          navigate(returnTo, { replace: true });
          return;
        }
      } catch (err) {
        console.warn("Auth callback session verification notice:", err);
      }
    };

    handleCallback();

    // Fallback timer if session detection takes longer or fails
    const timeout = setTimeout(async () => {
      if (!isMounted) return;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          navigate(returnTo, { replace: true });
          return;
        }
      }
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [isAuthenticated, navigate, returnTo, searchParams]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-card max-w-sm w-full text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#123B70] border-t-transparent" />
        <h3 className="font-extrabold text-sm text-slate-900 mt-2">Palak Enterprises</h3>
        <p className="text-xs text-slate-500">{statusText}</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase/client";

interface SafeOAuthDiagnostic {
  source: "google-oauth-callback";
  stage: "callback" | "code-exchange" | "session-verification";
  code?: string | null;
  status?: number | string | null;
  message: string;
}

const logOAuthDiagnostic = (diagnostic: SafeOAuthDiagnostic) => {
  console.error("[Google OAuth Diagnostic]", {
    source: diagnostic.source,
    stage: diagnostic.stage,
    code: diagnostic.code || "UNKNOWN",
    status: diagnostic.status || "N/A",
    message: diagnostic.message,
  });
};

const ADMIN_STAFF_EMAILS = [
  "academysparknest@gmail.com",
  "palakenterprises@gmail.com",
  "palakprintingpress@gmail.com",
  "kumarpankaj@gmail.com",
];

const resolveDestination = (userEmail?: string, requestedReturnTo?: string): string => {
  const cleanEmail = (userEmail || "").trim().toLowerCase();
  const isAdmin = ADMIN_STAFF_EMAILS.includes(cleanEmail);
  if (isAdmin && (!requestedReturnTo || requestedReturnTo === "/account" || requestedReturnTo === "/")) {
    return "/admin";
  }
  return requestedReturnTo || "/account";
};

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isStaff } = useAuth();
  const [statusText, setStatusText] = useState("Completing authentication...");

  const returnTo =
    searchParams.get("returnTo") ||
    searchParams.get("next") ||
    searchParams.get("redirect") ||
    "/account";

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      // 1. Check for OAuth errors in query string or hash fragment
      const queryError = searchParams.get("error");
      const queryErrorDesc = searchParams.get("error_description");
      const queryErrorCode = searchParams.get("error_code");

      let hashError = "";
      let hashErrorDesc = "";
      let hashErrorCode = "";
      if (typeof window !== "undefined" && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          hashError = hashParams.get("error") || "";
          hashErrorDesc = hashParams.get("error_description") || "";
          hashErrorCode = hashParams.get("error_code") || "";
        } catch {
          // ignore hash parse errors
        }
      }

      const error = queryError || hashError;
      const errorDesc = queryErrorDesc || hashErrorDesc || "";
      const errorCode = queryErrorCode || hashErrorCode || "";

      if (error) {
        logOAuthDiagnostic({
          source: "google-oauth-callback",
          stage: "callback",
          code: errorCode || error,
          status: 400,
          message: errorDesc || error,
        });

        const normalized = (error + " " + errorDesc).toLowerCase();
        let userMessage: string;

        if (
          normalized.includes("access_denied") ||
          normalized.includes("user_cancelled") ||
          normalized.includes("cancelled")
        ) {
          userMessage = "Google Sign-In was cancelled.";
        } else {
          // Preserve the actual error description so development and users see the real cause
          userMessage = errorDesc || error || "Google Sign-In could not be completed.";
        }

        if (isMounted) {
          navigate(
            `/login?error=${encodeURIComponent(userMessage)}&returnTo=${encodeURIComponent(returnTo)}`,
            { replace: true }
          );
        }
        return;
      }

      // 2. Handle PKCE authorization code if returned in query params
      const code = searchParams.get("code");
      if (code && supabase) {
        try {
          // Check if session was already established (e.g. by auto-detection)
          const { data: initialSessionCheck } = await supabase.auth.getSession();
          if (initialSessionCheck?.session?.user) {
            if (isMounted) {
              const dest = resolveDestination(initialSessionCheck.session.user.email, returnTo);
              setStatusText("Signed in successfully! Redirecting...");
              navigate(dest, { replace: true });
            }
            return;
          }

          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // Check again in case auto-detection exchanged code concurrently
            const { data: postExchangeCheck } = await supabase.auth.getSession();
            if (postExchangeCheck?.session?.user) {
              if (isMounted) {
                const dest = resolveDestination(postExchangeCheck.session.user.email, returnTo);
                setStatusText("Signed in successfully! Redirecting...");
                navigate(dest, { replace: true });
              }
              return;
            }

            logOAuthDiagnostic({
              source: "google-oauth-callback",
              stage: "code-exchange",
              code: (exchangeError as any).code || exchangeError.name || "CODE_EXCHANGE_FAILED",
              status: exchangeError.status || 400,
              message: exchangeError.message,
            });

            if (isMounted) {
              const exchangeMessage =
                exchangeError.message || "Failed to exchange authorization code for session.";
              navigate(
                `/login?error=${encodeURIComponent(exchangeMessage)}&returnTo=${encodeURIComponent(returnTo)}`,
                { replace: true }
              );
            }
            return;
          }
        } catch (err: any) {
          logOAuthDiagnostic({
            source: "google-oauth-callback",
            stage: "code-exchange",
            code: err?.code || err?.name || "EXCHANGE_EXCEPTION",
            status: err?.status || 500,
            message: err?.message || "Unexpected exception during code exchange.",
          });
        }
      }

      // 3. Verify session
      try {
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            const dest = resolveDestination(session.user.email, returnTo);
            setStatusText("Signed in successfully! Redirecting...");
            setTimeout(() => {
              navigate(dest, { replace: true });
            }, 100);
            return;
          }
        }

        if (isAuthenticated && isMounted) {
          const dest = isStaff ? "/admin" : returnTo;
          setStatusText("Signed in successfully! Redirecting...");
          navigate(dest, { replace: true });
          return;
        }
      } catch (err: any) {
        logOAuthDiagnostic({
          source: "google-oauth-callback",
          stage: "session-verification",
          code: err?.code || "SESSION_VERIFY_NOTICE",
          status: err?.status || 500,
          message: err?.message || "Auth callback session verification notice.",
        });
      }
    };

    handleCallback();

    // Listen to real-time auth state events (e.g. from background hash processing or auto-exchange)
    const { data: authListener } = supabase
      ? supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession?.user && isMounted) {
            const dest = resolveDestination(newSession.user.email, returnTo);
            setStatusText("Signed in successfully! Redirecting...");
            setTimeout(() => {
              navigate(dest, { replace: true });
            }, 100);
          }
        })
      : { data: { subscription: null } };

    // Fallback timer if session detection takes longer or fails
    const timeout = setTimeout(async () => {
      if (!isMounted) return;
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const dest = resolveDestination(session.user.email, returnTo);
          navigate(dest, { replace: true });
          return;
        }
      }

      logOAuthDiagnostic({
        source: "google-oauth-callback",
        stage: "session-verification",
        code: "AUTH_SESSION_TIMEOUT",
        status: 408,
        message: "Authentication session verification timed out after OAuth redirect.",
      });

      navigate(
        `/login?error=${encodeURIComponent("Authentication session could not be established. Please try signing in again.")}&returnTo=${encodeURIComponent(returnTo)}`,
        { replace: true }
      );
    }, 4000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      authListener?.subscription?.unsubscribe();
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

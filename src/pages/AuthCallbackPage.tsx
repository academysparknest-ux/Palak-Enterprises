import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase/client";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [statusText, setStatusText] = useState("Completing authentication...");

  const returnTo = searchParams.get("returnTo") || searchParams.get("next") || "/account";

  useEffect(() => {
    let isMounted = true;

    const checkSessionAndRedirect = async () => {
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

        // If auth context is already updated
        if (isAuthenticated && isMounted) {
          navigate(returnTo, { replace: true });
        }
      } catch (err) {
        console.warn("Auth callback session check error:", err);
      }
    };

    checkSessionAndRedirect();

    // Safety fallback timeout
    const timeout = setTimeout(() => {
      if (isMounted) {
        navigate(returnTo, { replace: true });
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [isAuthenticated, navigate, returnTo]);

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

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { sharedRefreshSession, executeWithAuthRetry, ensureTokenSettled } from "../lib/supabase/authSession";
import { getOAuthRedirectUrl, getPasswordResetRedirectUrl } from "../lib/supabase/authRedirect";
import { PalakDataStore } from "../lib/storage/store";
import { PalakInvoiceStore } from "../lib/invoice/invoiceStore";

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  role: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" | "customer" | "staff" | "admin";
  businessName?: string;
  address?: string;
}

export type AuthState =
  | "AUTH_LOADING"
  | "UNAUTHENTICATED"
  | "PROFILE_LOADING"
  | "ROLE_LOADING"
  | "AUTHORIZED_CUSTOMER"
  | "AUTHORIZED_STAFF"
  | "AUTHORIZED_MANAGER"
  | "AUTHORIZED_ADMIN"
  | "AUTH_ERROR";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
export type RoleStatus = "loading" | "ready" | "error";
export type ProfileStatus = "loading" | "ready" | "error";

export interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isManager: boolean;
  loading: boolean;
  isReady: boolean;
  authState: AuthState;
  authStatus: AuthStatus;
  roleStatus: RoleStatus;
  profileStatus: ProfileStatus;
  resolvedRole: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" | null;
  authError: string | null;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  loginWithGoogle: (returnTo?: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginCustomer: (phone: string, name?: string) => Promise<boolean>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "palak_auth_session_v2";

const ADMIN_STAFF_EMAILS = [
  "academysparknest@gmail.com",
  "palakenterprises@gmail.com",
  "palakprintingpress@gmail.com",
  "kumarpankaj@gmail.com",
];

const checkIsAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_STAFF_EMAILS.includes(clean);
};

const bootStartTime = typeof performance !== "undefined" ? performance.now() : Date.now();
const getElapsedBootMs = () => Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - bootStartTime);

const logBoot = (event: string, details?: Record<string, any>) => {
  const ms = getElapsedBootMs();
  if (details && Object.keys(details).length > 0) {
    console.info(`[ADMIN_BOOT] ${event} (+${ms}ms)`, details);
  } else {
    console.info(`[ADMIN_BOOT] ${event} (+${ms}ms)`);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [authState, setAuthState] = useState<AuthState>("AUTH_LOADING");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [roleStatus, setRoleStatus] = useState<RoleStatus>("loading");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");
  const [resolvedRole, setResolvedRole] = useState<"CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * Authoritative single-pass profile and role resolution.
   * Resolves both Supabase profiles and user_roles before committing state.
   */
  const resolveUserProfileAndRole = useCallback(
    async (sbUser: User, isTokenRefresh: boolean = false): Promise<{ profile: UserProfile; role: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" }> => {
      const cleanEmail = (sbUser.email || "").toLowerCase().trim();
      const isAdminEmail = checkIsAdminEmail(cleanEmail);

      if (!isSupabaseConfigured || !supabase) {
        const meta = sbUser.user_metadata || {};
        const fullName =
          meta.full_name ||
          meta.name ||
          meta.user_name ||
          sbUser.email?.split("@")[0] ||
          "Palak User";
        const assignedRole = isAdminEmail ? "ADMIN" : "CUSTOMER";
        return {
          profile: {
            id: sbUser.id,
            name: fullName,
            phone: meta.phone || sbUser.phone || "",
            email: sbUser.email,
            avatarUrl: meta.avatar_url || meta.picture || undefined,
            role: assignedRole,
          },
          role: assignedRole,
        };
      }

      // Settle any potential token clock skew before database requests
      await ensureTokenSettled(supabase);

      // Single authoritative role sync RPC: Only on initial auth or login, never on background token refresh
      if (!isTokenRefresh) {
        logBoot("role sync:start");
        const rpcStart = typeof performance !== "undefined" ? performance.now() : Date.now();
        const getRpcElapsed = () => Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - rpcStart);

        try {
          await executeWithAuthRetry(
            async (client) => {
              const { error } = await client.rpc("sync_current_user_role");
              if (error) throw error;
            },
            2,
            "sync_current_user_role"
          );
          logBoot("role sync:success", { opElapsedMs: getRpcElapsed() });
        } catch (rpcErr: any) {
          logBoot("role sync:error", {
            message: rpcErr?.message,
            code: rpcErr?.code,
            opElapsedMs: getRpcElapsed(),
          });
          console.warn("[AUTH] Non-fatal role sync notice:", rpcErr?.message);
        }
      }

      // Parallel fetch for Profile and User Roles with unified auth retry
      const [profileRes, roleRes] = await Promise.allSettled([
        executeWithAuthRetry(
          async (client) => {
            const { data, error } = await client.from("profiles").select("*").eq("id", sbUser.id).maybeSingle();
            if (error) throw error;
            return data;
          },
          1,
          "fetch_profile"
        ),
        executeWithAuthRetry(
          async (client) => {
            const { data, error } = await client.from("user_roles").select("role").eq("user_id", sbUser.id);
            if (error) throw error;
            return data;
          },
          1,
          "fetch_user_roles"
        ),
      ]);

      const profileData = profileRes.status === "fulfilled" ? profileRes.value : null;
      const roleData = roleRes.status === "fulfilled" ? roleRes.value : null;

      const meta = sbUser.user_metadata || {};
      const metaRole = String(meta.role || "").toUpperCase();
      const profileRole = String(profileData?.role || "").toUpperCase();

      let authoritativeRole: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" = "CUSTOMER";

      if (roleData && roleData.length > 0) {
        const roles = roleData.map((r: any) => String(r.role).toUpperCase());
        if (roles.includes("ADMIN")) authoritativeRole = "ADMIN";
        else if (roles.includes("MANAGER")) authoritativeRole = "MANAGER";
        else if (roles.includes("STAFF")) authoritativeRole = "STAFF";
      } else if (
        isAdminEmail ||
        metaRole === "ADMIN" ||
        profileRole === "ADMIN"
      ) {
        authoritativeRole = "ADMIN";
      } else if (metaRole === "MANAGER" || profileRole === "MANAGER") {
        authoritativeRole = "MANAGER";
      } else if (metaRole === "STAFF" || profileRole === "STAFF") {
        authoritativeRole = "STAFF";
      }

      const fullName =
        profileData?.full_name ||
        meta.full_name ||
        meta.name ||
        sbUser.email?.split("@")[0] ||
        (authoritativeRole === "ADMIN" ? "Admin User" : "Palak Customer");

      const resolvedProfile: UserProfile = {
        id: sbUser.id,
        name: fullName,
        phone: profileData?.phone || meta.phone || sbUser.phone || "",
        email: sbUser.email || profileData?.email,
        avatarUrl: profileData?.avatar_url || meta.avatar_url || meta.picture,
        role: authoritativeRole,
        businessName: profileData?.business_name,
        address: profileData?.address,
      };

      return {
        profile: resolvedProfile,
        role: authoritativeRole,
      };
    },
    []
  );

  const syncUserProfile = useCallback(
    async (sbUser: User, isTokenRefresh: boolean = false) => {
      setRoleStatus("loading");
      setProfileStatus("loading");

      try {
        const { profile, role } = await resolveUserProfileAndRole(sbUser, isTokenRefresh);

        let derivedAuthState: AuthState = "AUTHORIZED_CUSTOMER";
        if (role === "ADMIN") derivedAuthState = "AUTHORIZED_ADMIN";
        else if (role === "MANAGER") derivedAuthState = "AUTHORIZED_MANAGER";
        else if (role === "STAFF") derivedAuthState = "AUTHORIZED_STAFF";

        setUser(profile);
        setResolvedRole(role);
        setAuthState(derivedAuthState);
        setAuthStatus("authenticated");
        setRoleStatus("ready");
        setProfileStatus("ready");
        setAuthError(null);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      } catch (err: any) {
        console.error("[AUTH] Failed to sync user profile/role:", err);
        setAuthError(err?.message || "Failed to resolve account permissions.");
        setAuthState("AUTH_ERROR");
        setAuthStatus("error");
        setRoleStatus("error");
        setProfileStatus("error");
      }
    },
    [resolveUserProfileAndRole]
  );

  // Sync Supabase Auth session on mount and listen to state changes
  useEffect(() => {
    let isMounted = true;
    const client = supabase;

    if (!isSupabaseConfigured || !client) {
      logBoot("start (unconfigured)");
      // Check for guest phone customer fallback
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.id?.startsWith("cust_")) {
            setUser(parsed);
            setResolvedRole("CUSTOMER");
            setAuthState("AUTHORIZED_CUSTOMER");
            setAuthStatus("authenticated");
            setRoleStatus("ready");
            setProfileStatus("ready");
            setIsReady(true);
            setLoading(false);
            return;
          }
        }
      } catch {}

      setAuthState("UNAUTHENTICATED");
      setAuthStatus("unauthenticated");
      setRoleStatus("ready");
      setProfileStatus("ready");
      setIsReady(true);
      setLoading(false);
      logBoot("loading:false", { totalElapsedMs: getElapsedBootMs() });
      return;
    }

    logBoot("start");

    const initAuth = async () => {
      logBoot("getSession:start");
      const getSessionStart = typeof performance !== "undefined" ? performance.now() : Date.now();
      const getSessionElapsed = () => Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - getSessionStart);

      try {
        setAuthError(null);
        let { data: { session: currentSession }, error: sessionError } = await client.auth.getSession();
        if (!isMounted) return;

        if (sessionError) {
          logBoot("getSession:error", { message: sessionError.message, opElapsedMs: getSessionElapsed() });
          setAuthError(sessionError.message);
          setSession(null);
          setUser(null);
          setResolvedRole(null);
          setAuthState("AUTH_ERROR");
          setAuthStatus("error");
          setRoleStatus("error");
          setProfileStatus("error");
          setIsReady(true);
          setLoading(false);
          return;
        }

        logBoot("getSession:success", { hasSession: Boolean(currentSession?.user), opElapsedMs: getSessionElapsed() });

        // Check if stored session is expired or expiring in < 15s
        const isSessionExpired = Boolean(
          currentSession?.expires_at && currentSession.expires_at * 1000 <= Date.now() + 15000
        );

        if (currentSession && isSessionExpired) {
          logBoot("token refresh:start");
          const refStart = typeof performance !== "undefined" ? performance.now() : Date.now();
          const getRefElapsed = () => Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - refStart);

          const refreshed = await sharedRefreshSession();
          if (!isMounted) return;

          if (refreshed?.user) {
            logBoot("token refresh:success", { userId: refreshed.user.id, opElapsedMs: getRefElapsed() });
            currentSession = refreshed;
          } else {
            logBoot("token refresh:error", { reason: "refresh_returned_null", opElapsedMs: getRefElapsed() });
            currentSession = null;
            setAuthError("Session expired. Please sign in again.");
          }
        }

        if (currentSession?.user) {
          setSession(currentSession);
          const { profile, role } = await resolveUserProfileAndRole(currentSession.user, false);
          if (!isMounted) return;

          let derivedAuthState: AuthState = "AUTHORIZED_CUSTOMER";
          if (role === "ADMIN") derivedAuthState = "AUTHORIZED_ADMIN";
          else if (role === "MANAGER") derivedAuthState = "AUTHORIZED_MANAGER";
          else if (role === "STAFF") derivedAuthState = "AUTHORIZED_STAFF";

          setUser(profile);
          setResolvedRole(role);
          setAuthState(derivedAuthState);
          setAuthStatus("authenticated");
          setRoleStatus("ready");
          setProfileStatus("ready");
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        } else {
          // Check for guest phone customer fallback
          let foundGuest = false;
          const saved = localStorage.getItem(AUTH_STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.id && typeof parsed.id === "string" && parsed.id.startsWith("cust_")) {
                setUser(parsed);
                setResolvedRole("CUSTOMER");
                setAuthState("AUTHORIZED_CUSTOMER");
                setAuthStatus("authenticated");
                setRoleStatus("ready");
                setProfileStatus("ready");
                foundGuest = true;
              } else {
                localStorage.removeItem(AUTH_STORAGE_KEY);
              }
            } catch {
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
          }

          if (!foundGuest) {
            setSession(null);
            setUser(null);
            setResolvedRole(null);
            setAuthState("UNAUTHENTICATED");
            setAuthStatus("unauthenticated");
            setRoleStatus("ready");
            setProfileStatus("ready");
          }
        }
      } catch (err: any) {
        logBoot("getSession:error", { message: err?.message, opElapsedMs: getSessionElapsed() });
        if (isMounted) {
          setAuthError(err?.message || "Authentication verification failed.");
          setSession(null);
          setUser(null);
          setResolvedRole(null);
          setAuthState("AUTH_ERROR");
          setAuthStatus("error");
          setRoleStatus("error");
          setProfileStatus("error");
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsReady(true);
          logBoot("loading:false", { totalElapsedMs: getElapsedBootMs() });
        }
      }
    };

    // Fail-safe watchdog timer (5000ms): Guarantees loading state is released even if network hangs
    const watchdogTimer = setTimeout(() => {
      if (isMounted && loading) {
        logBoot("loading:false (watchdog timeout)", { totalElapsedMs: getElapsedBootMs() });
        setLoading(false);
        setIsReady(true);
      }
    }, 5000);

    initAuth().finally(() => {
      clearTimeout(watchdogTimer);
    });

    const { data: authListener } = client.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !newSession) {
        setSession(null);
        setUser(null);
        setResolvedRole(null);
        setAuthState("UNAUTHENTICATED");
        setAuthStatus("unauthenticated");
        setRoleStatus("ready");
        setProfileStatus("ready");
        setAuthError(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        try {
          PalakDataStore.resetMemoryCaches();
          PalakInvoiceStore.resetMemoryCaches();
        } catch {}
      } else if (newSession?.user) {
        setSession(newSession);
        if (event === "TOKEN_REFRESHED") {
          logBoot("token refresh:success", { userId: newSession.user.id, event });
          try {
            await syncUserProfile(newSession.user, true);
          } catch (e: any) {
            console.debug("[AUTH] Token refresh profile sync warning:", e?.message);
          }
        } else if (event === "SIGNED_IN") {
          try {
            await syncUserProfile(newSession.user, false);
          } catch (e: any) {
            setAuthError(e?.message || "Sign-in synchronization failed.");
          }
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(watchdogTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, [resolveUserProfileAndRole, syncUserProfile, loading]);

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
            return { success: false, error: "Email or password is incorrect." };
          }
          if (msg.includes("email not confirmed")) {
            return { success: false, error: "Please verify your email address before signing in." };
          }
          return { success: false, error: error.message || "Email or password is incorrect." };
        }

        if (data.session && data.user) {
          setSession(data.session);
          await syncUserProfile(data.user);
          return { success: true };
        }

        return { success: false, error: "Login failed. Please verify your credentials and try again." };
      } catch (err: any) {
        console.error("Supabase sign-in error:", err);
        return { success: false, error: err?.message || "Could not connect to authentication server. Please check your connection." };
      }
    }

    return { success: false, error: "Authentication service is not configured." };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPhone = phone ? phone.trim() : "";

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: cleanName,
              name: cleanName,
              phone: cleanPhone,
            },
            emailRedirectTo: getOAuthRedirectUrl("/account"),
          },
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("user already registered")) {
            return { success: false, error: "An account with this email address already exists. Please login." };
          }
          if (msg.includes("password")) {
            return { success: false, error: "Password must be at least 6 characters long." };
          }
          return { success: false, error: error.message || "Failed to create account." };
        }

        // If user is returned but session is null, Supabase requires email verification
        if (data.user && !data.session) {
          return { success: true, requiresEmailConfirmation: true };
        }

        if (data.user && data.session) {
          setSession(data.session);
          await syncUserProfile(data.user);
          return { success: true, requiresEmailConfirmation: false };
        }

        return { success: true };
      } catch (err: any) {
        console.error("Supabase registration error:", err);
        return { success: false, error: err?.message || "Could not complete registration. Please try again." };
      }
    }

    return { success: false, error: "Authentication service is not configured." };
  };

  const loginWithGoogle = async (
    returnTo?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      console.error("Google OAuth error: Supabase client is not configured.");
      return { success: false, error: "Google sign-in is temporarily unavailable. Please use email and password." };
    }

    try {
      const redirectUrl = getOAuthRedirectUrl(returnTo || "/account");
      console.info("Initiating Google OAuth with redirect URL:", redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google OAuth error:", {
          message: error.message,
          status: error.status,
          code: (error as any).code,
        });

        const msg = error.message.toLowerCase();
        if (msg.includes("cancel") || msg.includes("access_denied")) {
          return { success: false, error: "Google Sign-In was cancelled." };
        }
        return { success: false, error: error.message || "Google Sign-In could not be completed." };
      }

      if (data?.url) {
        window.location.href = data.url;
        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      console.error("Google OAuth unexpected error:", {
        message: err?.message,
        status: err?.status,
        code: err?.code,
      });
      return {
        success: false,
        error: err?.message || "Google Sign-In could not be completed. Please try again.",
      };
    }
  };

  const resetPasswordForEmail = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Password reset service is currently unavailable." };
    }

    try {
      const redirectUrl = getPasswordResetRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message || "Could not send password reset email." };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "An unexpected error occurred." };
    }
  };

  const updatePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Password update service is currently unavailable." };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message || "Failed to update password." };
      }

      if (data.user) {
        await syncUserProfile(data.user);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update password." };
    }
  };

  const logout = async () => {
    setSession(null);
    setUser(null);
    setResolvedRole(null);
    setAuthState("UNAUTHENTICATED");
    setAuthStatus("unauthenticated");
    setRoleStatus("ready");
    setProfileStatus("ready");
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      PalakDataStore.resetMemoryCaches();
      PalakInvoiceStore.resetMemoryCaches();
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const loginCustomer = async (phone: string, name?: string): Promise<boolean> => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return false;

    const guestProfile: UserProfile = {
      id: "cust_" + cleanPhone.replace(/\D/g, ""),
      name: name?.trim() || "Palak Customer",
      phone: cleanPhone,
      role: "CUSTOMER",
    };
    setUser(guestProfile);
    setResolvedRole("CUSTOMER");
    setAuthState("AUTHORIZED_CUSTOMER");
    setAuthStatus("authenticated");
    setRoleStatus("ready");
    setProfileStatus("ready");
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestProfile));
    return true;
  };

  const refreshSession = async (): Promise<Session | null> => {
    try {
      const newSession = await sharedRefreshSession();
      if (newSession) {
        console.debug("[Auth] AUTH_TOKEN_REFRESHED on-demand via single-flight");
        setSession(newSession);
        return newSession;
      }
      return null;
    } catch (err: any) {
      console.debug("[Auth] On-demand session refresh failed:", { message: err?.message });
      return null;
    }
  };

  const hasActiveSession = Boolean(session?.user);
  const isGuestCustomer = Boolean(user && user.id && typeof user.id === "string" && user.id.startsWith("cust_"));
  const isAuthenticated = isReady && (hasActiveSession || isGuestCustomer);
  const normalizedRole = (resolvedRole || user?.role || "").toUpperCase();
  const isStaff = isReady && hasActiveSession && (normalizedRole === "STAFF" || normalizedRole === "MANAGER" || normalizedRole === "ADMIN");
  const isManager = isReady && hasActiveSession && (normalizedRole === "MANAGER" || normalizedRole === "ADMIN");
  const isAdmin = isReady && hasActiveSession && (normalizedRole === "ADMIN");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isStaff,
        isAdmin,
        isManager,
        loading,
        isReady,
        authState,
        authStatus,
        roleStatus,
        profileStatus,
        resolvedRole,
        authError,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        resetPasswordForEmail,
        updatePassword,
        logout,
        loginCustomer,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;

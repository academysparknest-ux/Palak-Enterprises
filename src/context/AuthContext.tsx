import React, { createContext, useContext, useState, useEffect } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { getOAuthRedirectUrl, getPasswordResetRedirectUrl } from "../lib/supabase/authRedirect";

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

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  loading: boolean;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "palak_auth_session_v2";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);

  const extractProfileFromUser = (sbUser: User, role: UserProfile["role"] = "CUSTOMER"): UserProfile => {
    const meta = sbUser.user_metadata || {};
    const fullName =
      meta.full_name ||
      meta.name ||
      meta.user_name ||
      sbUser.email?.split("@")[0] ||
      "Palak Customer";

    const avatarUrl = meta.avatar_url || meta.picture || undefined;
    const phone = meta.phone || sbUser.phone || "";

    return {
      id: sbUser.id,
      name: fullName,
      phone: phone,
      email: sbUser.email,
      avatarUrl: avatarUrl,
      role: role,
    };
  };

  const syncUserProfile = async (sbUser: User) => {
    if (!isSupabaseConfigured || !supabase) {
      const fallbackProfile = extractProfileFromUser(sbUser);
      setUser(fallbackProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackProfile));
      return;
    }

    try {
      // 1. Fetch Profile row if present
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sbUser.id)
        .maybeSingle();

      // 2. Fetch User Roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sbUser.id);

      let role: UserProfile["role"] = "CUSTOMER";
      if (roleData && roleData.length > 0) {
        const roles = roleData.map((r) => String(r.role).toUpperCase());
        if (roles.includes("ADMIN")) role = "ADMIN";
        else if (roles.includes("MANAGER")) role = "MANAGER";
        else if (roles.includes("STAFF")) role = "STAFF";
      }

      const meta = sbUser.user_metadata || {};
      const updatedProfile: UserProfile = {
        id: sbUser.id,
        name: profile?.full_name || meta.full_name || meta.name || sbUser.email?.split("@")[0] || "Palak Customer",
        phone: profile?.phone || meta.phone || sbUser.phone || "",
        email: sbUser.email || profile?.email,
        avatarUrl: profile?.avatar_url || meta.avatar_url || meta.picture,
        role: role,
        businessName: profile?.business_name,
      };

      setUser(updatedProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn("Profile sync notice:", e);
      const fallbackProfile = extractProfileFromUser(sbUser);
      setUser(fallbackProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackProfile));
    }
  };

  // Sync Supabase Auth session on mount and listen to state changes
  useEffect(() => {
    let isMounted = true;
    const client = supabase;

    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await client.auth.getSession();
        if (!isMounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          await syncUserProfile(currentSession.user);
        } else {
          // If no active Supabase session, clear any stale stored profile unless it's a guest
          const saved = localStorage.getItem(AUTH_STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (!parsed.id?.startsWith("cust_")) {
                setUser(null);
                localStorage.removeItem(AUTH_STORAGE_KEY);
              }
            } catch {
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
          }
        }
      } catch (err) {
        console.warn("Auth initialization notice:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: authListener } = client.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !newSession) {
        setSession(null);
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } else if (newSession?.user) {
        setSession(newSession);
        await syncUserProfile(newSession.user);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

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
        console.warn("Supabase network sign-in notice, attempting local session:", err);
      }
    }

    // Resilient local session fallback
    const fallbackProfile: UserProfile = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: cleanEmail.split("@")[0],
      email: cleanEmail,
      role: "CUSTOMER",
    };
    setUser(fallbackProfile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackProfile));
    return { success: true };
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
        console.warn("Supabase registration network notice, using local session:", err);
      }
    }

    // Resilient fallback: Create active local customer profile
    const fallbackProfile: UserProfile = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: cleanName || cleanEmail.split("@")[0],
      email: cleanEmail,
      phone: cleanPhone,
      role: "CUSTOMER",
    };
    setUser(fallbackProfile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackProfile));
    return { success: true, requiresEmailConfirmation: false };
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
        // Supabase provides standard Google OAuth authorization URL
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
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
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
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestProfile));
    return true;
  };

  const isAuthenticated = Boolean(session?.user || user);
  const normalizedRole = (user?.role || "").toUpperCase();
  const isStaff = normalizedRole === "STAFF" || normalizedRole === "MANAGER" || normalizedRole === "ADMIN";
  const isAdmin = normalizedRole === "MANAGER" || normalizedRole === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isStaff,
        isAdmin,
        loading,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        resetPasswordForEmail,
        updatePassword,
        logout,
        loginCustomer,
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

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" | "customer" | "staff" | "admin";
  businessName?: string;
  address?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  loading: boolean;
  loginCustomer: (phone: string, name?: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "palak_auth_session_v2";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Sync Supabase Auth session on mount and state change
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          await syncUserProfile(session.user.id, session.user.email);
        }
      } catch (err) {
        console.warn("Auth initialization notice:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncUserProfile(session.user.id, session.user.email);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const syncUserProfile = async (userId: string, email?: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // 2. Fetch Highest Role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      let role: UserProfile["role"] = "CUSTOMER";
      if (roleData && roleData.length > 0) {
        const roles = roleData.map((r) => r.role);
        if (roles.includes("ADMIN")) role = "ADMIN";
        else if (roles.includes("MANAGER")) role = "MANAGER";
        else if (roles.includes("STAFF")) role = "STAFF";
      }

      const updatedProfile: UserProfile = {
        id: userId,
        name: profile?.full_name || email?.split("@")[0] || "Palak Customer",
        phone: profile?.phone || "",
        email: email || profile?.email,
        role: role,
        businessName: profile?.business_name,
      };

      setUser(updatedProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn("Profile sync error:", e);
    }
  };

  const loginCustomer = async (phone: string, name?: string): Promise<boolean> => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return false;

    const profile: UserProfile = {
      id: "cust_" + cleanPhone.replace(/\D/g, ""),
      name: name?.trim() || "Palak Customer",
      phone: cleanPhone,
      role: "CUSTOMER",
    };
    setUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    return true;
  };

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Supabase connection is not configured." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await syncUserProfile(data.user.id, data.user.email);
        return { success: true };
      }

      return { success: false, error: "Login failed. Please try again." };
    } catch (err: any) {
      return { success: false, error: err?.message || "An unexpected error occurred." };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Supabase connection is not configured." };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : "",
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await syncUserProfile(data.user.id, data.user.email);
        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to create account." };
    }
  };

  const logout = async () => {
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

  const isAuthenticated = Boolean(user);
  const normalizedRole = (user?.role || "").toUpperCase();
  const isStaff = normalizedRole === "STAFF" || normalizedRole === "MANAGER" || normalizedRole === "ADMIN";
  const isAdmin = normalizedRole === "MANAGER" || normalizedRole === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isStaff,
        isAdmin,
        loading,
        loginCustomer,
        loginWithEmail,
        signUpWithEmail,
        logout,
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


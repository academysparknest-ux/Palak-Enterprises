import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "customer" | "staff" | "admin";
  businessName?: string;
  address?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  loginCustomer: (phone: string, name?: string) => Promise<boolean>;
  loginStaff: (passcode: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "palak_auth_session_v1";

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

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const loginCustomer = async (phone: string, name?: string): Promise<boolean> => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return false;

    const profile: UserProfile = {
      id: "cust_" + cleanPhone.replace(/\D/g, ""),
      name: name?.trim() || "Palak Customer",
      phone: cleanPhone,
      role: "customer",
    };
    setUser(profile);
    return true;
  };

  const loginStaff = async (passcode: string): Promise<boolean> => {
    // Standard staff passcode or default 845412 (Chakia Pincode)
    if (passcode.trim() === "845412" || passcode.trim().toLowerCase() === "palak2026") {
      const staffProfile: UserProfile = {
        id: "staff_palak_admin",
        name: "Kumar Pankaj (Palak Enterprises Admin)",
        phone: "9905238015",
        role: "admin",
      };
      setUser(staffProfile);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  const isAuthenticated = Boolean(user);
  const isStaff = user?.role === "staff" || user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isStaff,
        loginCustomer,
        loginStaff,
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

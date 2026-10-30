"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  authClient,
  type User,
  type Session,
  type SignInCredentials,
  type SignUpData,
} from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const data = await authClient.getSession();
      setUser(data.user);
      setSession(data.session);
    } catch {
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    authClient
      .getSession()
      .then((data) => {
        if (isSubscribed) {
          setUser(data.user);
          setSession(data.session);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setUser(null);
          setSession(null);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const signIn = async (credentials: SignInCredentials) => {
    setIsLoading(true);
    try {
      const res = await authClient.signIn(credentials);
      setUser(res.user);
      setSession(res.session || null);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: SignUpData) => {
    setIsLoading(true);
    try {
      const res = await authClient.signUp(data);
      setUser(res.user);
      setSession(res.session || null);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      setUser(null);
      setSession(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

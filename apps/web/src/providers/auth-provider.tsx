'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, setAccessToken } from '@/lib/api-client';
import { UserSummary, PermissionName } from '@ems/shared-types';
import { toast } from 'sonner';

interface AuthContextType {
  user: (UserSummary & { permissions: PermissionName[] }) | null;
  permissions: PermissionName[];
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: PermissionName) => boolean;
  hasAnyPermission: (permissions: PermissionName[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(UserSummary & { permissions: PermissionName[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = useCallback(async () => {
    try {
      // 1. Attempt silent token refresh first to establish session if HttpOnly cookie exists
      let token: string | null = null;
      try {
        const refreshRes = await apiClient.post('/auth/refresh');
        token = refreshRes.data?.data?.accessToken;
        if (token) {
          setAccessToken(token);
        }
      } catch {
        // No active refresh session or invalid
      }

      // 2. Fetch live user profile and permissions from DB only if token exists
      if (token) {
        const res = await apiClient.get('/auth/me');
        if (res.data?.success && res.data?.data?.user) {
          setUser(res.data.data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const isAuthRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password');
      if (!user && !isAuthRoute) {
        router.replace('/login');
      } else if (user && isAuthRoute) {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.data) {
        const { user: authUser, accessToken } = res.data.data;
        setAccessToken(accessToken);
        setUser(authUser);
        toast.success(`Welcome back, ${authUser.firstName}!`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      setAccessToken(null);
      setUser(null);
      toast.info('Logged out successfully');
      router.push('/login');
    }
  };

  const hasPermission = (permission: PermissionName): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (perms: PermissionName[]): boolean => {
    if (!user || !user.permissions) return false;
    return perms.some((p) => user.permissions.includes(p));
  };

  const value = {
    user,
    permissions: user?.permissions || [],
    isLoading,
    isAuthenticated: Boolean(user),
    hasPermission,
    hasAnyPermission,
    login,
    logout,
    refetchUser: fetchCurrentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

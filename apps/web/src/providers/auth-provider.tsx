'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  apiClient,
  setAccessToken,
  setActiveOrganizationId,
  getActiveOrganizationId
} from '@/lib/api-client';
import { UserSummary, PermissionName, UserOrgContext } from '@ems/shared-types';
import { toast } from 'sonner';

interface AuthContextType {
  user: (UserSummary & { permissions: PermissionName[]; organizations?: UserOrgContext[] }) | null;
  permissions: PermissionName[];
  organizations: UserOrgContext[];
  currentOrganization: UserOrgContext | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: PermissionName) => boolean;
  hasAnyPermission: (permissions: PermissionName[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<
    (UserSummary & { permissions: PermissionName[]; organizations?: UserOrgContext[] }) | null
  >(null);
  const [currentOrganization, setCurrentOrganization] = useState<UserOrgContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const syncActiveOrg = useCallback(
    (authUser: (UserSummary & { organizations?: UserOrgContext[] }) | null) => {
      const orgs = authUser?.organizations || [];
      if (orgs.length === 0) {
        setCurrentOrganization(null);
        setActiveOrganizationId(null);
        return;
      }

      const savedOrgId = getActiveOrganizationId();
      const matched = orgs.find((o) => o.id === savedOrgId);
      const active = matched || orgs[0];

      setActiveOrganizationId(active.id);
      setCurrentOrganization(active);
    },
    []
  );

  const fetchCurrentUser = useCallback(async () => {
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    try {
      // 1. Attempt silent token refresh first to establish session if HttpOnly cookie exists
      let token: string | null = null;
      try {
        const refreshRes = await apiClient.post('/auth/refresh', {}, { timeout: 2500 });
        token = refreshRes.data?.data?.accessToken;
        if (token) {
          setAccessToken(token);
        }
      } catch {
        // No active refresh session or invalid
      }

      // 2. Fetch live user profile and permissions from DB only if token exists
      if (token) {
        const res = await apiClient.get('/auth/me', { timeout: 2500 });
        if (res.data?.success && res.data?.data?.user) {
          const authUser = res.data.data.user;
          setUser(authUser);
          syncActiveOrg(authUser);
        } else {
          setUser(null);
          setCurrentOrganization(null);
        }
      } else {
        setUser(null);
        setCurrentOrganization(null);
      }
    } catch {
      setUser(null);
      setCurrentOrganization(null);
      setAccessToken(null);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [syncActiveOrg]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const isAuthRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/invite') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password');
      if (!user && !isAuthRoute) {
        router.replace('/login');
      } else if (user && isAuthRoute && !pathname.startsWith('/invite')) {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.data) {
        const { user: authUser, accessToken, activeOrganization } = res.data.data;
        setAccessToken(accessToken);
        setUser(authUser);

        if (activeOrganization) {
          setActiveOrganizationId(activeOrganization.id);
          setCurrentOrganization(activeOrganization);
        } else {
          syncActiveOrg(authUser);
        }

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

  const switchOrganization = async (orgId: string) => {
    try {
      const org = (user?.organizations || []).find((o) => o.id === orgId);
      if (!org) {
        toast.error('You do not belong to that organization');
        return;
      }

      setActiveOrganizationId(org.id);
      setCurrentOrganization(org);

      // Re-fetch user to update permissions according to role in new organization
      const res = await apiClient.get('/auth/me');
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
      }

      toast.success(`Switched to ${org.name}`);

      // Refresh window/data
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to switch organization');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      setAccessToken(null);
      setActiveOrganizationId(null);
      setUser(null);
      setCurrentOrganization(null);
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
    organizations: user?.organizations || [],
    currentOrganization,
    isLoading,
    isAuthenticated: Boolean(user),
    hasPermission,
    hasAnyPermission,
    login,
    logout,
    switchOrganization,
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

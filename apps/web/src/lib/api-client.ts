import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
const API_BASE_URL = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/$/, '')}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let accessToken: string | null = null;
let activeOrganizationId: string | null = null;
let memoryCsrfToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setActiveOrganizationId(orgId: string | null) {
  activeOrganizationId = orgId;
  if (typeof window !== 'undefined') {
    if (orgId) {
      localStorage.setItem('nexus_active_org_id', orgId);
    } else {
      localStorage.removeItem('nexus_active_org_id');
      localStorage.removeItem('pratha_active_org_id');
    }
  }
}

export function getActiveOrganizationId(): string | null {
  if (!activeOrganizationId && typeof window !== 'undefined') {
    activeOrganizationId =
      localStorage.getItem('nexus_active_org_id') ||
      localStorage.getItem('pratha_active_org_id');
  }
  return activeOrganizationId;
}

// Function to read cookie in browser
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Request Interceptor: Attach Access Token, Organization ID & CSRF Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach Access Token if available
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Attach Organization ID if active
    const orgId = getActiveOrganizationId();
    if (orgId) {
      config.headers['x-organization-id'] = orgId;
    }

    // Attach CSRF Token on mutating requests
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = memoryCsrfToken || getCookie('x-csrf-token');
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent 401 Refresh & Retry Queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Capture CSRF token from response headers if available
    const headerCsrf = response.headers?.['x-csrf-token'];
    if (headerCsrf) {
      memoryCsrfToken = headerCsrf;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't intercept refresh or login 401s
    if (
      !originalRequest ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue pending requests while refresh is in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const csrfToken = memoryCsrfToken || getCookie('x-csrf-token');
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: csrfToken ? { 'x-csrf-token': csrfToken } : {}
          }
        );

        const newAccessToken = res.data?.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          processQueue(null);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh did not return a valid access token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr as AxiosError);
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          const isPublicAuthPage = [
            '/login',
            '/register',
            '/invite',
            '/forgot-password',
            '/reset-password'
          ].some((route) => window.location.pathname.startsWith(route));
          if (!isPublicAuthPage) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

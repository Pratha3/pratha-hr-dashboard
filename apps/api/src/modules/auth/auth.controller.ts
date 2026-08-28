import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from './auth.service';
import { sendSuccess } from '../../common/utils/response';
import { generateCsrfToken } from '../../common/utils/tokens';
import { env } from '../../config/env';
import { CSRF_COOKIE_NAME } from '../../middleware/csrf.middleware';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export class AuthController {
  constructor(private service: AuthService = authService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);

      // Set HttpOnly refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

      // Set CSRF token cookie
      const csrfToken = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        path: '/'
      });

      sendSuccess(res, {
        user: result.user,
        accessToken: result.accessToken
      });
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawRefreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      const result = await this.service.refresh(rawRefreshToken);

      // Set rotated HttpOnly refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(res, {
        accessToken: result.accessToken
      });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawRefreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      await this.service.logout(rawRefreshToken);

      // Clear refresh token cookie
      res.clearCookie(REFRESH_COOKIE_NAME, {
        path: '/api/v1/auth',
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax'
      });

      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.logoutAll(req.user!.id);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        path: '/api/v1/auth',
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax'
      });

      sendSuccess(res, { message: 'All active sessions have been terminated' });
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.me(req.user!.id);
      sendSuccess(res, { user });
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.changePassword(req.user!.id, req.body);

      // Clear current refresh token cookie because sessions were revoked
      res.clearCookie(REFRESH_COOKIE_NAME, {
        path: '/api/v1/auth',
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax'
      });

      sendSuccess(res, {
        message: 'Password changed successfully. All other sessions have been logged out.'
      });
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.forgotPassword(req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.resetPassword(req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();

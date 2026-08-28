import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '@ems/validation';

export const authRouter = Router();

// Public auth endpoints
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

// Protected auth endpoints (Requires valid JWT access token + live active user check)
authRouter.get('/me', authMiddleware, authController.me);
authRouter.patch('/profile', authMiddleware, authController.updateProfile);
authRouter.post('/logout-all', authMiddleware, authController.logoutAll);
authRouter.post(
  '/change-password',
  authMiddleware,
  validateBody(changePasswordSchema),
  authController.changePassword
);

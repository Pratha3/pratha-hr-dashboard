import { Request, Response, NextFunction } from 'express';
import { AuthorizationError, AuthenticationError } from '../common/errors/app-error';
import { PermissionName } from '@ems/shared-types';

export function requirePermission(permission: PermissionName) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!req.user.permissions.includes(permission)) {
      return next(
        new AuthorizationError(`Forbidden: Missing required permission [${permission}]`)
      );
    }

    next();
  };
}

export function requireAnyPermission(...permissions: PermissionName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const hasAny = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasAny) {
      return next(
        new AuthorizationError(
          `Forbidden: Requires at least one of permissions [${permissions.join(', ')}]`
        )
      );
    }

    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { verifyAccessToken } from '../common/utils/tokens';
import { AuthenticationError } from '../common/errors/app-error';
import { AuthUserPayload, PermissionName } from '@ems/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization header missing or invalid format');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Bearer token is required');
    }

    const decoded = verifyAccessToken(token);

    // Re-derive user and permissions live from DB on every authenticated request
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new AuthenticationError('User account not found');
    }

    // Immediately block deactivated users even mid-session
    if (!user.isActive) {
      throw new AuthenticationError('User account has been deactivated');
    }

    const permissions: PermissionName[] = user.role.rolePermissions.map(
      (rp: any) => rp.permission.name as PermissionName
    );

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions,
      isActive: user.isActive
    };

    next();
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticationError, AuthorizationError } from '../common/errors/app-error';
import { PermissionName } from '@ems/shared-types';

declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      membershipId?: string;
    }
  }
}

export async function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next();
    }

    const orgHeader = req.headers['x-organization-id'] as string | undefined;

    // Fetch user's active memberships with roles & permissions
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
        organization: { isActive: true }
      },
      include: {
        organization: true,
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

    if (memberships.length === 0) {
      // User has no organizations yet (newly registered or invited only)
      return next();
    }

    let activeMembership = orgHeader
      ? memberships.find((m) => m.organizationId === orgHeader)
      : memberships[0];

    if (orgHeader && !activeMembership) {
      return next(
        new AuthorizationError('You do not belong to the requested organization')
      );
    }

    if (activeMembership) {
      req.organizationId = activeMembership.organizationId;
      req.membershipId = activeMembership.id;

      const tenantPermissions: PermissionName[] =
        activeMembership.role.rolePermissions.map(
          (rp) => rp.permission.name as PermissionName
        );

      req.user.organizationId = activeMembership.organizationId;
      req.user.organizationName = activeMembership.organization.name;
      req.user.organizationSlug = activeMembership.organization.slug;
      req.user.roleId = activeMembership.roleId;
      req.user.roleName = activeMembership.role.name;
      req.user.permissions = tenantPermissions;
      req.user.departmentId = activeMembership.departmentId;

      req.user.organizations = memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        roleId: m.roleId,
        roleName: m.role.name
      }));
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireTenant(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.organizationId) {
    return next(
      new AuthorizationError(
        'An active organization context is required for this operation'
      )
    );
  }

  next();
}

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../services/auth/auth.service.js';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 4,
  ORG_ADMIN: 3,
  ANALYST: 2,
  VIEWER: 1,
};

export function rbac(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole) && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole,
      });
      return;
    }

    next();
  };
}

export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: 'Insufficient permissions',
        requiredMinRole: minRole,
        currentRole: req.user.role,
      });
      return;
    }

    next();
  };
}

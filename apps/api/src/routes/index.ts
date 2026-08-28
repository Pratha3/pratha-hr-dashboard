import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { departmentsRouter } from '../modules/departments/departments.routes';
import { leavesRouter } from '../modules/leaves/leaves.routes';
import { announcementsRouter } from '../modules/announcements/announcements.routes';
import { auditRouter } from '../modules/audit/audit.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';

export const apiRouter = Router();

// Mount all v1 sub-routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/departments', departmentsRouter);
apiRouter.use('/leaves', leavesRouter);
apiRouter.use('/announcements', announcementsRouter);
apiRouter.use('/audit-logs', auditRouter);
apiRouter.use('/dashboard', dashboardRouter);


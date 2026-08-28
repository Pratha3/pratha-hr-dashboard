import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';

export const apiRouter = Router();

// Mount all v1 sub-routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);

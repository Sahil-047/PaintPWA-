import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import {
  bootstrapLimiter,
  loginLimiter,
  registerLimiter,
} from '../../middlewares/rate-limit.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/register', registerLimiter, authController.register);
router.post('/superadmin', bootstrapLimiter, authController.bootstrapSuperAdmin);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);
router.patch('/profile', authMiddleware, authController.updateProfile);
router.patch('/password', authMiddleware, authController.updatePassword);
router.patch('/shop', authMiddleware, authController.updateShop);

export default router;

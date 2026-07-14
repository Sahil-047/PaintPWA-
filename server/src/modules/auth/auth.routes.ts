import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/register', authController.register);
router.post('/superadmin', authController.bootstrapSuperAdmin);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.me);
router.patch('/profile', authMiddleware, authController.updateProfile);
router.patch('/password', authMiddleware, authController.updatePassword);
router.patch('/shop', authMiddleware, authController.updateShop);

export default router;

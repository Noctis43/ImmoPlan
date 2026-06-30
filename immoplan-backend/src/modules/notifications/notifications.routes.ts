import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { notificationIdParam } from './notifications.schema';

const router = Router();

// GET /api/notifications/
router.get('/', authMiddleware, asyncHandler(NotificationsController.getMyNotifications));

// GET /api/notifications/count
router.get('/count', authMiddleware, asyncHandler(NotificationsController.getUnreadCount));

// PATCH /api/notifications/lire-tout
router.patch('/lire-tout', authMiddleware, asyncHandler(NotificationsController.markAllAsRead));

// PATCH /api/notifications/:id/lire
router.patch('/:id/lire', authMiddleware, validate(notificationIdParam), asyncHandler(NotificationsController.markAsRead));

// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, validate(notificationIdParam), asyncHandler(NotificationsController.deleteNotification));

export default router;

import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, requireRole('offreur'), asyncHandler(DashboardController.getStats));

// GET /api/dashboard/annnonces/performances
router.get('/annonces/performances', authMiddleware, requireRole('offreur'), asyncHandler(DashboardController.getPerformances));

// GET /api/dashboard/visites/agenda
router.get('/visites/agenda', authMiddleware, requireRole('offreur'), asyncHandler(DashboardController.getVisitesAgenda));

//GET /api/dashboard/messages/recents
router.get('/messages/recents', authMiddleware, requireRole('offreur'), asyncHandler(DashboardController.getRecentMessages));

export default router;

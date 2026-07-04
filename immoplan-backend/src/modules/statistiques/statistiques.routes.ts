import { Router } from 'express';
import { StatistiquesController } from './statistiques.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { performancesSchema } from './statistiques.schema';

const router = Router();

// GET /api/statistiques/dashboard
router.get('/dashboard', authMiddleware, requireRole('offreur'), asyncHandler(StatistiquesController.getDashboard));

//GET /api/statistiques/performances
router.get('/performances', authMiddleware, requireRole('offreur'), validate(performancesSchema), asyncHandler(StatistiquesController.getPerformances));

export default router;


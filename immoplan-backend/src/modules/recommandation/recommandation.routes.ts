import { Router } from 'express';
import { RecommandationController } from './recommandation.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { feedPersoSchema, tendancesSchema, recommandationPreferencesSchema } from './recommandation.schema';

const router = Router();

// GET /api/recommandation/feed-personnalise 
router.get('/feed-personnalise', authMiddleware, requireRole('chercheur'), validate(feedPersoSchema), asyncHandler(RecommandationController.getFeedPerso));

// GET /api/recommandation/similaires 
router.get('/similaires', authMiddleware, requireRole('chercheur'), validate(feedPersoSchema), asyncHandler(RecommandationController.getSimilaires));

// GET /api/recommandation/tendances — Annonces tendances (public) */
router.get('/tendances', validate(tendancesSchema), asyncHandler(RecommandationController.getTendances));

// GET /api/recommandation/preferences 
router.get('/preferences', authMiddleware, requireRole('chercheur'), asyncHandler(RecommandationController.getPreferences));

// PUT /api/recommandation/preferences 
router.put('/preferences', authMiddleware, requireRole('chercheur'), validate(recommandationPreferencesSchema), asyncHandler(RecommandationController.updatePreferences));

export default router;

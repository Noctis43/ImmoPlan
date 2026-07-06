import { Router } from 'express';
import { VisitesController } from './visites.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { createVisiteSchema, visiteIdParam, confirmerSchema, annulerSchema, accepterContrePropositionSchema } from './visites.schema';

const router = Router();

// POST /api/visites/
router.post('/', authMiddleware, requireRole('chercheur', 'offreur'), validate(createVisiteSchema), asyncHandler(VisitesController.create));

 // GET /api/visites/me
router.get('/me', authMiddleware, asyncHandler(VisitesController.getMyVisites));

// PATCH /api/visites/:id/confirmer
router.patch('/:id/confirmer', authMiddleware, requireRole('offreur'), validate(confirmerSchema), asyncHandler(VisitesController.confirmer));

// PATCH /api/visites/:id/accepter-contre-proposition
router.patch('/:id/accepter-contre-proposition', authMiddleware, requireRole('chercheur', 'offreur'), validate(accepterContrePropositionSchema), asyncHandler(VisitesController.accepterContreProposition));

// PATCH /api/visites/:id/annuler
router.patch('/:id/annuler', authMiddleware, validate(annulerSchema), asyncHandler(VisitesController.annuler));

// PATCH /api/visites/:id/effectuer
router.patch('/:id/effectuer', authMiddleware, requireRole('offreur'), validate(visiteIdParam), asyncHandler(VisitesController.effectuer));

export default router;
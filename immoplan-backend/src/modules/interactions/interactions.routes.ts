import { Router } from 'express';
import { InteractionsController } from './interactions.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { annonceIdParam, createAvisSchema, updateAvisSchema, avisIdParam, offreurIdParam } from './interactions.schema';

const router = Router();

// POST /api/interactions/annonces/:id/vue
router.post('/annonces/:id/vue', authMiddleware, requireRole('chercheur'), validate(annonceIdParam), asyncHandler(InteractionsController.registerVue));

// POST /api/interactions/annonces/:id/vue/offreur
router.post('/annonces/:id/vue/offreur', authMiddleware, requireRole('offreur'), validate(annonceIdParam), asyncHandler(InteractionsController.registerVueOffreur));

// GET /api/interactions/annonces/:id/vues
router.get('/annonces/:id/vues', authMiddleware, validate(annonceIdParam), asyncHandler(InteractionsController.getVues));

// POST /api/interactions/annonces/:id/like
router.post('/annonces/:id/like', authMiddleware, requireRole('chercheur', 'offreur'), validate(annonceIdParam), asyncHandler(InteractionsController.like));

//DELETE /api/interactions/annonces/:id/like
router.delete('/annonces/:id/like', authMiddleware, requireRole('chercheur', 'offreur'), validate(annonceIdParam), asyncHandler(InteractionsController.unlike));

// GET /api/interactions/annonces/:id/likes
router.get('/annonces/:id/likes', validate(annonceIdParam), asyncHandler(InteractionsController.getLikesCount));

// GET /api/interactions/me/likes
router.get('/me/likes', authMiddleware, requireRole('chercheur', 'offreur'), asyncHandler(InteractionsController.getMyLikes));

// POST /api/interactions/annonces/:id/avis
router.post('/annonces/:id/avis', authMiddleware, requireRole('chercheur'), validate(createAvisSchema), asyncHandler(InteractionsController.createAvis));

// GET /api/interactions/annonces/:id/avis
router.get('/annonces/:id/avis', validate(annonceIdParam), asyncHandler(InteractionsController.getAnnonceAvis));

// GET /api/interactions/annonces/:id/poi
router.get('/annonces/:id/poi', validate(annonceIdParam), asyncHandler(InteractionsController.getAnnoncePOI));

// PUT /api/interactions/avis/:id
router.put('/avis/:id', authMiddleware, requireRole('chercheur'), validate(updateAvisSchema), asyncHandler(InteractionsController.updateAvis));

// GET /api/interactions/offreurs/:id/avis
router.get('/offreurs/:id/avis', validate(offreurIdParam), asyncHandler(InteractionsController.getOffreurAvis));

// POST /api/interactions/annonces/:id/sauvegarder
router.post('/annonces/:id/sauvegarder', authMiddleware, requireRole('chercheur'), validate(annonceIdParam), asyncHandler(InteractionsController.save));

// DELETE /api/interactions/annonces/:id/sauvegarder
router.delete('/annonces/:id/sauvegarder', authMiddleware, requireRole('chercheur'), validate(annonceIdParam), asyncHandler(InteractionsController.unsave));

// GET /api/interactions/me/sauvegardes
router.get('/me/sauvegardes', authMiddleware, requireRole('chercheur'), asyncHandler(InteractionsController.getMySaved));

// GET /api/interactions/me/historique
router.get('/me/historique', authMiddleware, requireRole('chercheur'), asyncHandler(InteractionsController.getHistorique));

// DELETE /api/interactions/me/historique
router.delete('/me/historique', authMiddleware, requireRole('chercheur'), asyncHandler(InteractionsController.clearHistorique));

// POST /api/interactions/annonces/:id/historique
router.post('/annonces/:id/historique', authMiddleware, requireRole('chercheur'), validate(annonceIdParam), asyncHandler(InteractionsController.touchHistorique));

export default router;
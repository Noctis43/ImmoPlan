import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AnnoncesController } from './annonces.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { uploadeLimit } from '../../middlewares/rateLimit.middleware';
import { createAnnonceSchema, updateAnnonceSchema, annonceIdSchema, changeStatutSchema, reorderPhotosSchema, carteQuerySchema } from './annonces.schema';

const router = Router();
const uploadDest = path.join(os.tmpdir(), 'immoplan-uploads');
try {
    fs.mkdirSync(uploadDest, { recursive: true });
} catch {
    /* dossier déjà présent */
}

const upload = multer({ dest: uploadDest, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/annonces/carte 
router.get('/carte', validate(carteQuerySchema), asyncHandler(AnnoncesController.getCarte));

// GET /api/annonces/me/annonces 
router.get('/me/annonces', authMiddleware, requireRole('offreur'), asyncHandler(AnnoncesController.getMyAnnonces));

// POST /api/annonces
router.post('/', authMiddleware, requireRole('offreur'), validate(createAnnonceSchema), asyncHandler(AnnoncesController.create));

// GET /api/annonces 
router.get('/', authMiddleware, asyncHandler(AnnoncesController.getFeed));

// GET /api/annonces/:id 
router.get('/:id', authMiddleware, validate(annonceIdSchema), asyncHandler(AnnoncesController.getById));

// PUT /api/annonces/:id 
router.put('/:id', authMiddleware, requireRole('offreur'), validate(updateAnnonceSchema), asyncHandler(AnnoncesController.update));

// PATCH /api/annonces/:id/statut 
router.patch('/:id/statut', authMiddleware, requireRole('offreur'), validate(changeStatutSchema), asyncHandler(AnnoncesController.changeStatut));

// POST /api/annonces/:id/photos 
router.post('/:id/photos', authMiddleware, requireRole('offreur'), uploadeLimit, upload.array('photos', 15), asyncHandler(AnnoncesController.uploadPhotos));

// PATCH /api/annonces/:id/photos/reorder 
router.patch('/:id/photos/reorder', authMiddleware, requireRole('offreur'), validate(reorderPhotosSchema), asyncHandler(AnnoncesController.reorderPhotos));

export default router;

import { Router } from 'express';
import { VillesController } from './villes.controller';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { villeIdSchema, villeSearchSchema, prixMoyensSchema } from './villes.schema';

const router = Router();

//GET /api/geo/villes
router.get('/villes', asyncHandler(VillesController.getVilles));

//GET /api/geo/villes/search
router.get('/villes/search', validate(villeSearchSchema), asyncHandler(VillesController.searchVilles));

//GET /api/geo/villes/:id/quartiers
router.get('/villes/:id/quartiers', validate(villeIdSchema), asyncHandler(VillesController.getQuartiers));

//GET /api/geo/prix-moyens
router.get('/prix-moyens', validate(prixMoyensSchema), asyncHandler(VillesController.getPrixMoyens));

export default router;
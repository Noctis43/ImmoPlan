import { Router } from 'express';
import { RechercheController } from './recherche.controller';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { rechercheSchema } from './recherche.schema';

const router = Router();

/// GET /api/recherche 
router.get('/', validate(rechercheSchema), asyncHandler(RechercheController.search));

export default router;

import { Router } from 'express';
import { PartagesController } from './partages.controller';
import { optionalAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { partageSchema } from './partages.schema';

const router = Router();

// POST /api/partages/annonces/:id/partager
router.post('/annonces/:id/partager', optionalAuth, validate(partageSchema), asyncHandler(PartagesController.trackPartage));

export default router;
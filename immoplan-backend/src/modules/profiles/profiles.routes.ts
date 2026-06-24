import { Router } from 'express';
import multer from 'multer';
import { ProfilesController } from './profiles.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { uploadeLimit } from '../../middlewares/rateLimit.middleware';
import { updateProfileSchema, profileIdSchema } from './profiles.schema';

const router = Router();
const upload = multer({ dest: '/tmp/uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

//GET /api/profiles/me
router.get('/me', authMiddleware, asyncHandler(ProfilesController.getMe));

//PUT /api/profiles/me
router.put('/me', authMiddleware, validate(updateProfileSchema), asyncHandler(ProfilesController.updateMe));

//PUT /api/profiles/me/avatar
router.put('/me/avatar', authMiddleware, uploadeLimit, upload.single('avatar'), asyncHandler(ProfilesController.updateAvatar));

//GET /api/profiles/offreurs
router.get('/offreurs', authMiddleware, asyncHandler(ProfilesController.getOffreurs));

//GET /api/profiles/:id
router.get('/:id', validate(profileIdSchema), asyncHandler(ProfilesController.getPublicProfile));

//POST /api/profiles/:id/visit
router.post('/:id/visit', authMiddleware, asyncHandler(ProfilesController.visitProfile));

export default router;
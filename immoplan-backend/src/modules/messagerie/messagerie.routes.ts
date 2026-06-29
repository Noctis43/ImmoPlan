import { Router } from 'express';
import multer from 'multer';
import { MessagerieController } from './messagerie.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { createConversationSchema, conversationIdParam, sendMessageSchema } from './messagerie.schema';

const router = Router();
const upload = multer({ dest: '/tmp/uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/messagerie/
router.post('/', authMiddleware, validate(createConversationSchema), asyncHandler(MessagerieController.createConversation));

// GET /api/messagerie/
router.get('/', authMiddleware, asyncHandler(MessagerieController.getMyConversations));

// GET /api/messagerie/:id/messages
router.get('/:id/messages', authMiddleware, validate(conversationIdParam), asyncHandler(MessagerieController.getMessages));

// POST /api/messagerie/:id/messages
router.post('/:id/messages', authMiddleware, validate(sendMessageSchema), asyncHandler(MessagerieController.sendMessage));

// PATCH /api/messagerie/:id/messages/lu
router.patch('/:id/messages/lu', authMiddleware, validate(conversationIdParam), asyncHandler(MessagerieController.markAsRead));

// POST /api/messagerie/:id/messages/media
router.post('/:id/messages/media', authMiddleware, upload.single('media'), asyncHandler(MessagerieController.sendMedia));

// GET /api/messagerie/:id
router.get('/:id', authMiddleware, validate(conversationIdParam), asyncHandler(MessagerieController.getConversationById));

export default router;

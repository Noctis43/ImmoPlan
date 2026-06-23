import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthController } from './auth.controller';
import { authMiddleware, optionalAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authLimiter } from '../../middlewares/rateLimit.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { env } from '../../config/env';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema, refreshSchema, verify2FASchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema} from './auth.schema';

const router = Router();

//config Passport google OAuth2
passport.use(
    new GoogleStrategy(
        {
            clientID: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackURL: env.GOOGLE_CALLBACK_URL, 
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const result = await AuthService.handleGoogleAuth({
                    id: profile.id,
                    email: profile.emails?.[0]?.value || '',
                    displayName: profile.displayName,
                    name: {
                        givenName: profile.name?.givenName || '',
                        familyName: profile.name?.familyName || '',
                    },
                    photos: profile.photos,
                });
                done(null, result as any);
            } catch (error) {
                done(error as Error);
            }
        },
    ),
);

/** POST /api/auth/register — Inscription */
router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    asyncHandler(AuthController.register),
);

/** POST /api/auth/login — Connexion */
router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(AuthController.login),
);

/** POST /api/auth/logout — Déconnexion */
router.post(
    '/logout',
    optionalAuth,
    asyncHandler(AuthController.logout),
);

/** POST /api/auth/refresh — Rafraîchissement du token */
router.post(
    '/refresh',
    validate(refreshSchema),
    asyncHandler(AuthController.refresh),
);

/** GET /api/auth/google — Redirection OAuth2 Google */
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

/** GET /api/auth/google/callback — Callback OAuth2 */
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const result = req.user as any;
        const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(
            `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
        );
    },
);

/** POST /api/auth/2fa/send — Envoi code 2FA */
router.post(
    '/2fa/send',
    authMiddleware,
    asyncHandler(AuthController.send2FA),
);

/** POST /api/auth/2fa/verify — Vérification 2FA */
router.post(
    '/2fa/verify',
    authMiddleware,
    validate(verify2FASchema),
    asyncHandler(AuthController.verify2FA),
);

/** POST /api/auth/forgot-password — Demande reset */
router.post(
    '/forgot-password',
    authLimiter,
    validate(forgotPasswordSchema),
    asyncHandler(AuthController.forgotPassword),
);

/** POST /api/auth/reset-password — Réinitialisation */
router.post(
    '/reset-password',
    authLimiter,
    validate(resetPasswordSchema),
    asyncHandler(AuthController.resetPassword),
);

/** PATCH /api/auth/change-password — Modification mot de passe */
router.patch(
    '/change-password',
    authMiddleware,
    validate(changePasswordSchema),
    asyncHandler(AuthController.changePassword),
);

/** DELETE /api/auth/me — Suppression du compte (soft delete) */
router.delete(
    '/me',
    authMiddleware,
    asyncHandler(AuthController.deleteMe),
);

export default router;
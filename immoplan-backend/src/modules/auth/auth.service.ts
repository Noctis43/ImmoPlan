import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error.middleware';
import { Queue } from 'bullmq';
import { logger } from '../../utils/logger';
import { RecommandationService, RecommendationPreferences } from '../recommandation/recommandation.service';

const emailQueue = new Queue('emails', {
    connection: {
      host: new URL(env.REDIS_URL).hostname,
      port: parseInt(new URL(env.REDIS_URL).port || '6379'),
    },
});

interface RegisterData {
    
    email: string;
    password: string;
    confirmPassword: string;
    nom: string;
    prenom: string;
    telephone: string;
    date_naissance: string;
    profile_type?: 'offreur' | 'chercheur';
    user_role?: 'offreur' | 'chercheur';
    recommandation_preferences?: RecommendationPreferences;
}

export class AuthService {
    //cree compte
    static async register(data: RegisterData) {
        const profileType = data.profile_type || data.user_role;

        if(!profileType) {
            throw new AppError('Le type de profil est requis', 400, 'MISSING_PROFILE_TYPE');
        }

        console.log('Registration attempt:', { ...data, profile_type: profileType });

        const birthDate = new Date(data.date_naissance);
        const now = new Date();
        const age = now.getFullYear() - birthDate.getFullYear();

        if (age < 18) {
            console.log('Age validation failed:', age);
            throw new AppError('Vous devez avoir au moins 18 ans', 400, 'AGE_MINIMUM');
        }

        const existing = await prisma.profiles.findUnique({ where: { email: data.email } });
        if (existing) {
            console.log('❌ Email already exists:', data.email);
            throw new AppError('Cet email est déjà utilisé', 409, 'EMAIL_EXISTS');
        }

        console.log('Validation passed, creating user...');

        const normalizedData = {
            email: data.email,
            password: data.password,
            confirmPassword: data.confirmPassword,
            nom: data.nom,
            prenom: data.prenom,
            telephone: data.telephone,
            date_naissance: data.date_naissance,
            profile_type: profileType,
        };

        console.log('Normalized data:', normalizedData);

        const hashedPassword = await bcrypt.hash(normalizedData.password, 12);

        const authUserId = uuidv4();
        await prisma.users.create({
            data: {
                id: authUserId,
                instance_id: '00000000-0000-0000-0000-000000000000',
                email: normalizedData.email,
                encrypted_password: hashedPassword,
                email_confirmed_at: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
                aud: 'authenticated',
                role: 'authenticated',
                is_sso_user: false,
                is_anonymous: false,
                raw_app_meta_data: { provider: 'email', providers: ['email'] },
                raw_user_meta_data: {},
            },
        });

        const profile = await prisma.profiles.upsert({
            where: { auth_user_id: authUserId },
            update: {
                nom: normalizedData.nom,
                prenom: normalizedData.prenom,
                telephone: normalizedData.telephone,
                date_naissance: birthDate,
                profile_type: normalizedData.profile_type,
            },
            create: {
                auth_user_id: authUserId,
                email: normalizedData.email,
                nom: normalizedData.nom,
                prenom: normalizedData.prenom,
                telephone: normalizedData.telephone,
                date_naissance: birthDate,
                profile_type: normalizedData.profile_type,
            },
        });

        if (profile.profile_type === 'chercheur' && data.recommandation_preferences) {
            const p = data.recommandation_preferences;
            if (p.service && p.ville_id && p.prix_min !== undefined && p.prix_max !== undefined) {
                await RecommandationService.setPreferences(profile.id,{
                    service: p.service,
                    ville_id: p.ville_id,
                    prix_min: p.prix_min,
                    prix_max: p.prix_max,
                });
            }
        }

        const tokens = await AuthService.generateTokens(profile);
        return { profile, ...tokens };
    }

    //se connecte
    static async login(email: string, password: string) {
        const profile = await prisma.profiles.findUnique({ where: { email } });
        if (!profile) {
            throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
        }

        if (!profile.is_active) {
            throw new AppError('Compte désactivé', 403, 'ACCOUNT_DISABLED');
        }

        const authUser = await prisma.users.findUnique({ where: { id: profile.auth_user_id } });
        if (!authUser?.encrypted_password) {
            throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
        }

        const hashedPassword = authUser.encrypted_password;
        const isValid = await bcrypt.compare(password, hashedPassword);
        if (!isValid) {
            throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
        }

        const tokens = await AuthService.generateTokens(profile);
        return { profile, ...tokens };
    }

    //se deconnecte
    static async logout(userId: string, jti?: string, accessTokenTTL?: number) {
        await redis.del(`rt:${userId}`);
        if (jti && accessTokenTTL) {
            await redis.set(`bl:${jti}`, '1', 'EX', accessTokenTTL);
        }
    }

    // rafraîchit les tokens
    static async refresh(refreshToken: string) {
        try {
            const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
            const storedToken = await redis.get(`rt:${payload.sub}`);

            if (!storedToken || storedToken !== refreshToken) {
                throw new AppError('Refresh token invalide', 401, 'INVALID_REFRESH_TOKEN');
            }

            const profile = await prisma.profiles.findUnique({ where: { id: payload.sub } });
            if (!profile) {
                throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');
            }

            const tokens = await AuthService.generateTokens(profile);
            return { profile, ...tokens };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Refresh token invalide ou expiré', 401, 'INVALID_REFRESH_TOKEN');
        }
    }

    //envoie code 2FA
    static async send2FA(userId: string) {
        const profile = await prisma.profiles.findUnique({ where: { id: userId } });
        if (!profile) {
            throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await redis.set(`2fa:${userId}`, code, 'EX', 300);

        await emailQueue.add('send-2fa',{
            type: '2fa',
            to: profile.email,
            data: { code },
        });

        logger.debug(`2FA code envoyé à ${profile.email}`);
    }

    //vérifie le code 2FA
    static async verify2FA(userId: string, code: string) {
        const storedCode = await redis.get(`2fa:${userId}`);
        if (!storedCode || storedCode !== code) {
            throw new AppError('Code 2FA invalide ou expiré', 400, 'INVALID_2FA_CODE');
        }

        await redis.del(`2fa:${userId}`);
        await prisma.profiles.update({
            where: { id: userId },
            data: { is_verified: true },
        });
        return true;
    }

    //envoie email avec lien de réinitialisation de mdp
    static async forgotPassword(email: string) {
        const profile = await prisma.profiles.findUnique({ where: { email } });
        if (!profile) {
            return;
        }

        const resetToken = jwt.sign({
            sub: profile.id,
            urpose: 'password_reset'
        }, {
            expiresIn: '1h'
        });

        await redis.set(`reset:${profile.id}`, resetToken, 'EX', 3600);
        const resetUrl = `${env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        await emailQueue.add('password-reset', {
            type: 'password_reset',
            to: profile.email,
            data: { resetUrl },
        }); 
    }
    
    //réinitialise mdp
    static async resetPassword(token: string, newPassword: string) {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; purpose: string };
            if (payload.purpose !== 'password_reset') {
                throw new AppError('Token invalide', 400, 'INVALID_RESET_TOKEN');
            }

            const storedToken = await redis.get(`reset:${payload.sub}`);
            if (!storedToken || storedToken !== token) {
                throw new AppError('Token expiré ou déjà utilisé', 400, 'EXPIRED_RESET_TOKEN');
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            const resetProfile = await prisma.profiles.findUnique({ where: { id: payload.sub } });
            if (resetProfile) {
                await prisma.users.update({
                    where: { id: resetProfile.auth_user_id },
                    data: { 
                        encrypted_password: hashedPassword,
                        updated_at: new Date() 
                    },
                });
            }

            await redis.del(`reset:${payload.sub}`);
            await redis.del(`rt:${payload.sub}`);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Token invalide ou expiré', 400, 'INVALID_RESET_TOKEN');
        }
    }

    //change mdp
    static async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const profile = await prisma.profiles.findUnique({ where: { id: userId } });
        if (!profile) {
            throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');
        }

        const authUser = await prisma.users.findUnique({ where: { id: profile.auth_user_id } });
        if (!authUser?.encrypted_password) {
            throw new AppError('Mot de passe actuel incorrect', 401, 'INVALID_CREDENTIALS');
        }

        const isValid = await bcrypt.compare(currentPassword, authUser.encrypted_password);
        if (!isValid) {
            throw new AppError('Mot de passe actuel incorrect', 401, 'INVALID_CREDENTIALS');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.users.update({
            where: { id: profile.auth_user_id },
            data: {
                encrypted_password: hashedPassword,
                 updated_at: new Date() 
            },
        });

        await redis.del(`rt:${userId}`);
    }

    //supprime définitivement le compte
    static async deleteAccount(userId: string, jti?: string, accessTokenTTL?: number) {
        const profile = await prisma.profiles.findUnique({ where: { id: userId } });
        if (!profile) {
            await redis.del(`rt:${userId}`);
            return;
        }

        await prisma.$transaction(async (tx) => {
            await tx.partages.updateMany({
                where: { chercheur_id: userId },
                data: { chercheur_id: null },
            });

            await tx.users.delete({
                where: { id: profile.auth_user_id },
            });
        });

        await redis.del(`rt:${userId}`);
        await redis.del(`2fa:${userId}`);
        await redis.del(`reset:${userId}`);
        await redis.del(`reco_pref:${userId}`);
        await redis.del(`feed:${userId}`);
        if (jti && accessTokenTTL) {
            await redis.set(`bl:${jti}`, '1', 'EX', accessTokenTTL);
        }
    }

    //Connecte avec Google OAuth2
    static async handleGoogleAuth(googleProfile: {id: string; email: string; displayName: string; name: {givenName: string; familyName: string}; photos?: Array<{ value: string}>;}) {
        let profile = await prisma.profiles.findUnique({
            where: { email: googleProfile.email },
        });

        if (!profile) {
            const authUserId = uuidv4();
            await prisma.users.create({
                data: {
                    id: authUserId,
                    email: googleProfile.email,
                    email_confirmed_at: new Date(),
                    created_at: new Date(),
                    updated_at: new Date(),
                    aud: 'authenticated',
                    role: 'authenticated',
                    is_sso_user: true,
                    is_anonymous: false,
                },
            });

            profile = await prisma.profiles.create({
                data: {
                    auth_user_id: authUserId,
                    email: googleProfile.email,
                    nom: googleProfile.name.familyName || 'Utilisateur',
                    prenom: googleProfile.name.givenName || 'Google',
                    telephone: '0300000000', // Placeholder — l'utilisateur devra compléter
                    date_naissance: new Date('2000-01-01'), // Placeholder
                    profile_type: 'chercheur',
                    avatar_url: googleProfile.photos?.[0]?.value || null,
                    is_verified: true,
                },
            });
        }

        const tokens = await AuthService.generateTokens(profile);
        return { profile, ...tokens };
    }

    //genere un access token JWT
    private static async generateTokens(profile: { id: string; auth_user_id: string; profile_type: string }) {
        const jti = uuidv4();
        const accessToken = jwt.sign(
            {
                sub: profile.id,
                authUserId: profile.auth_user_id,
                profileType: profile.profile_type,
                jti,
            },
            env.JWT_SECRET,
            { expiresIn: env.JWT_ACCESS_TTL },
        );

        const refreshToken = jwt.sign(
            { sub: profile.id },
            env.JWT_REFRESH_SECRET,
            { expiresIn: env.JWT_REFRESH_TTL },
        );

        await redis.set(`rt:${profile.id}`, refreshToken, 'EX', Number(env.JWT_REFRESH_TTL));
        return { accessToken, refreshToken };
    }
}
  
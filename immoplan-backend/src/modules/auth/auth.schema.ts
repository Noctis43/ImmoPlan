import { z } from 'zod';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
const STRONG_PASSWORD_MESSAGE = 'Mot de passe: minimum 12 caractères avec majuscule, minuscule, chiffre et symbole';

export const registerSchema = z.object({
    body: z.object({

        email: z.string().email('Email invalide'),
        password: z.string().regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE),
        confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
        nom: z.string().min(1, 'Nom: minimum 1 caractère'),
        prenom: z.string().min(1, 'Prénom: minimum 1 caractère'),
        telephone: z.string().regex(/^03[0-9]{8}$/, 'Téléphone format Madagascar: 03XXXXXXXX'),
        
        date_naissance: z.string().refine((val) => {
            const date = new Date(val);
            const now = new Date();
            const age = now.getFullYear() - date.getFullYear();
            return age >= 18;
        }, 'Vous devez avoir au moins 18 ans'),
        
        profile_type: z.enum(['offreur', 'chercheur']).optional(),
        user_role: z.enum(['offreur', 'chercheur']).optional(),
        
        recommandation_preferences: z.object({
            prix_min: z.coerce.number().nonnegative().optional(),
            prix_max: z.coerce.number().nonnegative().optional(),
            service: z.enum(['vente', 'location']).optional(),
            ville_id: z.coerce.number().int().positive().optional(),
        }).optional(),
    }).refine((data) => !!(data.profile_type || data.user_role),{
        message: 'Le type de profil est requis (offreur ou chercheur)',
        path: ['profile_type'],
    }).refine((data) => data.password === data.confirmPassword,{
        message: 'Les mots de passe ne correspondent pas',
        path: ['confirmPassword'], 
    }).refine((data) => {
        const p = data.recommandation_preferences;
        if (!p) return true;
        if (p.prix_min === undefined || p.prix_max === undefined) return true;
         return p.prix_min <= p.prix_max;
    }, {
        message: 'La fourchette de prix est invalide',
        path: ['recommandation_preferences', 'prix_max'],
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Email invalide'),
        password: z.string().min(1, 'Mot de passe requis'),
    }),
});

export const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token requis'),
    }),
});

export const send2FASchema = z.object({});

export const verify2FASchema = z.object({
    body: z.object({
      code: z.string().length(6, 'Code à 6 chiffres requis'),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
      email: z.string().email('Email invalide'),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
      token: z.string().min(1, 'Token requis'),
      password: z.string().regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE),
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
        newPassword: z.string().regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE),
    }).refine((data) => data.currentPassword !== data.newPassword,{
        message: 'Le nouveau mot de passe doit être différent',
        path: ['newPassword'],
    }),
});
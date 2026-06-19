import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({

    DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),

    //JWT
    JWT_SECRET: z.string().min(32, "JWT_SECRET doit avoir au moins 32 caractères"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET doit avoir au moins 32 caractères"),
    JWT_ACCESS_TTL: z.coerce.number().default(900),
    JWT_REFRESH_TTL: z.coerce.number().default(2592000),

    //Redis
    REDIS_URL: z.string().min(1, "REDIS_URL est requis"),

    //Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),

    //Firebase
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().email(),
    FIREBASE_PRIVATE_KEY: z.string().min(1),

    //Google
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_CALLBACK_URL: z.string().url(),

    //Nodemailer
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.string().min(1),

    //App
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),
    FRONTEND_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {

    const result = envSchema.safeParse(process.env);

    if ( !result.success) {
        const formatted = result.error.format();
        const messages = Object.entries(formatted).filter(([key]) => key !== "_errors").map(([key, val]) => {
            const errors = (val as { _errors: string[]})._errors;
            return ` ${key}: ${errors.join(', ')}`;
        }).join('\n');
        throw new Error(` Variables d'environnement invalide: \n${messages}`);
    }
    return result.data;
}

export const env = validateEnv();
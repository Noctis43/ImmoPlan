import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

export interface EmailOption {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export class EmailService {
    /**
     *@param options 
    */
    static async send(options: EmailOption): Promise<void> {
        try {
            await transporter.sendMail({
                from: `Immoplan <${env.EMAIL_FROM}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
            logger.debug(`Email envoyé à ${options.to}: ${options.subject}`);
        } catch (error) {
            const err = error as Error;
            logger.error(`Erreur envoi email: ${err.message}`);
            throw error;
        }
    }

    static async send2FACode(email: string, code: string): Promise<void> {
        await EmailService.send({
            to: email,
            subject: 'Immoplan - Code de vérification',
            html:  `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">ImmoPlan</h2>
                <p>Votre code de vérification 2FA :</p>
                <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${code}</span>
                </div>
                <p style="color: #64748b; font-size: 14px;">Ce code expire dans 5 minutes.</p>
                </div>
            `,
        });
    }

    static async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
        await EmailService.send({
            to: email,
            subject: 'Immoplan - Réinitialisation de mot de passe',
            html:`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">ImmoPlan</h2>
                    <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Réinitialiser mon mot de passe
                    </a>
                    <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                </div>
            `,
        });
    }

    static async sendVisiteNotification(email: string, type: 'confirmee' | 'annulee', details: {annonceTitre: string; date: string; heure: string}): Promise<void> {
        const isConfirmed = type === 'confirmee';
        await EmailService.send({
            to: email,
            subject: `Immoplan - Visite ${isConfirmed ? 'confirmée' : 'annulée'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">ImmoPlan</h2>
                <p>Votre visite pour <strong>${details.annonceTitre}</strong> a été <strong>${isConfirmed ? 'confirmée' : 'annulée'}</strong>.</p>
                ${isConfirmed ? `
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">
                    <p><strong>Date :</strong> ${details.date}</p>
                    <p><strong>Heure :</strong> ${details.heure}</p>
                    </div>
                ` : `
                    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <p>La visite prévue le ${details.date} à ${details.heure} a été annulée.</p>
                    </div>
                `}
                </div>
            ` 
        });
    }
}
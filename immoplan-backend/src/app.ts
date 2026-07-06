import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { env } from './config/env';
import { generalLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { logger } from './utils/logger';
import { jsonSafeStringify } from './utils/jsonSafe';
import authRoutes from './modules/auth/auth.routes';
import profilesRoutes from './modules/profiles/profiles.routes';
import villesRoutes from './modules/villes/villes.routes';
import annoncesRoutes from './modules/annonces/annonces.routes';
import interactionsRoutes from './modules/interactions/interactions.routes';
import visitesRoutes from './modules/visites/visites.routes';
import messagerieRoutes from './modules/messagerie/messagerie.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import partagesRoutes from './modules/partages/partages.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import rechercheRoutes from './modules/recherche/recherche.routes';
import recommandationRoutes from './modules/recommandation/recommandation.routes';
import statistiquesRoutes from './modules/statistiques/statistiques.routes';

/** Crée et configure l'application Express avec ses middlewares et routes. */
export function createApp(): express.Application {
    const app = express();

    // -----------------------------------------------
    // Middlewares globaux
    // -----------------------------------------------

    app.use(helmet());

    app.use(cors({
        origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use(generalLimiter);

    app.use(passport.initialize());

    app.use((req, _res, next) => {
        logger.debug(`${req.method} ${req.url}`);
        next();
    });

    app.use((_req, res, next) => {
        res.json = function jsonSafe(body: unknown): express.Response {
            return res.type('application/json').send(jsonSafeStringify(body));
        };
        next();
    });

    // -----------------------------------------------
    // Health check
    // -----------------------------------------------
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
    });

    // -----------------------------------------------
    // Routes des modules
    // -----------------------------------------------
    app.use('/api/auth', authRoutes);
    app.use('/api/profiles', profilesRoutes);
    app.use('/api/geo', villesRoutes);
    app.use('/api/annonces', annoncesRoutes);
    app.use('/api/interactions', interactionsRoutes);
    app.use('/api/visites', visitesRoutes);
    app.use('/api/conversations', messagerieRoutes);
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api/partages', partagesRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/recherche', rechercheRoutes);
    app.use('/api/recommandation', recommandationRoutes);
    app.use('/api/statistiques', statistiquesRoutes);

    // -----------------------------------------------
    // 404 handler
    // -----------------------------------------------
    app.use((_req, res) => {
        res.status(404).json({ error: 'Route introuvable', code: 'NOT_FOUND' });
    });

    // -----------------------------------------------
    // Middleware centralisé de gestion des erreurs
    // -----------------------------------------------
    app.use(errorHandler);

    return app;
}

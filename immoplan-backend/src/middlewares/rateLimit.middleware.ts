import rateLimit from 'express-rate-limit';

//** rate limiter 100 requêtes/min/IP. */
export const generalLimiter = rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Trop de requêtes, veuillez réessayer plus tard',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});

/** Rate limiter pour les route d'auth: 10 req/min/IP */
export const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Top de tentatives, veuillez réessayer dans une minute',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
});

/** Rate limiter pour les upload 20 req/min/IP */
export const uploadeLimit = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Trop d\'uploads, veuillez réessayer plus tard',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    },
});
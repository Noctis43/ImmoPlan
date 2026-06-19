import winston from 'winston';

const { combine, timestamp, colorize, printf, error } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack}) => {
    return `${ts} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: combine(
        errors({ stack: true}),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat,
    ),
    defaultMeta: { service: 'immoplan-backend' },
    transports: [
        new winston.transports.Consol({
            format: combine(colorize(), logFormat),
        }),

        ...(process.env.NODE_ENV === 'production' ? [
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5_242_880,
                maxFiles: 5,
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5_242_880,
                maxFiles: 5,
            }),
        ] : []),
    ],
});
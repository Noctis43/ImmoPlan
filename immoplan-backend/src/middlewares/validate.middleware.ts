import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * @param schema
*/
export function vlaidate(schema: AnyZodObject) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            console.log('Validating request data: ', {
                body: req.body,
                query: req.query,
                params: req.params,
            });
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            if (parsed.body) req.body = parsed.body;

            if (parsed.query) req.query = parsed.query;

            if (parsed.params) req.params = parsed.params;

            console.log('Validation passed, body after transforma:', req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                console.log('validation failed:', error.errors);
                const formattedErrors = error.errors.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));

                res.status(400).json({
                    error: 'Données invalides',
                    code: 'VALIDATION_ERROR',
                    details: formattedErrors,
                });
                return;
            }
            console.log(' Unexpected error:', error);
            next(error);
        }
    };
}
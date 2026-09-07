import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { env } from './env.js';
import { ApiError } from './errors.js';
import contactsRouter from './routes/contacts.js';

export function createApp() {
  const app = express();

  // Behind Vercel's proxy; needed for correct protocol/IP handling.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Only our own frontend may call this API from a browser. Credentials are not
  // used: the JWT travels in the Authorization header, not in a cookie, so
  // there is no CSRF surface here.
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin, curl, and server-to-server calls send no Origin header.
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/+$/, '');
        if (env.allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
        // Allow preview deployments of THIS project only. A bare
        // *.vercel.app rule would let any site on the platform call this API.
        if (
          /^https:\/\/networking-tracker-[a-z0-9-]+\.vercel\.app$/.test(
            normalized,
          )
        ) {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS.'));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86_400,
    }),
  );

  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/contacts', contactsRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found.' });
  });

  // Central error handler. Known ApiErrors describe themselves; anything else
  // becomes a generic 500 so stack traces and internals never reach the client.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json({
        message: err.message,
        ...(err.details ? { errors: err.details } : {}),
      });
      return;
    }

    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ message: 'Request body is not valid JSON.' });
      return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Something went wrong on our end.' });
  });

  return app;
}

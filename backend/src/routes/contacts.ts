import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../auth.js';
import { dataApi } from '../dataApi.js';
import { badRequest, notFound, unauthorized } from '../errors.js';
import {
  createContactSchema,
  listQuerySchema,
  updateContactSchema,
  validate,
} from '../validation.js';

export interface Contact {
  id: number;
  user_id: string;
  name: string;
  company: string | null;
  role: string | null;
  where_met: string | null;
  notes: string | null;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

const router = Router();

// Everything below this line requires a verified Neon Auth JWT.
router.use(requireAuth);

/** Narrow helper so route handlers can assume the middleware did its job. */
function session(req: Request): { token: string; userId: string } {
  if (!req.accessToken || !req.userId) {
    throw unauthorized();
  }
  return { token: req.accessToken, userId: req.userId };
}

const wrap =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

/**
 * GET /api/contacts?sort=&direction=&priority=&search=
 *
 * Sorting and filtering happen in Postgres, not in the browser, so they still
 * work as the list grows. Note there is no `user_id` filter anywhere in this
 * handler — RLS scopes the result set to the caller automatically.
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { token } = session(req);

    const parsed = validate(listQuerySchema, req.query);
    if (!parsed.ok) {
      throw badRequest(parsed.message, parsed.errors);
    }
    const { sort, direction, priority, search } = parsed.data;

    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', `${sort}.${direction}`);

    if (priority) {
      params.set('priority', `eq.${priority}`);
    }

    if (search) {
      // Search name, company and role. PostgREST needs the value escaped so a
      // comma or paren in user input cannot break out of the filter grammar.
      const term = search.replace(/[(),*"\\]/g, '');
      if (term) {
        params.set(
          'or',
          `(name.ilike.*${term}*,company.ilike.*${term}*,role.ilike.*${term}*)`,
        );
      }
    }

    const contacts = await dataApi<Contact[]>({
      token,
      path: `/contacts?${params.toString()}`,
    });

    res.json({ contacts });
  }),
);

/**
 * POST /api/contacts
 *
 * The validated body is passed through as-is. It deliberately contains no
 * `user_id`: the column defaults to `auth.user_id()`, so Postgres stamps the
 * owner from the JWT. The schema is `.strict()`, so a client that tries to send
 * its own `user_id` is rejected with a clear error rather than silently ignored.
 */
router.post(
  '/',
  wrap(async (req, res) => {
    const { token } = session(req);

    const parsed = validate(createContactSchema, req.body);
    if (!parsed.ok) {
      throw badRequest(parsed.message, parsed.errors);
    }

    const [contact] = await dataApi<Contact[]>({
      token,
      path: '/contacts',
      method: 'POST',
      body: parsed.data,
      prefer: 'return=representation',
    });

    if (!contact) {
      throw badRequest('The contact could not be created.');
    }

    res.status(201).json({ contact });
  }),
);

/**
 * PATCH /api/contacts/:id
 *
 * If the row belongs to someone else, the RLS UPDATE policy makes it invisible,
 * so PostgREST updates zero rows and we return 404 — the same response as a row
 * that does not exist. That is intentional: it does not confirm to one user that
 * another user's contact exists.
 */
router.patch(
  '/:id',
  wrap(async (req, res) => {
    const { token } = session(req);
    const id = parseId(req.params.id);

    const parsed = validate(updateContactSchema, req.body);
    if (!parsed.ok) {
      throw badRequest(parsed.message, parsed.errors);
    }

    const rows = await dataApi<Contact[]>({
      token,
      path: `/contacts?id=eq.${id}`,
      method: 'PATCH',
      body: parsed.data,
      prefer: 'return=representation',
    });

    const contact = rows[0];
    if (!contact) {
      throw notFound();
    }

    res.json({ contact });
  }),
);

/** DELETE /api/contacts/:id — same ownership behaviour as PATCH. */
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const { token } = session(req);
    const id = parseId(req.params.id);

    const rows = await dataApi<Contact[]>({
      token,
      path: `/contacts?id=eq.${id}`,
      method: 'DELETE',
      prefer: 'return=representation',
    });

    if (!rows[0]) {
      throw notFound();
    }

    res.status(204).end();
  }),
);

function parseId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw badRequest('That contact id is not valid.');
  }
  return id;
}

export default router;

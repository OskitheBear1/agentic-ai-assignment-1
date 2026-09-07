import { useState, type FormEvent } from 'react';
import { describeAuthError } from '../lib/authErrors';
import { auth } from '../lib/neon';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';

type Mode = 'sign-in' | 'sign-up';

/**
 * Sign-in / sign-up.
 *
 * The browser talks to Neon Managed Better Auth directly. No password ever
 * reaches our own backend, and we store no credentials — Neon issues a JWT,
 * and that JWT is the only thing our API ever sees.
 */
export function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }

    if (mode === 'sign-up' && password.length < 8) {
      setError('Choose a password of at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const result =
        mode === 'sign-in'
          ? await auth.signIn.email({ email, password })
          : await auth.signUp.email({
              email,
              password,
              name: name.trim() || email.split('@')[0],
            });

      // Some failures resolve with an error rather than throwing.
      if (result?.error) {
        setError(describeAuthError(result.error));
      }
      // On success the session hook re-renders the app; nothing else to do.
    } catch (caught) {
      // ...and some throw. Both paths end up with the server's own message.
      setError(describeAuthError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Networking Tracker
          </h1>
          <p className="mt-1 text-sm text-muted">
            Keep track of the people you meet at Berkeley.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-ink">
            {mode === 'sign-in' ? 'Sign in' : 'Create an account'}
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            )}

            {mode === 'sign-up' && (
              <Field label="Name" htmlFor="signup-name">
                <input
                  id="signup-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass()}
                  autoComplete="name"
                  placeholder="Jordan Lee"
                />
              </Field>
            )}

            <Field label="Email" htmlFor="email" required>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass()}
                autoComplete="email"
                placeholder="you@berkeley.edu"
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              required
              hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined}
            >
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass()}
                autoComplete={
                  mode === 'sign-in' ? 'current-password' : 'new-password'
                }
              />
            </Field>

            <Button type="submit" loading={submitting} className="w-full">
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            {mode === 'sign-in' ? "Don't have an account?" : 'Already signed up?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                setError(null);
              }}
              className="font-medium text-brand underline underline-offset-4"
            >
              {mode === 'sign-in' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

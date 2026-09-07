import { useState, type FormEvent } from 'react';
import { describeAuthError } from '@/lib/authErrors';
import { auth } from '@/lib/neon';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

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
          <h1 className="text-2xl font-semibold tracking-tight">
            Networking Tracker
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Keep track of the people you meet at Berkeley.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{mode === 'sign-in' ? 'Sign in' : 'Create an account'}</h2>
            </CardTitle>
            <CardDescription>
              {mode === 'sign-in'
                ? 'Welcome back.'
                : 'Your contacts are private to your account.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <p
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm font-medium"
              >
                {error}
              </p>
            )}

            {mode === 'sign-up' && (
              <FormField label="Name" htmlFor="signup-name">
                <Input
                  id="signup-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                                    autoComplete="name"
                  placeholder="Jordan Lee"
                />
              </FormField>
            )}

            <FormField label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                placeholder="you@berkeley.edu"
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined}
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                                autoComplete={
                  mode === 'sign-in' ? 'current-password' : 'new-password'
                }
              />
            </FormField>

            <Button type="submit" loading={submitting} className="w-full">
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            {mode === 'sign-in' ? "Don't have an account?" : 'Already signed up?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                setError(null);
              }}
              className="text-primary font-medium underline underline-offset-4"
            >
              {mode === 'sign-in' ? 'Create one' : 'Sign in'}
            </button>
          </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

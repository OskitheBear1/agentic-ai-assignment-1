import { auth } from '@/lib/neon';
import { Contacts } from '@/pages/Contacts';
import { SignIn } from '@/pages/SignIn';
import { LoadingState } from '@/components/ui/states';

/**
 * Route by session state rather than by URL: signed out shows the auth screen,
 * signed in shows the contact list. `useSession` keeps this in sync across
 * tabs and after a refresh, which is why a reload lands you back where you were.
 */
export default function App() {
  const { data: session, isPending } = auth.useSession();


  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (!session?.user) {
    return <SignIn />;
  }

  return <Contacts userEmail={session.user.email} />;
}

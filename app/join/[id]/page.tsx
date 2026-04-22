import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function JoinFamily({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // If not logged in, send to home (which shows the login button)
  // We'll pass the join ID in the URL so they come back here after auth
  if (!session) {
    redirect(`/?join=${params.id}`);
  }

  // Link the user to this specific family
  const { error } = await supabase
    .from('profiles')
    .update({ family_id: params.id })
    .eq('id', session.user.id);

  if (error) {
    console.error("Join failed:", error);
    return <div>Invite link is invalid or expired.</div>;
  }

  // Success: Send them to the feed
  redirect('/');
}
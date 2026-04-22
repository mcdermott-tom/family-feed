import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginButton } from '@/components/LoginButton';

export default async function JoinFamily({ params }: { params: Promise<{ id: string }> }) {
  const { id: familyId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 1. UNAUTHENTICATED: Keep the user on this page to maintain the join context.
  if (!user) {
    const { data: family } = await supabase.from('families').select('name').eq('id', familyId).single();
    
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">You're Invited</h1>
          <p className="text-zinc-500 font-medium italic">
            Join the <span className="text-black dark:text-white font-bold">{family?.name || 'Family'}</span> archive.
          </p>
          <div className="flex justify-center">
            <LoginButton joinId={familyId} />
          </div>
        </div>
      </main>
    );
  }

  // 2. AUTHENTICATED HANDSHAKE: Ensure the profile exists and is linked.
  // RATIONAL: .upsert handles the case where the user doesn't have a profile row yet.
  const { error } = await supabase
    .from('profiles')
    .upsert({ 
      id: user.id, 
      family_id: familyId,
      display_name: user.user_metadata?.full_name || 'Folk Member',
      avatar_url: user.user_metadata?.avatar_url || ''
    });

  if (error) {
    console.error("Handshake failed:", error.message);
    return <div className="p-10 text-red-500">Could not link to family: {error.message}</div>;
  }

  // 3. REDIRECT: Once the DB row is written, go to the feed.
  redirect('/');
}
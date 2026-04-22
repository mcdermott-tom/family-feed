import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LoginButton } from '@/components/LoginButton';
import { Onboarding } from '@/components/Onboarding';
import { InviteButton } from '@/components/InviteButton';
import { FolkFeed } from '@/components/FolkFeed';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const { join } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black tracking-tighter italic uppercase text-black dark:text-white">Folk</h1>
          <p className="text-zinc-500 max-w-xs mx-auto text-lg font-medium">A private space for the family.</p>
          <div className="pt-6 flex justify-center"><LoginButton joinId={join} /></div>
        </div>
      </main>
    );
  }

  const [profileResponse, ownedResponse] = await Promise.all([
    supabase.from('profiles').select('*, families(*)').eq('id', user.id).single(),
    supabase.from('families').select('*').eq('owner_id', user.id).limit(1)
  ]);

  const activeFamily = profileResponse.data?.families || ownedResponse.data?.[0];

  if (!activeFamily) {
    return <Onboarding userId={user.id} />;
  }

  // RATIONAL: Adding a hard-coded fallback for the avatar URL.
  // This ensures the image tag always has a valid 'src'.
  const displayName = profileResponse.data?.display_name || user.user_metadata.full_name || 'Folk Member';
  const rawAvatar = profileResponse.data?.avatar_url || user.user_metadata.avatar_url;
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;

  const profile = {
    id: user.id,
    display_name: displayName,
    avatar_url: rawAvatar || fallbackAvatar,
    family_id: activeFamily.id
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-black dark:text-white">
      <div className="max-w-[600px] mx-auto bg-white dark:bg-black min-h-screen border-x border-zinc-100 dark:border-zinc-800">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight italic uppercase">Folk</h1>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{activeFamily.name}</span>
          </div>
          <div className="flex items-center gap-3">
             <InviteButton familyId={activeFamily.id} />
             <Link href="/settings">
               <img 
                src={profile.avatar_url} 
                className="w-8 h-8 rounded-full shadow-sm hover:ring-2 ring-blue-500 transition-all object-cover bg-zinc-100 dark:bg-zinc-900" 
                alt="Settings" 
               />
             </Link>
          </div>
        </header>
        <FolkFeed familyId={activeFamily.id} profile={profile} />
      </div>
    </main>
  );
}
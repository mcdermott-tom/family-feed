import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LoginButton } from '@/components/LoginButton';
import { Onboarding } from '@/components/Onboarding';
import { InviteButton } from '@/components/InviteButton';
import { FolkFeed } from '@/components/FolkFeed';
import Link from 'next/link';

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
          <h1 className="text-6xl font-black tracking-tighter italic text-black dark:text-white">Folk</h1>
          <p className="text-zinc-500 max-w-xs mx-auto text-lg font-medium">A private space for the family.</p>
          <div className="pt-6 flex justify-center">
            <LoginButton joinId={join} />
          </div>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, avatar_url, display_name, families(name, plan_type, subscription_ends_at)')
    .eq('id', user.id)
    .single();
  // FALLBACK LOGIC: Try profile, then Google metadata, then a generic UI avatar
  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.display_name || 'F')}&background=random`;
  
  if (!profile?.family_id) {
    return <Onboarding userId={user.id} />;
  }

  // RATIONAL: Air-tight avatar fallback chain to fix the "weird glitch"
  const displayAvatar = profile.avatar_url || user.user_metadata.avatar_url;
  const familyData = profile.families as any;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-black dark:text-white">
      <div className="max-w-[600px] mx-auto bg-white dark:bg-black min-h-screen border-x border-zinc-100 dark:border-zinc-800">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight italic uppercase">Folk</h1>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{familyData.name}</span>
          </div>
          <div className="flex items-center gap-3">
             <InviteButton familyId={profile.family_id} />
             <Link href="/settings">
               <img src={displayAvatar} className="w-8 h-8 rounded-full shadow-sm hover:ring-2 ring-blue-500 transition-all object-cover" alt="Settings" />
             </Link>
          </div>
        </header>

        <FolkFeed 
            familyId={profile.family_id} 
            profile={{ ...profile, avatar_url: displayAvatar }} 
        />
      </div>
    </main>
  );
}
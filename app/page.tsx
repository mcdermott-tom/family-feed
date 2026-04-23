import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LoginButton } from '@/components/LoginButton';
import { Onboarding } from '@/components/Onboarding';
import { InviteButton } from '@/components/InviteButton';
import { UserNav } from '@/components/UserNav';
import { FolkFeed } from '@/components/FolkFeed';

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
          <h1 className="text-6xl font-black tracking-tighter italic uppercase text-black dark:text-white leading-none">Folk</h1>
          <p className="text-zinc-500 max-w-xs mx-auto text-lg font-medium text-balance">A private space for the family.</p>
          <div className="pt-6 flex justify-center"><LoginButton joinId={join} /></div>
        </div>
      </main>
    );
  }

  // 1. Fetch Profile
  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const targetFamilyId = profileData?.family_id;

  // 2. Fetch Family
  let activeFamily = null;
  if (targetFamilyId) {
    const { data: familyRecord } = await supabase.from('families').select('*').eq('id', targetFamilyId).single();
    activeFamily = familyRecord;
  }

  if (!activeFamily) {
    const { data: ownedFamily } = await supabase.from('families').select('*').eq('owner_id', user.id).maybeSingle();
    activeFamily = ownedFamily;
  }

  // 3. Link logic
  if (activeFamily && profileData && !profileData.family_id) {
    await supabase.from('profiles').update({ family_id: activeFamily.id }).eq('id', user.id);
  }

  if (!activeFamily) return <Onboarding userId={user.id} />;

  // --- METADATA GHOST-HUNTING ---
  const meta = user.user_metadata || {};
  
  // LOG THIS: Check your terminal after refreshing. 
  // It will show us every key Google is sending back.
  console.log("DEBUG: Google Metadata keys found:", Object.keys(meta));
  console.log("DEBUG: Avatar URL from Meta:", meta.avatar_url || meta.picture || "NOT FOUND");

  const isValidUrl = (url: any) => url && typeof url === 'string' && url.startsWith('http') && url.length > 10;
  
  const googleAvatar = meta.avatar_url || meta.picture || meta.avatar;

  let finalAvatar = "";
  if (isValidUrl(profileData?.avatar_url)) {
    finalAvatar = profileData.avatar_url;
  } else if (isValidUrl(googleAvatar)) {
    finalAvatar = googleAvatar;
  }

  const displayName = profileData?.display_name || meta.full_name || meta.name || 'Folk Member';
  
  if (!finalAvatar) {
    finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
  }

  const profile = {
    id: user.id,
    display_name: displayName,
    avatar_url: finalAvatar,
    family_id: activeFamily.id
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-black dark:text-white">
      <div className="max-w-[600px] mx-auto bg-white dark:bg-black min-h-screen border-x border-zinc-100 dark:border-zinc-800 shadow-2xl">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight italic uppercase leading-none">Folk</h1>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{activeFamily.name}</span>
          </div>
          <div className="flex items-center gap-3">
             <InviteButton familyId={activeFamily.id} />
             <UserNav avatarUrl={profile.avatar_url} displayName={profile.display_name} />
          </div>
        </header>
        <FolkFeed familyId={activeFamily.id} profile={profile} />
      </div>
    </main>
  );
}
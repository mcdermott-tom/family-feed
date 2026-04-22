import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PostCard } from '@/components/PostCard';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon, ShieldAlert, Users, Clock } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/');

  // RATIONAL: Fetch profile AND owned families as a fallback for the "Unassigned" bug
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, families(*)')
    .eq('id', user.id)
    .single();

  const { data: ownedFamilies } = await supabase
    .from('families')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1);

  const activeFamily = profile?.families || ownedFamilies?.[0];

  const { data: familyMembers } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('family_id', activeFamily?.id);

  const { data: myPosts } = await supabase
    .from('posts')
    .select('*, profiles(display_name, avatar_url), likes(count), user_like:likes(user_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const lastActivityDate = activeFamily?.last_activity_at ? new Date(activeFamily.last_activity_at) : new Date();
  const daysSinceActivity = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

  const isOwner = user.id === activeFamily?.owner_id;
  const isLegacyContact = user.id === activeFamily?.legacy_contact_id;
  const isAtRisk = (activeFamily?.last_activity_at && daysSinceActivity >= 90) || activeFamily?.subscription_status === 'past_due';
  
  const showEmergencyAccess = isLegacyContact && isAtRisk && !isOwner;
  const canManage = isOwner || showEmergencyAccess;

  const avatar = profile?.avatar_url || user.user_metadata.avatar_url;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-black dark:text-white">
      <div className="max-w-[600px] mx-auto bg-white dark:bg-black min-h-screen border-x border-zinc-100 dark:border-zinc-800 pb-20">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 p-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-black uppercase italic tracking-tight text-black dark:text-white">Profile & Systems</h1>
        </header>

        <div className="p-8 flex flex-col items-center text-center space-y-4 border-b border-zinc-50 dark:border-zinc-900">
          <img src={avatar} className="w-20 h-20 rounded-full object-cover shadow-2xl border-2 border-zinc-100 dark:border-zinc-800" alt="" />
          <div>
            <h2 className="text-xl font-black">{profile?.display_name || user.user_metadata.full_name}</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {activeFamily?.name || 'Unassigned Family'} — {activeFamily?.plan_type || 'Free'}
            </p>
          </div>
        </div>

        {canManage && (
          <section className="p-6 border-b border-zinc-100 dark:border-zinc-800 space-y-6">
            <div className={`flex items-center gap-2 ${showEmergencyAccess ? 'text-red-500' : 'text-amber-500'}`}>
              <ShieldAlert size={16} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">
                {showEmergencyAccess ? "Emergency Succession Access" : "Family Administration"}
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-tighter">Family Surname/Name</label>
              <input 
                defaultValue={activeFamily?.name}
                className="w-full bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-sm font-bold text-black dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-tighter">Legacy Successor</label>
              <select 
                defaultValue={activeFamily?.legacy_contact_id || ""}
                className="w-full bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-sm font-bold text-black dark:text-white appearance-none"
              >
                <option value="" disabled>Select a family member...</option>
                {familyMembers?.filter(m => m.id !== user.id).map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>
            
            <button className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">
              Save Administrative Changes
            </button>
          </section>
        )}

        <div className="flex flex-col">
          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Users size={12} className="text-zinc-400" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Your Contributions ({myPosts?.length})</span>
          </div>
          {myPosts?.map(post => (
            <PostCard key={post.id} post={post} userId={user.id} />
          ))}
        </div>
      </div>
    </main>
  );
}
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Sparkles } from 'lucide-react';

export function Onboarding({ userId }: { userId: string }) {
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateFamily() {
    if (!familyName.trim()) return;
    setLoading(true);

    try {
      // 1. DATA ACQUISITION: Get real names from Google immediately
      const { data: { user } } = await supabase.auth.getUser();
      const googleName = user?.user_metadata?.full_name || 'Folk Member';
      const googleAvatar = user?.user_metadata?.avatar_url || '';

      // 2. STEP 1: Create the Profile first (The "Owner" must exist)
      const { error: profError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: googleName,
          avatar_url: googleAvatar
        });
      if (profError) throw profError;

      // 3. STEP 2: Create the Family (Pointing to the now-existing Profile)
      const { data: family, error: famError } = await supabase
        .from('families')
        .insert({ 
          name: familyName.trim(),
          owner_id: userId,
          plan_type: 'Pro',
          last_activity_at: new Date().toISOString(),
          subscription_status: 'active'
        })
        .select()
        .single();
      if (famError) throw famError;

      // 4. STEP 3: Link the Profile to the new Family
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ family_id: family.id })
        .eq('id', userId);
      if (linkError) throw linkError;

      // 5. SUCCESS: Hard reload to the feed
      window.location.href = '/';
      
    } catch (err: any) {
      console.error("Onboarding logic failed:", err.message);
      alert(`Setup failed: ${err.message}`);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-black dark:text-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Establish the Feed</h1>
          <p className="text-zinc-500 text-sm font-medium">Name your family archive to begin.</p>
        </div>

        <div className="space-y-4">
          <input 
            type="text"
            placeholder="The McDermotts"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-center text-xl transition-all"
          />
          
          <button 
            onClick={handleCreateFamily}
            disabled={loading || !familyName.trim()}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={16} /> Create Archive</>}
          </button>
        </div>
      </div>
    </main>
  );
}
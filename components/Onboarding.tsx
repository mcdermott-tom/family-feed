'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Loader2 } from 'lucide-react';

export function Onboarding({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createFamily = async () => {
    if (!name.trim()) return;
    setLoading(true);

    try {
      // 1. Create the family (setting created_by for RLS)
      const { data: family, error: fError } = await supabase
        .from('families')
        .insert({ name: name.trim(), created_by: userId })
        .select()
        .single();

      if (fError) throw fError;

      // 2. Link the user to the family (Implicitly makes them an admin)
      const { error: pError } = await supabase
        .from('profiles')
        .update({ family_id: family.id, role: 'admin' })
        .eq('id', userId);

      if (pError) throw pError;

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error creating family environment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-sm w-full space-y-6 text-center border border-zinc-100 dark:border-zinc-800 p-8 rounded-3xl shadow-sm bg-zinc-50 dark:bg-zinc-950">
        <Users size={48} className="mx-auto text-blue-500" />
        <h2 className="text-4xl font-black tracking-tighter italic">Folk Setup</h2>
        <p className="text-zinc-500 text-lg">Name your family feed to establish the private environment.</p>
        <input 
          type="text" 
          placeholder="e.g. The McDermotts"
          className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black outline-none focus:border-blue-500 transition-colors text-center font-bold"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button 
          onClick={createFamily}
          disabled={loading || !name}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black tracking-tight py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : "Establish the Feed"}
        </button>
      </div>
    </main>
  );
}
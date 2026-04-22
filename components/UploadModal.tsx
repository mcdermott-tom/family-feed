'use client';
import { useState, useTransition } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { Camera, X, Loader2 } from 'lucide-react';

export function UploadModal({ familyId, addOptimistic, profile }: { familyId: string, addOptimistic: any, profile: any }) {
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!text.trim() && files.length === 0) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const verifiedUid = user?.id || profile?.id;

    // Optimistic UI update
    const tempPost = {
      id: `temp-${Date.now()}`,
      content: text.trim(),
      image_url: previews,
      created_at: new Date().toISOString(),
      is_optimistic: true,
      profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url },
      likes: [{ count: 0 }],
      user_like: []
    };

    startTransition(() => addOptimistic(tempPost));

    try {
      let networkUrls: string[] = [];
      if (files.length > 0) {
        const uploads = files.map(async (file) => {
          const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 1200, useWebWorker: true });
          const path = `${familyId}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
          const { error: uploadErr } = await supabase.storage.from('posts').upload(path, compressed);
          if (uploadErr) throw uploadErr;
          return supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
        });
        networkUrls = await Promise.all(uploads);
      }

      const { error: dbErr } = await supabase.from('posts').insert({
        content: text.trim(),
        image_url: networkUrls,
        family_id: familyId,
        user_id: verifiedUid
      });

      if (dbErr) throw dbErr;
      setText(""); setFiles([]); setPreviews([]);
    } catch (err: any) {
      console.error("Folk Post Failed:", err.message);
      alert(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // RATIONAL: UX improvement for fast entry
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black">
      <textarea 
        placeholder="What's happening?" 
        value={text}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent outline-none text-lg mb-4 text-black dark:text-white resize-none"
        onChange={(e) => setText(e.target.value)}
      />
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <button onClick={() => { setFiles(f => f.filter((_, idx) => idx !== i)); setPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white z-10"><X size={14} /></button>
              <img src={src} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center">
        <label className="cursor-pointer p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all active:scale-90">
          <Camera size={26} /><input type="file" multiple accept="image/*" hidden onChange={(e) => {
            const selected = Array.from(e.target.files || []).slice(0, 4);
            setFiles(prev => [...prev, ...selected].slice(0, 4));
            setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))].slice(0, 4));
          }} disabled={loading} />
        </label>
        <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">⌘ + Enter</span>
            <button onClick={handleSubmit} disabled={loading || (!text.trim() && files.length === 0)} className="bg-black dark:bg-white text-white dark:text-black px-10 py-2.5 rounded-full font-black text-sm tracking-tight active:scale-95 transition-all disabled:opacity-20 uppercase">
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Folk Post"}
            </button>
        </div>
      </div>
    </div>
  );
}
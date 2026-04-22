'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { Camera, X, Loader2, Sparkles } from 'lucide-react';

export function UploadModal({ familyId, addOptimistic, profile, onSuccess }: { familyId: string, addOptimistic: any, profile: any, onSuccess: () => void }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!text.trim() && files.length === 0) return;
    
    const currentText = text;
    const currentPreviews = previews;
    const currentFiles = files;
    
    setText(""); setFiles([]); setPreviews([]);
    setLoading(true);

    // 1. Create the Optimistic "Temp" Post
    const tempPost = {
      id: `temp-${Date.now()}`,
      content: currentText.trim(),
      image_url: currentPreviews,
      created_at: new Date().toISOString(),
      user_id: profile.id
    };

    addOptimistic(tempPost);

    try {
      let networkUrls: string[] = [];
      
      // 2. Handle Image Uploads
      if (currentFiles.length > 0) {
        const uploads = currentFiles.map(async (file) => {
          const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 1200 });
          const path = `${familyId}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
          const { error: upError } = await supabase.storage.from('posts').upload(path, compressed);
          if (upError) throw upError;
          return supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
        });
        networkUrls = await Promise.all(uploads);
      }

      // 3. Final Database Insert
      const { error: insError } = await supabase.from('posts').insert({
        content: currentText.trim(),
        image_url: networkUrls,
        family_id: familyId,
        user_id: profile.id
      });

      if (insError) throw insError;

      // 4. RATIONAL: Call onSuccess immediately to replace temp post with real post
      onSuccess();

    } catch (err: any) {
      console.error(err);
      alert("Post failed to sync. Check connection.");
      onSuccess(); // Refresh anyway to clear the stuck optimistic post
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black">
      <textarea 
        placeholder="What's happening?" 
        value={text}
        rows={text.split('\n').length || 1}
        onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
        }}
        className="w-full bg-transparent outline-none text-lg mb-4 text-black dark:text-white resize-none font-medium placeholder:text-zinc-300"
        onChange={(e) => setText(e.target.value)}
      />
      
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
              <button onClick={() => { setFiles(f => f.filter((_, idx) => idx !== i)); setPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white z-10 backdrop-blur-sm"><X size={14} /></button>
              <img src={src} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <label className="cursor-pointer p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-full transition-all active:scale-90">
          <Camera size={24} />
          <input type="file" multiple accept="image/*" hidden onChange={(e) => {
            const selected = Array.from(e.target.files || []).slice(0, 4);
            setFiles(prev => [...prev, ...selected].slice(0, 4));
            setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))].slice(0, 4));
          }} disabled={loading} />
        </label>
        
        <button 
            onClick={handleSubmit} 
            disabled={loading || (!text.trim() && files.length === 0)} 
            className="bg-black dark:bg-white text-white dark:text-black px-8 py-2 rounded-full font-black text-xs tracking-widest active:scale-95 transition-all uppercase flex items-center gap-2 shadow-lg disabled:opacity-20"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={14} /> Folk Post</>}
        </button>
      </div>
    </div>
  );
}
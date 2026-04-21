'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { Camera, X } from 'lucide-react';

export function UploadModal() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validImages = selectedFiles.filter(file => file.type.startsWith('image/'));
    const totalFiles = [...files, ...validImages].slice(0, 4);
    setFiles(totalFiles);
    setPreviews(totalFiles.map(file => URL.createObjectURL(file)));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit() {
    // Allows text-only OR image-only OR both
    if (!text.trim() && files.length === 0) return;
    setLoading(true);

    try {
      let publicUrls: string[] | null = null;

      // Only run upload logic if there are actually files
      if (files.length > 0) {
        publicUrls = [];
        for (const file of files) {
          const compressed = await imageCompression(file, { 
            maxSizeMB: 0.2, 
            maxWidthOrHeight: 1200 
          });
          
          const fileName = `${crypto.randomUUID()}.${file.name.split('.').pop()}`;
          const { data, error: uploadError } = await supabase.storage.from('posts').upload(fileName, compressed);
          
          if (uploadError) throw uploadError;
          if (data) {
            const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(fileName);
            publicUrls.push(publicUrl);
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase.from('posts').insert({
        content: text.trim(),
        image_url: publicUrls, // Will be null if no photos were selected
        user_id: user?.id
      });

      if (insertError) throw insertError;

      setText("");
      setFiles([]);
      setPreviews([]);
      window.location.reload();
    } catch (err) {
      console.error("Post failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black">
      <textarea 
        placeholder="What's the latest?" 
        value={text}
        className="w-full bg-transparent resize-none outline-none text-lg mb-2 placeholder:text-zinc-500 min-h-[80px]"
        onChange={(e) => setText(e.target.value)}
      />

      {previews.length > 0 && (
        <div className={`grid gap-2 mb-4 ${previews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <button onClick={() => removeFile(i)} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white z-10"><X size={14} /></button>
              <img src={src} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label className={`cursor-pointer p-2 rounded-full transition-colors ${files.length >= 4 ? 'text-zinc-300' : 'text-blue-500 hover:bg-zinc-100'}`}>
            <Camera size={22} />
            <input type="file" accept="image/*" multiple onChange={handleFileChange} hidden disabled={loading || files.length >= 4} />
          </label>
          <span className="text-xs font-medium text-zinc-400">{files.length}/4</span>
        </div>
        
        <button 
          onClick={handleSubmit} 
          disabled={loading || (!text.trim() && files.length === 0)} 
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-1.5 rounded-full font-bold transition-all active:scale-95"
        >
          {loading ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}
'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Shield, User, Camera, Loader2 } from 'lucide-react';

export function SettingsForm({ profile, user }: { profile: any, user: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [familyName, setFamilyName] = useState(profile.families?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Admin Check: Creators are default admins
  const isAdmin = profile.families?.created_by === user.id;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingAvatar(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      // 1. Upload new photo to the public bucket
      const { error: uploadError } = await supabase.storage.from('posts').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(filePath);

      // 2. Update profile with new URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      alert(`Avatar failed: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update display name
      const { error: pError } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id);
      if (pError) throw pError;

      // Update family name if admin
      if (isAdmin && familyName.trim() !== profile.families?.name) {
        const { error: fError } = await supabase.from('families').update({ name: familyName.trim() }).eq('id', profile.family_id);
        if (fError) throw fError;
      }
      
      alert("Settings saved.");
      window.location.href = "/"; // Sync home state
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Avatar Section */}
      <section className="flex flex-col items-center gap-4 py-6 border-y border-zinc-100 dark:border-zinc-800">
        <div className="relative group w-28 h-28">
          <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-zinc-400" />
            )}
          </div>
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Loader2 size={24} className="animate-spin text-white" />
            </div>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} hidden disabled={uploadingAvatar} />
        </div>
        <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploadingAvatar}
            className="flex items-center gap-2 text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
            <Camera size={18} /> {avatarUrl ? "Update Photo" : "Upload Photo"}
        </button>
      </section>

      {/* 2. Public Profile Section */}
      <section className="space-y-4">
        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Settings size={13} /> Personal Identity
        </label>
        <p className="text-xs text-zinc-500 italic px-1">This name appears above your family posts.</p>
        <input 
          value={displayName} 
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Tommy McD"
          className="w-full p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-transparent outline-none focus:border-blue-500 transition-colors text-black dark:text-white font-bold"
        />
      </section>

      {/* 3. Family Management (Admin Only) */}
      {isAdmin && (
        <section className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Shield size={13} /> Family Governance
          </label>
          <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-bold">You are the primary admin.</p>
            <p className="text-xs text-zinc-500 italic">This name defines the entire environment (top-left of the feed).</p>
            <input 
              value={familyName} 
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. The McDermotts - Fagans"
              className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-black outline-none focus:border-blue-500 text-black dark:text-white"
            />
          </div>
        </section>
      )}

      {/* 4. Submission Button */}
      <button 
        onClick={handleSave}
        disabled={loading || uploadingAvatar || (!displayName.trim() && !familyName.trim())}
        className="w-full bg-black dark:bg-white text-white dark:text-black font-black tracking-tight py-4 rounded-3xl active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : "Verify & Save Settings"}
      </button>
    </div>
  );
}
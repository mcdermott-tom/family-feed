'use client';
import { supabase } from '@/lib/supabase';

interface LoginButtonProps {
  joinId?: string;
}

export function LoginButton({ joinId }: LoginButtonProps) {
  const handleLogin = async () => {
    // If a joinId exists, we tell the callback to send them to the join route
    const nextPath = joinId ? `/join/${joinId}` : '/';
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}`,
      },
    });
  };

  return (
    <button 
      onClick={handleLogin}
      className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-8 py-4 rounded-full text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-md active:scale-95 text-black dark:text-white"
    >
      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
      Continue with Google
    </button>
  );
}
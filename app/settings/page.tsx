import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/SettingsForm';
import Link from 'next/link';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, families(*)')
    .eq('id', user.id)
    .single();

  return (
    <main className="min-h-screen bg-white dark:bg-black p-6 text-black dark:text-white">
      <div className="max-w-md mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-black dark:hover:text-white transition-colors font-bold">← Feed</Link>
          <h1 className="text-2xl font-black tracking-tighter">Account</h1>
        </header>
        
        <SettingsForm profile={profile} user={user} />
      </div>
    </main>
  );
}
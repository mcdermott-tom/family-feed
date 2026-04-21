import { Feed } from '@/components/Feed';
import { UploadModal } from '@/components/UploadModal';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-[600px] mx-auto bg-white dark:bg-black min-h-screen border-x border-zinc-100 dark:border-zinc-800">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 p-4">
          <h1 className="text-xl font-black tracking-tight">Fagan Feed</h1>
        </header>
        <UploadModal />
        <Feed />
      </div>
    </main>
  );
}
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface UserNavProps {
  avatarUrl: string;
  displayName: string;
}

export function UserNav({ avatarUrl, displayName }: UserNavProps) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
  const [imgSrc, setImgSrc] = useState(avatarUrl || fallback);

  // Sync state if prop changes
  useEffect(() => {
    setImgSrc(avatarUrl || fallback);
  }, [avatarUrl, fallback]);

  return (
    <Link href="/settings">
      <div className="relative group overflow-hidden rounded-full border border-zinc-100 dark:border-zinc-800">
        <img 
          key={imgSrc}
          src={imgSrc} 
          className="w-8 h-8 rounded-full shadow-sm hover:ring-2 ring-blue-500 transition-all object-cover bg-zinc-100 dark:bg-zinc-900" 
          alt="Settings" 
          onError={() => setImgSrc(fallback)}
        />
        <div className="absolute inset-0 rounded-full bg-black/5 group-active:bg-black/20 transition-colors pointer-events-none" />
      </div>
    </Link>
  );
}
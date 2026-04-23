'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PostCard } from './PostCard';
import { UploadModal } from './UploadModal';

export function FolkFeed({ familyId, profile }: { familyId: string, profile: any }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthsLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // 1. DATA INDEXING: Fetch all timestamps once to build the UI
  // RATIONAL: Fetching only the 'created_at' column is a tiny payload that 
  // allows us to prune the UI without expensive aggregate queries.
  const fetchDateMap = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('created_at')
      .eq('family_id', familyId);
    
    if (data) setAvailableDates(data.map(p => new Date(p.created_at)));
  }, [familyId]);

  // 2. UI PRUNING LOGIC
  const dateStructure = useMemo(() => {
    const map: any = {};
    availableDates.forEach(date => {
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();
      if (!map[y]) map[y] = {};
      if (!map[y][m]) map[y][m] = new Set();
      map[y][m].add(d);
    });
    return map;
  }, [availableDates]);

  const activeYears = useMemo(() => Object.keys(dateStructure).map(Number).sort((a, b) => b - a), [dateStructure]);
  const activeMonths = useMemo(() => 
    selectedYear && dateStructure[selectedYear] 
      ? Object.keys(dateStructure[selectedYear]).map(Number).sort((a, b) => a - b) 
      : [], 
  [dateStructure, selectedYear]);
  
  const activeDays = useMemo(() => 
    (selectedYear && selectedMonth !== null && dateStructure[selectedYear]?.[selectedMonth])
      ? Array.from(dateStructure[selectedYear][selectedMonth] as Set<number>).sort((a, b) => a - b)
      : [],
  [dateStructure, selectedYear, selectedMonth]);

  const fetchPosts = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select(`*, profiles(display_name, avatar_url), likes(profiles(display_name)), user_like:likes(user_id)`)
      .eq('family_id', familyId);

    if (selectedYear) {
      let start, end;
      if (selectedMonth !== null && selectedDay !== null) {
        start = new Date(selectedYear, selectedMonth, selectedDay, 0, 0, 0).toISOString();
        end = new Date(selectedYear, selectedMonth, selectedDay, 23, 59, 59).toISOString();
      } else if (selectedMonth !== null) {
        start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0).toISOString();
        end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();
      } else {
        start = new Date(selectedYear, 0, 1, 0, 0, 0).toISOString();
        end = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
      }
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data } = await query.order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  }, [familyId, selectedYear, selectedMonth, selectedDay]);

  useEffect(() => {
    fetchDateMap();
    fetchPosts();
    const channel = supabase.channel(`room-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `family_id=eq.${familyId}` }, () => {
        fetchDateMap();
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [familyId, fetchPosts, fetchDateMap]);

  if (loading && posts.length === 0) return <div className="p-10 text-center animate-pulse uppercase text-[10px] font-black">Gathering...</div>;

  return (
    <div className="flex flex-col">
      <div className="sticky top-[73px] z-20 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
        {/* Years */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {activeYears.map(year => (
            <button key={year} onClick={() => { setSelectedYear(selectedYear === year ? null : year); setSelectedMonth(null); setSelectedDay(null); }} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedYear === year ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}>{year}</button>
          ))}
        </div>
        {/* Months */}
        {activeMonths.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar animate-in slide-in-from-top-2">
            {activeMonths.map(mIdx => (
              <button key={mIdx} onClick={() => { setSelectedMonth(selectedMonth === mIdx ? null : mIdx); setSelectedDay(null); }} className={`flex-shrink-0 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${selectedMonth === mIdx ? 'bg-blue-500 text-white' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}`}>{monthsLabel[mIdx]}</button>
            ))}
          </div>
        )}
        {/* Days */}
        {activeDays.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar animate-in slide-in-from-top-4">
            {activeDays.map(day => (
              <button key={day} onClick={() => setSelectedDay(selectedDay === day ? null : day)} className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-bold ${selectedDay === day ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-zinc-100 dark:border-zinc-800'}`}>{day}</button>
            ))}
          </div>
        )}
      </div>

      <UploadModal familyId={familyId} profile={profile} addOptimistic={(p:any) => setPosts(c => [p, ...c])} onSuccess={fetchPosts} />
      <div className="flex flex-col">
        {posts.map(post => <PostCard key={post.id} post={post} userId={profile.id} />)}
      </div>
    </div>
  );
}
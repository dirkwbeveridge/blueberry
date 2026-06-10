import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface RealtimeSyncOptions<T> {
  table:      string;
  householdId: string | null;
  onInsert?:  (payload: T) => void;
  onUpdate?:  (payload: T) => void;
  onDelete?:  (payload: { id: string }) => void;
}

let channelSeq = 0;

export function useRealtimeSync<T>({ table, householdId, onInsert, onUpdate, onDelete }: RealtimeSyncOptions<T>) {
  // Keep the latest callbacks in a ref so the subscription effect can stay
  // keyed on [table, householdId] only — changing callbacks must not tear down
  // and rebuild the channel.
  const handlers = useRef({ onInsert, onUpdate, onDelete });
  handlers.current = { onInsert, onUpdate, onDelete };

  // A stable, process-unique suffix per hook instance. Two components syncing
  // the same table+household (e.g. home + todo both watching `todos`) would
  // otherwise produce identical channel names; supabase-js reuses the existing
  // channel and throws "cannot add postgres_changes callbacks after subscribe()".
  const instanceId = useRef<number>(++channelSeq);

  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`${table}:${householdId}:${instanceId.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        ({ new: payload }) => handlers.current.onInsert?.(payload as T)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        ({ new: payload }) => handlers.current.onUpdate?.(payload as T)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        ({ old: payload }) => handlers.current.onDelete?.(payload as { id: string })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, householdId]);
}

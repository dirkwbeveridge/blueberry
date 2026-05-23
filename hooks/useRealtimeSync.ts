import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RealtimeSyncOptions<T> {
  table:      string;
  householdId: string | null;
  onInsert?:  (payload: T) => void;
  onUpdate?:  (payload: T) => void;
  onDelete?:  (payload: { id: string }) => void;
}

export function useRealtimeSync<T>({ table, householdId, onInsert, onUpdate, onDelete }: RealtimeSyncOptions<T>) {
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`${table}:${householdId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        ({ new: payload }) => onInsert?.(payload as T)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        ({ new: payload }) => onUpdate?.(payload as T)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        ({ old: payload }) => onDelete?.(payload as { id: string })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, householdId]);
}

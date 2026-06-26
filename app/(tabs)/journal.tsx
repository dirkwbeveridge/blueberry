import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { supabase } from '../../lib/supabase';
import type { JournalEntry } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JournalScreen() {
  const { household } = useHousehold();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!household) return;

    setLoading(true);
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setEntries((data ?? []) as unknown as JournalEntry[]);
    setLoading(false);
  }, [household]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntries();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchEntries]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'journal_entries',
    householdId: household?.id ?? null,
    onInsert: (payload) => {
      setEntries((prev) => [payload as unknown as JournalEntry, ...prev].slice(0, 50));
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <ScreenHeader
        title="Journal"
        subtitle="Shared entries and milestones"
        action={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(modals)/add-journal-entry' as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add journal entry"
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <Card>
          <Text style={styles.loadingText}>Loading…</Text>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📓"
            title="No journal entries yet"
            body="Capture weekly notes, milestones, and moments you want to remember."
            action={{ label: 'Add first entry', onPress: () => router.push('/(modals)/add-journal-entry' as never) }}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <Card key={entry.id}>
              <View style={styles.entryHeader}>
                <Badge label={`Week ${entry.week_number}`} variant="accent" />
                <Text style={styles.entryDate}>{formatDate(entry.created_at)}</Text>
              </View>
              {!!entry.milestone_tag && <Text style={styles.milestone}>✨ {entry.milestone_tag}</Text>}
              <Text style={styles.entryContent}>{entry.content}</Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: { ...typography.label, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.surface },
  loadingText: { ...typography.body, fontSize: 14, lineHeight: 22, color: colors.textMuted },
  list: { gap: spacing.md },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  entryDate: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  milestone: { ...typography.subheading, fontSize: 15, lineHeight: 22, color: colors.primary, marginBottom: spacing.xs },
  entryContent: { ...typography.body, fontSize: 14, lineHeight: 22, color: colors.text },
});

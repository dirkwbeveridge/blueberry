import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { useHousehold } from '../../hooks/useHousehold';
import { getPostpartumWeek } from '../../lib/postpartumWeeks';
import { supabase } from '../../lib/supabase';

function getDefaultWeek(currentWeek: number, babyDob: string | null): number {
  if (currentWeek > 0) return currentWeek;
  if (babyDob) return getPostpartumWeek(babyDob);
  return 1;
}

export default function AddJournalEntryModal() {
  const { household, currentUser, currentWeek } = useHousehold();
  const [content, setContent] = useState('');
  const [milestoneTag, setMilestoneTag] = useState('');
  const [weekNumber, setWeekNumber] = useState(String(getDefaultWeek(currentWeek, household?.baby_dob ?? null)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!household || !currentUser) {
      Alert.alert('Not set up', 'Complete setup before creating journal entries.');
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      setError('Please write a note before saving.');
      return;
    }

    const parsedWeek = Number.parseInt(weekNumber, 10);
    const safeWeek = Number.isFinite(parsedWeek) && parsedWeek > 0 ? parsedWeek : 1;

    setLoading(true);
    setError('');
    try {
      const { error: saveError } = await supabase.from('journal_entries').insert({
        household_id: household.id,
        author_id: currentUser.id,
        week_number: safeWeek,
        milestone_tag: milestoneTag.trim() || null,
        content: trimmed,
      });
      if (saveError) throw saveError;

      router.back();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalSheet title="Add journal entry" onClose={() => router.back()}>
      <Input
        label="Entry"
        value={content}
        onChangeText={(text) => {
          setContent(text);
          if (error) setError('');
        }}
        placeholder="Capture what happened today"
        multiline
        numberOfLines={5}
        error={error}
      />

      <Input
        label="Milestone tag (optional)"
        value={milestoneTag}
        onChangeText={setMilestoneTag}
        placeholder="e.g. First smile"
      />

      <Input
        label="Week"
        value={weekNumber}
        onChangeText={setWeekNumber}
        keyboardType="number-pad"
        placeholder="e.g. 28"
      />

      <Button
        label="Save entry"
        onPress={handleSave}
        loading={loading}
        disabled={!content.trim()}
      />
    </ModalSheet>
  );
}

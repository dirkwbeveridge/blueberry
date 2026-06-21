import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '../../components/ui/Button';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useHousehold } from '../../hooks/useHousehold';
import { supabase } from '../../lib/supabase';
import { useHouseholdStore } from '../../store/household';
import type { BabyGender, Household } from '../../types';

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function BabyDetailsModal() {
  const { household, isPostpartum } = useHousehold();
  const setHousehold = useHouseholdStore((s) => s.setHousehold);

  const [babyName, setBabyName] = useState(household?.baby_name ?? '');
  const [babyGender, setBabyGender] = useState<BabyGender>(household?.baby_gender ?? 'unknown');
  const [dueDate, setDueDate] = useState<Date | null>(parseDate(household?.due_date ?? null));
  const [babyDob, setBabyDob] = useState<Date | null>(parseDate(household?.baby_dob ?? null));
  const [loading, setLoading] = useState(false);

  const dateLabel = useMemo(() => (isPostpartum ? 'Baby birthday' : 'Due date'), [isPostpartum]);

  async function handleSave() {
    if (!household) {
      Alert.alert('Not set up', 'Complete household setup first.');
      return;
    }

    if (isPostpartum && babyDob && babyDob.getTime() > Date.now()) {
      Alert.alert('Invalid birthday', 'Baby birthday cannot be in the future.');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        baby_name: babyName.trim() || null,
        baby_gender: babyGender,
      };

      if (isPostpartum) {
        payload.baby_dob = babyDob ? formatDateIsoLocal(babyDob) : null;
      } else {
        payload.due_date = dueDate ? formatDateIsoLocal(dueDate) : null;
      }

      const { data, error } = await supabase
        .from('households')
        .update(payload)
        .eq('id', household.id)
        .select('*')
        .single();

      if (error) throw error;
      if (data) setHousehold(data as unknown as Household);
      router.back();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalSheet title="Baby details" onClose={() => router.back()}>
      <Input
        label="Baby name"
        value={babyName}
        onChangeText={setBabyName}
        placeholder="Name or nickname"
      />

      <SegmentedControl
        options={[
          { value: 'unknown', label: '🤫 Secret' },
          { value: 'male', label: '💙 Boy' },
          { value: 'female', label: '💜 Girl' },
        ]}
        value={babyGender}
        onChange={(value) => setBabyGender(value as BabyGender)}
      />

      <DateField
        label={dateLabel}
        value={isPostpartum ? babyDob : dueDate}
        onChange={(date) => {
          if (isPostpartum) setBabyDob(date);
          else setDueDate(date);
        }}
        maximumDate={isPostpartum ? new Date() : undefined}
      />

      <Button label="Save details" onPress={handleSave} loading={loading} />
    </ModalSheet>
  );
}

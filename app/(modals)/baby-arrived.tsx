import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { colors, fonts, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { supabase } from '../../lib/supabase';
import { useHouseholdStore } from '../../store/household';
import type { BabyGender, Household } from '../../types';

export default function BabyArrivedModal() {
  const { household, currentUser } = useHousehold();
  const setBabyDob = useHouseholdStore((s) => s.setBabyDob);
  const setBabyName = useHouseholdStore((s) => s.setBabyName);
  const setBabyGender = useHouseholdStore((s) => s.setBabyGender);
  const setHousehold = useHouseholdStore((s) => s.setHousehold);

  const [babyDob, setBabyDobDate] = useState<Date | null>(
    household?.baby_dob ? new Date(household.baby_dob) : null
  );
  const [babyName, setBabyNameText] = useState(household?.baby_name ?? '');
  const [babyGender, setBabyGenderValue] = useState<BabyGender>(household?.baby_gender ?? 'unknown');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!household?.id || !currentUser?.id) {
      Alert.alert('Not set up', 'Sign in and load your household before switching to Family Mode.');
      return;
    }

    if (!babyDob) {
      Alert.alert('Birthday needed', 'Please choose your baby\'s birthday.');
      return;
    }

    const now = new Date();
    if (babyDob.getTime() > now.getTime()) {
      Alert.alert('Invalid birthday', 'Baby\'s birthday cannot be in the future.');
      return;
    }

    const dobIso = babyDob.toISOString().slice(0, 10);
    const trimmedName = babyName.trim();
    const previousHousehold: Household = household;

    setSaving(true);
    try {
      setBabyDob(dobIso);
      setBabyName(trimmedName);
      setBabyGender(babyGender);

      const { data, error } = await supabase
        .from('households')
        .update({
          baby_dob: dobIso,
          baby_name: trimmedName || null,
          baby_gender: babyGender,
          stage: 'postpartum',
        })
        .eq('id', household.id)
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setHousehold(data);
      }

      Alert.alert('Family Mode enabled', 'Blueberry is now set to postpartum tracking.', [
        { text: 'Continue', onPress: () => router.back() },
      ]);
    } catch (error) {
      setHousehold(previousHousehold);
      Alert.alert('Could not update household', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalSheet title="Begin Family Mode" subtitle="Switch to postpartum tracking" onClose={() => router.back()}>
      <Card style={styles.card}>
        <Text style={styles.body}>
          Enter your baby&apos;s birthday to unlock Family Mode features for feeding, sleep, diapers, and milestones.
        </Text>
      </Card>

      <Input
        label="Baby name (optional)"
        value={babyName}
        onChangeText={setBabyNameText}
        placeholder="What should Blueberry call your baby?"
      />

      <DateField
        label="Baby's birthday"
        value={babyDob}
        onChange={setBabyDobDate}
        placeholder="Select birthday"
        minimumDate={new Date('2000-01-01')}
        maximumDate={new Date()}
      />

      <Text style={styles.label}>Baby gender</Text>
      <SegmentedControl
        value={babyGender}
        onChange={(value) => setBabyGenderValue(value as BabyGender)}
        options={[
          { value: 'unknown', label: 'Keep private' },
          { value: 'female', label: 'Girl' },
          { value: 'male', label: 'Boy' },
        ]}
      />

      <Button
        label={household?.stage === 'postpartum' ? 'Update Family Mode' : 'Begin Family Mode'}
        loading={saving}
        onPress={handleSave}
        disabled={!babyDob}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 14,
  },
});

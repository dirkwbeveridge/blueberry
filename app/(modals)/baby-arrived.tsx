import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DateField } from '../../components/ui/DateField';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { colors, fonts, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { supabase } from '../../lib/supabase';
import { useHouseholdStore } from '../../store/household';

export default function BabyArrivedModal() {
  const { household, currentUser } = useHousehold();
  const setBabyDob = useHouseholdStore((s) => s.setBabyDob);
  const setHousehold = useHouseholdStore((s) => s.setHousehold);

  const [babyDob, setBabyDobDate] = useState<Date | null>(
    household?.baby_dob ? new Date(household.baby_dob) : null
  );
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

    const dobIso = babyDob.toISOString().slice(0, 10);

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('households')
        .update({ baby_dob: dobIso, stage: 'postpartum' })
        .eq('id', household.id)
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setHousehold(data);
      }
      setBabyDob(dobIso);

      Alert.alert('Family Mode enabled', 'Blueberry is now set to postpartum tracking.', [
        { text: 'Continue', onPress: () => router.back() },
      ]);
    } catch (error) {
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

      <DateField
        label="Baby's birthday"
        value={babyDob}
        onChange={setBabyDobDate}
        placeholder="Select birthday"
        minimumDate={new Date('2000-01-01')}
      />

      <Button
        label={saving ? 'Saving...' : 'Begin Family Mode'}
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
});

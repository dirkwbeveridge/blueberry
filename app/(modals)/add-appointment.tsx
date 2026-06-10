import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { Button }    from '../../components/ui/Button';
import { Input }     from '../../components/ui/Input';
import { DateField } from '../../components/ui/DateField';
import { TimeField } from '../../components/ui/TimeField';
import { colors, fonts, spacing } from '../../constants/theme';

export default function AddAppointmentModal() {
  const { household } = useHousehold();
  const [title,    setTitle]    = useState('');
  const [apptDate, setApptDate] = useState<Date | null>(null);
  const [apptTime, setApptTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('Please enter an appointment title.'); return; }
    if (!apptDate)     { setError('Please select a date.'); return; }
    if (!household) {
      Alert.alert('Not set up', 'Complete household setup before adding appointments.');
      return;
    }

    const dateStr = apptDate.toISOString().slice(0, 10);
    let timeStr = '09:00:00';
    if (apptTime) {
      const h = apptTime.getHours().toString().padStart(2, '0');
      const m = apptTime.getMinutes().toString().padStart(2, '0');
      timeStr = `${h}:${m}:00`;
    }
    const datetime = `${dateStr}T${timeStr}`;

    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.from('appointments').insert({
        household_id:     household.id,
        title:            title.trim(),
        appointment_date: datetime,
        location:         location.trim() || null,
        notes:            notes.trim() || null,
      });
      if (err) throw err;
      router.back();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.topBar}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Add appointment</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input
          label="Appointment"
          value={title}
          onChangeText={t => { setTitle(t); setError(''); }}
          placeholder="e.g. 20-week anatomy scan"
          error={error}
        />

        <DateField
          label="Date"
          value={apptDate}
          onChange={d => { setApptDate(d); if (d) setError(''); }}
          minimumDate={new Date()}
        />

        <TimeField
          label="Time (optional)"
          value={apptTime}
          onChange={setApptTime}
        />

        <Input
          label="Location (optional)"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. City OB-GYN, Suite 4"
        />
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Questions to ask, prep needed…"
          multiline
          numberOfLines={3}
        />

        <Button
          label="Save appointment"
          onPress={handleSave}
          loading={loading}
          disabled={!title.trim() || !apptDate}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  topBar:    { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading:   { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.text },
  cancelBtn: { fontFamily: fonts.body.medium, fontSize: 15, color: colors.textMuted },
  scroll:    { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});

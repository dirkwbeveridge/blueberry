import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { colors, fonts, spacing } from '../../constants/theme';

export default function AddAppointmentModal() {
  const { household } = useHousehold();
  const [title,   setTitle]   = useState('');
  const [date,    setDate]    = useState('');
  const [time,    setTime]    = useState('');
  const [location,setLocation]= useState('');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('Please enter an appointment title.'); return; }
    if (!date)         { setError('Please enter a date.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Date must be YYYY-MM-DD'); return; }
    if (!household) return;

    const datetime = time ? `${date}T${time}:00` : `${date}T09:00:00`;

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
          <Text style={styles.title}>Add appointment</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input label="Appointment" value={title} onChangeText={t => { setTitle(t); setError(''); }}
          placeholder="e.g. 20-week anatomy scan" error={error} />
        <Input label="Date" value={date} onChangeText={setDate}
          placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCorrect={false} />
        <Input label="Time (optional)" value={time} onChangeText={setTime}
          placeholder="HH:MM  e.g. 09:30" keyboardType="numbers-and-punctuation" autoCorrect={false} />
        <Input label="Location (optional)" value={location} onChangeText={setLocation}
          placeholder="e.g. City OB-GYN, Suite 4" />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes}
          placeholder="Questions to ask, prep needed…" multiline numberOfLines={3} />
        <Button label="Save appointment" onPress={handleSave} loading={loading} disabled={!title.trim() || !date} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  topBar:    { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:     { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.text },
  cancelBtn: { fontFamily: fonts.body.medium, fontSize: 15, color: colors.textMuted },
  scroll:    { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});

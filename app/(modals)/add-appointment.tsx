import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { colors, fonts, radii, spacing } from '../../constants/theme';

export default function AddAppointmentModal() {
  const { household } = useHousehold();
  const [title,         setTitle]         = useState('');
  const [apptDate,      setApptDate]      = useState<Date | null>(null);
  const [apptTime,      setApptTime]      = useState<Date | null>(null);
  const [showDatePicker,setShowDatePicker]= useState(false);
  const [showTimePicker,setShowTimePicker]= useState(false);
  const [location,      setLocation]      = useState('');
  const [notes,         setNotes]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

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

        {/* Date picker */}
        <Text style={styles.fieldLabel}>Date</Text>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => { setShowDatePicker(s => !s); setShowTimePicker(false); }}
          activeOpacity={0.7}
        >
          <Text style={apptDate ? styles.pickerValue : styles.pickerPlaceholder}>
            {apptDate
              ? apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
              : 'Select a date'}
          </Text>
          {apptDate ? (
            <TouchableOpacity
              onPress={() => { setApptDate(null); setShowDatePicker(false); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.chevron}>{showDatePicker ? '▲' : '▽'}</Text>
          )}
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={apptDate ?? new Date()}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onChange={(_, selected) => {
              if (selected) { setApptDate(selected); setShowDatePicker(false); }
            }}
            accentColor={colors.primary}
            style={styles.inlinePicker}
          />
        )}

        {/* Time picker */}
        <Text style={styles.fieldLabel}>Time (optional)</Text>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => { setShowTimePicker(s => !s); setShowDatePicker(false); }}
          activeOpacity={0.7}
        >
          <Text style={apptTime ? styles.pickerValue : styles.pickerPlaceholder}>
            {apptTime
              ? apptTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : 'Select a time'}
          </Text>
          {apptTime ? (
            <TouchableOpacity
              onPress={() => { setApptTime(null); setShowTimePicker(false); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.chevron}>{showTimePicker ? '▲' : '▽'}</Text>
          )}
        </TouchableOpacity>
        {showTimePicker && (
          <View style={styles.spinnerWrapper}>
            <DateTimePicker
              value={apptTime ?? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; })()}
              mode="time"
              display="spinner"
              onChange={(_, selected) => { if (selected) setApptTime(selected); }}
              style={styles.spinner}
            />
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setShowTimePicker(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

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
  screen:          { flex: 1, backgroundColor: colors.background },
  topBar:          { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: spacing.md },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading:         { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.text },
  cancelBtn:       { fontFamily: fonts.body.medium, fontSize: 15, color: colors.textMuted },
  scroll:          { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  fieldLabel:      { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  pickerTrigger:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14 },
  pickerValue:     { fontFamily: fonts.body.medium, fontSize: 15, color: colors.text },
  pickerPlaceholder:{ fontFamily: fonts.body.regular, fontSize: 15, color: colors.textMuted },
  clearBtn:        { fontFamily: fonts.body.medium, fontSize: 14, color: colors.textMuted },
  chevron:         { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  inlinePicker:    { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden' },
  spinnerWrapper:  { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  spinner:         { height: 160 },
  doneBtn:         { backgroundColor: colors.primary, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  doneBtnText:     { fontFamily: fonts.body.semibold, fontSize: 15, color: '#FFFFFF' },
});

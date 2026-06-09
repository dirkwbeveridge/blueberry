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
import type { Priority } from '../../types';

const PRIORITIES: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: 'high',   label: '🔴 High',   color: colors.error,   bg: '#FEF0ED' },
  { value: 'medium', label: '🟡 Medium', color: colors.warning, bg: '#FEF3E8' },
  { value: 'low',    label: '🟢 Low',    color: colors.success, bg: '#E8F8ED' },
];

export default function AddTodoModal() {
  const { household, currentUser } = useHousehold();
  const [title,      setTitle]      = useState('');
  const [priority,   setPriority]   = useState<Priority>('medium');
  const [dueDate,    setDueDate]    = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a task.'); return; }
    if (!household || !currentUser) {
      Alert.alert('Not set up', 'Complete household setup before adding tasks.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.from('todos').insert({
        household_id: household.id,
        created_by:   currentUser.id,
        title:        title.trim(),
        priority,
        due_date:     dueDate ? dueDate.toISOString().slice(0, 10) : null,
        source:       'manual',
        is_done:      false,
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
          <Text style={styles.title}>Add a task</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input
          label="What needs to be done?"
          value={title}
          onChangeText={t => { setTitle(t); setError(''); }}
          placeholder="e.g. Book anatomy scan appointment"
          error={error}
          autoCapitalize="sentences"
        />

        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityChip,
                { borderColor: priority === p.value ? p.color : colors.border,
                  backgroundColor: priority === p.value ? p.bg : colors.surface },
              ]}
              onPress={() => setPriority(p.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.priorityLabel, { color: priority === p.value ? p.color : colors.textMuted }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Due date (optional)</Text>
        <TouchableOpacity
          style={styles.dateTrigger}
          onPress={() => setShowPicker(s => !s)}
          activeOpacity={0.7}
        >
          <Text style={dueDate ? styles.dateValue : styles.datePlaceholder}>
            {dueDate
              ? dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
              : 'Select a date'}
          </Text>
          {dueDate ? (
            <TouchableOpacity
              onPress={() => { setDueDate(null); setShowPicker(false); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.chevron}>{showPicker ? '▲' : '▽'}</Text>
          )}
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onChange={(_, selected) => {
              if (selected) { setDueDate(selected); setShowPicker(false); }
            }}
            accentColor={colors.primary}
            style={styles.picker}
          />
        )}

        <Button label="Add task" onPress={handleSave} loading={loading} disabled={!title.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  topBar:       { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: spacing.md },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:        { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.text },
  cancelBtn:    { fontFamily: fonts.body.medium, fontSize: 15, color: colors.textMuted },
  scroll:       { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  priorityRow:  { flexDirection: 'row', gap: spacing.sm },
  priorityChip: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, alignItems: 'center' },
  priorityLabel:{ fontFamily: fonts.body.semibold, fontSize: 13 },
  dateTrigger:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14 },
  dateValue:    { fontFamily: fonts.body.medium, fontSize: 15, color: colors.text },
  datePlaceholder: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.textMuted },
  clearBtn:     { fontFamily: fonts.body.medium, fontSize: 14, color: colors.textMuted },
  chevron:      { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  picker:       { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden' },
});

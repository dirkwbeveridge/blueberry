import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors, fonts, radii, spacing } from '../../constants/theme';

const SYMPTOMS = [
  'Nausea','Fatigue','Back pain','Headache','Heartburn',
  'Swelling','Cramping','Shortness of breath','Insomnia',
  'Mood swings','Braxton Hicks','Pelvic pressure','Food cravings',
  'Breast tenderness','Dizziness','Round ligament pain',
];

const MOODS = [
  { label: 'Great',     emoji: '😄', value: 'great'     },
  { label: 'Good',      emoji: '🙂', value: 'good'      },
  { label: 'Okay',      emoji: '😐', value: 'okay'      },
  { label: 'Tired',     emoji: '😴', value: 'tired'     },
  { label: 'Anxious',   emoji: '😟', value: 'anxious'   },
  { label: 'Emotional', emoji: '🥹', value: 'emotional' },
  { label: 'Nauseous',  emoji: '🤢', value: 'nauseous'  },
  { label: 'Happy',     emoji: '😊', value: 'happy'     },
];

export default function LogSymptomModal() {
  const { household, currentUser } = useHousehold();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [mood,             setMood]             = useState<string | null>(null);
  const [energy,           setEnergy]           = useState<number | null>(null);
  const [notes,            setNotes]            = useState('');
  const [loading,          setLoading]          = useState(false);

  function toggleSymptom(s: string) {
    setSelectedSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  async function handleSave() {
    if (!household || !currentUser) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('health_logs').insert({
        household_id: household.id,
        user_id:      currentUser.id,
        symptoms:     selectedSymptoms.length > 0 ? selectedSymptoms : null,
        mood:         mood,
        energy_level: energy,
        notes:        notes.trim() || null,
      });
      if (error) throw error;
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
      {/* Handle + Header */}
      <View style={styles.topBar}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>How are you feeling?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mood */}
        <Text style={styles.sectionLabel}>Mood</Text>
        <View style={styles.moodGrid}>
          {MOODS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[styles.moodChip, mood === m.value && styles.moodChipSelected]}
              onPress={() => setMood(mood === m.value ? null : m.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodLabel, mood === m.value && styles.moodLabelSelected]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Energy */}
        <Text style={styles.sectionLabel}>Energy level</Text>
        <View style={styles.energyRow}>
          {[1,2,3,4,5].map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.energyBtn, energy === n && styles.energyBtnSelected]}
              onPress={() => setEnergy(energy === n ? null : n)}
              activeOpacity={0.7}
            >
              <Text style={[styles.energyNum, energy === n && styles.energyNumSelected]}>{n}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.energyHint}>
            {energy === 1 ? 'Exhausted' : energy === 5 ? 'Energised' : ''}
          </Text>
        </View>

        {/* Symptoms */}
        <Text style={styles.sectionLabel}>Symptoms</Text>
        <View style={styles.symptomGrid}>
          {SYMPTOMS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.symptomChip, selectedSymptoms.includes(s) && styles.symptomChipSelected]}
              onPress={() => toggleSymptom(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.symptomLabel, selectedSymptoms.includes(s) && styles.symptomLabelSelected]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else on your mind…"
          multiline
          numberOfLines={3}
        />

        <Button
          label="Save log"
          onPress={handleSave}
          loading={loading}
          disabled={!mood && selectedSymptoms.length === 0 && !energy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.background },
  topBar:   { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: spacing.md },
  headerRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:    { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.text },
  cancelBtn:{ fontFamily: fonts.body.medium, fontSize: 15, color: colors.textMuted },
  scroll:   { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moodChip: { alignItems: 'center', width: 72, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, gap: 4 },
  moodChipSelected: { borderColor: colors.primary, backgroundColor: '#F5F0FF' },
  moodEmoji:{ fontSize: 22 },
  moodLabel:{ fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  moodLabelSelected: { color: colors.primary },
  energyRow:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  energyBtn:{ width: 44, height: 44, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  energyBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  energyNum:{ fontFamily: fonts.body.semibold, fontSize: 16, color: colors.textMuted },
  energyNumSelected: { color: '#FFFFFF' },
  energyHint:{ fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  symptomChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  symptomChipSelected: { borderColor: colors.primary, backgroundColor: '#F5F0FF' },
  symptomLabel: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMuted },
  symptomLabelSelected: { color: colors.primary },
});

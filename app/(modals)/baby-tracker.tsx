import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { colors, fonts, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { supabase } from '../../lib/supabase';
import type { BabyLog, BabyLogType } from '../../types';

type TrackerKey = BabyLogType | 'milestones' | 'pediatric';

interface TrackerConfig {
  title: string;
  subtitle: string;
  guidance: string;
}

function getTrackerConfig(tracker: TrackerKey): TrackerConfig {
  switch (tracker) {
    case 'feeding':
      return {
        title: 'Feeding',
        subtitle: 'Family Mode tracker',
        guidance: 'Capture breast side, bottle amount, formula, and timer-based duration in one place.',
      };
    case 'sleep':
      return {
        title: 'Sleep',
        subtitle: 'Family Mode tracker',
        guidance: 'Track sleep blocks, wake windows, and overnight patterns for handoff clarity.',
      };
    case 'diaper':
      return {
        title: 'Diaper',
        subtitle: 'Family Mode tracker',
        guidance: 'Log wet and dirty counts to monitor trends and support pediatric check-ins.',
      };
    case 'handoff':
      return {
        title: 'Night-shift handoff',
        subtitle: 'Family Mode tracker',
        guidance: 'Track who is on shift and keep handoff notes visible to both partners.',
      };
    case 'milestones':
      return {
        title: 'Milestones',
        subtitle: 'Family Mode tracker',
        guidance: 'Capture milestone notes and keep a simple shared timeline for both parents.',
      };
    case 'pediatric':
      return {
        title: 'Pediatric visits',
        subtitle: 'Appointments',
        guidance: 'Use the appointment flow to store visit details, follow-up actions, and reminders.',
      };
  }
}

function isTrackerValue(value: string | undefined): value is TrackerKey {
  return value === 'feeding'
    || value === 'sleep'
    || value === 'diaper'
    || value === 'handoff'
    || value === 'milestones'
    || value === 'pediatric';
}

function formatLogSummary(log: BabyLog): string {
  const details = (log.details ?? {}) as Record<string, unknown>;
  switch (log.log_type) {
    case 'feeding':
      return [details.method, details.side, details.durationMins ? `${details.durationMins}m` : null, details.amountMl ? `${details.amountMl} ml` : null]
        .filter(Boolean)
        .join(' · ');
    case 'sleep':
      return [details.sleepType, details.durationMins ? `${details.durationMins}m` : null]
        .filter(Boolean)
        .join(' · ');
    case 'diaper':
      return [details.diaperType, details.count ? `${details.count}x` : null]
        .filter(Boolean)
        .join(' · ');
    case 'handoff':
      return [details.shiftOwner, details.status].filter(Boolean).join(' · ');
    default:
      return '';
  }
}

export default function BabyTrackerModal() {
  const { tracker } = useLocalSearchParams<{ tracker?: string }>();
  const trackerKey: TrackerKey = isTrackerValue(tracker) ? tracker : 'feeding';
  const config = getTrackerConfig(trackerKey);
  const { household, currentUser } = useHousehold();

  const [logs, setLogs] = useState<BabyLog[]>([]);
  const [saving, setSaving] = useState(false);

  const [notes, setNotes] = useState('');
  const [feedMethod, setFeedMethod] = useState('breast');
  const [feedSide, setFeedSide] = useState('left');
  const [feedAmountMl, setFeedAmountMl] = useState('');
  const [feedDurationMins, setFeedDurationMins] = useState('');
  const [sleepType, setSleepType] = useState('nap');
  const [sleepDurationMins, setSleepDurationMins] = useState('');
  const [diaperType, setDiaperType] = useState('wet');
  const [diaperCount, setDiaperCount] = useState('1');
  const [shiftOwner, setShiftOwner] = useState('me');
  const [handoffStatus, setHandoffStatus] = useState('starting');

  const isDataTracker = trackerKey === 'feeding' || trackerKey === 'sleep' || trackerKey === 'diaper' || trackerKey === 'handoff';

  const canSave = useMemo(() => {
    if (trackerKey === 'feeding') return !!notes.trim() || !!feedAmountMl.trim() || !!feedDurationMins.trim();
    if (trackerKey === 'sleep') return !!notes.trim() || !!sleepDurationMins.trim();
    if (trackerKey === 'diaper') return !!notes.trim() || Number(diaperCount) > 0;
    if (trackerKey === 'handoff') return !!notes.trim();
    return true;
  }, [trackerKey, notes, feedAmountMl, feedDurationMins, sleepDurationMins, diaperCount]);

  const fetchLogs = useCallback(async () => {
    if (!household || !isDataTracker) return;
    const { data } = await supabase
      .from('baby_logs')
      .select('*')
      .eq('household_id', household.id)
      .eq('log_type', trackerKey)
      .order('logged_at', { ascending: false })
      .limit(8);
    setLogs((data ?? []) as unknown as BabyLog[]);
  }, [household, trackerKey, isDataTracker]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'baby_logs',
    householdId: household?.id ?? null,
    onInsert: (payload) => {
      const log = payload as unknown as BabyLog;
      if (!isDataTracker || log.log_type !== trackerKey) return;
      setLogs((prev) => [log, ...prev].slice(0, 8));
    },
  });

  async function saveLog() {
    if (!household || !currentUser || !isDataTracker || !canSave) return;

    const details: Record<string, unknown> = {};
    if (trackerKey === 'feeding') {
      details.method = feedMethod;
      details.side = feedMethod === 'breast' ? feedSide : null;
      details.amountMl = feedAmountMl ? Number(feedAmountMl) : null;
      details.durationMins = feedDurationMins ? Number(feedDurationMins) : null;
    } else if (trackerKey === 'sleep') {
      details.sleepType = sleepType;
      details.durationMins = sleepDurationMins ? Number(sleepDurationMins) : null;
    } else if (trackerKey === 'diaper') {
      details.diaperType = diaperType;
      details.count = diaperCount ? Number(diaperCount) : 1;
    } else if (trackerKey === 'handoff') {
      details.shiftOwner = shiftOwner;
      details.status = handoffStatus;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('baby_logs').insert({
        household_id: household.id,
        user_id: currentUser.id,
        log_type: trackerKey,
        details,
        notes: notes.trim() || null,
      });
      if (error) throw error;

      setNotes('');
      if (trackerKey === 'feeding') {
        setFeedAmountMl('');
        setFeedDurationMins('');
      }
      if (trackerKey === 'sleep') {
        setSleepDurationMins('');
      }
      if (trackerKey === 'diaper') {
        setDiaperCount('1');
      }
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (trackerKey === 'milestones') {
    return (
      <ModalSheet title={config.title} subtitle={config.subtitle} onClose={() => router.back()}>
        <Card style={styles.card}>
          <Text style={styles.body}>{config.guidance}</Text>
        </Card>
        <Button label="Open shared journal" onPress={() => router.push('/(tabs)/journal' as never)} />
      </ModalSheet>
    );
  }

  if (trackerKey === 'pediatric') {
    return (
      <ModalSheet title={config.title} subtitle={config.subtitle} onClose={() => router.back()}>
        <Card style={styles.card}>
          <Text style={styles.body}>{config.guidance}</Text>
        </Card>
        <Button label="Add appointment" onPress={() => router.push('/(modals)/add-appointment' as never)} />
      </ModalSheet>
    );
  }

  return (
    <ModalSheet title={config.title} subtitle={config.subtitle} onClose={() => router.back()}>
      <Card style={styles.card}>
        <Text style={styles.body}>{config.guidance}</Text>
      </Card>

      {trackerKey === 'feeding' && (
        <Card style={styles.card}>
          <Text style={styles.section}>Details</Text>
          <SegmentedControl
            options={[
              { value: 'breast', label: 'Breast' },
              { value: 'bottle', label: 'Bottle' },
              { value: 'formula', label: 'Formula' },
            ]}
            value={feedMethod}
            onChange={setFeedMethod}
          />
          {feedMethod === 'breast' && (
            <SegmentedControl
              options={[
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
                { value: 'both', label: 'Both' },
              ]}
              value={feedSide}
              onChange={setFeedSide}
            />
          )}
          <Input
            label="Duration (minutes, optional)"
            value={feedDurationMins}
            onChangeText={setFeedDurationMins}
            keyboardType="number-pad"
            placeholder="e.g. 18"
          />
          <Input
            label="Amount (ml, optional)"
            value={feedAmountMl}
            onChangeText={setFeedAmountMl}
            keyboardType="number-pad"
            placeholder="e.g. 90"
          />
        </Card>
      )}

      {trackerKey === 'sleep' && (
        <Card style={styles.card}>
          <Text style={styles.section}>Details</Text>
          <SegmentedControl
            options={[
              { value: 'nap', label: 'Nap' },
              { value: 'overnight', label: 'Overnight' },
            ]}
            value={sleepType}
            onChange={setSleepType}
          />
          <Input
            label="Duration (minutes)"
            value={sleepDurationMins}
            onChangeText={setSleepDurationMins}
            keyboardType="number-pad"
            placeholder="e.g. 45"
          />
        </Card>
      )}

      {trackerKey === 'diaper' && (
        <Card style={styles.card}>
          <Text style={styles.section}>Details</Text>
          <SegmentedControl
            options={[
              { value: 'wet', label: 'Wet' },
              { value: 'dirty', label: 'Dirty' },
              { value: 'both', label: 'Both' },
            ]}
            value={diaperType}
            onChange={setDiaperType}
          />
          <Input
            label="Count"
            value={diaperCount}
            onChangeText={setDiaperCount}
            keyboardType="number-pad"
            placeholder="e.g. 1"
          />
        </Card>
      )}

      {trackerKey === 'handoff' && (
        <Card style={styles.card}>
          <Text style={styles.section}>Shift details</Text>
          <SegmentedControl
            options={[
              { value: 'me', label: 'I am on shift' },
              { value: 'partner', label: 'Partner is on shift' },
            ]}
            value={shiftOwner}
            onChange={setShiftOwner}
          />
          <SegmentedControl
            options={[
              { value: 'starting', label: 'Starting shift' },
              { value: 'handoff', label: 'Handoff complete' },
            ]}
            value={handoffStatus}
            onChange={setHandoffStatus}
          />
        </Card>
      )}

      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything important for your partner"
        multiline
        numberOfLines={3}
      />

      <Button
        label={saving ? 'Saving…' : 'Save log'}
        onPress={saveLog}
        loading={saving}
        disabled={!canSave || saving}
      />

      {logs.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.section}>Recent entries</Text>
          {logs.map((log, index) => (
            <View key={log.id} style={[styles.entryRow, index < logs.length - 1 && styles.entryBorder]}>
              <Text style={styles.entryTime}>
                {new Date(log.logged_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
              {!!formatLogSummary(log) && <Text style={styles.entrySummary}>{formatLogSummary(log)}</Text>}
              {!!log.notes && <Text style={styles.entryNotes}>{log.notes}</Text>}
            </View>
          ))}
        </Card>
      )}

      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
        <Text style={styles.backLink}>Back to Baby tab</Text>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 14,
  },
  entryRow: {
    gap: 2,
    paddingVertical: spacing.sm,
  },
  entryBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryTime: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 11,
  },
  entrySummary: {
    color: colors.text,
    fontFamily: fonts.body.medium,
    fontSize: 13,
  },
  entryNotes: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  backLink: {
    color: colors.primary,
    fontFamily: fonts.body.medium,
    fontSize: 13,
    textAlign: 'center',
  },
});

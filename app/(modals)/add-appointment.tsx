import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button } from '../../components/ui/Button';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { TimeField } from '../../components/ui/TimeField';
import { colors, fonts, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { getValidAccessToken } from '../../lib/googleAuth';
import { createCalendarEvent } from '../../lib/googleCalendarApi';
import {
    buildAppointmentDateTime,
    getNotificationPreferencesForUser,
    scheduleAppointmentReminder,
} from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

function appointmentEndIso(startIso: string): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return end.toISOString();
}

function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export default function AddAppointmentModal() {
  const { household, currentUser } = useHousehold();
  const [title,    setTitle]    = useState('');
  const [apptDate, setApptDate] = useState<Date | null>(null);
  const [apptTime, setApptTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [titleError, setTitleError] = useState('');
  const [formError,  setFormError]  = useState('');

  async function handleSave() {
    setTitleError('');
    setFormError('');

    if (!title.trim()) {
      setTitleError('Please enter an appointment title.');
      return;
    }
    if (!apptDate) {
      setFormError('Please select a date.');
      return;
    }

    const today = new Date();
    const isToday = apptDate.toDateString() === today.toDateString();
    if (isToday && !apptTime) {
      setFormError('Please choose a time for appointments scheduled today.');
      return;
    }

    if (!household) {
      Alert.alert('Not set up', 'Complete household setup before adding appointments.');
      return;
    }

    const datetime = buildAppointmentDateTime(apptDate, apptTime);
    if (new Date(datetime).getTime() <= Date.now()) {
      setFormError('Please choose a future date and time.');
      return;
    }

    setLoading(true);
    try {
      const basePayload = {
        household_id:     household.id,
        title:            title.trim(),
        appointment_date: datetime,
        location:         location.trim() || null,
        notes:            notes.trim() || null,
      };

      let { data: savedAppointment, error: err } = await supabase
        .from('appointments')
        .insert({ ...basePayload, created_by: currentUser?.id ?? null })
        .select('id, title, appointment_date, location')
        .single();

      // Backward compatibility for environments where appointments.created_by
      // has not been migrated yet.
      if (err && err.message.toLowerCase().includes('created_by')) {
        const fallback = await supabase
          .from('appointments')
          .insert(basePayload)
          .select('id, title, appointment_date, location')
          .single();
        savedAppointment = fallback.data;
        err = fallback.error;
      }

      if (err) throw err;
      if (!savedAppointment) throw new Error('Appointment insert returned no row.');

      if (currentUser?.id) {
        const accessToken = await getValidAccessToken(currentUser.id);
        if (accessToken) {
          try {
            const startIso = new Date(savedAppointment.appointment_date).toISOString();
            const googleEventId = await createCalendarEvent(accessToken, {
              summary: savedAppointment.title,
              start: {
                dateTime: startIso,
                timeZone: localTimezone(),
              },
              end: {
                dateTime: appointmentEndIso(startIso),
                timeZone: localTimezone(),
              },
              location: savedAppointment.location ?? undefined,
            });

            await supabase
              .from('appointments')
              .update({ google_event_id: googleEventId })
              .eq('id', savedAppointment.id);
          } catch (googleSyncError) {
            console.warn('Google Calendar create sync failed', googleSyncError);
          }
        }
      }

      try {
        const preferences = currentUser?.id ? await getNotificationPreferencesForUser(currentUser.id) : null;
        if (preferences?.appointment_reminders) {
          await scheduleAppointmentReminder(savedAppointment, preferences);
        }
      } catch (reminderError) {
        Alert.alert(
          'Appointment saved',
          reminderError instanceof Error
            ? `${reminderError.message} The appointment was created, but the reminder could not be scheduled.`
            : 'The appointment was created, but the reminder could not be scheduled.'
        );
      }

      router.back();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalSheet title="Add appointment" onClose={() => router.back()}>
      <Input
        label="Appointment"
        value={title}
        onChangeText={t => { setTitle(t); setTitleError(''); }}
        placeholder="e.g. 20-week anatomy scan"
        error={titleError}
      />

      <DateField
        label="Date"
        value={apptDate}
        onChange={d => { setApptDate(d); if (d) setFormError(''); }}
        minimumDate={new Date()}
      />

      <TimeField
        label="Time (optional)"
        value={apptTime}
        onChange={(value) => { setApptTime(value); if (value) setFormError(''); }}
        placeholder="Optional (defaults to 9:00 AM)"
        minuteInterval={5}
      />
      {!apptTime && <Text style={styles.helperText}>Defaults to 9:00 AM when left blank.</Text>}
      {!!formError && <Text style={styles.errorText}>{formError}</Text>}

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
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  helperText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  errorText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.error,
    marginTop: -spacing.sm,
  },
});

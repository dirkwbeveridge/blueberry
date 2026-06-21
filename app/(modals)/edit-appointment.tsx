import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '../../components/ui/Button';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { TimeField } from '../../components/ui/TimeField';
import { colors, fonts, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { getValidAccessToken } from '../../lib/googleAuth';
import { updateCalendarEvent } from '../../lib/googleCalendarApi';
import {
    buildAppointmentDateTime,
    cancelAppointmentReminderByAppointmentId,
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

export default function EditAppointmentModal() {
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const appointmentId = typeof params.appointmentId === 'string' ? params.appointmentId : '';
  const { household, currentUser } = useHousehold();

  const [title, setTitle] = useState('');
  const [apptDate, setApptDate] = useState<Date | null>(null);
  const [apptTime, setApptTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [googleEventId, setGoogleEventId] = useState<string | null>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAppointment() {
      if (!household?.id || !appointmentId) {
        if (active) {
          setLoadingInitial(false);
          setFormError('Missing appointment details.');
        }
        return;
      }

      setLoadingInitial(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('id, title, appointment_date, location, notes, google_event_id')
        .eq('id', appointmentId)
        .eq('household_id', household.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error || !data) {
        setFormError('Could not load appointment.');
        setLoadingInitial(false);
        return;
      }

      const appointmentDate = new Date(data.appointment_date);
      setTitle(data.title ?? '');
      setApptDate(appointmentDate);
      setApptTime(appointmentDate);
      setLocation(data.location ?? '');
      setNotes(data.notes ?? '');
      setGoogleEventId(data.google_event_id ?? null);
      setLoadingInitial(false);
    }

    void loadAppointment();

    return () => {
      active = false;
    };
  }, [appointmentId, household?.id]);

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

    if (!appointmentId || !household?.id) {
      setFormError('Missing appointment details.');
      return;
    }

    const datetime = buildAppointmentDateTime(apptDate, apptTime);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          title: title.trim(),
          appointment_date: datetime,
          location: location.trim() || null,
          notes: notes.trim() || null,
        })
        .eq('id', appointmentId)
        .eq('household_id', household.id);

      if (error) {
        throw error;
      }

      if (googleEventId && currentUser?.id) {
        try {
          const accessToken = await getValidAccessToken(currentUser.id);
          if (accessToken) {
            const timezone = localTimezone();
            await updateCalendarEvent(accessToken, googleEventId, {
              summary: title.trim(),
              start: {
                dateTime: new Date(datetime).toISOString(),
                timeZone: timezone,
              },
              end: {
                dateTime: appointmentEndIso(new Date(datetime).toISOString()),
                timeZone: timezone,
              },
              location: location.trim() || undefined,
            });
          }
         } catch (googleSyncError) {
           console.warn('Google Calendar update sync failed', googleSyncError);
         }
       }

       if (currentUser?.id) {
         try {
           const preferences = await getNotificationPreferencesForUser(currentUser.id);
           if (preferences.appointment_reminders) {
             await scheduleAppointmentReminder(
               {
                 id: appointmentId,
                 title: title.trim(),
                 appointment_date: datetime,
               },
               preferences,
             );
           } else {
             await cancelAppointmentReminderByAppointmentId(appointmentId);
           }
         } catch (reminderError) {
           console.warn('Appointment reminder resync failed', reminderError);
         }
       }

       router.back();
     } catch {
       Alert.alert('Could not save', 'Please try again.');
     } finally {
       setSaving(false);
     }
   }

  return (
    <ModalSheet title="Edit appointment" onClose={() => router.back()}>
      {loadingInitial ? (
        <Text style={styles.helperText}>Loading appointment...</Text>
      ) : (
        <>
          <Input
            label="Appointment"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setTitleError('');
            }}
            placeholder="e.g. 20-week anatomy scan"
            error={titleError}
          />

          <DateField
            label="Date"
            value={apptDate}
            onChange={(value) => {
              setApptDate(value);
              if (value) {
                setFormError('');
              }
            }}
          />

          <TimeField
            label="Time"
            value={apptTime}
            onChange={(value) => {
              setApptTime(value);
              if (value) {
                setFormError('');
              }
            }}
            placeholder="Set appointment time"
            minuteInterval={5}
          />

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
            placeholder="Questions to ask, prep needed..."
            multiline
            numberOfLines={3}
          />

          <Button label="Save changes" onPress={handleSave} loading={saving} disabled={!title.trim() || !apptDate} />
        </>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  helperText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  errorText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.error,
    marginTop: -spacing.sm,
  },
});

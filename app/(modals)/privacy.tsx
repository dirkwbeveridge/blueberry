import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { colors, fonts, spacing } from '../../constants/theme';

export default function PrivacyModal() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Privacy" subtitle="What Blueberry stores and shares" action={<Button label="Done" variant="ghost" onPress={() => router.back()} />} />

      <Card style={styles.card}>
        <Text style={styles.section}>Household data</Text>
        <Text style={styles.body}>All records are scoped by household. Only your two-person household can read or update those rows under RLS policies.</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Notifications</Text>
        <Text style={styles.body}>Health details are not included in notification payloads. Appointment reminders include title and time only.</Text>
        <Button label="Manage notifications" variant="secondary" onPress={() => router.push('/(modals)/notifications' as never)} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Connected services</Text>
        <Text style={styles.body}>Google Calendar and Apple Health remain optional integrations. Blueberry does not enable them without your explicit action.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  card: { gap: spacing.sm },
  section: {
    color: colors.textMuted,
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.text,
    fontFamily: fonts.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});

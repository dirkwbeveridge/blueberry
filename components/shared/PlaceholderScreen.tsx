import { StyleSheet, Text, View } from 'react-native';

import Card from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

export default function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <View style={styles.screen}>
      <Card>
        <Text style={styles.kicker}>Blueberry</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.primary,
    fontFamily: typography.heading,
    fontSize: 34,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
});

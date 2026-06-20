import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { colors, spacing } from '../../constants/theme';

export default function PartnerScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Partner"
        subtitle="Partner support notes and shared household actions will live here."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
});

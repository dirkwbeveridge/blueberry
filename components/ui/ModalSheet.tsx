import React from 'react';
import {
  View, Text, Pressable, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet,
} from 'react-native';
import { colors, fonts, spacing } from '../../constants/theme';

interface ModalSheetProps {
  title:     string;
  subtitle?: string;
  onClose:   () => void;
  children:  React.ReactNode;
  scroll?:   boolean;
}

export function ModalSheet({ title, subtitle, onClose, children, scroll = true }: ModalSheetProps) {
  const topBar = (
    <View style={styles.topBar}>
      <View style={styles.handle} />
      <View style={[styles.headerRow, subtitle ? styles.headerRowTop : undefined]}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={[styles.cancelPressable, subtitle ? styles.cancelPressableTop : undefined]}
        >
          <Text style={styles.cancelBtn}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!scroll) {
    return (
      <View style={styles.screen}>
        {topBar}
        {children}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {topBar}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  topBar:  {
    backgroundColor:    colors.surface,
    paddingHorizontal:  spacing.lg,
    paddingBottom:      spacing.md,
    borderBottomWidth:  1,
    borderBottomColor:  colors.border,
  },
  handle: {
    width:       40,
    height:      4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf:   'center',
    marginTop:   12,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
  },
  headerRowTop: {
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize:   20,
    color:      colors.text,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize:   13,
    color:      colors.textMuted,
    marginTop:  2,
  },
  cancelPressable: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelPressableTop: {
    paddingTop: 4,
  },
  cancelBtn: {
    fontFamily: fonts.body.medium,
    fontSize:   15,
    color:      colors.textMuted,
  },
  scrollContent: {
    padding:       spacing.lg,
    gap:           spacing.md,
    paddingBottom: spacing.xxl,
  },
});

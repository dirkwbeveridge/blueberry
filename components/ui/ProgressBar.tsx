import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii } from '../../constants/theme';

interface ProgressBarProps {
  progress: number; // 0–1
  height?:  number;
  color?:   string;
}

export function ProgressBar({ progress, height = 6, color = colors.accent }: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radii.full, backgroundColor: colors.border, overflow: 'hidden', width: '100%' },
  fill:  { borderRadius: radii.full },
});

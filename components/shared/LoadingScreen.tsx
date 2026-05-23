import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, fonts } from '../../constants/theme';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🫐</Text>
      <Text style={styles.name}>Blueberry</Text>
      <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logo:      { fontSize: 56 },
  name:      { fontFamily: fonts.heading.bold, fontSize: 28, color: '#FFFFFF', letterSpacing: 1 },
  spinner:   { marginTop: 32 },
});

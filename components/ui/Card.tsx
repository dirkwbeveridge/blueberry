import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { cardStyle } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: cardStyle as ViewStyle,
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Badge } from '../ui/Badge';
import { colors, fonts, priorityColors, spacing } from '../../constants/theme';
import type { Priority, Todo } from '../../types';

const PRIORITY_BADGE: Record<Priority, 'error' | 'warning' | 'success'> = {
  high: 'error', medium: 'warning', low: 'success',
};

interface TodoListProps {
  todos:    Todo[];
  onToggle: (todo: Todo) => void;
}

export function TodoList({ todos, onToggle }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No open tasks.</Text>
        <TouchableOpacity onPress={() => router.push('/(modals)/add-todo')}>
          <Text style={styles.emptyLink}>Add one →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {todos.map((todo, i) => (
        <TouchableOpacity
          key={todo.id}
          style={[styles.row, i < todos.length - 1 && styles.rowBorder]}
          onPress={() => onToggle(todo)}
          activeOpacity={0.7}
        >
          <View style={styles.checkbox} />
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1}>{todo.title}</Text>
            <Badge label={todo.priority} variant={PRIORITY_BADGE[todo.priority]} />
          </View>
          <View style={[styles.dot, { backgroundColor: priorityColors[todo.priority] }]} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list:        { gap: 0 },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  rowBorder:   { borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox:    { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.accent },
  body:        { flex: 1, gap: 3 },
  title:       { fontFamily: fonts.body.medium, fontSize: 14, color: colors.text },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  empty:       { paddingVertical: spacing.md, alignItems: 'center', gap: spacing.xs },
  emptyText:   { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted },
  emptyLink:   { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.primary },
});

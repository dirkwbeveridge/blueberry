import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing } from '../../constants/theme';
import type { Priority, Todo } from '../../types';
import { Badge } from '../ui/Badge';

const PRIORITY_BADGE: Record<Priority, 'error' | 'warning' | 'success'> = {
  high: 'error', medium: 'warning', low: 'success',
};

interface TodoListProps {
  todos:    Todo[];
  onToggle: (todo: Todo) => void;
  pendingTodoIds?: string[];
}

export function TodoList({ todos, onToggle, pendingTodoIds = [] }: TodoListProps) {
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
      {todos.map((todo, i) => {
        const isPending = pendingTodoIds.includes(todo.id);
        return (
        <TouchableOpacity
          key={todo.id}
          style={[styles.row, i < todos.length - 1 && styles.rowBorder]}
          onPress={() => onToggle(todo)}
          disabled={isPending}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isPending && styles.checkboxPending]}>
            {isPending ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <View style={styles.body}>
            <Text style={[styles.title, isPending && styles.titlePending]} numberOfLines={1}>{todo.title}</Text>
            <Badge label={todo.priority} variant={PRIORITY_BADGE[todo.priority]} />
          </View>
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list:        { gap: 0 },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  rowBorder:   { borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox:    { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.accent },
  checkboxPending: { backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  checkmark:   { color: colors.surface, fontFamily: fonts.body.semibold, fontSize: 12, lineHeight: 14 },
  body:        { flex: 1, gap: 3 },
  title:       { fontFamily: fonts.body.medium, fontSize: 14, color: colors.text },
  titlePending:{ color: colors.textMuted, textDecorationLine: 'line-through' },
  empty:       { paddingVertical: spacing.md, alignItems: 'center', gap: spacing.xs },
  emptyText:   { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted },
  emptyLink:   { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.primary },
});

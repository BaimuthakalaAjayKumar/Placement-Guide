import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { THEME } from '../utils/constants';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.errorBg,
    borderColor: THEME.colors.error,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  icon: {
    fontSize: 16,
    marginRight: THEME.spacing.sm,
  },
  message: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    paddingLeft: THEME.spacing.sm,
  },
  dismissText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

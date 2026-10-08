import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { THEME } from '../utils/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const isActionDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];
    if (variant === 'primary') list.push(styles.primary);
    if (variant === 'secondary') list.push(styles.secondary);
    if (variant === 'outline') list.push(styles.outline);
    if (variant === 'danger') list.push(styles.danger);
    if (isActionDisabled) list.push(styles.disabled);
    if (style) list.push(style);
    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.text];
    if (variant === 'outline') list.push(styles.outlineText);
    if (textStyle) list.push(textStyle);
    return list;
  };

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={onPress}
      disabled={isActionDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? THEME.colors.primary : '#FFFFFF'} size="small" />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.md,
  },
  primary: {
    backgroundColor: THEME.colors.primary,
  },
  secondary: {
    backgroundColor: THEME.colors.surfaceLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  danger: {
    backgroundColor: THEME.colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineText: {
    color: THEME.colors.primary,
  },
});

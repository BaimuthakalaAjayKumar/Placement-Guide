import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardTypeOptions,
  ViewStyle,
} from 'react-native';
import { THEME } from '../utils/constants';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  editable?: boolean;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  editable = true,
  style,
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const shouldHideText = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry={shouldHideText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {isPasswordVisible ? 'HIDE' : 'SHOW'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    height: 50,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: THEME.colors.primary,
  },
  inputError: {
    borderColor: THEME.colors.error,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  textInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 15,
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});

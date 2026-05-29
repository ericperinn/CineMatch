import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, style, ...rest }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          style,
        ]}
        placeholderTextColor={theme.colors.textSubtle}
        onFocus={(e) => {
          setIsFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  labelFocused: {
    color: theme.colors.primary,
  },
  input: {
    height: 50,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceHighlight,
    paddingHorizontal: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '500',
    fontSize: 15,
    color: theme.colors.text,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
});

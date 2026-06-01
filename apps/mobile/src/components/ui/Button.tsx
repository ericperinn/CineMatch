import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const containerStyle = variantContainer(variant);
  const textColor = variantTextColor(variant);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        containerStyle,
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.75}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.text, { color: textColor }]}>{label}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

function variantContainer(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return styles.primary;
    case 'secondary':
      return styles.secondary;
    case 'tonal':
      return styles.tonal;
    case 'outline':
      return styles.outline;
    case 'ghost':
      return styles.ghost;
    case 'danger':
      return styles.danger;
  }
}

function variantTextColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return theme.colors.primaryDark;
    case 'tonal':
      return theme.colors.primary;
    case 'danger':
      return theme.colors.error;
    case 'secondary':
    case 'outline':
    case 'ghost':
    default:
      return theme.colors.text;
  }
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: theme.radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  // Filled neutral — most visible non-primary CTA.
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  // Lime-tinted, used for soft CTAs that still want a brand accent.
  tonal: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.30)',
  },
  // Bordered, transparent fill — for tertiary actions like "Leave" / "Log out".
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  // No fill, no border — for purely secondary text actions (e.g. "Dismiss").
  ghost: {
    backgroundColor: 'transparent',
  },
  // Destructive — used for explicit dangerous actions.
  danger: {
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.32)',
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
});

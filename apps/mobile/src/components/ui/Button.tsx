import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tonal'
  | 'outline'
  | 'ghost'
  | 'danger';

export interface ButtonProps
  extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    scale.value = withSpring(0.96, {
      damping: 14,
      stiffness: 260,
      mass: 0.4,
    });
    onPressIn?.(e);
  };
  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    scale.value = withSpring(1, {
      damping: 16,
      stiffness: 220,
      mass: 0.5,
    });
    onPressOut?.(e);
  };

  const containerStyle = variantContainer(variant);
  const textColor = variantTextColor(variant);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      style={[
        styles.base,
        containerStyle,
        (disabled || isLoading) && styles.disabled,
        animatedStyle,
        style,
      ]}
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
    </AnimatedPressable>
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
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  tonal: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.30)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
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

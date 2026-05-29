import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  bgColor?: string;
}

export function ScreenContainer({
  children,
  safeArea = true,
  padded = true,
  style,
  bgColor = theme.colors.background,
  ...rest
}: ScreenContainerProps) {
  const content = (
    <View style={[styles.inner, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );

  if (safeArea) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'bottom']}>
        {content}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: theme.spacing.lg,
  },
});

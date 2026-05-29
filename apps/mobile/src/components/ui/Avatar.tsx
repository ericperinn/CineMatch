import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../constants/theme';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string | null;
  ring?: boolean;
  ringColor?: string;
}

export function Avatar({
  name,
  size = 48,
  imageUrl,
  ring = false,
  ringColor = theme.colors.primary,
}: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const ringStyle = ring ? {
    borderWidth: 2,
    borderColor: ringColor,
  } : {};

  return (
    <View style={[styles.wrapper, containerStyle, ringStyle]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { width: ring ? size - 4 : size, height: ring ? size - 4 : size }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: ring ? size - 4 : size, height: ring ? size - 4 : size }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2, // Space for ring
  },
  image: {
    borderRadius: 999,
  },
  placeholder: {
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    color: theme.colors.text,
  },
});

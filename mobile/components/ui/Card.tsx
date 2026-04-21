import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  elevation?: 'sm' | 'md' | 'lg' | 'none';
  surface?: 'primary' | 'secondary';
}

export function Card({ children, style, padding = 16, elevation = 'sm', surface = 'primary' }: CardProps) {
  const { theme } = useTheme();
  const bg = surface === 'primary' ? theme.surface : theme.bgSecondary;
  const elev = elevation === 'none' ? {} : theme.shadow[elevation];
  return (
    <View style={[{
      backgroundColor: bg,
      borderRadius: theme.radius.lg,
      padding,
      ...elev,
    }, style]}>
      {children}
    </View>
  );
}

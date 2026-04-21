import React from 'react';
import {
  Pressable, Text, ActivityIndicator, View,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  gradient?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  gradient, loading, disabled, style, textStyle, icon,
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const sizeStyles: Record<string, { padH: number; padV: number; fontSize: number }> = {
    sm: { padH: 14, padV: 8, fontSize: 13 },
    md: { padH: 20, padV: 12, fontSize: 15 },
    lg: { padH: 24, padV: 14, fontSize: 16 },
  };
  const s = sizeStyles[size];

  const bgColor: Record<string, string> = {
    primary: theme.primary,
    secondary: theme.bgTertiary,
    danger: theme.danger,
    success: theme.success,
    ghost: 'transparent',
  };

  const textColor: Record<string, string> = {
    primary: theme.textOnPrimary,
    secondary: theme.text,
    danger: theme.textOnPrimary,
    success: theme.textOnPrimary,
    ghost: theme.primary,
  };

  const baseStyle: ViewStyle = {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: theme.radius.md, gap: 8,
    paddingHorizontal: s.padH, paddingVertical: s.padV,
    opacity: isDisabled ? 0.5 : 1,
    ...(variant === 'secondary' ? { borderWidth: 1, borderColor: theme.border } : {}),
  };

  const content = loading ? (
    <ActivityIndicator color={textColor[variant]} size="small" />
  ) : (
    <>
      {icon}
      <Text style={[{ fontSize: s.fontSize, fontWeight: '600', color: textColor[variant] }, textStyle]}>
        {title}
      </Text>
    </>
  );

  if (gradient && (variant === 'primary' || variant === 'success' || variant === 'danger')) {
    const grad = variant === 'primary'
      ? theme.primaryGradient
      : variant === 'success'
        ? ([theme.success, '#059669'] as const)
        : ([theme.danger, '#DC2626'] as const);
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[style]}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={baseStyle}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        baseStyle,
        { backgroundColor: bgColor[variant], transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }] },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

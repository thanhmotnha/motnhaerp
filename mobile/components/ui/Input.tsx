import React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          {
            backgroundColor: theme.mode === 'dark' ? theme.bgTertiary : theme.surface,
            borderWidth: 1,
            borderColor: error ? theme.danger : theme.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.textMuted}
        {...props}
      />
      {error && <Text style={{ color: theme.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from './ui/Card';
import { Badge, getStatusVariant } from './ui/Badge';
import { COLORS } from '@/lib/constants';
import type { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.code}>{project.code}</Text>
          <Badge label={project.status} variant={getStatusVariant(project.status)} size="sm" />
        </View>
        <Text style={styles.name} numberOfLines={2}>{project.name}</Text>
        {project.customer?.name && (
          <Text style={styles.customer}>KH: {project.customer.name}</Text>
        )}
        {project.address && (
          <Text style={styles.address} numberOfLines={1}>{project.address}</Text>
        )}
        {typeof project.progress === 'number' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{project.progress}%</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  code: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  customer: { fontSize: 13, color: COLORS.textSecondary },
  address: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  progressText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, width: 36, textAlign: 'right' },
});

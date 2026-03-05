import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Text,
} from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useProjects } from '@/hooks/useApi';
import { ProjectCard } from '@/components/ProjectCard';
import { COLORS } from '@/lib/constants';
import type { Project } from '@/lib/types';

export default function ProjectsScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, refetch, isRefetching } = useProjects(page, debouncedSearch);

  // Debounce search input
  const handleSearchChange = useCallback((text: string) => {
    setSearchInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
      setAllProjects([]);
    }, 400);
  }, []);

  // Accumulate projects across pages
  useEffect(() => {
    if (data?.data) {
      setAllProjects((prev) =>
        page === 1 ? data.data : [...prev, ...data.data]
      );
    }
  }, [data, page]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    setAllProjects([]);
    refetch();
  }, [refetch]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm dự án..."
          placeholderTextColor={COLORS.textLight}
          value={searchInput}
          onChangeText={handleSearchChange}
        />
      </View>

      <FlatList
        data={allProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/projects/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>Không có dự án nào</Text>
          )
        }
        onEndReached={() => {
          if (data?.pagination && page < data.pagination.totalPages && !isLoading) {
            setPage((p) => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && page > 1 ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ paddingVertical: 16 }} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 15 },
});

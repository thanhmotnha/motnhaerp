import React, { useState } from 'react';
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

export default function ProjectsScreen() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useProjects(page, search);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm dự án..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
        />
      </View>

      <FlatList
        data={data?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/projects/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>Không có dự án nào</Text>
          )
        }
        onEndReached={() => {
          if (data?.pagination && page < data.pagination.totalPages) {
            setPage((p) => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
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

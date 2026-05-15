import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthApi } from '@/hooks/use-auth-api';

type Instrumento = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: string;
  concedente: string;
};

const PAGE_SIZE = 20;

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function InstrumentosScreen() {
  const router = useRouter();
  const { authApiFetch } = useAuthApi();
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchInstrumentos = useCallback(async () => {
    if (!refreshing) {
      setLoading(true);
    }

    try {
      const endpoint =
        selectedStatus === 'TODOS'
          ? '/instrumentos'
          : `/instrumentos?status=${encodeURIComponent(selectedStatus)}`;
      const data = await authApiFetch(endpoint);
      setInstrumentos(Array.isArray(data) ? (data as Instrumento[]) : []);
    } catch (error) {
      console.warn("Erro ao buscar instrumentos:", error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar os instrumentos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authApiFetch, refreshing, selectedStatus]);

  useEffect(() => {
    fetchInstrumentos();
  }, [fetchInstrumentos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedQuery, selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInstrumentos();
  };

  const filteredInstrumentos = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery) return instrumentos;

    return instrumentos.filter((item) => {
      const fields = [item.instrumento, item.proposta, item.objeto, item.status, item.concedente]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return fields.some((value) => value.includes(normalizedQuery));
    });
  }, [instrumentos, debouncedQuery]);

  const statusOptions = useMemo(() => {
    const dynamicStatuses = Array.from(new Set(instrumentos.map((item) => item.status).filter(Boolean))).sort();
    return ['TODOS', ...dynamicStatuses];
  }, [instrumentos]);

  const visibleInstrumentos = useMemo(
    () => filteredInstrumentos.slice(0, visibleCount),
    [filteredInstrumentos, visibleCount]
  );

  const canLoadMore = visibleCount < filteredInstrumentos.length;

  const loadMore = () => {
    if (!canLoadMore || loading || refreshing) {
      return;
    }
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const renderItem = ({ item }: { item: Instrumento }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/instrumento/${item.id}`)}
      activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.instrumento || item.proposta || 'Sem Número'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{item.concedente}</Text>
      <Text style={styles.objeto} numberOfLines={2}>
        {item.objeto}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d7a7d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por numero, objeto, status ou concedente"
          placeholderTextColor="#8293a3"
          style={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
          {statusOptions.map((status) => {
            const active = status === selectedStatus;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.statusChip, active ? styles.statusChipActive : null]}
                onPress={() => setSelectedStatus(status)}>
                <Text style={[styles.statusChipText, active ? styles.statusChipTextActive : null]}>
                  {status === 'TODOS' ? 'Todos' : formatStatus(status)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visibleInstrumentos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          canLoadMore ? <Text style={styles.loadMoreText}>Carregando mais instrumentos...</Text> : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim() || selectedStatus !== 'TODOS'
              ? 'Nenhum resultado para os filtros informados.'
              : 'Nenhum instrumento encontrado.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: '#edf5fb',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9e4ee',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#113451',
    fontSize: 14,
  },
  statusScroll: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
    paddingRight: 2,
  },
  statusChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cdd9e4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusChipActive: {
    backgroundColor: '#1d7a7d',
    borderColor: '#1d7a7d',
  },
  statusChipText: {
    color: '#4e647b',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#113451',
  },
  badge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#1d7a7d',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#4e647b',
    marginBottom: 8,
  },
  objeto: {
    fontSize: 14,
    color: '#4e647b',
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    color: '#4e647b',
  },
  loadMoreText: {
    color: '#4e647b',
    textAlign: 'center',
    paddingBottom: 20,
    fontSize: 12,
  },
});

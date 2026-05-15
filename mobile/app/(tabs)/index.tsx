import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Alert } from 'react-native';
import { useAuthApi } from '@/hooks/use-auth-api';

type Alerta = {
  id: number;
  tipo: string;
  mensagem: string;
  urgencia: string;
};

export default function DashboardScreen() {
  const { authApiFetch } = useAuthApi();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [stats, setStats] = useState({ totalInstrumentos: 0 });

  const loadData = useCallback(async () => {
    try {
      // Busca alertas de prazos usando a API implementada no backend
      const alertasData = (await authApiFetch('/instrumentos/alerts/deadlines?limite_dias=30')) as {
        itens?: Alerta[];
      };
      setAlertas(alertasData.itens || []);
      
      // Busca a lista para obter o count superficial
      const listData = await authApiFetch('/instrumentos');
      setStats({ totalInstrumentos: Array.isArray(listData) ? listData.length : 0 });
    } catch (err) {
      console.warn("Erro ao buscar dados do dashboard", err);
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao carregar o resumo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authApiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d7a7d" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total de Instrumentos</Text>
        <Text style={styles.cardValue}>{stats.totalInstrumentos}</Text>
      </View>

      <Text style={styles.sectionTitle}>Alertas de Prazos (Próximos 30 dias)</Text>
      
      {alertas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Tudo certo! Nenhum alerta de prazo.</Text>
        </View>
      ) : (
        alertas.map((alerta) => (
          <View key={alerta.id} style={[styles.card, styles.alertaCard, alerta.urgencia === 'ALTO' ? styles.alertaAlto : {}]}>
            <Text style={styles.alertaText}>{alerta.mensagem}</Text>
          </View>
        ))
      )}
    </ScrollView>
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
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    color: '#4e647b',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    color: '#113451',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#113451',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#4e647b',
  },
  alertaCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ECC94B',
  },
  alertaAlto: {
    borderLeftColor: '#9b2c2c',
  },
  alertaText: {
    color: '#113451',
  }
});

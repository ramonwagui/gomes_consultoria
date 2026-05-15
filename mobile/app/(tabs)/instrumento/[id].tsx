import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthApi } from '@/hooks/use-auth-api';

type InstrumentoDetalhe = {
  id: number;
  proposta?: string;
  instrumento?: string;
  objeto?: string;
  status?: string;
  concedente?: string;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  valor_total?: number;
  valor_repasse?: number;
  valor_contrapartida?: number;
};

type RepasseItem = {
  id: number;
  data_repasse: string;
  valor_repasse: number;
};

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getStatusTone(status?: string) {
  switch (status) {
    case 'EM_EXECUCAO':
      return { background: '#e6fffa', color: '#0f766e' };
    case 'CONCLUIDO':
      return { background: '#ecfdf3', color: '#166534' };
    case 'EM_PRESTACAO_CONTAS':
      return { background: '#eff6ff', color: '#1d4ed8' };
    case 'CANCELADO':
      return { background: '#fef2f2', color: '#991b1b' };
    default:
      return { background: '#f1f5f9', color: '#334155' };
  }
}

function toPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default function InstrumentoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authApiFetch } = useAuthApi();

  const [loadingInstrumento, setLoadingInstrumento] = useState(true);
  const [loadingRepasses, setLoadingRepasses] = useState(true);
  const [instrumento, setInstrumento] = useState<InstrumentoDetalhe | null>(null);
  const [repasses, setRepasses] = useState<RepasseItem[]>([]);

  useEffect(() => {
    async function loadInstrumento() {
      if (!id) {
        setLoadingInstrumento(false);
        setLoadingRepasses(false);
        return;
      }

      try {
        const [instrumentoData, repassesData] = await Promise.allSettled([
          authApiFetch(`/instrumentos/${id}`),
          authApiFetch(`/instrumentos/${id}/repasses`),
        ]);

        if (instrumentoData.status === 'fulfilled') {
          setInstrumento(instrumentoData.value as InstrumentoDetalhe);
        } else {
          throw instrumentoData.reason;
        }

        if (repassesData.status === 'fulfilled') {
          const repassesValue = repassesData.value as { itens?: RepasseItem[] };
          const nextRepasses = Array.isArray(repassesValue.itens) ? repassesValue.itens : [];
          nextRepasses.sort((a, b) => b.data_repasse.localeCompare(a.data_repasse));
          setRepasses(nextRepasses);
        } else {
          console.warn('Erro ao carregar repasses:', repassesData.reason);
        }
      } catch (error) {
        console.warn('Erro ao carregar detalhe do instrumento:', error);
        Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar detalhes.');
      } finally {
        setLoadingInstrumento(false);
        setLoadingRepasses(false);
      }
    }

    loadInstrumento();
  }, [id, authApiFetch]);

  if (loadingInstrumento) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={[styles.skeletonLine, styles.skeletonTitle]} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLong]} />
        </View>

        <View style={styles.card}>
          <View style={[styles.skeletonLine, styles.skeletonTitle]} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
        </View>
      </ScrollView>
    );
  }

  if (!instrumento) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Instrumento nao encontrado.</Text>
      </View>
    );
  }

  const totalRepasses = repasses.reduce((acc, item) => acc + item.valor_repasse, 0);
  const repassePrevisto = instrumento.valor_repasse ?? 0;
  const percentualRepassado = repassePrevisto > 0 ? Math.min(100, (totalRepasses / repassePrevisto) * 100) : 0;
  const statusTone = getStatusTone(instrumento.status);

  return (
    <>
      <Stack.Screen options={{ title: instrumento.instrumento || `Instrumento ${id}` }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.instrumentoTitle}>{instrumento.instrumento || instrumento.proposta || '-'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusTone.background }]}>
              <Text style={[styles.statusBadgeText, { color: statusTone.color }]}>{instrumento.status || 'SEM STATUS'}</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Valor global</Text>
              <Text style={styles.metricValue}>{formatCurrency(instrumento.valor_total)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Repasse previsto</Text>
              <Text style={styles.metricValue}>{formatCurrency(instrumento.valor_repasse)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Ja repassado</Text>
              <Text style={styles.metricValue}>{formatCurrency(totalRepasses)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Percentual</Text>
              <Text style={styles.metricValue}>{toPercent(percentualRepassado)}</Text>
            </View>
          </View>

          <View style={styles.quickActionsRow}>
            <Text style={styles.quickActionsTitle}>Acompanhamento</Text>
            <Text
              onPress={() => router.push(`/(tabs)/instrumento/${id}/obra`)}
              style={styles.quickActionLink}>
              Abrir andamento da obra
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Numero</Text>
          <Text style={styles.value}>{instrumento.instrumento || instrumento.proposta || '-'}</Text>

          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{instrumento.status || '-'}</Text>

          <Text style={styles.label}>Concedente</Text>
          <Text style={styles.value}>{instrumento.concedente || '-'}</Text>

          <Text style={styles.label}>Vigencia</Text>
          <Text style={styles.value}>
            {formatDate(instrumento.vigencia_inicio)} ate {formatDate(instrumento.vigencia_fim)}
          </Text>

          <Text style={styles.label}>Valor global</Text>
          <Text style={styles.value}>{formatCurrency(instrumento.valor_total)}</Text>

          <Text style={styles.label}>Repasse</Text>
          <Text style={styles.value}>{formatCurrency(instrumento.valor_repasse)}</Text>

          <Text style={styles.label}>Contrapartida</Text>
          <Text style={styles.value}>{formatCurrency(instrumento.valor_contrapartida)}</Text>

          <Text style={styles.label}>Objeto</Text>
          <Text style={styles.value}>{instrumento.objeto || '-'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Repasses</Text>
          {loadingRepasses ? (
            <View style={styles.repassesLoadingContainer}>
              <ActivityIndicator size="small" color="#1d7a7d" />
              <Text style={styles.loadingText}>Carregando repasses...</Text>
            </View>
          ) : repasses.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum repasse encontrado para este instrumento.</Text>
          ) : (
            <>
              {repasses.map((repasse) => (
                <View key={repasse.id} style={styles.repasseRow}>
                  <Text style={styles.repasseDate}>{formatDate(repasse.data_repasse)}</Text>
                  <Text style={styles.repasseValue}>{formatCurrency(repasse.valor_repasse)}</Text>
                </View>
              ))}
              <View style={styles.repasseTotalRow}>
                <Text style={styles.repasseTotalLabel}>Total repassado</Text>
                <Text style={styles.repasseTotalValue}>{formatCurrency(totalRepasses)}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#edf5fb',
    padding: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#edf5fb',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  instrumentoTitle: {
    color: '#113451',
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
    marginRight: 10,
  },
  statusBadge: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '47%',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 3,
    fontWeight: '600',
  },
  metricValue: {
    color: '#113451',
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionsRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  quickActionsTitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  quickActionLink: {
    color: '#1d7a7d',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#113451',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#4e647b',
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: '#113451',
    lineHeight: 22,
  },
  emptyText: {
    color: '#4e647b',
    fontSize: 14,
  },
  loadingText: {
    color: '#4e647b',
    fontSize: 13,
  },
  repassesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  repasseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingVertical: 10,
  },
  repasseDate: {
    color: '#4e647b',
    fontSize: 14,
  },
  repasseValue: {
    color: '#113451',
    fontWeight: '700',
    fontSize: 14,
  },
  repasseTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  repasseTotalLabel: {
    color: '#113451',
    fontSize: 14,
    fontWeight: '700',
  },
  repasseTotalValue: {
    color: '#1d7a7d',
    fontSize: 15,
    fontWeight: '800',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#dbe7f0',
    marginBottom: 10,
    width: '65%',
  },
  skeletonTitle: {
    height: 16,
    width: '45%',
    marginBottom: 16,
  },
  skeletonLong: {
    width: '90%',
  },
});

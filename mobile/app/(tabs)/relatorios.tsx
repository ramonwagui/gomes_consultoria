import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuthApi } from '@/hooks/use-auth-api';

type Proponente = {
  id: number;
  nome: string;
  cnpj: string;
};

type RepasseReport = {
  kpis: {
    instrumentos: number;
    quantidade_repasses: number;
    valor_repassado_periodo: number;
    valor_pactuado: number;
    valor_ja_repassado: number;
    saldo_pactuado: number;
    percentual_repassado: number;
  };
};

type ObraReport = {
  kpis: {
    obras_monitoradas: number;
    percentual_medio_obra: number;
    valor_total_boletins_periodo: number;
    valor_total_repasses_periodo: number;
    obras_risco_alto: number;
  };
};

type PeriodPreset = '30' | '90' | '180' | 'CUSTOM';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function daysAgoDate(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now.toISOString().slice(0, 10);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default function RelatoriosScreen() {
  const { authApiFetch } = useAuthApi();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('90');
  const [dataDe, setDataDe] = useState(daysAgoDate(90));
  const [dataAte, setDataAte] = useState(todayDate());

  const [proponentes, setProponentes] = useState<Proponente[]>([]);
  const [selectedProponenteId, setSelectedProponenteId] = useState<number | null>(null);

  const [repasseReport, setRepasseReport] = useState<RepasseReport | null>(null);
  const [obraReport, setObraReport] = useState<ObraReport | null>(null);

  const selectedProponente = useMemo(
    () => proponentes.find((item) => item.id === selectedProponenteId) ?? null,
    [proponentes, selectedProponenteId]
  );

  const loadReports = useCallback(
    async (params?: { proponenteId?: number | null; from?: string; to?: string; keepLoading?: boolean }) => {
      const from = params?.from ?? dataDe;
      const to = params?.to ?? dataAte;

      if (!isDateOnly(from) || !isDateOnly(to)) {
        Alert.alert('Validacao', 'Use o formato de data AAAA-MM-DD.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (from > to) {
        Alert.alert('Validacao', 'A data inicial deve ser menor ou igual a final.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (!refreshing && !params?.keepLoading) {
          setLoading(true);
        }

        const list = (await authApiFetch('/proponentes')) as Proponente[];
        const nextProponentes = Array.isArray(list) ? list : [];
        setProponentes(nextProponentes);

        const fallbackProponenteId = params?.proponenteId ?? selectedProponenteId ?? nextProponentes[0]?.id ?? null;
        setSelectedProponenteId(fallbackProponenteId);

        const obraEndpoint = `/relatorios/obras?ativo=true&data_de=${from}&data_ate=${to}`;
        const repasseEndpoint = fallbackProponenteId
          ? `/relatorios/repasses?convenete_id=${fallbackProponenteId}&data_de=${from}&data_ate=${to}`
          : null;

        const [obraResp, repasseResp] = await Promise.allSettled([
          authApiFetch(obraEndpoint),
          repasseEndpoint ? authApiFetch(repasseEndpoint) : Promise.resolve(null),
        ]);

        if (obraResp.status === 'fulfilled') {
          setObraReport(obraResp.value as ObraReport);
        } else {
          setObraReport(null);
        }

        if (repasseResp.status === 'fulfilled' && repasseResp.value) {
          setRepasseReport(repasseResp.value as RepasseReport);
        } else {
          setRepasseReport(null);
        }
      } catch (error) {
        Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar relatorios.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authApiFetch, dataAte, dataDe, refreshing, selectedProponenteId]
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReports({ keepLoading: true });
  };

  const handleApplyCustomPeriod = () => {
    setPeriodPreset('CUSTOM');
    loadReports({ from: dataDe, to: dataAte });
  };

  const handleSelectPreset = (preset: Exclude<PeriodPreset, 'CUSTOM'>) => {
    const days = Number(preset);
    const from = daysAgoDate(days);
    const to = todayDate();
    setPeriodPreset(preset);
    setDataDe(from);
    setDataAte(to);
    loadReports({ from, to, keepLoading: true });
  };

  const handleSelectProponente = (id: number) => {
    setSelectedProponenteId(id);
    loadReports({ proponenteId: id, keepLoading: true });
  };

  const buildShareSummary = () => {
    const rep = repasseReport?.kpis;
    const obra = obraReport?.kpis;
    return [
      `Gestconv360 - Resumo de relatorios (${dataDe} a ${dataAte})`,
      '',
      `Proponente: ${selectedProponente?.nome ?? 'Nao selecionado'}`,
      '',
      'Obras',
      `- Monitoradas: ${obra?.obras_monitoradas ?? 0}`,
      `- Percentual medio: ${formatPercent(obra?.percentual_medio_obra ?? 0)}`,
      `- Boletins no periodo: ${formatCurrency(obra?.valor_total_boletins_periodo ?? 0)}`,
      `- Risco alto: ${obra?.obras_risco_alto ?? 0}`,
      '',
      'Repasses',
      `- Instrumentos: ${rep?.instrumentos ?? 0}`,
      `- Quantidade de repasses: ${rep?.quantidade_repasses ?? 0}`,
      `- Valor repassado no periodo: ${formatCurrency(rep?.valor_repassado_periodo ?? 0)}`,
      `- Percentual repassado: ${formatPercent(rep?.percentual_repassado ?? 0)}`,
    ].join('\n');
  };

  const handleShareSummary = async () => {
    try {
      await Share.share({
        message: buildShareSummary(),
        title: 'Resumo de relatorios Gestconv360',
      });
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao compartilhar resumo.');
    }
  };

  const handleExportPdf = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'Exportacao em PDF no web nao esta habilitada no app mobile.');
      return;
    }

    setExportingPdf(true);
    try {
      const rep = repasseReport?.kpis;
      const obra = obraReport?.kpis;

      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
            <h1 style="margin: 0 0 8px;">Gestconv360 - Relatorios</h1>
            <p style="margin: 0 0 20px;">Periodo: ${dataDe} ate ${dataAte}</p>
            <p style="margin: 0 0 20px;">Proponente: ${selectedProponente?.nome ?? 'Nao selecionado'}</p>

            <h2 style="margin: 0 0 8px;">Obras</h2>
            <ul>
              <li>Obras monitoradas: ${obra?.obras_monitoradas ?? 0}</li>
              <li>Percentual medio: ${formatPercent(obra?.percentual_medio_obra ?? 0)}</li>
              <li>Boletins no periodo: ${formatCurrency(obra?.valor_total_boletins_periodo ?? 0)}</li>
              <li>Obras risco alto: ${obra?.obras_risco_alto ?? 0}</li>
            </ul>

            <h2 style="margin: 16px 0 8px;">Repasses</h2>
            <ul>
              <li>Instrumentos: ${rep?.instrumentos ?? 0}</li>
              <li>Quantidade de repasses: ${rep?.quantidade_repasses ?? 0}</li>
              <li>Valor repassado no periodo: ${formatCurrency(rep?.valor_repassado_periodo ?? 0)}</li>
              <li>Percentual repassado: ${formatPercent(rep?.percentual_repassado ?? 0)}</li>
            </ul>
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });
      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
      } else {
        await Share.share({ message: buildShareSummary() });
      }
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao exportar PDF.');
    } finally {
      setExportingPdf(false);
    }
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
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.card}>
        <Text style={styles.title}>Filtros de periodo</Text>
        <View style={styles.periodChips}>
          {(['30', '90', '180'] as const).map((item) => {
            const active = periodPreset === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => handleSelectPreset(item)}
                style={[styles.chip, active ? styles.chipActive : null]}>
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item} dias</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.inputLabel}>De</Text>
            <TextInput style={styles.input} value={dataDe} onChangeText={setDataDe} placeholder="AAAA-MM-DD" />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.inputLabel}>Ate</Text>
            <TextInput style={styles.input} value={dataAte} onChangeText={setDataAte} placeholder="AAAA-MM-DD" />
          </View>
        </View>

        <TouchableOpacity style={styles.applyButton} onPress={handleApplyCustomPeriod}>
          <Text style={styles.applyButtonText}>Aplicar periodo customizado</Text>
        </TouchableOpacity>

        <View style={styles.exportRow}>
          <TouchableOpacity style={[styles.actionButton, styles.exportPdfButton]} onPress={handleExportPdf}>
            <Text style={styles.actionButtonText}>{exportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShareSummary}>
            <Text style={styles.actionButtonText}>Compartilhar resumo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Relatorio de obras</Text>
        {obraReport ? (
          <View style={styles.grid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Obras monitoradas</Text>
              <Text style={styles.metricValue}>{obraReport.kpis.obras_monitoradas}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Percentual medio</Text>
              <Text style={styles.metricValue}>{formatPercent(obraReport.kpis.percentual_medio_obra)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Boletins no periodo</Text>
              <Text style={styles.metricValue}>{formatCurrency(obraReport.kpis.valor_total_boletins_periodo)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Obras risco alto</Text>
              <Text style={styles.metricDanger}>{obraReport.kpis.obras_risco_alto}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Nao foi possivel carregar o relatorio de obras.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Relatorio de repasses</Text>
        <Text style={styles.subtitle}>Selecione o proponente</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {proponentes.map((item) => {
            const active = item.id === selectedProponenteId;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSelectProponente(item.id)}
                style={[styles.chip, active ? styles.chipActive : null]}>
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.nome}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedProponente ? <Text style={styles.selectedHint}>CNPJ: {selectedProponente.cnpj}</Text> : null}

        {repasseReport ? (
          <View style={styles.grid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Instrumentos</Text>
              <Text style={styles.metricValue}>{repasseReport.kpis.instrumentos}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Qtde repasses</Text>
              <Text style={styles.metricValue}>{repasseReport.kpis.quantidade_repasses}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Repassado periodo</Text>
              <Text style={styles.metricValue}>{formatCurrency(repasseReport.kpis.valor_repassado_periodo)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Percentual repassado</Text>
              <Text style={styles.metricValue}>{formatPercent(repasseReport.kpis.percentual_repassado)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Selecione um proponente para visualizar repasses.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf5fb',
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#edf5fb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    color: '#113451',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#4e647b',
    fontSize: 12,
    marginBottom: 8,
  },
  periodChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 6,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d8e3ee',
  },
  chipActive: {
    backgroundColor: '#1d7a7d',
    borderColor: '#1d7a7d',
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  inputLabel: {
    color: '#4e647b',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7e2ec',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#f8fbff',
    color: '#113451',
  },
  applyButton: {
    marginTop: 12,
    backgroundColor: '#ebf8ff',
    borderColor: '#b7d7f2',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#1f5f88',
    fontSize: 12,
    fontWeight: '700',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  exportPdfButton: {
    backgroundColor: '#1d7a7d',
  },
  shareButton: {
    backgroundColor: '#113451',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  selectedHint: {
    color: '#4e647b',
    fontSize: 12,
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricItem: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: '#113451',
    fontSize: 14,
    fontWeight: '800',
  },
  metricDanger: {
    color: '#9b2c2c',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#4e647b',
    fontSize: 13,
  },
});

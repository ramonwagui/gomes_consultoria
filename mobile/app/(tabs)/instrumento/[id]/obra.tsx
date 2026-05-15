import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuthApi } from '@/hooks/use-auth-api';

type Boletim = {
  id: number;
  data_boletim: string;
  valor_medicao: number;
  percentual_obra_informado: number | null;
  observacao: string | null;
};

type WorkProgress = {
  percentual_obra: number;
  valor_total_boletins: number;
  boletins: Boletim[];
};

const todayDate = () => new Date().toISOString().slice(0, 10);

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function InstrumentoObraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authApiFetch } = useAuthApi();

  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingBoletim, setSavingBoletim] = useState(false);
  const [progress, setProgress] = useState<WorkProgress | null>(null);

  const [percentualInput, setPercentualInput] = useState('0');
  const [dataBoletim, setDataBoletim] = useState(todayDate());
  const [valorBoletim, setValorBoletim] = useState('');
  const [percentualBoletim, setPercentualBoletim] = useState('');
  const [observacaoBoletim, setObservacaoBoletim] = useState('');

  const loadProgress = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const data = (await authApiFetch(`/instrumentos/${id}/work-progress`)) as WorkProgress;
      setProgress(data);
      setPercentualInput(String(data.percentual_obra ?? 0));
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar andamento da obra.');
    } finally {
      setLoading(false);
    }
  }, [authApiFetch, id]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const boletins = useMemo(() => progress?.boletins ?? [], [progress]);

  const handleUpdateProgress = async () => {
    if (!id) return;

    const percentual = Number(percentualInput.replace(',', '.'));
    if (Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
      Alert.alert('Validacao', 'Informe um percentual entre 0 e 100.');
      return;
    }

    setSavingProgress(true);
    try {
      await authApiFetch(`/instrumentos/${id}/work-progress`, {
        method: 'PUT',
        body: JSON.stringify({ percentual_obra: percentual }),
      });
      await loadProgress();
      Alert.alert('Sucesso', 'Percentual de obra atualizado.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao atualizar percentual.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSyncTransferegov = async () => {
    if (!id) return;

    setSavingProgress(true);
    try {
      await authApiFetch(`/instrumentos/${id}/work-progress/sync-transferegov`, { method: 'POST' });
      await loadProgress();
      Alert.alert('Sucesso', 'Sincronizacao com Transferegov concluida.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao sincronizar com Transferegov.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleCreateBoletim = async () => {
    if (!id) return;

    const valor = Number(valorBoletim.replace(',', '.'));
    if (!dataBoletim || Number.isNaN(valor) || valor < 0) {
      Alert.alert('Validacao', 'Informe data e valor de medicao validos.');
      return;
    }

    let percentualInformado: number | undefined;
    if (percentualBoletim.trim() !== '') {
      const parsed = Number(percentualBoletim.replace(',', '.'));
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        Alert.alert('Validacao', 'Percentual informado no boletim deve estar entre 0 e 100.');
        return;
      }
      percentualInformado = parsed;
    }

    setSavingBoletim(true);
    try {
      await authApiFetch(`/instrumentos/${id}/work-progress/boletins`, {
        method: 'POST',
        body: JSON.stringify({
          data_boletim: dataBoletim,
          valor_medicao: valor,
          percentual_obra_informado: percentualInformado,
          observacao: observacaoBoletim.trim() || undefined,
        }),
      });

      setValorBoletim('');
      setPercentualBoletim('');
      setObservacaoBoletim('');
      await loadProgress();
      Alert.alert('Sucesso', 'Boletim registrado.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao criar boletim.');
    } finally {
      setSavingBoletim(false);
    }
  };

  const handleDeleteBoletim = async (boletimId: number) => {
    if (!id) return;

    Alert.alert('Remover boletim', 'Deseja remover este boletim?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApiFetch(`/instrumentos/${id}/work-progress/boletins/${boletimId}`, {
              method: 'DELETE',
            });
            await loadProgress();
          } catch (error) {
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao remover boletim.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d7a7d" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Andamento da Obra' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Progresso</Text>
          <Text style={styles.label}>Percentual da obra (%)</Text>
          <TextInput
            style={styles.input}
            value={percentualInput}
            onChangeText={setPercentualInput}
            keyboardType="decimal-pad"
            placeholder="0 a 100"
          />

          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleUpdateProgress}
              disabled={savingProgress}>
              <Text style={styles.primaryButtonText}>{savingProgress ? 'Salvando...' : 'Salvar percentual'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSyncTransferegov}
              disabled={savingProgress}>
              <Text style={styles.secondaryButtonText}>Sincronizar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Boletins de medicao</Text>
          <Text style={styles.kpiLabel}>Total de boletins no periodo</Text>
          <Text style={styles.kpiValue}>{formatCurrency(progress?.valor_total_boletins ?? 0)}</Text>

          <Text style={styles.label}>Data do boletim (AAAA-MM-DD)</Text>
          <TextInput style={styles.input} value={dataBoletim} onChangeText={setDataBoletim} placeholder="2026-04-16" />

          <Text style={styles.label}>Valor da medicao</Text>
          <TextInput
            style={styles.input}
            value={valorBoletim}
            onChangeText={setValorBoletim}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />

          <Text style={styles.label}>Percentual informado (opcional)</Text>
          <TextInput
            style={styles.input}
            value={percentualBoletim}
            onChangeText={setPercentualBoletim}
            keyboardType="decimal-pad"
            placeholder="0 a 100"
          />

          <Text style={styles.label}>Observacao (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observacaoBoletim}
            onChangeText={setObservacaoBoletim}
            placeholder="Detalhes do boletim"
            multiline
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, styles.fullWidthButton]}
            onPress={handleCreateBoletim}
            disabled={savingBoletim}>
            <Text style={styles.primaryButtonText}>{savingBoletim ? 'Registrando...' : 'Registrar boletim'}</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          {boletins.length === 0 ? (
            <Text style={styles.emptyText}>Sem boletins cadastrados.</Text>
          ) : (
            boletins.map((item) => (
              <View key={item.id} style={styles.boletimRow}>
                <View style={styles.boletimInfo}>
                  <Text style={styles.boletimDate}>{formatDate(item.data_boletim)}</Text>
                  <Text style={styles.boletimValue}>{formatCurrency(item.valor_medicao)}</Text>
                  {item.percentual_obra_informado !== null ? (
                    <Text style={styles.boletimMeta}>Percentual informado: {item.percentual_obra_informado}%</Text>
                  ) : null}
                  {item.observacao ? <Text style={styles.boletimMeta}>{item.observacao}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => handleDeleteBoletim(item.id)}>
                  <Text style={styles.deleteText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#113451',
    marginBottom: 10,
  },
  label: {
    color: '#4e647b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7e2ec',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#113451',
    backgroundColor: '#f8fbff',
  },
  textArea: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1d7a7d',
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#ebf8ff',
    borderWidth: 1,
    borderColor: '#b7d7f2',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#1f5f88',
    fontSize: 13,
    fontWeight: '700',
  },
  fullWidthButton: {
    marginTop: 14,
    flex: 0,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#4e647b',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#113451',
    marginBottom: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#e8eef4',
    marginVertical: 14,
  },
  emptyText: {
    color: '#4e647b',
    textAlign: 'center',
    paddingVertical: 8,
  },
  boletimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingVertical: 10,
  },
  boletimInfo: {
    flex: 1,
  },
  boletimDate: {
    color: '#113451',
    fontWeight: '700',
    fontSize: 13,
  },
  boletimValue: {
    color: '#1d7a7d',
    fontWeight: '800',
    marginTop: 2,
  },
  boletimMeta: {
    color: '#4e647b',
    fontSize: 12,
    marginTop: 2,
  },
  deleteText: {
    color: '#9b2c2c',
    fontWeight: '700',
    fontSize: 12,
  },
});

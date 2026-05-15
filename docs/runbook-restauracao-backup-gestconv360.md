# Runbook de Restauracao — GestConv360

## Objetivo e metas
- **RPO alvo:** 1 hora
- **RTO alvo:** 4 horas (dia util), 8 horas (fim de semana)
- **Escopo:** PostgreSQL + arquivos no R2

## Pre-check de incidente
1. Confirmar tipo de incidente: corrupcao logica, falha total do banco, perda de arquivos.
2. Congelar mudancas operacionais (sem deploy e sem jobs manuais de sync durante restauracao).
3. Identificar timestamp de referencia (ultimo estado considerado bom).
4. Registrar inicio do incidente (hora exata) para medir MTTR.

## Cenario A — Corrupcao logica de dados (1–2h)
1. Criar banco temporario no Neon.
2. Baixar dump mais proximo do timestamp:
   - `postgres/daily/` ou `postgres/hourly/` no bucket de backup.
3. Restaurar:
   - `pg_restore --dbname=$TEMP_DB_URL --clean --if-exists <arquivo.dump>`
4. Validar contagens em tabelas criticas (usuarios, instrumentos, tickets, documentos, transferencias).
5. Se necessario, usar PITR do Neon para aproximar ao horario exato.
6. Exportar/aplicar apenas as tabelas afetadas para producao.
7. Executar smoke test funcional.

## Cenario B — Falha total do banco de producao (2–4h)
1. Provisionar novo banco no Neon.
2. Restaurar ultimo dump horario:
   - `pg_restore --dbname=$NEW_DB_URL --clean --if-exists <latest-hourly.dump>`
3. Aplicar PITR no Neon ate o ponto mais recente disponivel.
4. Atualizar `DATABASE_URL` no Railway.
5. Reiniciar servico e validar:
   - login, listagens, upload/download de documento, relatorios principais.
6. Comunicar retorno parcial/total aos usuarios.

## Cenario C — Perda de arquivos no R2 (1–3h)
1. Identificar data do snapshot em `r2-snapshots/daily/` ou `monthly/`.
2. Listar arquivos esperados pelo manifesto do dia.
3. Restaurar objetos para o bucket de producao (copiando do bucket de backup).
4. Conferir amostra de arquivos por hash/tamanho.
5. Validar download de documentos no sistema.

## Checklist pos-restauracao
1. Rodar queries de sanidade (contagens, ultimos registros, integridade basica).
2. Rodar smoke test funcional end-to-end.
3. Reativar jobs automaticos.
4. Registrar fim do incidente e calcular MTTR.
5. Criar post-mortem com causa raiz e acoes preventivas.

## Teste mensal de restauracao (staging)
1. Restaurar ultimo dump em banco temporario de staging.
2. Validar `pg_restore --list` e contagens de tabelas criticas.
3. Recuperar amostra de arquivos do snapshot R2.
4. Executar smoke test.
5. Registrar duracao total e comparar com meta de RTO.

# Estudo mensal de custos do GestConv360

Data do estudo: 13/05/2026  
Moeda: BRL  
Cambio de referencia usado: USD 1,00 = BRL 4,90

Este estudo estima o custo mensal dos servicos pagos que estao implementados e ativos no ambiente atual do GestConv360, com base no codigo e nas variaveis do `.env`. Os valores abaixo sao uma estimativa operacional para tomada de decisao; devem ser recalibrados quando houver faturas reais de Railway, Neon, OpenAI, R2, Google Workspace e OCR.Space.

## 1. Servicos pagos identificados

| Servico | Uso no sistema | Situacao atual | Tipo de custo |
|---|---:|---:|---:|
| Railway | Hospedagem do backend/frontend | Sistema publicado em dominio Railway | Fixo/uso de infraestrutura |
| Neon Postgres | Banco principal da aplicacao | `DATABASE_URL` em Neon | Variavel por uso |
| Cloudflare R2 | Documentos, logos, timbres e arquivos gerados | `R2_ENABLED=true` | Variavel, quase zero em baixa escala |
| OpenAI | Somente tickets por e-mail (sem Assistente 360) | `gpt-4o` | Variavel por token |
| OCR.Space | OCR de imagens/PDFs escaneados | `AI_DOCUMENT_OCR_ENABLED=true` | Plano pago recomendado |
| Google Workspace/Gmail | Uma unica caixa para tickets | Gmail API ativa | Licenca fixa mensal |

Sem custo direto de fornecedor no codigo atual: APIs publicas do governo, Transferegov, Portal da Transparencia, FNS, SIMEC e scrapers. Elas podem ter custo indireto de processamento e limites externos, mas nao geram cobranca SaaS identificada no sistema.

## 2. Premissas de calculo

Fontes oficiais consultadas em 13/05/2026:

- OpenAI API Pricing: https://openai.com/api/pricing/
- Neon Pricing: https://neon.com/pricing
- Railway Pricing: https://railway.com/pricing
- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
- OCR.Space OCR API: https://ocr.space/ocrapi
- Google Workspace Pricing: https://workspace.google.com/pricing.html

Premissas usadas nos cenarios:

| Item | Premissa usada |
|---|---:|
| Railway | BRL 98,00/mes, equivalente a USD 20,00 para plano de producao pequeno. Alternativa economica: Hobby em torno de BRL 24,50/mes, se aceitavel para ambiente inicial. |
| Google Workspace | BRL 34,30/mes, equivalente a USD 7,00, considerando apenas 1 caixa de e-mail para tickets. |
| OCR.Space | BRL 294,00/mes, equivalente a USD 60,00, recomendado porque o sistema aceita arquivos ate 15 MB e PDFs escaneados. Se o volume couber no plano gratuito, este custo pode cair para zero. |
| OpenAI tickets | Ate 3 chamadas por e-mail aceito: resumo, identificacao de instrumento e nome do remetente. Estimativa media: BRL 0,13 por e-mail processado. |
| R2 | Free tier cobre os cenarios pequenos. Em crescimento/escala, o custo segue baixo porque R2 cobra barato por GB e operacoes. |
| Neon | Estimado por faixa: conservador BRL 39,20, esperado BRL 73,50, intenso BRL 122,50 nos cenarios pequenos. Cenarios maiores sobem conforme volume. |

Faixas de uso:

| Faixa | Tickets/e-mails com IA | Armazenamento de documentos |
|---|---:|---:|
| Conservador | 8 por proponente/mes | 0,2 GB por proponente/mes |
| Esperado | 20 por proponente/mes | 0,8 GB por proponente/mes |
| Intenso | 50 por proponente/mes | 2,0 GB por proponente/mes |

## 3. Cenarios solicitados

### 1 gestor atendendo 5 proponentes

Google considerado: 1 unica caixa de tickets.

| Faixa | Hospedagem | Banco Neon | R2 | Google/Gmail | OpenAI | OCR | Total mensal | Por gestor | Por proponente |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Conservador | BRL 98,00 | BRL 39,20 | BRL 0,00 | BRL 34,30 | BRL 5,20 | BRL 294,00 | BRL 470,70 | BRL 470,70 | BRL 94,14 |
| Esperado | BRL 98,00 | BRL 73,50 | BRL 0,00 | BRL 34,30 | BRL 13,00 | BRL 294,00 | BRL 512,80 | BRL 512,80 | BRL 102,56 |
| Intenso | BRL 98,00 | BRL 122,50 | BRL 0,00 | BRL 34,30 | BRL 32,50 | BRL 294,00 | BRL 581,30 | BRL 581,30 | BRL 116,26 |

### 2 usuarios atendendo 10 proponentes

Google considerado: 1 unica caixa de tickets.

| Faixa | Hospedagem | Banco Neon | R2 | Google/Gmail | OpenAI | OCR | Total mensal | Por usuario | Por proponente |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Conservador | BRL 98,00 | BRL 39,20 | BRL 0,00 | BRL 34,30 | BRL 10,40 | BRL 294,00 | BRL 475,90 | BRL 237,95 | BRL 47,59 |
| Esperado | BRL 98,00 | BRL 73,50 | BRL 0,00 | BRL 34,30 | BRL 26,00 | BRL 294,00 | BRL 525,80 | BRL 262,90 | BRL 52,58 |
| Intenso | BRL 98,00 | BRL 122,50 | BRL 0,00 | BRL 34,30 | BRL 65,00 | BRL 294,00 | BRL 613,80 | BRL 306,90 | BRL 61,38 |

### 3 usuarios atendendo 15 proponentes

Google considerado: 1 unica caixa de tickets.

| Faixa | Hospedagem | Banco Neon | R2 | Google/Gmail | OpenAI | OCR | Total mensal | Por usuario | Por proponente |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Conservador | BRL 98,00 | BRL 39,20 | BRL 0,00 | BRL 34,30 | BRL 15,60 | BRL 294,00 | BRL 481,10 | BRL 160,37 | BRL 32,07 |
| Esperado | BRL 98,00 | BRL 73,50 | BRL 0,00 | BRL 34,30 | BRL 39,00 | BRL 294,00 | BRL 538,80 | BRL 179,60 | BRL 35,92 |
| Intenso | BRL 98,00 | BRL 122,50 | BRL 0,00 | BRL 34,30 | BRL 97,50 | BRL 294,00 | BRL 646,30 | BRL 215,43 | BRL 43,09 |

## 4. Cenarios sugeridos de mercado

| Cenario | Usuarios | Proponentes | Conservador | Esperado | Intenso | Leitura comercial |
|---|---:|---:|---:|---:|---:|---|
| Entrada comercial | 1 | 3 | BRL 468,62 | BRL 507,60 | BRL 568,30 | Bom para validacao e implantacao inicial. O custo por proponente ainda e alto porque OCR, Railway e e-mail pesam como fixos. |
| Operacao padrao | 2 | 10 | BRL 475,90 | BRL 525,80 | BRL 613,80 | Melhor equilibrio para venda: custo tecnico dilui bem e ainda opera com folga. |
| Crescimento | 5 | 25 | BRL 525,80 | BRL 614,54 | BRL 812,24 | Faixa saudavel para consultoria maior; exige acompanhar OCR, banco e volume de tickets. |
| Agencia/escala | 10 | 50 | BRL 600,80 | BRL 779,01 | BRL 1.149,92 | Ja pede monitoramento formal de custos e limites por cliente/proponente. |

Detalhamento dos cenarios sugeridos:

| Cenario | Faixa | Hospedagem | Banco Neon | R2 | Google/Gmail | OpenAI | OCR | Total mensal | Por usuario | Por proponente |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Entrada comercial | Conservador | BRL 98,00 | BRL 39,20 | BRL 0,00 | BRL 34,30 | BRL 3,12 | BRL 294,00 | BRL 468,62 | BRL 468,62 | BRL 156,21 |
| Entrada comercial | Esperado | BRL 98,00 | BRL 73,50 | BRL 0,00 | BRL 34,30 | BRL 7,80 | BRL 294,00 | BRL 507,60 | BRL 507,60 | BRL 169,20 |
| Entrada comercial | Intenso | BRL 98,00 | BRL 122,50 | BRL 0,00 | BRL 34,30 | BRL 19,50 | BRL 294,00 | BRL 568,30 | BRL 568,30 | BRL 189,43 |
| Crescimento | Conservador | BRL 98,00 | BRL 73,50 | BRL 0,00 | BRL 34,30 | BRL 26,00 | BRL 294,00 | BRL 525,80 | BRL 105,16 | BRL 21,03 |
| Crescimento | Esperado | BRL 98,00 | BRL 122,50 | BRL 0,74 | BRL 34,30 | BRL 65,00 | BRL 294,00 | BRL 614,54 | BRL 122,91 | BRL 24,58 |
| Crescimento | Intenso | BRL 98,00 | BRL 220,50 | BRL 2,94 | BRL 34,30 | BRL 162,50 | BRL 294,00 | BRL 812,24 | BRL 162,45 | BRL 32,49 |
| Agencia/escala | Conservador | BRL 98,00 | BRL 122,50 | BRL 0,00 | BRL 34,30 | BRL 52,00 | BRL 294,00 | BRL 600,80 | BRL 60,08 | BRL 12,02 |
| Agencia/escala | Esperado | BRL 98,00 | BRL 220,50 | BRL 2,21 | BRL 34,30 | BRL 130,00 | BRL 294,00 | BRL 779,01 | BRL 77,90 | BRL 15,58 |
| Agencia/escala | Intenso | BRL 98,00 | BRL 392,00 | BRL 6,62 | BRL 34,30 | BRL 325,00 | BRL 294,00 | BRL 1.149,92 | BRL 114,99 | BRL 23,00 |

## 5. Opiniao e recomendacoes

Sem o Assistente 360 e com apenas uma caixa de e-mail para tickets, a estrutura de custo ficou mais enxuta e previsivel. O melhor cenario comercial continua sendo 2 usuarios e 10 proponentes, agora com custo esperado de BRL 525,80/mes, ou BRL 52,58 por proponente.

O maior peso fixo permanece no OCR. Se o produto usar OCR de forma eventual, vale manter `AI_DOCUMENT_OCR_ENABLED=false` por padrao e ativar OCR pago apenas para clientes que realmente enviem muitos PDFs escaneados. Isso reduziria cerca de BRL 294,00/mes de todos os cenarios.

O custo da OpenAI ficou bem menor sem o Assistente 360, mas ainda cresce conforme volume de tickets. Para crescimento acima de 25 proponentes, vale acompanhar mensalmente custo por ticket e eventualmente testar modelo menor para tarefas simples de classificacao.

Railway e Neon continuam adequados para a fase atual. O principal ponto de controle operacional passa a ser volume de documentos/OCR e volume de e-mails processados por IA, ja que o componente de assistente saiu do desenho.

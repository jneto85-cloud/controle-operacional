# AUDITORIA TÉCNICA — RELATÓRIO DIÁRIO DE OPERAÇÕES (RDO PRO)

**Objeto auditado:** aplicativo "Relatório Diário PRO" (hospedado em Replit) e os relatórios
que ele gera.
**Material recebido:** PDF da aba *Editor* com o estado atual dos dados (06/08/2026 – NOTURNO),
captura de tela da aba *Relatório* com esse mesmo dataset, e PNG exportado do relatório anterior
(25/07/2026 – NOTURNO).
**Data da auditoria:** 19/08/2026.

---

## 0. Escopo e limites — leia antes dos achados

**O código-fonte do aplicativo não foi disponibilizado.** O arquivo `C.O.Meta.txt` enviado não
contém o app (é uma página salva do "Meta AI", sem conteúdo aproveitável).

Consequência metodológica, declarada de forma explícita para não inflar a auditoria:

- Auditei a **saída** do aplicativo, não a implementação. Cada número exibido foi recalculado
  do zero a partir dos dados de entrada e comparado com o que a tela mostra.
- Onde o comportamento interno pôde ser **determinado por engenharia reversa** (é o caso do
  cálculo de dias de operação), isso está demonstrado com o raciocínio e os intervalos
  numéricos que sustentam a conclusão — não é suposição.
- Onde não há evidência suficiente, o item está marcado como **NÃO VALIDADO — EVIDÊNCIA
  INSUFICIENTE**, e não como aprovado.
- Nenhuma função do próprio app foi usada como referência de validação. Todas as fórmulas de
  comparação foram escritas do zero (arquivo `verificacao_independente.js`, reexecutável).

---

## 1. Resumo executivo

O relatório é **visualmente muito bom** e a maior parte dos agregados simples está correta
(soma das barras, total de poços entregues, total de eventos NPT, ordenação do TOP 3, datas de
cabeçalho — todos conferidos e corretos).

Porém, a **métrica principal do relatório — DIAS DE OPERAÇÃO — está errada**, e errada de um
jeito que piora com o tempo. Além disso, dois gráficos da mesma página classificam as mesmas 7
sondas de formas que não podem ser ambas verdadeiras.

| | |
|---|---|
| Indicadores verificados | 23 |
| Corretos | 12 |
| Erros críticos confirmados | **2** |
| Erro de apresentação confirmado | 1 |
| Requerem atenção | 7 |
| Não validados (evidência insuficiente) | 1 |
| **Índice de confiança técnica** | **46 / 100** |
| **Parecer final** | 🔴 **NÃO APTO COMO DOCUMENTO OFICIAL SEM CORREÇÃO** |

O parecer é determinado pela regra de bloqueio: **um único erro crítico confirmado impede a
classificação de "apto para uso operacional"**. Há dois.

---

## 2. Erros críticos confirmados

### 🚨 CRÍTICO 1 — "Dias de operação" é calculado pelo relógio do celular, não pela data do relatório

**Este é o achado mais grave e é reproduzível.**

O relatório está configurado para **06/08/2026 – NOTURNO**. Mas os valores de dias de operação
exibidos são matematicamente impossíveis para essa data.

Método de verificação: cada valor exibido restringe o instante de referência usado pelo app a
um intervalo. Intersectando os 7 intervalos, sobra uma única janela possível:

> Instante de referência realmente usado: **entre 08/08/2026 12:00 e 08/08/2026 23:00**
> — ou seja, **~2,5 dias depois da data que o relatório declara.**

Comparação, sonda a sonda, contra o valor correto no fechamento de 06/08:

| Sonda | Início | Correto (06/08) | Exibido | Erro |
|---|---|---|---|---|
| SPT-82 | 28/07 00:00 | 9,83 d | 12 d | **+22,0%** |
| SPT-92 | 27/07 21:00 | 9,96 d | 12 d | +20,5% |
| SPT-53 | 02/08 20:00 | 4,00 d | 6 d | +50,0% |
| SPT-131 | 02/08 18:30 | 4,06 d | 6 d | +47,7% |
| SPT-61 | 04/08 11:00 | 2,38 d | 4 d | +68,4% |
| SPT-28 | 05/08 16:30 | 1,15 d | 3 d | **+161,8%** |
| SPT-154 | 01/08 00:00 | 5,83 d | 8 d | +37,1% |

**Prova cruzada com o relatório anterior:** no PNG de 25/07/2026 os valores (9,84 / 9,97 / 4,01
/ 4,07 / 2,38 / 1,16 / 5,84) correspondem a um instante de referência entre **25/07 20:13 e
25/07 20:14** — dentro do próprio dia do relatório. Ou seja: **quando o relatório é gerado e
exportado no mesmo dia, ele fica certo; quando é reaberto depois, os números mudam sozinhos.**

**Por que isso é crítico e não cosmético:**

1. O documento **não é reproduzível**. O mesmo relatório reaberto em datas diferentes mostra
   números diferentes. Um relatório diário arquivado precisa ser imutável.
2. "Dias de exposição" alimenta decisão operacional e priorização de sonda. Um erro de +162%
   numa sonda (SPT-28: 1,15 dia virando 3 dias) distorce a leitura de risco.
3. O PNG exportado e o app ao vivo **divergem** — duas versões do mesmo relatório circulando
   com números diferentes.

**Correção:** calcular sempre em relação a uma **data/hora de fechamento explícita**, gravada
junto com o relatório e impressa nele. Implementado na versão nova.

---

### 🚨 CRÍTICO 2 — Dois gráficos classificam as mesmas 7 sondas de formas incompatíveis

Na mesma página do relatório de 25/07:

| Gráfico | O que mostra | Confere com a tabela? |
|---|---|---|
| POÇOS EM ANDAMENTO (ATUAL) | Injetores 4 / Produtor BCS 2 / Arrasamento 1 | ✅ Sim — bate com a coluna OPERAÇÃO (4 OPEX ÁGUA, 2 BCS, 1 ARRASAMENTO) |
| TIPOS DE OPERAÇÃO (ATUAL) | OPEX ÁGUA 3 / PESCARIA 3 / BCS 1 | ❌ **Não** |

O segundo gráfico não bate com **nenhuma** coluna da tabela:

- Pela coluna OPERAÇÃO: são 4 OPEX ÁGUA, não 3; 2 BCS, não 1; e falta ARRASAMENTO.
- Pela coluna SITUAÇÃO: há **2** sondas em pescaria (SPT-82 e SPT-53), não 3.

As duas roscas descrevem o mesmo universo de 7 sondas e **não podem estar ambas corretas**. Um
leitor do relatório não tem como saber qual acreditar.

**Correção:** todos os gráficos derivados de uma única fonte de verdade (a tabela de sondas), e
as duas roscas passam a mostrar dimensões genuinamente diferentes — uma por OPERAÇÃO, outra por
SITUAÇÃO — cada uma somando 7. Implementado na versão nova.

---

## 3. Erro de apresentação confirmado

### ❌ INCORRETO — Duas categorias com a mesma quantidade exibem percentuais diferentes

No relatório de 25/07: **ATENÇÃO = 2 sondas → 29%** e **NORMAIS = 2 sondas → 28%**.

Ambas valem exatamente 2/7 = 28,571%. Foram exibidas com valores diferentes, aparentemente para
forçar a soma a fechar em 100% (43+29+28). Isso troca um problema visível (soma 101%) por um
problema pior: o relatório afirma que duas quantidades iguais são diferentes.

Na versão de 06/08 o comportamento mudou — as duas passaram a mostrar 29%, o que é correto,
mas agora a soma dá **101%** sem nenhuma indicação de arredondamento.

**Não existe solução que satisfaça as duas coisas ao mesmo tempo** com 3/7, 2/7 e 2/7. A saída
honesta, usada em relatórios técnicos, é: manter cada percentual arredondado corretamente
(43% / 29% / 29%), dar destaque visual à **quantidade** (que é exata) e incluir a nota de
rodapé "percentuais arredondados — a soma pode diferir de 100%". Implementado na versão nova.

---

## 4. Itens que requerem atenção

| # | Item | Evidência | Severidade |
|---|---|---|---|
| 1 | **Percentual de NPT é campo de texto digitado à mão** | No editor a coluna é "Obs (%)" com "67%" e "33%" digitados. Hoje coincidem com 2/3 e 1/3, mas nada impede alterar a quantidade sem atualizar o percentual — o gráfico passaria a mentir silenciosamente. Defeito **latente**: não está errado hoje. | 🟠 Alto (latente) |
| 2 | **Arredondar dias para inteiro cria empates e quebra o TOP 3** | SPT-82 (9,83 d) e SPT-92 (9,96 d) ambos viram "12"; SPT-53 (4,00 d) e SPT-131 (4,06 d) ambos viram "6". O pódio não consegue ordenar. A versão de 25/07 usava 2 decimais e não tinha o problema. | 🟠 Alto |
| 3 | **NPT mecânico = 2 eventos, mas só 1 está descrito** | O gráfico contabiliza 2 eventos de NPT Mecânico. Destaques e Nota NPT descrevem apenas 1 (substituição do motor às 21:45). O segundo evento não aparece em lugar nenhum do relatório. | 🟡 Médio |
| 4 | **Produção total do campo não é calculada** | Somando a coluna: **2.976 bbl/d**. O relatório mostra 7 valores soltos e nenhum agregado, sendo esse o número mais direto para a gestão. | 🟡 Médio |
| 5 | **Duas convenções para "sem produção" na mesma coluna** | SPT-53 usa "–" (texto) enquanto SPT-82 e SPT-131 usam "0". "Sem medição" e "produzindo zero" são coisas diferentes; o relatório não distingue e qualquer soma trata "–" como inválido. | 🟡 Médio |
| 6 | **Campo "Meta" é coletado e descartado** | As 6 categorias de poços entregues têm Meta = 0 e nenhuma meta aparece no relatório. Além do trabalho desperdiçado, qualquer cálculo de "% da meta" dividiria por zero. | 🟡 Médio |
| 7 | **Criticidade é 100% manual, sem regra de apoio** | SPT-131 está marcada "ATENÇÃO" com situação "EXCESSO DE DIAS" tendo 4,06 dias, enquanto SPT-82, com 9,83 dias, também não é a mais crítica por regra alguma. Não há erro objetivo aqui — mas não há nada no app que ajude a detectar uma classificação esquecida ou inconsistente. | 🟡 Médio |

---

## 5. O que foi verificado e está CORRETO ✅

Registrado com o mesmo rigor dos erros — estes foram conferidos, não presumidos:

| Item | Verificação |
|---|---|
| Soma das barras de poços entregues | 4+5+4+7+7+9 = **36** ✅ confere com os campos do editor |
| "TOTAL: 36 POÇOS" | ✅ confere com a soma das barras |
| Versão anterior (25/07): 10+3+5+4+7+7 | = **36** ✅ confere |
| Total de eventos NPT | 2+1 = **3** ✅ confere com o exibido |
| Percentuais de NPT vs quantidades | 2/3 = 66,7% → "67%" ✅; 1/3 = 33,3% → "33%" ✅ (valores corretos, ainda que digitados) |
| Donut "POÇOS EM ANDAMENTO" | 4/2/1 ✅ confere com a coluna OPERAÇÃO |
| Percentuais 57/29/14 desse donut | 4/7, 2/7, 1/7 ✅ corretos e somam 100% |
| Ordenação do TOP 3 (25/07) | SPT-92 > SPT-82 > SPT-154 ✅ correta |
| Valores do TOP 3 (25/07) | 9,97 / 9,84 / 5,84 ✅ conferem com a tabela |
| Contagem de criticidade | 3 críticas / 2 atenção / 2 normais ✅ confere com a tabela |
| Próxima atualização | 07/08 DIURNO = data do relatório + 1 dia ✅ coerente |
| Título do gráfico de entregues | "ATÉ 06/08/2026" ✅ acompanha a data do relatório |

---

## 6. Não validado

| Item | Motivo |
|---|---|
| Comportamento interno do app (persistência, validação de entrada, exportação PNG, tratamento de erro) | **NÃO VALIDADO — EVIDÊNCIA INSUFICIENTE.** O código-fonte não foi fornecido. Observei apenas que a tela do editor exibiu um overlay `[plugin:runtime-error-plugin] (unknown runtime error)` no PDF enviado, o que indica que houve um erro de execução em algum momento — mas sem o código não é possível dizer qual, nem se afeta os números. |

---

## 7. Matriz de confiabilidade (ponderada)

| Categoria | Peso | Nota | Justificativa |
|---|---|---|---|
| Reprodutibilidade do documento | 20% | 15 | Métrica principal muda sozinha; erro de até +162% |
| Correção dos agregados e percentuais | 18% | 60 | Somas e totais corretos; percentuais com defeito de apresentação |
| Coerência interna entre visualizações | 16% | 30 | Dois gráficos contraditórios sobre o mesmo dado |
| Integridade da entrada de dados | 12% | 35 | % digitado à mão, produção em texto livre, meta descartada |
| Rastreabilidade (dado → gráfico) | 12% | 40 | Não é possível saber de qual coluna sai o gráfico de tipos |
| Completude da informação | 10% | 55 | Falta produção total e carimbo de fechamento |
| Apresentação e legibilidade | 12% | 85 | Layout excelente, hierarquia clara, ícones além da cor |

**ÍNDICE DE CONFIANÇA TÉCNICA = 46 / 100**

Faixas: 90–100 apto para uso operacional · 75–89 apto com dupla conferência ·
50–74 uso com restrições · **abaixo de 50 não apto sem correção**.

---

## 8. Parecer final

### 🔴 NÃO APTO COMO DOCUMENTO OFICIAL SEM CORREÇÃO

Justificativa: dois erros críticos confirmados, sendo um deles na métrica principal do
relatório (dias de operação), com erro medido de +20% a +162% e comportamento que se agrava a
cada dia que passa. A regra de bloqueio se aplica.

**Importante e sem rodeio:** o relatório de **25/07 está correto** nos dias de operação, porque
foi gerado e exportado no mesmo dia. O problema aparece quando o relatório é reaberto depois.
Isso significa que os relatórios já distribuídos **não estão necessariamente errados** — mas o
método não é confiável, porque depende de exportar sempre no mesmo dia e nunca reabrir.

---

## 9. Correções aplicadas na versão nova

| # | Correção | Achado que resolve |
|---|---|---|
| 1 | Data/hora de **fechamento explícita**, editável e impressa no rodapé do relatório. Todos os dias de operação derivam dela. | Crítico 1 |
| 2 | Dias de operação com **2 casas decimais** | Atenção 2 |
| 3 | **Fonte única de verdade**: toda rosca, barra, contagem e percentual é derivada da tabela de sondas. Impossível dois gráficos discordarem. | Crítico 2 |
| 4 | As duas roscas passam a mostrar **dimensões diferentes** (por OPERAÇÃO e por SITUAÇÃO), cada uma somando 7 | Crítico 2 |
| 5 | Percentuais **sempre calculados**, nunca digitados; quantidades iguais sempre exibem percentuais iguais; nota de rodapé sobre arredondamento | Incorreto 1, Atenção 1 |
| 6 | Campo de produção **numérico** com caixa "sem medição" separada; **produção total do campo** exibida no cabeçalho | Atenção 4 e 5 |
| 7 | Meta passa a ser exibida no gráfico (barra de meta + rótulo de atingimento), com proteção contra divisão por zero | Atenção 6 |
| 8 | **Painel de validação** no editor: aponta NPT sem descrição, sonda acima do limite de dias sem criticidade alta, produção não informada, percentuais que não fecham 100% | Atenção 3 e 7 |
| 9 | Carimbo de auditoria no rodapé: data/hora de fechamento + momento da geração, separados | Crítico 1 |

---

## 10. Testes de regressão a manter

Rodar `node verificacao_nucleo.js` na pasta do app após qualquer alteração. A suíte confere:

1. Dias de operação de cada sonda contra o cálculo independente no fechamento declarado.
2. Que mudar o relógio do sistema **não** altera nenhum número do relatório.
3. Que a soma das barras de poços entregues é igual ao total exibido.
4. Que a soma das quantidades de NPT é igual ao total de eventos exibido.
5. Que cada rosca soma exatamente o número de sondas em operação.
6. Que quantidades iguais produzem percentuais iguais.
7. Que a produção total ignora corretamente as sondas sem medição.
8. Que o TOP 3 está ordenado por dias de operação decrescente.

---

*Auditoria baseada exclusivamente nos arquivos fornecidos. Todos os recálculos são
reexecutáveis em `verificacao_independente.js`. Nenhum achado foi inferido sem evidência, e os
itens sem evidência suficiente estão marcados como tal.*

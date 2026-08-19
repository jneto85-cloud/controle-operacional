# Relatório Diário de Operações — versão corrigida

App de arquivo único para o relatório diário de controle sonda/poço. Editor + relatório +
exportação, funcionando offline, sem depender de servidor.

## Como publicar no GitHub Pages

1. Crie um repositório novo (ou use um existente).
2. Envie **todos os arquivos desta pasta** para a raiz do repositório.
3. Vá em **Settings → Pages**, em "Source" escolha **Deploy from a branch**, selecione a
   branch `main` e a pasta `/ (root)`, e salve.
4. Aguarde 1–2 minutos. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Como o app se chama `index.html`, ele abre direto na raiz do site — não precisa de redirecionamento.

## Como usar no celular (instalar como aplicativo)

1. Abra o endereço no **Safari** (iPhone) ou **Chrome** (Android).
2. Espere uns segundos com internet, para o modo offline se instalar.
3. iPhone: botão **Compartilhar** → **Adicionar à Tela de Início**.
   Android: menu **⋮** → **Instalar aplicativo**.
4. A partir daí ele abre como app e **funciona sem internet**.

## O que mudou em relação ao app anterior

Todas as mudanças abaixo saíram de achados documentados em `AUDITORIA.md`.

### 0. Dados carregados: 18/08/2026, 8 sondas

O app já vem com os dados do informe de 18/08/2026: sonda, poço, equipe (fiscal, engenheiro,
coordenador, encarregado), início/fim de DTM e início da intervenção das 8 sondas — SPT-76,
SPT-131, SPT-28, SPT-61, SPT-154, SPT-92, SPT-53 e SPT-82.

**Produção, run life, criticidade, situação e próxima ação ficaram em branco de propósito.**
Como os poços mudaram todos em relação ao relatório anterior, reaproveitar aqueles valores
colocaria o número de um poço em cima de outro. Esses campos aparecem como *a preencher* no
relatório e a validação do editor lista cada um que falta.

**Dias de intervenção contam a partir do início da intervenção.** A SPT-61 ainda está em DTM
(começou 17/08 08:00, sem fim de DTM nem início de intervenção informados), então ela aparece
marcada como **EM DTM** em vez de receber um número inventado, e fica fora do TOP 3. Assim que
você preencher o início da intervenção dela, ela entra no cálculo automaticamente.

Dias no fechamento de 18/08/2026 20:00 (editável): SPT-154 15,96 · SPT-92 9,29 · SPT-82 7,42 ·
SPT-53 4,11 · SPT-76 1,92 · SPT-131 0,27 · SPT-28 0,17 · SPT-61 em DTM.

O relatório também passou a mostrar a **duração de cada DTM** no quadro de equipe (SPT-76 30h,
SPT-131 28h, SPT-154 18h30, SPT-92 15h, SPT-28 7h15, SPT-53 6h30, SPT-82 6h; SPT-61 com 36h e
ainda em curso, marcado com asterisco).

### 1. Dias de operação não dependem mais do relógio do aparelho

Era o erro mais grave. O app anterior calculava os dias de operação a partir da hora atual do
celular, e não da data do relatório. Resultado: o relatório de **06/08** exibia dias calculados
em **08/08** — a SPT-28 aparecia com 3 dias quando o correto eram 1,15 (erro de +162%), e os
números mudavam sozinhos toda vez que a tela era reaberta.

Agora existe o campo **Hora de fechamento** ao lado da data. Todos os dias de operação são
calculados em relação a esse instante, que fica impresso no rodapé do relatório. O mesmo
relatório aberto hoje, amanhã ou daqui a um ano mostra exatamente os mesmos números.

O cálculo também é imune ao fuso horário do aparelho (testado em quatro fusos diferentes).

### 2. Nenhum gráfico pode contradizer a tabela

O app anterior tinha duas roscas na mesma página classificando as mesmas 7 sondas de formas
incompatíveis ("POÇOS EM ANDAMENTO" dizia 4/2/1 e "TIPOS DE OPERAÇÃO" dizia 3/3/1). Agora todo
gráfico é derivado da tabela de sondas, e o app verifica sozinho que cada agrupamento soma
exatamente o número de sondas em operação.

As duas roscas passaram a mostrar coisas genuinamente diferentes: uma por **operação** e outra
por **situação atual** — esta última em barras, porque rosca com muitas fatias iguais não se lê.

### 3. Percentuais são calculados, nunca digitados

O percentual de NPT era um campo de texto livre. Se alguém mudasse a quantidade sem mexer no
percentual, o gráfico passaria a mentir em silêncio. Agora o campo é somente leitura e sempre
acompanha a quantidade.

Também foi corrigido o caso em que duas categorias com a **mesma quantidade** apareciam com
percentuais **diferentes** (2 sondas = 29% e 2 sondas = 28%). Quantidades iguais sempre geram
percentuais iguais. Quando o arredondamento faz a soma não fechar em 100%, o relatório mostra
uma nota de rodapé em vez de forçar um número errado.

### 4. Produção do campo

O total de produção não existia em lugar nenhum — só valores soltos. Agora aparece no
cabeçalho, somado automaticamente. Sondas sem medição têm uma caixa própria ("sem medição") e
ficam **fora** da soma, em vez de virarem zero. Como a produção dos novos poços ainda não foi
informada, o KPI está em 0 com o aviso "8 s/ medição" até você preencher.

### 5. Meta de poços entregues

O campo existia no editor mas era descartado. Agora, quando preenchido, aparece como marca no
gráfico e como percentual de atingimento — com proteção contra divisão por zero.

### 6. Validação automática no editor

Antes de exportar, o app aponta sozinho:

- sondas cuja data de início da intervenção é posterior ao fechamento (dias negativos);
- sondas ainda em DTM, sem início de intervenção;
- operação e situação não informadas;
- sondas acima do limite de dias sem estarem marcadas como críticas (limite configurável);
- produção em branco sem a caixa "sem medição" marcada;
- eventos de NPT contabilizados que não aparecem descritos nos destaques;
- metas preenchidas só em parte das categorias.

E mostra as autoverificações que passaram, para você ver que os totais fecham.

### 7. Backup

Botão **Backup** salva um arquivo `.json` com tudo, e o botão **Importar backup** restaura.
Serve para arquivar o relatório do dia de forma que ele possa ser reaberto exatamente igual.

## Exportar

- **Exportar PNG** — imagem em alta resolução (2000 px de largura), pronta para WhatsApp.
- **Salvar PDF** — abre a impressão do navegador; escolha "Salvar em PDF".

Se o PNG falhar em algum navegador antigo, o app avisa e indica o caminho do PDF.

## Verificação

O núcleo de cálculo tem suíte de testes automatizada. Dentro desta pasta:

```
node verificacao_nucleo.js     # 47 testes do cálculo (dias, DTM, percentuais, somas, casos-limite)
node verificar_espelho.js      # confirma que a suíte testa o código que roda no app de verdade
```

O segundo script existe por um motivo específico: o núcleo de cálculo está duplicado (o app
precisa dele embutido para funcionar como arquivo único offline). Sem essa checagem, alguém
poderia alterar o app e não a suíte, e os testes continuariam passando testando código morto.

Estado atual: **47/47 no núcleo**, **32/32 em navegador real** (Chromium), **10/10 funções
idênticas** entre app e suíte.

## O que ainda precisa ser testado por você

O teste de instalação e uso offline no **iPhone real** (Adicionar à Tela de Início → modo avião
→ reabrir). Isso não pode ser verificado fora de um aparelho de verdade.

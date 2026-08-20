# Controle Operacional — revisado

App de arquivo único para acompanhamento de intervenções em poços: painel executivo, edição
das sondas e planejamento mensal. Funciona offline, sem servidor.

Este é o **seu** app (`Controle_Operacional_Completo_CORRIGIDO_1.html`) com os defeitos
encontrados na revisão corrigidos. Nada foi reescrito do zero: visual, busca, filtros,
exportação para Excel, envio por WhatsApp, imagem HD e planejamento continuam iguais.

## Como publicar no GitHub Pages

1. Envie **todos os arquivos desta pasta** para a raiz do repositório.
2. **Settings → Pages**, em "Source" escolha **Deploy from a branch**, branch `main`,
   pasta `/ (root)`, e salve.
3. Em 1–2 minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

O app se chama `index.html`, então abre direto na raiz.

## Como instalar no celular

Abra o endereço no Safari (iPhone) ou Chrome (Android), espere alguns segundos com internet
para o modo offline se instalar, e use **Compartilhar → Adicionar à Tela de Início** (iPhone)
ou **⋮ → Instalar aplicativo** (Android).

---

## Dados carregados: planilha de 19/08/2026

O app já abre com os dados da sua planilha, **fechado em 19/08/2026 18:55** — que é o instante
que reproduz exatamente os dias que a planilha mostra:

| Sonda | Poço | Dias | Criticidade | Motivo |
|---|---|---|---|---|
| SPT-28 | CP-648-SE | 1,12 | Normal | NÃO |
| SPT-53 | CP-705A-SE | 5,07 | Atenção | PESCARIA |
| SPT-76 | BRG-0004-SE | 2,87 | Normal | NÃO |
| SPT-82 | CP-2140D-SE | 8,37 | Atenção | EXCESSO DE DIAS |
| SPT-92 | RO-80-SE | 10,18 | Crítica | FURO REVESTIMENTO |
| SPT-131 | 7-AN-25 | 1,23 | Normal | NÃO |
| SPT-154 | 7-CP-1166-SE | 16,91 | Normal | NÃO |

Engenheiro, fiscal, encarregado, empresa e revestimento entraram num quadro novo
(**Equipe e empresa por sonda**), porque o app não tinha esses campos e a informação seria
descartada. O texto de OPERAÇÃO também virou campo próprio.

### Três coisas que você precisa saber

**1. A SPT-61 não entrou nos indicadores.** Na planilha ela está sem poço (e sem método e sem
revestimento), e o app exige sonda + poço para contar um registro. Antes isso acontecia em
silêncio — o relatório mostrava 7 sondas e ninguém sabia da oitava. Agora o **próprio
relatório** traz o aviso: "1 sonda(s) fora deste relatório por dado incompleto: SPT-61
(Informe o poço)". Preencha o poço no editor e ela entra sozinha.

Vale conferir também que a SPT-61 está com a **mesma data e hora da SPT-53** (14/08/2026 17:15),
o que costuma ser sinal de cópia na planilha.

**2. Três valores da planilha estavam sendo descartados em silêncio.** O app trocava motivo
desconhecido por "NÃO" e método desconhecido por "Opex Água", sem avisar. Então
"FURO REVESTIMENTO", "EXCESSO DE DIAS", "PESCARIA ÁGUA" e "CONVERÇÃO BM → ÁGUA" sumiriam.
Ampliei as duas listas para aceitar esses valores. Se aparecer um valor novo na planilha que
não esteja na lista, ele ainda será trocado em silêncio — vale me avisar para eu incluir.

**3. Dois pontos ficaram com conteúdo antigo**, porque não vieram na sua imagem:
os **Destaques do dia** e o bloco **Pontos de atenção / Plano de ação** ainda têm o texto do
relatório anterior. Atualize na aba "Atualizar sondas". O **Planejamento** (33 planejados,
4 entregues) também é o anterior.

Uma observação sobre o gráfico de NPT: ele conta pelo campo de motivo — "NPT" vira NPT
Mecânico e "PESCARIA" vira NPT Operacional. Como agora "PESCARIA ÁGUA" é um motivo separado,
ele não entra nessa conta. Se quiser que entre, me avise.

## Listas de escolha: Empresa e Revestimento

Os dois campos deixaram de ser texto livre e viraram lista:

- **Empresa:** CONTERP · PERBRÁS · BRASERV
- **Revestimento:** 5 1/2" nas bitolas 14, 15,5, 17, 20 e 23 lb/pé · 7" nas bitolas 20, 23 e 26 lb/pé

Três decisões que tomei e vale você conferir:

**Toda lista tem a opção "— não informado —", e ela é a primeira.** Sem isso, os campos que
estão em branco na sua planilha (empresa da SPT-28, revestimento da SPT-61 e da SPT-76)
assumiriam CONTERP e 5 1/2" - 14 lb/pé sozinhos, inventando dado que ninguém informou. Eles
continuam em branco.

**Os valores antigos foram migrados** para a grafia da lista: "7 - 23 lb/pé" virou
`7" - 23 lb/pé`, "Braserv" virou BRASERV, e assim por diante.

**"5.1/3 - 15.5 lb/pé" virou `5 1/2" - 15,5 lb/pé`** (SPT-131 e SPT-154). Isso é uma
interpretação minha: 5 1/3" não é bitola de revestimento, e 5 1/2" - 15,5 lb/pé é o único item
compatível da sua lista. Se não for isso, me avise.

E um cuidado para o futuro: se um dia aparecer um valor que não está na lista (importando um
backup antigo, por exemplo), ele **não é descartado** — aparece selecionado com a marca
"(fora da lista)", para você ver e corrigir. Foi justamente o descarte silencioso que fazia o
app trocar motivo desconhecido por "NÃO".

## Módulo de pescaria

O bloco **só aparece quando o motivo da sonda contém PESCARIA** (cobre PESCARIA e PESCARIA
ÁGUA). As outras sondas não veem nada — hoje ele aparece na SPT-53 e na SPT-61.

**Manobra é registro, não contador.** Cada manobra é uma linha com data, ferramenta descida,
tipo de agarramento (interno/externo), resultado e o que subiu. A quantidade sai da contagem
das linhas. Era isso que o seu destaque *"09 manobras... recuperado o mandril do packer,
permanecendo no poço o rodal inferior"* estava tentando dizer em uma frase só.

**Dias de pescaria são separados dos dias de intervenção.** Há um campo "início da pescaria"
próprio, e ele usa o mesmo instante de fechamento do resto do relatório — no modo FECHADO o
número não muda sozinho.

**O app calcula sozinho** e mostra numa faixa de indicadores no topo do bloco:

- Dias de pescaria.
- Quantidade de manobras, contra o limite que você definir.
- Topo e base do peixe (a base sai de topo + extensão).
- **Folga** entre o peixe e a parede do revestimento, usando o ID do revestimento já
  selecionado. Os IDs vêm da tabela API 5CT e batem um a um com a lista: 5 1/2" 14 lb/pé tem
  5,012", 17 lb/pé tem 4,892", 23 lb/pé tem 4,670"; 7" 20 lb/pé tem 6,456", 26 lb/pé tem
  6,276". **É triagem, não substitui o catálogo da ferramenta de pescaria.**
- Se o peixe está acima, abaixo ou **sobre** os canhoneados.

**Avisa quando:** a folga fica abaixo de 0,25"; o diâmetro do peixe é maior que o ID do
revestimento (dado incoerente); o peixe está sobre o intervalo canhoneado; ou o número de
manobras atinge o limite.

Os campos numéricos aceitam **vírgula decimal** — são `text` com teclado numérico, não
`number`, porque o campo numérico do navegador recusa vírgula.

### Duas coisas que ficaram pendentes de você

**A lista de ferramentas é um palpite meu**: Overshot, Tarraxa (spear), Cesta coletora, Ímã de
pesca, Fresa, Gancho de pesca, Cortador, Packer retriever. Me passe as que vocês usam de fato,
com os nomes que vocês usam, que eu troco. Valor fora da lista não é descartado — aparece
marcado "(fora da lista)".

**O limite de manobras é por sonda e começa vazio.** Se vocês já têm um número de referência,
me diga que eu deixo como padrão.

## O que foi corrigido

### 1. O relatório agora funciona dos dois jeitos: ao vivo e fechado

Este era o problema sério. Os dias de operação e a data do cabeçalho vinham do relógio do
aparelho, e não havia como definir a data do relatório. Consequência: o mesmo arquivo aberto
em dias diferentes mostrava números diferentes. Medido abrindo o arquivo original com o
relógio adiantado 30 dias:

| | ao abrir | 30 dias depois |
|---|---|---|
| cabeçalho | 19/08/2026 | 18/09/2026 |
| SPT-82 | 34,71 d | 64,71 d |
| SPT-61 | 27,26 d | 57,26 d |

Não dava para emitir o relatório de ontem, nem reabrir o de semana passada.

Agora existe um controle **Fechamento** na barra de status, com dois modos:

- **AO VIVO** — é o painel de acompanhamento. Os dias contam até agora e crescem
  sozinhos, que é o comportamento certo para uma tela de monitoramento. O cabeçalho diz
  "Ao vivo, atualizado HH:MM".
- **FECHADO** (como o app vem, em 19/08 18:55) — clicando em **Fechar o dia**, o instante fica gravado e tudo passa a ser
  calculado em relação a ele. O cabeçalho diz "FECHADO às HH:MM". A partir daí o relatório
  é um documento: exportar hoje ou reabrir daqui a um ano mostra exatamente os mesmos
  números. Dá para corrigir o instante no próprio campo, e **Voltar ao vivo** desfaz.

O modo escolhido é salvo junto com os dados, então o fechamento sobrevive a fechar e reabrir
o app.

### 2. A faixa de indicadores não mistura mais dimensões

Antes: Crítica 3 (43%) · **Pescaria 2 (29%)** · Atenção 1 (14%) · Normal 3 (43%). Quatro
cartões lado a lado que se leem como um conjunto só — mas somam 129%, porque "Pescaria" é um
**motivo**, não um nível de criticidade.

Agora Crítica, Atenção e Normal aparecem juntos e somam 100%. "Em pescaria" vem depois, com
cor própria, e mostra **"de 7 sondas"** em vez de uma porcentagem que convidava a somar.

### 3. A mesma sonda não aparece mais com duas cores

"Sondas com excesso de dias" pintava todas as barras de vermelho, enquanto "Top 3 — maior
exposição" pintava pela criticidade. Resultado: a SPT-28, com o mesmo 19,03 d, saía vermelha
num painel e verde no outro. Os dois passaram a usar a mesma regra — cor pela criticidade da
sonda.

### 4. O gráfico de poços entregues voltou a ser legível

Os dois gráficos dividem a mesma escala de propósito, para plano e realizado serem
comparáveis a olho — isso está certo. O efeito colateral é que, com 4 entregues contra 33
planejados, as barras de entregues sumiam. Agora cada barra de entregue tem atrás a **barra
hachurada do plano** da mesma categoria, o que devolve a referência visual sem quebrar a
comparabilidade. Há uma legenda explicando a hachura.

### 5. Modo offline: o service worker que faltava

O app já registrava `./sw.js?v=3.10.0`, mas esse arquivo nunca existiu — o registro falhava
em silêncio e o modo offline nunca funcionou. O `sw.js` está incluído agora, junto com o
`manifest.webmanifest` (também ausente), que é o que faz o navegador oferecer "Instalar" e
abrir em tela cheia no celular.

### 6. Mensagem de validação mais precisa

"A data de início não pode estar no futuro" virou "não pode ser posterior ao fechamento do
relatório", que é o que a regra realmente verifica agora.

---

## O que foi conferido e **está correto** no app original

Registrado com o mesmo cuidado dos defeitos:

- Plano do mês: 14+3+3+13 = **33** e o rótulo diz 33.
- Poços entregues: 2+1+1 = **4** e o rótulo diz 4.
- Eficiência: 4/33 = 12,1% → **12%**.
- Criticidade 3/1/3 = 7, batendo com a coluna Criticidade da tabela.
- As duas roscas somam 7 (o total de sondas).
- NPT: 1+2 = 3 eventos, com 33% e 67% **calculados a partir da quantidade**, não digitados.
- SPT-131, sem data de início, mostra "—" em vez de inventar um número. Isso já estava certo.
- Validação por linha: exige sonda e poço, rejeita data inválida, rejeita produção e run life
  negativos.
- Zero erro de JavaScript em toda a navegação.

---

## Uma observação que não corrigi

"Sondas com excesso de dias" e "Top 3 — maior exposição" são, na prática, quase a mesma lista:
o Top 3 são os três primeiros da outra. Conceitualmente são diferentes (um usa o limite de 6
dias, o outro é sempre os três maiores), então unificar seria uma mudança de layout, não uma
correção. Deixei os dois, agora com cores coerentes. Se preferir, dá para trocar um deles por
algo que não se repete — produção por sonda, por exemplo.

---

## Verificação

```
node verificacao.js            # 61 testes do app
node verificacao_pescaria.js   # 21 testes do módulo de pescaria
```

Roda 61 testes em Chromium de verdade: carregamento sem erro, faixa de indicadores, cores
coerentes entre painéis, barras hachuradas, dias conferidos contra cálculo independente,
cada um dos 7 dias conferido contra cálculo independente, colunas conferidas contra a planilha,
aviso da sonda incompleta, quadro de equipe, congelamento com o relógio adiantado 30 dias,
volta ao vivo, recursos preservados e totais.

Estado atual: **61/61** no app e **21/21** na pescaria.

Os arquivos `corrigir.py`, `atualizar_dados.py` `picklists.py` e `pescaria.py` são os scripts que aplicaram as correções e a
carga de dados no original — fica no pacote como
registro do que foi mudado e por quê. Ele confere todos os trechos antes de gravar qualquer
coisa, e é idempotente (rodar de novo não duplica nada).

## O que ainda depende de você

O teste de instalação e uso offline no iPhone real (Adicionar à Tela de Início → modo avião →
reabrir). Isso não dá para verificar fora de um aparelho de verdade.

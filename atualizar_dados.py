# -*- coding: utf-8 -*-
"""
atualizar_dados.py — carrega no app os dados da planilha de 19/08/2026.

Mesma disciplina do corrigir.py: confere TODOS os trechos antes de gravar qualquer
coisa, e e idempotente.

Alem de trocar os dados, este script:
  - amplia METHODS e MOTIVES para aceitar os valores que a planilha realmente usa.
    Sem isso o app descartava em silencio: normalizeMotive() troca motivo desconhecido
    por "NAO" e normalizeMethod() troca metodo desconhecido por "Opex Agua". Ou seja,
    "FURO REVESTIMENTO", "EXCESSO DE DIAS" e "CONVERCAO BM -> AGUA" sumiriam sem aviso.
  - acrescenta os campos que a planilha tem e o app nao tinha: engenheiro, fiscal,
    encarregado, empresa, revestimento e o texto de OPERACAO.
  - deixa o relatorio ja FECHADO em 19/08/2026 18:55, que e o instante que reproduz
    exatamente os dias da planilha (1,12 / 5,07 / 2,87 / 8,37 / 10,18 / 1,23 / 16,91).
"""
import io, sys

ARQ = 'app.html'
s = io.open(ARQ, encoding='utf-8').read()
EDICOES = []

# ---------------------------------------------------------------- 1. METHODS
EDICOES.append(('metodos novos da planilha', 'Conversão BM → Água',
"""        {label:"Conversão Água → Óleo", color:"#4f46e5"},
        {label:"Arrasamento", color:"#eab308"}
      ];""",
"""        {label:"Conversão Água → Óleo", color:"#4f46e5"},
        // Acrescentados a partir da planilha operacional de 19/08/2026. Sem eles,
        // normalizeMethod() trocava o valor por "Opex Água" em silencio.
        {label:"Conversão BM → Água", color:"#16a34a"},
        {label:"Completação", color:"#1d4ed8"},
        {label:"Arrasamento", color:"#eab308"}
      ];"""))

# ---------------------------------------------------------------- 2. MOTIVES
EDICOES.append(('motivos novos da planilha', 'FURO REVESTIMENTO',
"""        "FALHA DE LOGÍSTICA",
        "FALHA NA EQUIPAGEM"
      ];""",
"""        "FALHA DE LOGÍSTICA",
        "FALHA NA EQUIPAGEM",
        // Acrescentados a partir da planilha operacional de 19/08/2026. Sem eles,
        // normalizeMotive() trocava o valor por "NÃO" em silencio.
        "PESCARIA ÁGUA",
        "EXCESSO DE DIAS",
        "FURO REVESTIMENTO"
      ];"""))

# ---------------------------------------------------------------- 3. novos campos na linha
EDICOES.append(('novos campos em normalizeRow', 'engenheiro:safeText',
"""          status:isKnownStatus(row.status) ? row.status : "andamento",
          categoriaPlano:isKnownPlanCategory(categoriaPlano) ? categoriaPlano : "",
          proximaAcao:safeText(row.proximaAcao,300)
        };""",
"""          status:isKnownStatus(row.status) ? row.status : "andamento",
          categoriaPlano:isKnownPlanCategory(categoriaPlano) ? categoriaPlano : "",
          proximaAcao:safeText(row.proximaAcao,300),
          // Campos que a planilha operacional ja tinha e o app descartava.
          engenheiro:safeText(row.engenheiro,80),
          fiscal:safeText(row.fiscal,80),
          encarregado:safeText(row.encarregado,80),
          empresa:safeText(row.empresa,60),
          revestimento:safeText(row.revestimento,60),
          operacaoTexto:safeText(row.operacaoTexto,600)
        };"""))

# ---------------------------------------------------------------- 4. dados
ANTIGO_ROWS_INICIO = '      function defaultRows(){\n        return ['
i = s.find(ANTIGO_ROWS_INICIO)
if i < 0 and 'CP-705A-SE' not in s:
    print('nao encontrei defaultRows'); sys.exit(1)
if i >= 0:
    j = s.find('\n        ];\n      }', i)
    ANTIGO_ROWS = s[i:j+len('\n        ];\n      }')]
else:
    ANTIGO_ROWS = None

NOVO_ROWS = '''      // Dados da planilha operacional de 19/08/2026 (fechamento 18:55).
      // Campos deixados em branco estao em branco na propria planilha — nao foram
      // preenchidos por suposicao.
      function defaultRows(){
        var r = function(o){
          return {
            id:makeId(), sonda:o.s, poco:o.p||"", tipo:o.m||"", datahora:o.d||"",
            crit:o.c, producao:o.prod||"", runlife:o.rl||"", motivo:o.mo, obs:o.ob||"",
            engenheiro:o.eng||"", fiscal:o.fis||"", encarregado:o.enc||"",
            empresa:o.emp||"", revestimento:o.rev||"", operacaoTexto:o.op||""
          };
        };
        return [
          r({s:"SPT-28", p:"CP-648-SE", m:"Arrasamento", d:"2026-08-18T16:00", c:"normal", mo:"NÃO",
             prod:"0", rl:"", rev:"7 - 26 lb/pé", eng:"Ricardo Freitas", fis:"João Dantas",
             enc:"Washington", emp:"", ob:"xxxxxxx"}),
          r({s:"SPT-53", p:"CP-705A-SE", m:"Conversão BM → Água", d:"2026-08-14T17:15", c:"media", mo:"PESCARIA",
             prod:"0", rl:"", rev:"7 - 23 lb/pé", eng:"Stanley Menezes", fis:"Francisco Teles",
             enc:"Marcelo Melo", emp:"Braserv", ob:"PESCARIA DO CANHÃO"}),
          r({s:"SPT-61", p:"", m:"", d:"2026-08-14T17:15", c:"alto", mo:"PESCARIA ÁGUA",
             prod:"0", rl:"", rev:"", eng:"Jubirai Galliza", fis:"Genivan César",
             enc:"Cícero Nobre", emp:"Conterp", op:"REALIZANDO MANUTENÇÃO",
             ob:"PESCARIA DA COMPOSIÇÃO IA"}),
          r({s:"SPT-76", p:"BRG-0004-SE", m:"Arrasamento", d:"2026-08-16T22:00", c:"normal", mo:"NÃO",
             prod:"0", rl:"", rev:"", eng:"Jubirai Galliza", fis:"Adi Souza",
             enc:"Michel", emp:"Conterp"}),
          r({s:"SPT-82", p:"CP-2140D-SE", m:"Completação", d:"2026-08-11T10:00", c:"media", mo:"EXCESSO DE DIAS",
             prod:"0", rl:"", rev:"7 - 23 lb/pé", eng:"Mônica Arruda", fis:"Genivan César",
             enc:"Filipe", emp:"Perbrás", ob:"EQUIPANDO COM 03 TH DA HILONG"}),
          r({s:"SPT-92", p:"RO-80-SE", m:"Conversão BM → Água", d:"2026-08-09T14:30", c:"alto", mo:"FURO REVESTIMENTO",
             prod:"0", rl:"530", rev:"7 - 23 lb/pé", eng:"Stanley Menezes", fis:"Antônio Carlos",
             enc:"Márcio Alves", emp:"Perbrás",
             ob:"FURO NO REVESTIMENTO TOPO 47,0 M BASE 90,0 M. TESTE NEGATIVO APÓS O CORTE DE 100 PSI EM 10 MINUTOS"}),
          r({s:"SPT-131", p:"7-AN-25", m:"Arrasamento", d:"2026-08-18T13:30", c:"normal", mo:"NÃO",
             prod:"0", rl:"0", rev:"5.1/3 - 15.5 lb/pé", eng:"Ricardo Freitas", fis:"Fabiano",
             enc:"Arnaldo", emp:"Braserv"}),
          r({s:"SPT-154", p:"7-CP-1166-SE", m:"Reoping Água", d:"2026-08-02T21:00", c:"normal", mo:"NÃO",
             prod:"1774", rl:"708", rev:"5.1/3 - 15.5 lb/pé", eng:"Mônica Arruda", fis:"Tales",
             enc:"Anselmo", emp:"Braserv"})
        ];
      }'''

if ANTIGO_ROWS:
    EDICOES.append(('dados das 8 sondas (19/08/2026)', 'CP-705A-SE', ANTIGO_ROWS, NOVO_ROWS))

# ---------------------------------------------------------------- 5. fechamento padrao
EDICOES.append(('fechamento padrao 19/08 18:55', 'fechamento:"2026-08-19T18:55"',
'settings:{month:currentMonth(),foco:"SEGURANÇA • PRODUTIVIDADE • ENTREGA",proximaAtualizacao:"",fechamento:""},',
'settings:{month:currentMonth(),foco:"SEGURANÇA • PRODUTIVIDADE • ENTREGA",proximaAtualizacao:"",fechamento:"2026-08-19T18:55"},'))

# ---------------------------------------------------------------- 6. revisao dos dados
EDICOES.append(('revisao dos dados', '2026-08-19T18:55";',
'var OFFICIAL_DATA_REVISION = "2026-08-05T10:32";',
'var OFFICIAL_DATA_REVISION = "2026-08-19T18:55";'))

# ---------------------------------------------------------------- 7. campos no editor
EDICOES.append(('campos novos no editor', 'data-field="engenheiro"',
"""              '<div class="field wide-mobile"><label for="categoriaPlano-'+index+'">Categoria do plano</label><select id="categoriaPlano-'+index+'" data-index="'+index+'" data-field="categoriaPlano">'+planCategoryOptions+'</select></div>'+
            '</div>'+""",
"""              '<div class="field wide-mobile"><label for="categoriaPlano-'+index+'">Categoria do plano</label><select id="categoriaPlano-'+index+'" data-index="'+index+'" data-field="categoriaPlano">'+planCategoryOptions+'</select></div>'+
              fieldHtml(index,"revestimento","Revestimento",r.revestimento,"text","7 - 23 lb/pé")+
              fieldHtml(index,"empresa","Empresa",r.empresa,"text","Braserv / Conterp / Perbrás")+
              fieldHtml(index,"engenheiro","Engenheiro",r.engenheiro,"text","Nome do engenheiro")+
              fieldHtml(index,"fiscal","Fiscal",r.fiscal,"text","Nome do fiscal")+
              fieldHtml(index,"encarregado","Encarregado",r.encarregado,"text","Nome do encarregado")+
            '</div>'+
            '<div class="field edit-notes"><label for="operacaoTexto-'+index+'">Operação</label><textarea id="operacaoTexto-'+index+'" data-index="'+index+'" data-field="operacaoTexto" maxlength="600" placeholder="Ex.: Realizando manutenção">'+escapeHtml(r.operacaoTexto)+'</textarea></div>'+"""))

# ---------------------------------------------------------------- 8. quadro de equipe no relatorio
EDICOES.append(('quadro de equipe no relatorio', 'Equipe e empresa por sonda',
"""'<div class="report-grid-2 report-actions">'+""",
"""'<article class="report-card"><div class="report-card-title">Equipe e empresa por sonda</div><div class="report-card-body" style="padding:0"><div class="table-wrap"><table class="report-table"><thead><tr><th>Sonda</th><th>Poço</th><th>Empresa</th><th>Engenheiro</th><th>Fiscal</th><th>Encarregado</th><th>Revestimento</th><th>Operação</th></tr></thead><tbody>'+
              rows.map(function(r){
                var vazio='<span style="color:#94a3b8;font-style:italic">—</span>';
                var c=function(v){return v&&String(v).trim()?escapeHtml(v):vazio;};
                return '<tr><td><strong>'+escapeHtml(r.sonda)+'</strong></td><td>'+c(r.poco)+'</td><td>'+c(r.empresa)+'</td><td>'+c(r.engenheiro)+'</td><td>'+c(r.fiscal)+'</td><td>'+c(r.encarregado)+'</td><td>'+c(r.revestimento)+'</td><td>'+c(r.operacaoTexto)+'</td></tr>';
              }).join("")+
            '</tbody></table></div></div></article>'+
            '<div class="report-grid-2 report-actions">'+"""))

# ---------------------------------------------------------------- conferencia
pend, err = [], []
for rot, marc, velho, novo in EDICOES:
    if marc in s:
        print('JA APLICADO | ' + rot); continue
    n = s.count(velho)
    if n != 1:
        err.append('%s: esperava 1 ocorrencia, achei %d' % (rot, n))
    else:
        pend.append((rot, velho, novo))

if err:
    print('\nNADA FOI GRAVADO. Padroes que nao bateram:')
    for e in err: print('  - ' + e)
    sys.exit(1)

for rot, velho, novo in pend:
    s = s.replace(velho, novo); print('APLICADO    | ' + rot)

io.open(ARQ, 'w', encoding='utf-8').write(s)
print('\n%d edicao(oes) gravada(s).' % len(pend))

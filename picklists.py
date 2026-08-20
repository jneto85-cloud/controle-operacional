# -*- coding: utf-8 -*-
"""
picklists.py — transforma EMPRESA e REVESTIMENTO em listas de escolha.

Cuidados embutidos (aprendidos nas etapas anteriores deste app):

  1. Toda lista tem opcao VAZIA. Sem ela, um campo em branco assumiria o primeiro
     item da lista em silencio — a SPT-28 esta sem empresa e a SPT-61/SPT-76 sem
     revestimento; elas passariam a "CONTERP" e '5 1/2" - 14 lb/pe' sem ninguem pedir.

  2. Valor gravado que NAO esteja na lista nao e descartado: entra como opcao extra
     marcada "(fora da lista)". Foi exatamente o contrario disso que fazia o app
     trocar motivo desconhecido por "NAO" e metodo desconhecido por "Opex Agua".

  3. Os valores que ja existiam sao migrados para a grafia nova por um mapa explicito.

Idempotente e tudo-ou-nada, como os scripts anteriores.
"""
import io, sys

ARQ = 'app.html'
s = io.open(ARQ, encoding='utf-8').read()
ED = []

# ------------------------------------------------------------------ constantes
ED.append(('listas de empresa e revestimento', 'var EMPRESAS =',
'''      var CRITICALITIES = [''',
'''      var EMPRESAS = ["CONTERP","PERBRÁS","BRASERV"];

      var REVESTIMENTOS = [
        '5 1/2" - 14 lb/pé',
        '5 1/2" - 15,5 lb/pé',
        '5 1/2" - 17 lb/pé',
        '5 1/2" - 20 lb/pé',
        '5 1/2" - 23 lb/pé',
        '7" - 20 lb/pé',
        '7" - 23 lb/pé',
        '7" - 26 lb/pé'
      ];

      // Grafias antigas -> grafia da lista. A chave e o texto sem acento e em
      // maiusculas (ver semAcento). "5.1/3" vinha assim da planilha; a unica bitola
      // compativel na lista oficial e 5 1/2" - 15,5 lb/pe.
      var LEGACY_REVESTIMENTO = {
        '7 - 20 LB/PE':'7" - 20 lb/pé',
        '7 - 23 LB/PE':'7" - 23 lb/pé',
        '7 - 26 LB/PE':'7" - 26 lb/pé',
        '5.1/3 - 15.5 LB/PE':'5 1/2" - 15,5 lb/pé',
        '5 1/3 - 15.5 LB/PE':'5 1/2" - 15,5 lb/pé',
        '5.1/2 - 15.5 LB/PE':'5 1/2" - 15,5 lb/pé',
        '5 1/2 - 15.5 LB/PE':'5 1/2" - 15,5 lb/pé'
      };

      var CRITICALITIES = ['''))

# ------------------------------------------------------------------ normalizadores
ED.append(('normalizadores de empresa e revestimento', 'function normalizeEmpresa(',
'''      function isKnownCriticality(value){''',
'''      // Compara ignorando acento e caixa, para "Perbras", "PERBRÁS" e "perbrás"
      // caírem todos no mesmo item da lista.
      function semAcento(value){
        return String(value||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLocaleUpperCase("pt-BR").trim();
      }
      function normalizeEmpresa(value){
        var v = safeText(value,60).trim();
        if(!v) return "";
        var achado = EMPRESAS.find(function(e){return semAcento(e)===semAcento(v);});
        return achado || v;   // fora da lista: preserva, nao descarta
      }
      function normalizeRevestimento(value){
        var v = safeText(value,60).trim();
        if(!v) return "";
        var achado = REVESTIMENTOS.find(function(r){return semAcento(r)===semAcento(v);});
        if(achado) return achado;
        return LEGACY_REVESTIMENTO[semAcento(v)] || v;   // fora da lista: preserva
      }

      // Monta um <select> de lista fixa. SEMPRE inclui a opcao vazia — sem ela um
      // campo em branco assumiria o primeiro item da lista em silencio. Valor gravado
      // que nao esteja na lista entra como opcao extra marcada, em vez de sumir.
      function picklistHtml(lista, valor, rotuloVazio){
        var v = valor==null ? "" : String(valor);
        var naLista = false;
        var html = '<option value=""'+(v?"":" selected")+'>'+escapeHtml(rotuloVazio||"— não informado —")+'</option>';
        html += lista.map(function(item){
          var sel = item===v;
          if(sel) naLista = true;
          return '<option value="'+escapeHtml(item)+'"'+(sel?" selected":"")+'>'+escapeHtml(item)+'</option>';
        }).join("");
        if(v && !naLista){
          html += '<option value="'+escapeHtml(v)+'" selected>'+escapeHtml(v)+' (fora da lista)</option>';
        }
        return html;
      }

      function isKnownCriticality(value){'''))

# ------------------------------------------------------------------ normalizeRow
ED.append(('normalizeRow usa os novos normalizadores', 'empresa:normalizeEmpresa',
'''          empresa:safeText(row.empresa,60),
          revestimento:safeText(row.revestimento,60),''',
'''          empresa:normalizeEmpresa(row.empresa),
          revestimento:normalizeRevestimento(row.revestimento),'''))

# ------------------------------------------------------------------ editor
ED.append(('campos viram lista de escolha', 'data-field="revestimento">',
'''              fieldHtml(index,"revestimento","Revestimento",r.revestimento,"text","7 - 23 lb/pé")+
              fieldHtml(index,"empresa","Empresa",r.empresa,"text","Braserv / Conterp / Perbrás")+''',
'''              '<div class="field wide-mobile"><label for="revestimento-'+index+'">Revestimento</label><select id="revestimento-'+index+'" data-index="'+index+'" data-field="revestimento">'+picklistHtml(REVESTIMENTOS,r.revestimento)+'</select></div>'+
              '<div class="field"><label for="empresa-'+index+'">Empresa</label><select id="empresa-'+index+'" data-index="'+index+'" data-field="empresa">'+picklistHtml(EMPRESAS,r.empresa)+'</select></div>'+'''))

# ------------------------------------------------------------------ dados migrados
ED.append(('dados migrados para a grafia da lista', 'rev:\'7" - 26 lb/pé\'',
'''             prod:"0", rl:"", rev:"7 - 26 lb/pé", eng:"Ricardo Freitas", fis:"João Dantas",''',
'''             prod:"0", rl:"", rev:'7" - 26 lb/pé', eng:"Ricardo Freitas", fis:"João Dantas",'''))

for velho, novo, rot in [
  ('''prod:"0", rl:"", rev:"7 - 23 lb/pé", eng:"Stanley Menezes", fis:"Francisco Teles",''',
   '''prod:"0", rl:"", rev:'7" - 23 lb/pé', eng:"Stanley Menezes", fis:"Francisco Teles",''', 'SPT-53'),
  ('''prod:"0", rl:"", rev:"7 - 23 lb/pé", eng:"Mônica Arruda", fis:"Genivan César",''',
   '''prod:"0", rl:"", rev:'7" - 23 lb/pé', eng:"Mônica Arruda", fis:"Genivan César",''', 'SPT-82'),
  ('''prod:"0", rl:"530", rev:"7 - 23 lb/pé", eng:"Stanley Menezes", fis:"Antônio Carlos",''',
   '''prod:"0", rl:"530", rev:'7" - 23 lb/pé', eng:"Stanley Menezes", fis:"Antônio Carlos",''', 'SPT-92'),
  ('''prod:"0", rl:"0", rev:"5.1/3 - 15.5 lb/pé", eng:"Ricardo Freitas", fis:"Fabiano",''',
   '''prod:"0", rl:"0", rev:'5 1/2" - 15,5 lb/pé', eng:"Ricardo Freitas", fis:"Fabiano",''', 'SPT-131'),
  ('''prod:"1774", rl:"708", rev:"5.1/3 - 15.5 lb/pé", eng:"Mônica Arruda", fis:"Tales",''',
   '''prod:"1774", rl:"708", rev:'5 1/2" - 15,5 lb/pé', eng:"Mônica Arruda", fis:"Tales",''', 'SPT-154'),
]:
    ED.append(('revestimento migrado — '+rot, novo, velho, novo))

for velho, novo, rot in [
  ('emp:"Braserv", ob:"PESCARIA DO CANHÃO"', 'emp:"BRASERV", ob:"PESCARIA DO CANHÃO"', 'SPT-53'),
  ('enc:"Cícero Nobre", emp:"Conterp"', 'enc:"Cícero Nobre", emp:"CONTERP"', 'SPT-61'),
  ('enc:"Michel", emp:"Conterp"', 'enc:"Michel", emp:"CONTERP"', 'SPT-76'),
  ('emp:"Perbrás", ob:"EQUIPANDO', 'emp:"PERBRÁS", ob:"EQUIPANDO', 'SPT-82'),
  ('enc:"Márcio Alves", emp:"Perbrás"', 'enc:"Márcio Alves", emp:"PERBRÁS"', 'SPT-92'),
  ('enc:"Arnaldo", emp:"Braserv"', 'enc:"Arnaldo", emp:"BRASERV"', 'SPT-131'),
  ('enc:"Anselmo", emp:"Braserv"', 'enc:"Anselmo", emp:"BRASERV"', 'SPT-154'),
]:
    ED.append(('empresa migrada — '+rot, novo, velho, novo))

# ------------------------------------------------------------------ conferencia
pend, err = [], []
for rot, marc, velho, novo in ED:
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

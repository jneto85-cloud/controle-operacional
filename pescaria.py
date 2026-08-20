# -*- coding: utf-8 -*-
"""
pescaria.py — acrescenta o modulo de pescaria ao Controle Operacional.

Decisoes de projeto (as que expliquei antes de construir):

  - Os campos ficam PLANOS na linha (pescInicio, pescTopoPeixe, ...), com prefixo "pesc".
    Assim o handler de edicao que ja existe (data-index + data-field) funciona sem
    nenhuma alteracao. So a lista de manobras tem handler proprio.

  - O bloco so aparece quando o motivo da sonda contem PESCARIA. As outras sondas nao
    veem nada.

  - Manobra e REGISTRO, nao contador. Cada manobra guarda data, ferramenta, tipo de
    agarramento, resultado e o que subiu. A quantidade e a contagem das linhas.

  - "Dias de pescaria" conta a partir do inicio da PESCARIA, nao do inicio da
    intervencao, e usa o mesmo instante de fechamento do resto do relatorio.

  - A folga usa o ID do revestimento ja selecionado. Os IDs vem da tabela API 5CT e
    batem um a um com a lista de revestimento. E TRIAGEM: nao substitui o catalogo da
    ferramenta de pescaria.
"""
import io, sys

ARQ = 'app.html'
s = io.open(ARQ, encoding='utf-8').read()
ED = []

# ------------------------------------------------------------------ 1. constantes
ED.append(('constantes de pescaria', 'var FERRAMENTAS_PESCARIA',
"      var CRITICALITIES = [",
"""      var FERRAMENTAS_PESCARIA = [
        "Overshot",
        "Tarraxa (spear)",
        "Cesta coletora",
        "Ímã de pesca",
        "Fresa",
        "Gancho de pesca",
        "Cortador",
        "Packer retriever"
      ];
      var AGARRAMENTOS = ["Externo","Interno"];
      var RESULTADOS_MANOBRA = [
        "Recuperado total",
        "Recuperado parcial",
        "Sem recuperação",
        "Ferramenta não engatou",
        "Manobra em andamento"
      ];

      // Diametro interno (pol) de cada item da lista de revestimento, pela tabela API 5CT.
      // Serve para calcular a folga em relacao ao diametro do peixe. Os oito itens batem
      // um a um com REVESTIMENTOS.
      var ID_REVESTIMENTO = {
        '5 1/2" - 14 lb/pé':5.012,
        '5 1/2" - 15,5 lb/pé':4.950,
        '5 1/2" - 17 lb/pé':4.892,
        '5 1/2" - 20 lb/pé':4.778,
        '5 1/2" - 23 lb/pé':4.670,
        '7" - 20 lb/pé':6.456,
        '7" - 23 lb/pé':6.366,
        '7" - 26 lb/pé':6.276
      };

      var CRITICALITIES = ["""))

# ------------------------------------------------------------------ 2. nucleo
ED.append(('nucleo de calculo da pescaria', 'function calcPescaria(',
"      function isKnownCriticality(value){",
"""      // A sonda esta em pescaria quando o motivo contem "PESCARIA" (cobre PESCARIA e
      // PESCARIA ÁGUA sem precisar listar cada variante).
      function ehPescaria(row){
        return /PESCARIA/.test(semAcento(row && row.motivo));
      }

      function numeroOuNulo(valor){
        var v = toNumber(valor);
        return Number.isFinite(v) ? v : null;
      }

      function normalizeManobra(m){
        m = m && typeof m === "object" ? m : {};
        var ferramenta = safeText(m.ferramenta,80);
        var agarramento = safeText(m.agarramento,20);
        var resultado = safeText(m.resultado,40);
        return {
          id: safeText(m.id,100) || makeId(),
          data: safeText(m.data,30),
          ferramenta: ferramenta,
          agarramento: AGARRAMENTOS.indexOf(agarramento)>=0 ? agarramento : "",
          resultado: RESULTADOS_MANOBRA.indexOf(resultado)>=0 ? resultado : "",
          recuperado: safeText(m.recuperado,400)
        };
      }

      /* Nucleo puro da pescaria. Recebe a linha e o instante de fechamento, devolve tudo
         que a tela mostra. Nada aqui usa Date.now() — o mesmo relatorio fechado mostra
         sempre os mesmos dias de pescaria. */
      function calcPescaria(row, refMs){
        var manobras = Array.isArray(row.pescManobras) ? row.pescManobras : [];
        var inicio = row.pescInicio ? new Date(row.pescInicio).getTime() : NaN;
        var dias = (Number.isFinite(inicio) && Number.isFinite(refMs) && refMs>=inicio)
          ? (refMs-inicio)/86400000 : null;

        var topo = numeroOuNulo(row.pescTopoPeixe);
        var ext  = numeroOuNulo(row.pescExtensaoPeixe);
        var diam = numeroOuNulo(row.pescDiametroPeixe);
        var cTopo = numeroOuNulo(row.pescCanhTopo);
        var cBase = numeroOuNulo(row.pescCanhBase);
        var base = (topo!==null && ext!==null) ? topo+ext : null;

        // Folga radial disponivel entre o peixe e a parede do revestimento.
        var idRev = ID_REVESTIMENTO[row.revestimento];
        var folga = (idRev!==undefined && diam!==null) ? idRev-diam : null;

        // Relacao do peixe com os canhoneados. So conclui quando ha dado suficiente.
        var relCanh = null;
        if(topo!==null && cTopo!==null){
          var fundoPeixe = base!==null ? base : topo;
          var fundoCanh = cBase!==null ? cBase : cTopo;
          if(fundoPeixe < cTopo) relCanh = {estado:"acima", texto:"Peixe acima dos canhoneados"};
          else if(topo > fundoCanh) relCanh = {estado:"abaixo", texto:"Peixe abaixo dos canhoneados"};
          else relCanh = {estado:"cobre", texto:"Peixe sobre os canhoneados"};
        }

        var limite = numeroOuNulo(row.pescLimiteManobras);
        var qtd = manobras.length;
        return {
          ativa: ehPescaria(row),
          dias: dias,
          manobras: manobras,
          qtd: qtd,
          ultima: qtd ? manobras[qtd-1] : null,
          topo: topo, extensao: ext, base: base, diametro: diam,
          canhTopo: cTopo, canhBase: cBase,
          idRevestimento: idRev===undefined ? null : idRev,
          folga: folga,
          relCanhoneados: relCanh,
          manobrasPorDia: (dias && dias>0) ? qtd/dias : null,
          limite: limite,
          acimaDoLimite: (limite!==null && limite>0 && qtd>=limite)
        };
      }

      function isKnownCriticality(value){"""))

# ------------------------------------------------------------------ 3. campos na linha
ED.append(('campos de pescaria em normalizeRow', 'pescManobras:',
"""          empresa:normalizeEmpresa(row.empresa),
          revestimento:normalizeRevestimento(row.revestimento),""",
"""          empresa:normalizeEmpresa(row.empresa),
          revestimento:normalizeRevestimento(row.revestimento),
          // Pescaria — campos planos de proposito, para o handler de edicao que ja
          // existe (data-index + data-field) funcionar sem alteracao nenhuma.
          pescInicio:safeText(row.pescInicio,30),
          pescTopoPeixe:safeText(row.pescTopoPeixe,20),
          pescExtensaoPeixe:safeText(row.pescExtensaoPeixe,20),
          pescDiametroPeixe:safeText(row.pescDiametroPeixe,20),
          pescCanhTopo:safeText(row.pescCanhTopo,20),
          pescCanhBase:safeText(row.pescCanhBase,20),
          pescLimiteManobras:safeText(row.pescLimiteManobras,10),
          pescManobras:(Array.isArray(row.pescManobras)?row.pescManobras:[]).slice(0,200).map(normalizeManobra),"""))

# ------------------------------------------------------------------ 4. bloco no editor
ED.append(('bloco de pescaria no editor', 'pesc-bloco',
"""'<div class="field edit-notes"><label for="operacaoTexto-'+index+'">Operação</label><textarea id="operacaoTexto-'+index+'" data-index="'+index+'" data-field="operacaoTexto" maxlength="600" placeholder="Ex.: Realizando manutenção">'+escapeHtml(r.operacaoTexto)+'</textarea></div>'+""",
"""'<div class="field edit-notes"><label for="operacaoTexto-'+index+'">Operação</label><textarea id="operacaoTexto-'+index+'" data-index="'+index+'" data-field="operacaoTexto" maxlength="600" placeholder="Ex.: Realizando manutenção">'+escapeHtml(r.operacaoTexto)+'</textarea></div>'+
            (ehPescaria(r) ? pescariaEditorHtml(index,r) : '')+"""))

ED.append(('funcao que desenha o bloco de pescaria', 'function pescariaEditorHtml',
"      function renderEditorNotice(){",
"""      function pescariaEditorHtml(index,r){
        var p = calcPescaria(r, msFechamentoRelatorio());
        var num = function(campo,rot,valor,unid,passo){
          return '<div class="field"><label for="'+campo+'-'+index+'">'+rot+(unid?' <span class="pesc-unid">('+unid+')</span>':'')+'</label>'+
            '<input id="'+campo+'-'+index+'" data-index="'+index+'" data-field="'+campo+'" type="number" step="'+(passo||"any")+'" min="0" inputmode="decimal" value="'+escapeHtml(valor)+'"></div>';
        };
        var resumo = [];
        if(p.dias!==null) resumo.push('<span class="pesc-chip">'+formatNumber(p.dias,2)+' dias de pescaria</span>');
        resumo.push('<span class="pesc-chip'+(p.acimaDoLimite?' alerta':'')+'">'+p.qtd+' manobra'+(p.qtd===1?'':'s')+
          (p.limite?' de '+p.limite:'')+'</span>');
        if(p.base!==null) resumo.push('<span class="pesc-chip">peixe de '+formatNumber(p.topo,1)+' a '+formatNumber(p.base,1)+' m</span>');
        if(p.folga!==null) resumo.push('<span class="pesc-chip'+(p.folga<=0?' alerta':'')+'">folga '+formatNumber(p.folga,3)+'&quot;</span>');
        if(p.relCanhoneados) resumo.push('<span class="pesc-chip'+(p.relCanhoneados.estado==="cobre"?' alerta':'')+'">'+escapeHtml(p.relCanhoneados.texto)+'</span>');

        var avisos = [];
        if(p.folga!==null && p.folga<=0){
          avisos.push('O diâmetro do peixe ('+formatNumber(p.diametro,3)+'") é maior ou igual ao ID do revestimento ('+formatNumber(p.idRevestimento,3)+'"). Confira os dois valores.');
        } else if(p.folga!==null && p.folga<0.25){
          avisos.push('Folga de apenas '+formatNumber(p.folga,3)+'" entre o peixe e o revestimento — confirme no catálogo se a ferramenta de agarramento externo passa.');
        }
        if(p.diametro!==null && p.idRevestimento===null){
          avisos.push('Selecione o revestimento para o app calcular a folga.');
        }
        if(p.acimaDoLimite){
          avisos.push('Já são '+p.qtd+' manobras, no limite de '+p.limite+' que vocês definiram. Vale reavaliar a estratégia.');
        }
        if(p.relCanhoneados && p.relCanhoneados.estado==="cobre"){
          avisos.push('O peixe está sobre o intervalo canhoneado.');
        }

        var manobras = p.manobras.map(function(m,mi){
          return '<div class="pesc-manobra">'+
            '<div class="pesc-manobra-no">'+(mi+1)+'ª</div>'+
            '<div class="pesc-manobra-campos">'+
              '<div class="field"><label>Data</label><input type="date" data-manobra-row="'+index+'" data-manobra-index="'+mi+'" data-manobra-field="data" value="'+escapeHtml(m.data)+'"></div>'+
              '<div class="field"><label>Ferramenta descida</label><select data-manobra-row="'+index+'" data-manobra-index="'+mi+'" data-manobra-field="ferramenta">'+picklistHtml(FERRAMENTAS_PESCARIA,m.ferramenta,"— selecione —")+'</select></div>'+
              '<div class="field"><label>Agarramento</label><select data-manobra-row="'+index+'" data-manobra-index="'+mi+'" data-manobra-field="agarramento">'+picklistHtml(AGARRAMENTOS,m.agarramento,"— selecione —")+'</select></div>'+
              '<div class="field"><label>Resultado</label><select data-manobra-row="'+index+'" data-manobra-index="'+mi+'" data-manobra-field="resultado">'+picklistHtml(RESULTADOS_MANOBRA,m.resultado,"— selecione —")+'</select></div>'+
              '<div class="field pesc-larga"><label>O que subiu</label><input type="text" data-manobra-row="'+index+'" data-manobra-index="'+mi+'" data-manobra-field="recuperado" value="'+escapeHtml(m.recuperado)+'" placeholder="Ex.: mandril do packer"></div>'+
            '</div>'+
            '<button class="btn btn-danger btn-icon pesc-remove" type="button" data-manobra-remove-row="'+index+'" data-manobra-remove-index="'+mi+'" aria-label="Excluir manobra '+(mi+1)+'">✕</button>'+
          '</div>';
        }).join("");

        return '<div class="pesc-bloco">'+
          '<div class="pesc-cab"><strong>🪝 Pescaria</strong><div class="pesc-resumo">'+resumo.join("")+'</div></div>'+
          (avisos.length?'<div class="pesc-avisos">'+avisos.map(function(a){return '<div>⚠ '+escapeHtml(a)+'</div>';}).join("")+'</div>':'')+
          '<div class="edit-fields">'+
            '<div class="field"><label for="pescInicio-'+index+'">Início da pescaria</label><input id="pescInicio-'+index+'" data-index="'+index+'" data-field="pescInicio" type="datetime-local" value="'+escapeHtml(r.pescInicio)+'"></div>'+
            num("pescTopoPeixe","Topo do peixe",r.pescTopoPeixe,"m")+
            num("pescExtensaoPeixe","Extensão do peixe",r.pescExtensaoPeixe,"m")+
            num("pescDiametroPeixe","Diâmetro do peixe",r.pescDiametroPeixe,"pol")+
            num("pescCanhTopo","Canhoneados — topo",r.pescCanhTopo,"m")+
            num("pescCanhBase","Canhoneados — base",r.pescCanhBase,"m")+
            num("pescLimiteManobras","Alerta acima de",r.pescLimiteManobras,"manobras","1")+
          '</div>'+
          '<div class="pesc-manobras-cab"><span>Manobras</span><button class="btn btn-ghost pesc-add" type="button" data-manobra-add="'+index+'">+ Manobra</button></div>'+
          (manobras || '<div class="pesc-vazio">Nenhuma manobra registrada. A quantidade sai da contagem destas linhas.</div>')+
        '</div>';
      }

      function renderEditorNotice(){"""))

# helper: instante de fechamento acessivel de qualquer lugar
ED.append(('atalho para o instante de fechamento', 'function msFechamentoRelatorio',
"      function refNow(){",
"""      // Mesmo instante que o resto do relatorio usa. Existe so para o bloco de
      // pescaria poder chamar sem repetir a regra.
      function msFechamentoRelatorio(){ return refNow(); }

      function refNow(){"""))

# ------------------------------------------------------------------ 5. handlers das manobras
ED.append(('handlers das manobras', 'data-manobra-field',
"""      document.getElementById("rows-container").addEventListener("click",function(event){
        var button=event.target.closest(".remove-row");
        if(button) removeRow(Number(button.getAttribute("data-index")));
      });""",
"""      document.getElementById("rows-container").addEventListener("click",function(event){
        var button=event.target.closest(".remove-row");
        if(button){ removeRow(Number(button.getAttribute("data-index"))); return; }

        var add=event.target.closest("[data-manobra-add]");
        if(add){
          var ri=Number(add.getAttribute("data-manobra-add"));
          if(!state.rows[ri]) return;
          if(!Array.isArray(state.rows[ri].pescManobras)) state.rows[ri].pescManobras=[];
          state.rows[ri].pescManobras.push(normalizeManobra({}));
          saveNow(); renderEditor(); renderDashboard();
          return;
        }
        var rem=event.target.closest("[data-manobra-remove-row]");
        if(rem){
          var rr=Number(rem.getAttribute("data-manobra-remove-row"));
          var mi=Number(rem.getAttribute("data-manobra-remove-index"));
          if(!state.rows[rr]||!Array.isArray(state.rows[rr].pescManobras)) return;
          if(!window.confirm("Excluir esta manobra?")) return;
          state.rows[rr].pescManobras.splice(mi,1);
          saveNow(); renderEditor(); renderDashboard();
        }
      });

      // Edicao dos campos de cada manobra. Vive num handler proprio porque a manobra e
      // um item de lista dentro da linha, e nao um campo plano.
      function aplicarManobra(event, redesenhar){
        var el=event.target.closest("[data-manobra-field]");
        if(!el) return;
        var ri=Number(el.getAttribute("data-manobra-row"));
        var mi=Number(el.getAttribute("data-manobra-index"));
        var campo=el.getAttribute("data-manobra-field");
        var linha=state.rows[ri];
        if(!linha||!Array.isArray(linha.pescManobras)||!linha.pescManobras[mi]) return;
        linha.pescManobras[mi][campo]=safeText(el.value,campo==="recuperado"?400:80);
        scheduleSave();
        renderDashboard();
        if(redesenhar) renderEditor();
      }
      document.getElementById("rows-container").addEventListener("input",function(e){aplicarManobra(e,false);});
      document.getElementById("rows-container").addEventListener("change",function(e){aplicarManobra(e,true);});"""))

# ------------------------------------------------------------------ 6. CSS
ED.append(('CSS do bloco de pescaria', '.pesc-bloco{',
"    .report-excluidas{",
"""    /* Bloco de pescaria no editor */
    .pesc-bloco{
      border:1px solid #f2d69a;background:#fffdf6;border-radius:12px;
      padding:12px;margin-top:12px;
    }
    .pesc-cab{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px}
    .pesc-cab strong{font-size:13px;color:#7a5210;letter-spacing:.4px}
    .pesc-resumo{display:flex;gap:6px;flex-wrap:wrap}
    .pesc-chip{
      background:#fff;border:1px solid #e6d3a8;border-radius:999px;padding:3px 10px;
      font-size:10.5px;font-weight:800;color:#7a5210;
    }
    .pesc-chip.alerta{background:#fdecea;border-color:#f5c2bd;color:#8f1d14}
    .pesc-avisos{
      background:#fdecea;border:1px solid #f5c2bd;color:#8f1d14;border-radius:9px;
      padding:8px 11px;margin-bottom:10px;font-size:11.5px;font-weight:700;line-height:1.5;
    }
    .pesc-avisos div+div{margin-top:4px}
    .pesc-unid{font-weight:600;color:#9a8557}
    .pesc-manobras-cab{
      display:flex;align-items:center;justify-content:space-between;gap:8px;
      margin:12px 0 8px;font-size:10px;font-weight:800;letter-spacing:1px;
      text-transform:uppercase;color:#7a5210;
    }
    .pesc-manobra{
      display:flex;align-items:flex-start;gap:9px;background:#fff;border:1px solid #ece0c4;
      border-radius:10px;padding:9px;margin-bottom:7px;
    }
    .pesc-manobra-no{
      flex:none;width:28px;height:28px;border-radius:50%;background:#e8890c;color:#fff;
      font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;
    }
    .pesc-manobra-campos{
      flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;
    }
    .pesc-manobra-campos .field label{font-size:9.5px}
    .pesc-larga{grid-column:1/-1}
    .pesc-remove{flex:none}
    .pesc-vazio{font-size:11.5px;color:#9a8557;font-style:italic;padding:4px 2px}

    .report-excluidas{"""))

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

# -*- coding: utf-8 -*-
"""
corrigir.py — aplica as correcoes de auditoria no Controle Operacional.

Estrategia: TODOS os padroes sao conferidos antes de qualquer substituicao.
Se um so nao bater, nada e gravado — evita gravar o arquivo pela metade.
Idempotente: se a correcao ja esta aplicada (marcador presente), pula.
"""
import io, sys

ARQ = 'app.html'
s = io.open(ARQ, encoding='utf-8').read()

# (rotulo, marcador_de_ja_aplicado, texto_antigo, texto_novo)
EDICOES = []

EDICOES.append(('controle de fechamento (HTML)', 'closing-box',
"""    <div>
      <span class="status-dot" id="network-dot"></span><span id="network-status">Online</span>
    </div>
  </div>""",
"""    <div class="closing-box" id="closing-box">
      <span class="closing-badge" id="closing-badge">AO VIVO</span>
      <label class="closing-label" for="closing-input">Fechamento</label>
      <input type="datetime-local" id="closing-input" class="closing-input">
      <button type="button" class="closing-btn" id="closing-toggle">Fechar o dia</button>
    </div>
    <div>
      <span class="status-dot" id="network-dot"></span><span id="network-status">Online</span>
    </div>
  </div>"""))

EDICOES.append(('CSS do fechamento e da barra hachurada', '.closing-badge{',
"    .status-group{display:flex;align-items:center;gap:12px;flex-wrap:wrap}",
"""    .status-group{display:flex;align-items:center;gap:12px;flex-wrap:wrap}

    /* Controle de fechamento: alterna entre painel ao vivo e documento congelado. */
    .closing-box{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    .closing-label{font-size:10px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}
    .closing-input{border:1px solid #cdd8e6;border-radius:8px;padding:4px 7px;font-size:11px;font-weight:700;font-family:inherit;color:inherit;background:#fff}
    .closing-btn{border:1px solid #cdd8e6;background:#fff;border-radius:8px;padding:5px 11px;font-size:11px;font-weight:800;font-family:inherit;cursor:pointer;color:#0f2136}
    .closing-btn:hover{background:#f2f6fb}
    .closing-badge{border-radius:999px;padding:3px 9px;font-size:10px;font-weight:900;letter-spacing:.7px;background:#e6f4ec;color:#14603a;border:1px solid #bfe3cd}
    .closing-box.fechado .closing-badge{background:#e8effa;color:#1c3f74;border-color:#c3d5ee}
    .closing-box.fechado .closing-input{background:#f5f8fc;font-weight:800}

    /* Barra hachurada do plano atras da barra de entregues, para o grafico de
       entregues continuar legivel mesmo compartilhando escala com o plano. */
    .bar-stack{position:relative;width:100%;flex:1;display:flex;align-items:flex-end}
    .bar-ghost{position:absolute;left:0;right:0;bottom:0;border-radius:6px 6px 2px 2px;background:repeating-linear-gradient(45deg,#dfe7f1,#dfe7f1 3px,#eef2f7 3px,#eef2f7 6px);border:1px solid #d3dde9}
    .bar-stack .bar-fill{position:relative;z-index:1}
    .ghost-note{font-size:9px;color:var(--muted);font-weight:700;text-align:center;margin-top:6px}"""))

EDICOES.append(('faixa de KPI sem mistura de dimensoes', 'Em pescaria',
"""        kpis+=kpiCard("Crítica","⚠️",String(countHigh),total?Math.round(countHigh/total*100)+"%":"0%","#dc2626");
        kpis+=kpiCard("Pescaria","🪝",String(countFishing),total?Math.round(countFishing/total*100)+"%":"0%","#dc2626");
        kpis+=kpiCard("Atenção","◆",String(countMedium),total?Math.round(countMedium/total*100)+"%":"0%","#d97706");
        kpis+=kpiCard("Normal","✓",String(countNormal),total?Math.round(countNormal/total*100)+"%":"0%","#059669");""",
"""        // Criticidade primeiro, os tres juntos: sao as unicas categorias que se excluem
        // entre si e somam 100%. "Pescaria" e um MOTIVO, nao um nivel de criticidade —
        // antes ela ficava no meio dos tres e a faixa somava 129%, como se as quatro
        // fizessem parte da mesma escala. Agora vem depois e mostra "de N sondas".
        kpis+=kpiCard("Crítica","⚠️",String(countHigh),total?Math.round(countHigh/total*100)+"%":"0%","#dc2626");
        kpis+=kpiCard("Atenção","◆",String(countMedium),total?Math.round(countMedium/total*100)+"%":"0%","#d97706");
        kpis+=kpiCard("Normal","✓",String(countNormal),total?Math.round(countNormal/total*100)+"%":"0%","#059669");
        kpis+=kpiCard("Em pescaria","🪝",String(countFishing),"de "+total+(total===1?" sonda":" sondas"),"#b45309");"""))

EDICOES.append(('cor unica no ranking de excesso', 'Mesma regra de cor do TOP 3',
"""          var width=Math.max(12,Math.min(item.days/maxExcessDays*100,100));
          return '<div class="rank-row"><div class="rank-no">'+(index+1)+'º</div><div class="rank-name">'+escapeHtml(item.row.sonda)+'<span>'+escapeHtml(item.row.poco)+'</span></div><div class="rank-track"><div class="rank-fill" style="width:'+width+'%;background:#dc2626">'+formatNumber(item.days,1)+' d</div></div></div>';""",
"""          var width=Math.max(12,Math.min(item.days/maxExcessDays*100,100));
          // Mesma regra de cor do TOP 3 (pela criticidade da sonda). Antes este painel
          // pintava tudo de vermelho e o TOP 3 pintava pela criticidade, entao a mesma
          // sonda com o mesmo numero de dias aparecia vermelha aqui e verde la.
          var color=item.row.crit==="alto"?"#dc2626":item.row.crit==="media"?"#d97706":"#059669";
          return '<div class="rank-row"><div class="rank-no">'+(index+1)+'º</div><div class="rank-name">'+escapeHtml(item.row.sonda)+'<span>'+escapeHtml(item.row.poco)+'</span></div><div class="rank-track"><div class="rank-fill" style="width:'+width+'%;background:'+color+'">'+formatNumber(item.days,1)+' d</div></div></div>';"""))

EDICOES.append(('barra hachurada do plano no grafico de entregues', 'bar-ghost" style',
"""        var bars=PLAN_CATEGORIES.map(function(m){
          var value=Number(state.delivered[m.label])||0;
          var height=value ? Math.max(value/sharedChartMax*100,4) : 2;
          return '<div class="bar-col"><div class="bar-value">'+String(value).padStart(2,"0")+'</div><div class="bar-fill" style="height:'+height+'%;background:'+m.color+'"></div><div class="bar-label">'+escapeHtml(m.label)+'</div></div>';
        }).join("");""",
"""        // Os dois graficos dividem a mesma escala de proposito, para plano e realizado
        // serem comparaveis a olho. O efeito colateral era o grafico de entregues ficar
        // quase invisivel (4 contra 33). A barra hachurada do plano atras de cada barra
        // devolve a referencia visual sem quebrar a comparabilidade.
        var bars=PLAN_CATEGORIES.map(function(m){
          var value=Number(state.delivered[m.label])||0;
          var planValue=Number(state.plan[m.label])||0;
          var height=value ? Math.max(value/sharedChartMax*100,4) : 2;
          var ghost=planValue ? Math.max(planValue/sharedChartMax*100,4) : 0;
          var ghostEl=ghost ? '<div class="bar-ghost" style="height:'+ghost+'%"></div>' : '';
          return '<div class="bar-col"><div class="bar-value">'+String(value).padStart(2,"0")+'</div><div class="bar-stack">'+ghostEl+'<div class="bar-fill" style="height:'+height+'%;background:'+m.color+'"></div></div><div class="bar-label">'+escapeHtml(m.label)+'</div></div>';
        }).join("");"""))

EDICOES.append(('alinhamento do grafico do plano', 'bar-stack"><div class="bar-fill',
"""        var planBars=PLAN_CATEGORIES.map(function(m){
          var value=Number(state.plan[m.label])||0;
          var height=value ? Math.max(value/sharedChartMax*100,4) : 2;
          return '<div class="bar-col"><div class="bar-value">'+String(value).padStart(2,"0")+'</div><div class="bar-fill" style="height:'+height+'%;background:'+m.color+'"></div><div class="bar-label">'+escapeHtml(m.label)+'</div></div>';
        }).join("");""",
"""        var planBars=PLAN_CATEGORIES.map(function(m){
          var value=Number(state.plan[m.label])||0;
          var height=value ? Math.max(value/sharedChartMax*100,4) : 2;
          return '<div class="bar-col"><div class="bar-value">'+String(value).padStart(2,"0")+'</div><div class="bar-stack"><div class="bar-fill" style="height:'+height+'%;background:'+m.color+'"></div></div><div class="bar-label">'+escapeHtml(m.label)+'</div></div>';
        }).join("");"""))

EDICOES.append(('legenda da barra hachurada', 'ghost-note">Barra hachurada',
"""<div class="chart-total">TOTAL ENTREGUE: '+deliveredTotal+' POÇOS</div></div></article>'+""",
"""<div class="chart-total">TOTAL ENTREGUE: '+deliveredTotal+' POÇOS</div><div class="ghost-note">Barra hachurada = plano do mês, na mesma escala</div></div></article>'+"""))

EDICOES.append(('cabecalho indica ao vivo ou fechado', "isFechado()?'FECHADO",
"""Controle Sonda – Poço | '+reportDate()+' • Atualizado '+reportTime()+'</div>""",
"""Controle Sonda – Poço | '+reportDate()+' • '+(isFechado()?'FECHADO às ':'Ao vivo, atualizado ')+reportTime()+'</div>"""))

# ---------------------------------------------------------------- conferencia
pendentes, erros = [], []
for rot, marcador, velho, novo in EDICOES:
    if marcador in s:
        print('JA APLICADO | ' + rot)
        continue
    n = s.count(velho)
    if n != 1:
        erros.append('%s: esperava 1 ocorrencia, achei %d' % (rot, n))
    else:
        pendentes.append((rot, velho, novo))

if erros:
    print('\nNADA FOI GRAVADO. Padroes que nao bateram:')
    for e in erros:
        print('  - ' + e)
    sys.exit(1)

for rot, velho, novo in pendentes:
    s = s.replace(velho, novo)
    print('APLICADO    | ' + rot)

io.open(ARQ, 'w', encoding='utf-8').write(s)
print('\n%d edicao(oes) gravada(s).' % len(pendentes))

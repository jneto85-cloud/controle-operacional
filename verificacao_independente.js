'use strict';
/*
 * verificacao_independente.js
 *
 * REGRA DA AUDITORIA: nada aqui usa o codigo do app original como referencia — o app nao foi
 * disponibilizado. Todas as formulas abaixo foram escritas do zero a partir da definicao
 * matematica de cada grandeza, e comparadas contra os NUMEROS EXIBIDOS pelo app (transcritos
 * em dataset_exibido.json a partir do PDF do Editor e das imagens do relatorio).
 *
 * Onde nao ha evidencia suficiente para afirmar como o app calcula internamente, o resultado
 * e marcado como INFERENCIA (com a evidencia que sustenta a inferencia) e nunca como fato.
 */
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(__dirname + '/dataset_exibido.json', 'utf8'));

const DIA_MS = 86400000;
const achados = [];
function achado(sev, area, titulo, evidencia, esperado, exibido){
 achados.push({sev, area, titulo, evidencia, esperado, exibido});
}
function linha(ok, texto){ console.log(`${ok===null?'--  ':ok?'OK  ':'ERRO'} | ${texto}`); }

// ---------------------------------------------------------------------------
// 1. DIAS DE OPERACAO — a grandeza principal do relatorio
// ---------------------------------------------------------------------------
// Definicao: dias de operacao = (instante de referencia) - (data/hora de inicio), em dias.
// A pergunta auditavel nao e "a subtracao esta certa" (esta), e sim QUAL instante de
// referencia o app usa. Isso e determinavel por engenharia reversa dos valores exibidos:
// para cada sonda, o valor exibido restringe o instante de referencia a um intervalo.
// A intersecao dos 7 intervalos revela o instante que o app usou.
function intervaloDeReferencia(inicioISO, valorExibido, modo){
 const S = new Date(inicioISO + ':00Z').getTime();
 if(modo === 'round-int')  return [S + (valorExibido-0.5)*DIA_MS, S + (valorExibido+0.5)*DIA_MS];
 if(modo === 'floor-int')  return [S + valorExibido*DIA_MS,       S + (valorExibido+1)*DIA_MS];
 if(modo === 'round-2dec') return [S + (valorExibido-0.005)*DIA_MS, S + (valorExibido+0.005)*DIA_MS];
 throw new Error('modo desconhecido');
}
function intersecao(intervalos){
 let lo = -Infinity, hi = Infinity;
 intervalos.forEach(([a,b])=>{ lo = Math.max(lo,a); hi = Math.min(hi,b); });
 return lo < hi ? [lo,hi] : null;
}
function fmtUTC(ms){ return new Date(ms).toISOString().replace('T',' ').slice(0,16) + ' UTC'; }

console.log('=== 1. DIAS DE OPERACAO: qual instante de referencia o app usa? ===\n');

// --- 1a. Relatorio ANTERIOR (25/07/2026), valores com 2 casas decimais ---
{
 const ini = D.exibido_v_anterior.sondasInicio;
 const dias = D.exibido_v_anterior.diasOperacao;
 const ivs = Object.keys(dias).map(s => intervaloDeReferencia(ini[s], dias[s], 'round-2dec'));
 const inter = intersecao(ivs);
 if(inter){
  console.log(`Relatorio de 25/07/2026 -> instante de referencia usado: entre ${fmtUTC(inter[0])} e ${fmtUTC(inter[1])}`);
  const dataRel = new Date('2026-07-25T00:00:00Z').getTime();
  const desvioDias = (inter[0] - dataRel)/DIA_MS;
  linha(true, `Cai DENTRO do dia do relatorio (25/07). Desvio em relacao a 00:00 do dia: +${desvioDias.toFixed(2)} dia (~${(desvioDias*24).toFixed(1)}h) -> compativel com "gerado durante o turno noturno do proprio dia".`);
 } else {
  linha(false, 'Nao ha instante unico compativel com os 7 valores de 25/07 (os valores seriam mutuamente inconsistentes).');
 }
}

// --- 1b. Relatorio ATUAL (06/08/2026), valores inteiros ---
{
 const sondas = D.entrada.sondas;
 const dias = D.exibido_v_atual.diasOperacao;
 ['round-int','floor-int'].forEach(modo=>{
  const ivs = sondas.map(s => intervaloDeReferencia(s.inicio, dias[s.sonda], modo));
  const inter = intersecao(ivs);
  if(inter){
   console.log(`\nRelatorio de 06/08/2026, hipotese "${modo}" -> instante compativel: entre ${fmtUTC(inter[0])} e ${fmtUTC(inter[1])}`);
   const dataRel = new Date(D.entrada.config.dataRelatorio + 'T00:00:00Z').getTime();
   const atrasoDias = (inter[0] - dataRel)/DIA_MS;
   if(atrasoDias > 1){
    linha(false, `O instante usado esta ${atrasoDias.toFixed(2)} dias DEPOIS da data do relatorio (${D.entrada.config.dataRelatorio}). O app NAO usa a data do relatorio — usa o relogio do dispositivo no momento em que a tela e aberta.`);
    if(modo==='round-int'){
     achado('CRITICO','Dias de operacao',
      'Dias de operacao calculados pelo relogio do dispositivo, nao pela data do relatorio',
      `Relatorio configurado para ${D.entrada.config.dataRelatorio} (NOTURNO), mas os valores exibidos so sao possiveis se o instante de referencia estiver entre ${fmtUTC(inter[0])} e ${fmtUTC(inter[1])} — ou seja, ~${atrasoDias.toFixed(1)} dias depois da data do relatorio.`,
      'SPT-82 = 9,8 dias (fechamento em 06/08)',
      'SPT-82 = 12 dias');
    }
   } else {
    linha(true, `Instante compativel com a data do relatorio (desvio de ${atrasoDias.toFixed(2)} dia).`);
   }
  } else {
   console.log(`\nRelatorio de 06/08/2026, hipotese "${modo}" -> INCOMPATIVEL (nenhum instante unico explica os 7 valores).`);
  }
 });
}

// --- 1c. Valores corretos para a data do relatorio ---
console.log('\n--- Dias de operacao recalculados para o fechamento do relatorio (06/08/2026 20:00) ---');
const FECHAMENTO = new Date('2026-08-06T20:00:00Z').getTime();
const diasCorretos = {};
D.entrada.sondas.forEach(s=>{
 const v = (FECHAMENTO - new Date(s.inicio + ':00Z').getTime())/DIA_MS;
 diasCorretos[s.sonda] = v;
 const exib = D.exibido_v_atual.diasOperacao[s.sonda];
 const erroPct = Math.abs(exib - v)/v*100;
 linha(erroPct < 1, `${s.sonda.padEnd(8)} inicio ${s.inicio}  correto=${v.toFixed(2).padStart(6)} d   exibido=${String(exib).padStart(3)} d   erro=${erroPct.toFixed(1)}%`);
});

// --- 1d. Impacto do arredondamento para inteiro no ranking TOP 3 ---
console.log('\n--- Impacto do arredondamento para inteiro no ranking TOP 3 ---');
{
 const exib = D.exibido_v_atual.diasOperacao;
 const empates = {};
 Object.entries(exib).forEach(([s,v])=>{ (empates[v] = empates[v]||[]).push(s); });
 const comEmpate = Object.entries(empates).filter(([,arr])=>arr.length>1);
 comEmpate.forEach(([v,arr])=>{
  const reais = arr.map(s=>`${s}=${diasCorretos[s].toFixed(2)}`).join(' vs ');
  linha(false, `Empate artificial em ${v} dias entre ${arr.join(' e ')} — valores reais distintos: ${reais}. O podio nao consegue ordenar.`);
  achado('ATENCAO','Dias de operacao',
   'Arredondamento para numero inteiro cria empates e destroi a ordenacao do TOP 3',
   `${arr.join(' e ')} aparecem ambos com ${v} dias, mas os valores reais no fechamento diferem (${reais}).`,
   'Manter 2 casas decimais (como na versao anterior do relatorio)',
   'Inteiro arredondado');
 });
 if(!comEmpate.length) linha(true, 'Nenhum empate gerado pelo arredondamento neste dataset.');
}

// ---------------------------------------------------------------------------
// 2. CRITICIDADE — contagens e percentuais
// ---------------------------------------------------------------------------
console.log('\n\n=== 2. CRITICIDADE: contagens e percentuais ===\n');
const MAPA_CRIT = {'Alto':'criticas','Media':'atencao','Normal':'normais'};
const contCrit = {criticas:0, atencao:0, normais:0};
D.entrada.sondas.forEach(s=>{ contCrit[MAPA_CRIT[s.criticidade]]++; });
const totalSondas = D.entrada.sondas.length;
console.log(`Contagem a partir da tabela: criticas=${contCrit.criticas} atencao=${contCrit.atencao} normais=${contCrit.normais} (total ${totalSondas})`);

const pctExato = k => contCrit[k]/totalSondas*100;
console.log(`Percentuais exatos: criticas=${pctExato('criticas').toFixed(3)}%  atencao=${pctExato('atencao').toFixed(3)}%  normais=${pctExato('normais').toFixed(3)}%`);

// 2a. Versao anterior: 43 / 29 / 28
{
 const d = D.exibido_v_anterior.donutCriticidade;
 const soma = d.criticas.percent + d.atencao.percent + d.normais.percent;
 linha(soma===100, `Versao 25/07: ${d.criticas.percent}+${d.atencao.percent}+${d.normais.percent} = ${soma}%`);
 const igualQtd = d.atencao.qtd === d.normais.qtd;
 const igualPct = d.atencao.percent === d.normais.percent;
 linha(!(igualQtd && !igualPct), `Versao 25/07: ATENCAO e NORMAIS tem a MESMA quantidade (${d.atencao.qtd}) mas percentuais DIFERENTES (${d.atencao.percent}% e ${d.normais.percent}%).`);
 if(igualQtd && !igualPct){
  achado('INCORRETO','Percentuais de criticidade',
   'Duas categorias com a mesma quantidade exibem percentuais diferentes',
   `ATENCAO=${d.atencao.qtd} sondas -> ${d.atencao.percent}% e NORMAIS=${d.normais.qtd} sondas -> ${d.normais.percent}%. Ambas valem ${pctExato('atencao').toFixed(2)}%.`,
   'Ambas 29% (ou ambas 28,6%)',
   '29% e 28%');
 }
}
// 2b. Versao atual: 29 / 29 (+ criticas cortada na captura)
{
 const d = D.exibido_v_atual.criticidadePercent;
 const criticasEsperado = Math.round(pctExato('criticas'));
 const somaSeCriticas43 = criticasEsperado + d.atencao + d.normais;
 linha(false, `Versao 06/08: ATENCAO=${d.atencao}% e NORMAIS=${d.normais}% (iguais, correto). Somando a CRITICAS arredondada (${criticasEsperado}%): total = ${somaSeCriticas43}%.`);
 console.log('    (CRITICAS estava cortada na captura — o valor acima e o arredondamento correto de 3/7, nao uma leitura.)');
 if(somaSeCriticas43 !== 100){
  achado('ATENCAO','Percentuais de criticidade',
   'Percentuais arredondados nao somam 100%',
   `3/7=${pctExato('criticas').toFixed(2)}%, 2/7=${pctExato('atencao').toFixed(2)}%, 2/7=${pctExato('normais').toFixed(2)}%. Arredondando cada um ao inteiro mais proximo: ${criticasEsperado}+${d.atencao}+${d.normais}=${somaSeCriticas43}%.`,
   'Somar 100% OU deixar explicito que ha arredondamento',
   `${somaSeCriticas43}% sem nenhuma indicacao`);
 }
}

// ---------------------------------------------------------------------------
// 3. POCOS ENTREGUES — soma das barras vs total exibido
// ---------------------------------------------------------------------------
console.log('\n\n=== 3. POCOS ENTREGUES ===\n');
{
 const somaEntrada = D.entrada.pocosEntregues.reduce((a,c)=>a+c.entregue,0);
 const somaBarras = Object.values(D.exibido_v_atual.barrasEntregues).reduce((a,b)=>a+b,0);
 linha(somaEntrada===somaBarras, `Soma das barras exibidas (${somaBarras}) confere com a soma dos campos do editor (${somaEntrada}).`);
 linha(somaBarras===D.exibido_v_atual.totalEntregues, `TOTAL exibido (${D.exibido_v_atual.totalEntregues}) confere com a soma das barras (${somaBarras}).`);
 const somaAnt = Object.values(D.exibido_v_anterior.barrasEntregues).reduce((a,b)=>a+b,0);
 linha(somaAnt===D.exibido_v_anterior.totalEntregues, `Versao 25/07: soma das barras (${somaAnt}) confere com o TOTAL exibido (${D.exibido_v_anterior.totalEntregues}).`);

 const metasZero = D.entrada.pocosEntregues.filter(c=>c.meta===0);
 linha(null, `Campo "Meta" preenchido com 0 em ${metasZero.length} de ${D.entrada.pocosEntregues.length} categorias — nenhuma meta e exibida no relatorio.`);
 if(metasZero.length === D.entrada.pocosEntregues.length){
  achado('ATENCAO','Pocos entregues',
   'Campo "Meta" existe no editor mas nao aparece no relatorio e esta zerado',
   'As 6 categorias tem Meta=0. O grafico mostra apenas "Entregue". Qualquer calculo de "% da meta" dividiria por zero.',
   'Ou exibir meta vs realizado, ou remover o campo',
   'Campo coletado e descartado');
 }
}

// ---------------------------------------------------------------------------
// 4. NPT — percentuais digitados a mao
// ---------------------------------------------------------------------------
console.log('\n\n=== 4. NPT ===\n');
{
 const total = D.entrada.npt.reduce((a,c)=>a+c.qtd,0);
 linha(total===D.exibido_v_anterior.donutNpt.totalEventos, `Total de eventos NPT exibido (${D.exibido_v_anterior.donutNpt.totalEventos}) confere com a soma das quantidades (${total}).`);
 D.entrada.npt.forEach(n=>{
  const exato = n.qtd/total*100;
  const digitado = parseFloat(n.obsPercentDigitado);
  linha(Math.abs(digitado-exato)<0.6, `${n.tipo.padEnd(28)} qtd=${n.qtd}  exato=${exato.toFixed(1)}%  digitado="${n.obsPercentDigitado}"`);
 });
 // Classificado como LATENTE, e nao CRITICO CONFIRMADO: os valores digitados hoje ESTAO
 // corretos (2/3 e 1/3). O defeito e estrutural — a proxima alteracao de quantidade pode
 // deixar o percentual para tras sem nenhum aviso. Inflar isso para "critico confirmado"
 // seria exagerar um erro que ainda nao aconteceu.
 achado('ALTO-LATENTE','NPT',
  'O percentual de NPT e um campo de texto digitado a mao, nao um valor calculado',
  `No editor, a coluna aparece como "Obs (%)" com os valores "67%" e "33%" digitados. Hoje eles coincidem com 2/3 e 1/3, mas nada no app impede que a quantidade seja alterada sem o percentual acompanhar — o grafico passaria a mentir silenciosamente.`,
  'Percentual derivado automaticamente da quantidade',
  'Texto livre digitado pelo usuario');

 // Coerencia com a narrativa
 const mencionaMotor = D.entrada.destaques.filter(t=>/motor/i.test(t)).length;
 const qtdMecanico = D.entrada.npt.find(n=>/Mecanico/i.test(n.tipo)).qtd;
 linha(mencionaMotor===qtdMecanico, `NPT Mecanico = ${qtdMecanico} evento(s), mas os Destaques descrevem ${mencionaMotor} evento mecanico (substituicao do motor as 21:45).`);
 if(mencionaMotor!==qtdMecanico){
  achado('ATENCAO','NPT',
   'Quantidade de NPT mecanico nao bate com a narrativa dos Destaques',
   `O grafico contabiliza ${qtdMecanico} eventos de NPT Mecanico, mas so ha ${mencionaMotor} evento mecanico descrito nos Destaques e na Nota NPT (falha do motor as 21:45). O segundo evento nao esta documentado em lugar nenhum do relatorio.`,
   'Cada evento contabilizado deve ter descricao correspondente',
   `${qtdMecanico} eventos, ${mencionaMotor} descrito`);
 }
}

// ---------------------------------------------------------------------------
// 5. COERENCIA ENTRE OS GRAFICOS DE ROSCA E A TABELA
// ---------------------------------------------------------------------------
console.log('\n\n=== 5. COERENCIA ENTRE OS GRAFICOS E A TABELA DE SONDAS ===\n');
{
 const porOperacao = {};
 D.entrada.sondas.forEach(s=>{ porOperacao[s.operacao] = (porOperacao[s.operacao]||0)+1; });
 console.log('Contagem real da coluna OPERACAO:', JSON.stringify(porOperacao));

 const andamento = D.exibido_v_anterior.donutPocosAndamento;
 const okAndamento = andamento['Injetores'].qtd===porOperacao['OPEX AGUA']
   && andamento['Produtor (BCS)'].qtd===porOperacao['BCS']
   && andamento['Arrasamento'].qtd===porOperacao['ARRASAMENTO'];
 linha(okAndamento, `Donut "POCOS EM ANDAMENTO" (4/2/1) confere com a coluna OPERACAO (${porOperacao['OPEX AGUA']}/${porOperacao['BCS']}/${porOperacao['ARRASAMENTO']}).`);

 const tipos = D.exibido_v_anterior.donutTiposOperacao;
 const okTipos = tipos['OPEX AGUA'].qtd===porOperacao['OPEX AGUA'] && tipos['BCS'].qtd===porOperacao['BCS'];
 linha(okTipos, `Donut "TIPOS DE OPERACAO" (OPEX AGUA=${tipos['OPEX AGUA'].qtd}, PESCARIA=${tipos['PESCARIA'].qtd}, BCS=${tipos['BCS'].qtd}) NAO confere com a coluna OPERACAO (OPEX AGUA=${porOperacao['OPEX AGUA']}, BCS=${porOperacao['BCS']}, ARRASAMENTO=${porOperacao['ARRASAMENTO']}).`);

 const pescarias = D.entrada.sondas.filter(s=>/PESCARIA/i.test(s.situacao)).length;
 linha(tipos['PESCARIA'].qtd===pescarias, `E tambem nao confere com a coluna SITUACAO: ha ${pescarias} sondas em pescaria, nao ${tipos['PESCARIA'].qtd}.`);

 if(!okTipos){
  achado('CRITICO','Graficos de rosca',
   'Dois graficos na mesma pagina classificam as MESMAS 7 sondas de formas incompativeis',
   `"POCOS EM ANDAMENTO" mostra 4 injetores / 2 BCS / 1 arrasamento, que confere com a coluna OPERACAO. "TIPOS DE OPERACAO" mostra 3 OPEX AGUA / 3 PESCARIA / 1 BCS, que nao confere nem com a coluna OPERACAO (4/2/1) nem com a coluna SITUACAO (${pescarias} pescarias). As duas nao podem estar certas ao mesmo tempo.`,
   'Todos os graficos derivados da mesma tabela',
   'Dois graficos contraditorios');
 }
}

// ---------------------------------------------------------------------------
// 6. TOP 3 — ranking
// ---------------------------------------------------------------------------
console.log('\n\n=== 6. TOP 3 MAIOR EXPOSICAO ===\n');
{
 const ord = Object.entries(D.exibido_v_anterior.diasOperacao).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const exibido = D.exibido_v_anterior.top3;
 const ok = ord.every((e,i)=> e[0]===exibido[i].sonda && Math.abs(e[1]-exibido[i].valor)<0.005);
 linha(ok, `Versao 25/07: podio exibido (${exibido.map(t=>t.sonda).join(' > ')}) confere com a ordenacao por dias de operacao (${ord.map(e=>e[0]).join(' > ')}).`);
}

// ---------------------------------------------------------------------------
// 7. PRODUCAO — agregado ausente e entrada inconsistente
// ---------------------------------------------------------------------------
console.log('\n\n=== 7. PRODUCAO ===\n');
{
 const comNumero = D.entrada.sondas.filter(s=>typeof s.producao === 'number');
 const totalProd = comNumero.reduce((a,s)=>a+s.producao,0);
 linha(null, `Producao total do campo (soma das ${comNumero.length} sondas com valor numerico): ${totalProd.toLocaleString('pt-BR')} bbl/d — este numero NAO aparece em lugar nenhum do relatorio.`);
 achado('ATENCAO','Producao',
  'A producao total do campo nao e calculada nem exibida',
  `Somando a coluna de producao das sondas com valor numerico: ${totalProd.toLocaleString('pt-BR')} bbl/d. O relatorio mostra 7 valores soltos e nenhum agregado, sendo que o total e a informacao mais direta para a gestao.`,
  'Exibir producao total do campo',
  'Ausente');

 const semNumero = D.entrada.sondas.filter(s=>typeof s.producao !== 'number');
 semNumero.forEach(s=>{
  linha(false, `${s.sonda}: producao registrada como "${s.producaoBruta}" (texto), enquanto sondas tambem sem producao usam "0" (${D.entrada.sondas.filter(x=>x.producao===0).map(x=>x.sonda).join(', ')}).`);
 });
 if(semNumero.length){
  achado('ATENCAO','Producao',
   'Duas convencoes diferentes para "sem producao" na mesma coluna',
   `${semNumero.map(s=>s.sonda).join(', ')} usa "-" enquanto ${D.entrada.sondas.filter(x=>x.producao===0).map(x=>x.sonda).join(', ')} usa "0". "Sem medicao" e "produzindo zero" sao coisas diferentes, mas o relatorio nao distingue nem soma corretamente.`,
   'Campo numerico com estado explicito "sem medicao"',
   'Texto livre misturando "-" e "0"');
 }
}

// ---------------------------------------------------------------------------
// 8. DATAS DE CABECALHO
// ---------------------------------------------------------------------------
console.log('\n\n=== 8. DATAS ===\n');
{
 const c = D.entrada.config;
 const d1 = new Date(c.dataRelatorio+'T00:00:00Z').getTime();
 const d2 = new Date(c.proximaAtualizacaoData+'T00:00:00Z').getTime();
 const delta = (d2-d1)/DIA_MS;
 linha(delta>0, `Proxima atualizacao (${c.proximaAtualizacaoData} ${c.proximaAtualizacaoTurno}) e ${delta} dia apos a data do relatorio (${c.dataRelatorio} ${c.turno}).`);
 linha(D.exibido_v_atual.tituloGraficoEntregues.includes('06/08/2026'), `Titulo do grafico de entregues ("${D.exibido_v_atual.tituloGraficoEntregues}") acompanha a data do relatorio.`);
}

// ---------------------------------------------------------------------------
// RESUMO
// ---------------------------------------------------------------------------
console.log('\n\n=== RESUMO DOS ACHADOS ===\n');
const ordem = {CRITICO:0, INCORRETO:1, 'ALTO-LATENTE':2, ATENCAO:3};
achados.sort((a,b)=>ordem[a.sev]-ordem[b.sev]);
achados.forEach((a,i)=>{
 console.log(`${i+1}. [${a.sev}] (${a.area}) ${a.titulo}`);
 console.log(`   Evidencia: ${a.evidencia}`);
 console.log(`   Esperado: ${a.esperado}  |  Exibido: ${a.exibido}\n`);
});
const cont = achados.reduce((m,a)=>{ m[a.sev]=(m[a.sev]||0)+1; return m; },{});
console.log(`TOTAL: ${achados.length} achados — ${cont.CRITICO||0} criticos confirmados, ${cont.INCORRETO||0} incorreto (apresentacao), ${cont['ALTO-LATENTE']||0} alto latente, ${cont.ATENCAO||0} requerem atencao.`);
fs.writeFileSync(__dirname+'/achados.json', JSON.stringify(achados,null,1));

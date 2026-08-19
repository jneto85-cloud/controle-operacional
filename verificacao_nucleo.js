'use strict';
/*
 * verificacao_nucleo.js — suite de regressao do Relatorio Diario de Operacoes
 *
 * Espelha LITERALMENTE o nucleo de calculo do index.html (secao 1), sem DOM, para poder
 * rodar em Node. As referencias de comparacao sao calculadas do zero neste arquivo, a
 * partir da definicao de cada grandeza — nunca reutilizando a funcao do app como se fosse
 * a resposta certa.
 *
 * Rodar:  node verificacao_nucleo.js
 * Rodar em outro fuso: TZ=America/Sao_Paulo node verificacao_nucleo.js
 * Conferir que o espelho nao ficou defasado: node verificar_espelho.js
 */

// ============================================================
// NUCLEO ESPELHADO DO APP (identico a secao 1 do index.html)
// ============================================================
const DIA_MS = 86400000;
function msDe(dataISO, horaHM){
 if(!dataISO) return NaN;
 const [a,m,d] = String(dataISO).split('-').map(Number);
 const [h,min] = String(horaHM||'00:00').split(':').map(Number);
 if(![a,m,d].every(Number.isFinite)) return NaN;
 return Date.UTC(a, m-1, d, h||0, min||0);
}
function msDeInicio(valor){
 if(!valor) return NaN;
 const [data,hora] = String(valor).split('T');
 return msDe(data, hora);
}
function msFechamento(cfg){ return msDe(cfg.dataRelatorio, cfg.horaFechamento); }
function diasDeIntervencao(sonda, refMs){
 const ini = msDeInicio(sonda.inicioIntervencao);
 if(!Number.isFinite(ini) || !Number.isFinite(refMs)) return null;
 return (refMs - ini)/DIA_MS;
}
function duracaoDTM(sonda, refMs){
 const i = msDeInicio(sonda.inicioDTM);
 if(!Number.isFinite(i)) return null;
 const f = msDeInicio(sonda.fimDTM);
 if(Number.isFinite(f)) return {emAndamento:false, horas:(f-i)/3600000};
 if(!Number.isFinite(refMs)) return null;
 return {emAndamento:true, horas:(refMs-i)/3600000};
}
function contarPor(itens, chave){
 const m = new Map();
 itens.forEach(it=>{
  const k = String(chave(it)||'').trim().toUpperCase() || '(NÃO INFORMADO)';
  m.set(k, (m.get(k)||0)+1);
 });
 return [...m.entries()].map(([rotulo,qtd])=>({rotulo,qtd})).sort((a,b)=>b.qtd-a.qtd);
}
function comPercentual(itens, total){
 return itens.map(it=>({...it, pct: total>0 ? it.qtd/total*100 : 0}));
}
function somaArredondada(itens){ return itens.reduce((s,it)=>s+Math.round(it.pct),0); }
const PALETA = ['#d92d20','#e8890c','#1f9d55','#1d8fb8','#7b4fc9','#7a8794','#0d9488','#b45309'];
function colorir(itens, cores){
 return itens.map((it,i)=>({...it, cor: (cores && cores[i]) || PALETA[i % PALETA.length]}));
}
function computar(estado){
 const cfg = estado.config;
 const refMs = msFechamento(cfg);
 const sondas = estado.sondas.map(s=>{
  const dias = diasDeIntervencao(s, refMs);
  const emDTM = dias === null;
  const prod = (s.semMedicao || s.producao === '' || s.producao === null) ? null : Number(s.producao);
  return {...s, dias, emDTM, diasInvalido: !emDTM && dias < 0,
   dtm: duracaoDTM(s, refMs), producaoNum: Number.isFinite(prod) ? prod : null};
 });
 const total = sondas.length;
 const emIntervencao = sondas.filter(s=>!s.emDTM).length;
 const emDTM = total - emIntervencao;
 const ORDEM_CRIT = [
  {chave:'critica', rotulo:'CRÍTICAS', cor:'#d92d20'},
  {chave:'atencao', rotulo:'ATENÇÃO',  cor:'#e8890c'},
  {chave:'normal',  rotulo:'NORMAIS',  cor:'#1f9d55'}
 ];
 const criticidade = comPercentual(ORDEM_CRIT.map(c=>({...c, qtd: sondas.filter(s=>s.criticidade===c.chave).length})), total);
 const porOperacao = colorir(comPercentual(contarPor(sondas, s=>s.operacao), total), ['#1d8fb8','#1f9d55','#e8890c','#7b4fc9','#7a8794']);
 const porSituacao = colorir(comPercentual(contarPor(sondas, s=>s.situacao), total));
 const comMedicao = sondas.filter(s=>s.producaoNum !== null);
 const producaoTotal = comMedicao.reduce((a,s)=>a+s.producaoNum, 0);
 const entregues = estado.entregues.map(e=>({...e, entregue: Number(e.entregue)||0, meta: Number(e.meta)||0}));
 const totalEntregue = entregues.reduce((a,e)=>a+e.entregue, 0);
 const totalMeta = entregues.reduce((a,e)=>a+e.meta, 0);
 const atingimento = totalMeta > 0 ? totalEntregue/totalMeta*100 : null;
 const nptItens = estado.npt.map(n=>({rotulo:n.tipo, qtd:Number(n.qtd)||0}));
 const totalNpt = nptItens.reduce((a,n)=>a+n.qtd, 0);
 const npt = colorir(comPercentual(nptItens, totalNpt), ['#d92d20','#e8890c','#1d8fb8','#7b4fc9']);
 const top = sondas.filter(s=>!s.emDTM && !s.diasInvalido).slice().sort((a,b)=>b.dias-a.dias).slice(0,3);
 const precisaNotaPct = [criticidade, porOperacao, porSituacao, npt].some(g=> g.length>0 && somaArredondada(g) !== 100);
 return {refMs, sondas, total, emIntervencao, emDTM, criticidade, porOperacao, porSituacao,
  producaoTotal, qtdComMedicao: comMedicao.length, qtdSemMedicao: total - comMedicao.length,
  entregues, totalEntregue, totalMeta, atingimento, npt, totalNpt, top, precisaNotaPct};
}

// ============================================================
// DADOS DE 18/08/2026 — os mesmos embutidos no app
// ============================================================
const base = (sonda, poco, iDTM, fDTM, iInt) => ({
 sonda, poco, operacao:'', inicioDTM:iDTM, fimDTM:fDTM, inicioIntervencao:iInt,
 fiscal:'', engenheiro:'', coordenador:'', encarregado:'',
 criticidade:'normal', producao:'', semMedicao:false, runLife:'', situacao:'', proximaAcao:''
});
const estado = {
 config:{dataRelatorio:'2026-08-18', turno:'NOTURNO', horaFechamento:'20:00', limiteDias:7},
 sondas:[
  base('SPT-76', '7BRG-0004-SE','2026-08-15T16:00','2026-08-16T22:00','2026-08-16T22:00'),
  base('SPT-131','7-AN-0025-SE','2026-08-17T09:30','2026-08-18T13:30','2026-08-18T13:30'),
  base('SPT-28', 'CP-2139D-SE', '2026-08-18T08:45','2026-08-18T16:00','2026-08-18T16:00'),
  base('SPT-61', 'Base Conterp','2026-08-17T08:00','',''),
  base('SPT-154','CP-1166-SE',  '2026-08-02T02:30','2026-08-02T21:00','2026-08-02T21:00'),
  base('SPT-92', 'RO-0080-SE',  '2026-08-08T22:00','2026-08-09T13:00','2026-08-09T13:00'),
  base('SPT-53', 'CP-705-SE',   '2026-08-14T10:45','2026-08-14T17:15','2026-08-14T17:15'),
  base('SPT-82', 'CP-2140D-SE', '2026-08-11T04:00','2026-08-11T10:00','2026-08-11T10:00')
 ],
 entregues:[
  {categoria:'Injetores',meta:0,entregue:0},{categoria:'Completação (Óleo)',meta:0,entregue:0},
  {categoria:'Produtor (WO)',meta:0,entregue:0},{categoria:'Pulling',meta:0,entregue:0},
  {categoria:'Arrasamento',meta:0,entregue:0},{categoria:'Captação',meta:0,entregue:0}
 ],
 npt:[], destaques:[], recomendacoes:[], notaNpt:''
};

// ============================================================
// TESTES
// ============================================================
let ok=0, falha=0;
function t(nome, condicao, detalhe){
 if(condicao) ok++; else falha++;
 console.log(`${condicao?'OK  ':'FALHA'} | ${nome}${detalhe?'  ->  '+detalhe:''}`);
}
const c = computar(estado);
const REF_MS = Date.UTC(2026,7,18,20,0);   // 18/08/2026 20:00, calculado do zero
const H = 3600000;

console.log('=== 1. DIAS DE INTERVENCAO (contados do inicio da intervencao) ===');
const esperado = {
 'SPT-76':1.9166666667,'SPT-131':0.2708333333,'SPT-28':0.1666666667,'SPT-61':null,
 'SPT-154':15.9583333333,'SPT-92':9.2916666667,'SPT-53':4.1145833333,'SPT-82':7.4166666667
};
c.sondas.forEach(s=>{
 const esp = esperado[s.sonda];
 if(esp === null){
  t(`${s.sonda}: sem inicio de intervencao -> dias = null (em DTM)`, s.dias===null && s.emDTM===true);
  return;
 }
 // referencia independente, sem usar as funcoes do app
 const [d,h] = s.inicioIntervencao.split('T');
 const [A,M,Dd] = d.split('-').map(Number), [Hh,Mi] = h.split(':').map(Number);
 const ref = (REF_MS - Date.UTC(A,M-1,Dd,Hh,Mi))/DIA_MS;
 t(`${s.sonda}: ${s.dias.toFixed(4)} dias`, Math.abs(s.dias-ref)<1e-9 && Math.abs(s.dias-esp)<1e-6,
   `referencia independente = ${ref.toFixed(4)}`);
});

console.log('\n=== 2. SONDA EM DTM NAO RECEBE DIAS INVENTADOS ===');
{
 const spt61 = c.sondas.find(s=>s.sonda==='SPT-61');
 t('SPT-61 marcada como emDTM', spt61.emDTM===true);
 t('SPT-61 nao entra no TOP 3', !c.top.some(s=>s.sonda==='SPT-61'));
 t('SPT-61 nao e contada como "diasInvalido" (nao e erro, e estado normal)', spt61.diasInvalido===false);
 t('Contagem: 7 em intervencao + 1 em DTM = 8', c.emIntervencao===7 && c.emDTM===1 && c.total===8,
   `${c.emIntervencao} + ${c.emDTM} = ${c.total}`);
}

console.log('\n=== 3. DURACAO DO DTM ===');
const dtmEsperado = {'SPT-76':30,'SPT-131':28,'SPT-28':7.25,'SPT-154':18.5,'SPT-92':15,'SPT-53':6.5,'SPT-82':6};
c.sondas.filter(s=>s.fimDTM).forEach(s=>{
 const [d1,h1]=s.inicioDTM.split('T'), [d2,h2]=s.fimDTM.split('T');
 const p=(d,h)=>{const[A,M,D]=d.split('-').map(Number),[Hh,Mi]=h.split(':').map(Number);return Date.UTC(A,M-1,D,Hh,Mi);};
 const ref=(p(d2,h2)-p(d1,h1))/H;
 t(`${s.sonda}: DTM de ${s.dtm.horas.toFixed(2)} h`,
   Math.abs(s.dtm.horas-ref)<1e-9 && Math.abs(s.dtm.horas-dtmEsperado[s.sonda])<1e-6 && s.dtm.emAndamento===false,
   `referencia = ${ref.toFixed(2)} h`);
});
{
 const spt61 = c.sondas.find(s=>s.sonda==='SPT-61');
 const ref = (REF_MS - Date.UTC(2026,7,17,8,0))/H;   // 36 h
 t('SPT-61: DTM em andamento, contado ate o fechamento',
   spt61.dtm.emAndamento===true && Math.abs(spt61.dtm.horas-ref)<1e-9 && Math.abs(spt61.dtm.horas-36)<1e-6,
   `${spt61.dtm.horas.toFixed(2)} h (referencia ${ref.toFixed(2)} h)`);
}

console.log('\n=== 4. REGRESSAO DO BUG CRITICO: o relogio do sistema nao pode influenciar ===');
{
 const antes = computar(estado).sondas.map(s=>s.dias);
 const _now = Date.now; Date.now = ()=> _now() + 30*DIA_MS;
 const depois = computar(estado).sondas.map(s=>s.dias);
 Date.now = _now;
 t('Adiantar o relogio do sistema em 30 dias nao altera nenhum valor', JSON.stringify(antes)===JSON.stringify(depois));
}
t('Fuso horario nao influencia (rodando em '+(process.env.TZ||'fuso do sistema')+')',
  Math.abs(c.sondas.find(s=>s.sonda==='SPT-154').dias - 15.958333333333334) < 1e-12);

console.log('\n=== 5. FONTE UNICA DE VERDADE: todo agrupamento soma o total de sondas ===');
t('Criticidade soma 8', c.criticidade.reduce((a,i)=>a+i.qtd,0)===8);
t('Por operacao soma 8', c.porOperacao.reduce((a,i)=>a+i.qtd,0)===8);
t('Por situacao soma 8', c.porSituacao.reduce((a,i)=>a+i.qtd,0)===8);
t('Campos ainda em branco viram "(NAO INFORMADO)" em vez de sumirem da contagem',
  c.porOperacao[0].rotulo==='(NÃO INFORMADO)' && c.porOperacao[0].qtd===8);

console.log('\n=== 6. TOP 3 ===');
t('Podio correto: SPT-154 > SPT-92 > SPT-82',
  c.top.map(s=>s.sonda).join(' > ')==='SPT-154 > SPT-92 > SPT-82',
  c.top.map(s=>`${s.sonda} ${s.dias.toFixed(2)}`).join(' | '));
t('Ordenado por dias decrescente', c.top[0].dias>=c.top[1].dias && c.top[1].dias>=c.top[2].dias);
t('Nenhum empate com 2 decimais', new Set(c.top.map(s=>s.dias.toFixed(2))).size===c.top.length);

console.log('\n=== 7. PERCENTUAIS DERIVADOS ===');
{
 const nm = c.criticidade.find(i=>i.chave==='normal');
 t('8 de 8 em Normal = 100%', nm.qtd===8 && Math.abs(nm.pct-100)<1e-9);
 t('Categorias com 0 sonda tem 0% (nao NaN)', c.criticidade.filter(i=>i.qtd===0).every(i=>i.pct===0));
 // quantidades iguais -> percentuais iguais (o achado "29% e 28%")
 const alt = JSON.parse(JSON.stringify(estado));
 alt.sondas[0].criticidade='critica'; alt.sondas[1].criticidade='critica'; alt.sondas[2].criticidade='critica';
 alt.sondas[3].criticidade='atencao'; alt.sondas[4].criticidade='atencao';
 const c2 = computar(alt);   // 3 criticas, 2 atencao, 3 normais de 8
 const at = c2.criticidade.find(i=>i.chave==='atencao');
 const cr = c2.criticidade.find(i=>i.chave==='critica');
 const nr = c2.criticidade.find(i=>i.chave==='normal');
 t('3 criticas e 3 normais -> percentuais identicos', Math.round(cr.pct)===Math.round(nr.pct),
   `${Math.round(cr.pct)}% e ${Math.round(nr.pct)}%`);
 t('2 atencao de 8 = 25%', Math.round(at.pct)===25);
}

console.log('\n=== 8. NPT VAZIO NAO QUEBRA ===');
t('Sem eventos de NPT, total = 0', c.totalNpt===0);
t('Sem eventos de NPT, lista vazia e sem NaN', c.npt.length===0);
{
 const alt = JSON.parse(JSON.stringify(estado));
 alt.npt=[{tipo:'Mecanico',qtd:2},{tipo:'Operacional',qtd:1}];
 const c2 = computar(alt);
 t('Ao adicionar 2 e 1, percentuais viram 67% e 33% sozinhos',
   Math.round(c2.npt[0].pct)===67 && Math.round(c2.npt[1].pct)===33);
}

console.log('\n=== 9. PRODUCAO E POCOS ENTREGUES ===');
t('Nenhuma producao informada -> total 0 e nao NaN', c.producaoTotal===0 && Number.isFinite(c.producaoTotal));
t('8 sondas sem medicao', c.qtdSemMedicao===8);
{
 const alt = JSON.parse(JSON.stringify(estado));
 alt.sondas[4].producao=1233; alt.sondas[5].producao=760; alt.sondas[7].producao=20;
 const c2 = computar(alt);
 t('Com 3 producoes informadas, total = 2013', c2.producaoTotal===2013, String(c2.producaoTotal));
 t('E as outras 5 continuam fora da soma', c2.qtdSemMedicao===5);
}
t('Sem meta definida, atingimento e nulo (nao divide por zero)', c.atingimento===null);

console.log('\n=== 10. CASOS-LIMITE ===');
{
 const vazio = computar({config:{dataRelatorio:'2026-08-18',horaFechamento:'20:00'}, sondas:[], entregues:[], npt:[], destaques:[], recomendacoes:[]});
 t('Relatorio sem nenhuma sonda nao quebra', vazio.total===0 && vazio.producaoTotal===0 && vazio.top.length===0);
 t('Sem sondas, percentuais sao 0 e nao NaN', vazio.criticidade.every(i=>i.pct===0));

 const inval = JSON.parse(JSON.stringify(estado));
 inval.sondas.push(base('SPT-XX','TESTE','2026-09-01T00:00','2026-09-01T06:00','2026-09-01T06:00'));
 const ci = computar(inval);
 const xx = ci.sondas.find(s=>s.sonda==='SPT-XX');
 t('Intervencao que comeca DEPOIS do fechamento e marcada como invalida', xx.diasInvalido===true, `dias = ${xx.dias.toFixed(2)}`);
 t('Sonda invalida fica fora do TOP 3', !ci.top.some(s=>s.sonda==='SPT-XX'));

 const semData = computar({config:{dataRelatorio:'',horaFechamento:''}, sondas:estado.sondas, entregues:[], npt:[], destaques:[], recomendacoes:[]});
 t('Fechamento vazio nao gera NaN silencioso (tudo cai em emDTM)', semData.sondas.every(s=>s.emDTM===true));

 const semDTM = computar({config:{dataRelatorio:'2026-08-18',horaFechamento:'20:00'},
  sondas:[base('SPT-ZZ','X','','','2026-08-17T00:00')], entregues:[], npt:[], destaques:[], recomendacoes:[]});
 t('Sonda sem DTM registrado nao quebra (dtm = null)', semDTM.sondas[0].dtm===null && Math.abs(semDTM.sondas[0].dias-1.8333333)<1e-6);
}

console.log(`\n=== RESUMO: ${ok} OK / ${falha} FALHAS de ${ok+falha} ===`);
if(falha>0) process.exitCode = 1;

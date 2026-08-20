'use strict';
/*
 * verificacao.js — suite de verificacao do Controle Operacional.
 *
 * Roda em Chromium de verdade. Os valores de referencia sao calculados AQUI, do zero,
 * a partir das datas de inicio e do instante de fechamento — nunca lidos de volta do
 * proprio app. Assim o teste nao "concorda" com um erro do app.
 *
 * Rodar: node verificacao.js
 */
const {chromium} = require('playwright');
const path = require('path');

const URL_APP = 'file://' + path.join(__dirname, 'index.html');
const DIA = 86400000;
const FECHAMENTO = '2026-08-19T18:55';

// Dados da planilha operacional de 19/08/2026, transcritos a mao para servir de
// referencia independente. A coluna "dias" e a que a planilha mostra.
const PLANILHA = [
 {sonda:'SPT-28',  poco:'CP-648-SE',     inicio:'2026-08-18T16:00', dias:'1,12',  crit:'NORMAL',  motivo:'NÃO'},
 {sonda:'SPT-53',  poco:'CP-705A-SE',   inicio:'2026-08-14T17:15', dias:'5,07',  crit:'ATENÇÃO', motivo:'PESCARIA'},
 {sonda:'SPT-76',  poco:'BRG-0004-SE',  inicio:'2026-08-16T22:00', dias:'2,87',  crit:'NORMAL',  motivo:'NÃO'},
 {sonda:'SPT-82',  poco:'CP-2140D-SE',  inicio:'2026-08-11T10:00', dias:'8,37',  crit:'ATENÇÃO', motivo:'EXCESSO DE DIAS'},
 {sonda:'SPT-92',  poco:'RO-80-SE',     inicio:'2026-08-09T14:30', dias:'10,18', crit:'CRÍTICA', motivo:'FURO REVESTIMENTO'},
 {sonda:'SPT-131', poco:'7-AN-25',      inicio:'2026-08-18T13:30', dias:'1,23',  crit:'NORMAL',  motivo:'NÃO'},
 {sonda:'SPT-154', poco:'7-CP-1166-SE', inicio:'2026-08-02T21:00', dias:'16,91', crit:'NORMAL',  motivo:'NÃO'}
];
// SPT-61 esta na planilha mas sem poco — o app nao a inclui nos indicadores e precisa
// declarar isso no proprio relatorio.
const EXCLUIDA = 'SPT-61';

let ok = 0, falha = 0;
function t(nome, cond, det){
 if(cond) ok++; else falha++;
 console.log(`${cond?'OK  ':'FALHA'} | ${nome}${det?'  ->  '+det:''}`);
}
const relogio = d => `{
  const D=Date, off=${d}*86400000;
  const F=function(...a){return a.length? new D(...a) : new D(D.now()+off)};
  F.now=()=>D.now()+off; F.UTC=D.UTC; F.parse=D.parse; F.prototype=D.prototype;
  window.Date=F;
}`;

async function ler(page){
 return page.evaluate(()=>{
  const sub = document.querySelector('.report-sub');
  const linhas = [...document.querySelectorAll('.screen-table tbody tr')].map(tr=>{
   const c=[...tr.querySelectorAll('td')].map(td=>td.innerText.trim());
   return {sonda:c[0], poco:c[1], metodo:c[2], dias:c[3], producao:c[4], runlife:c[5], crit:c[6], motivo:c[7]};
  });
  const kpis = [...document.querySelectorAll('.kpi')].map(k=>({
   rotulo:(k.querySelector('.kpi-label')||{}).innerText||'',
   valor:(k.querySelector('.kpi-value')||{}).innerText||'',
   nota:(k.querySelector('.kpi-note')||{}).innerText||''
  }));
  const cores={};
  document.querySelectorAll('.rank-row').forEach(r=>{
   const nome=((r.querySelector('.rank-name')||{}).innerText||'').split('\n')[0].trim();
   const f=r.querySelector('.rank-fill'); if(!f) return;
   (cores[nome]=cores[nome]||[]).push(f.style.background||getComputedStyle(f).backgroundColor);
  });
  const eqCard=[...document.querySelectorAll('.report-card')].find(c=>/Equipe e empresa/i.test(c.innerText));
  const equipe=eqCard?[...eqCard.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>td.innerText.trim())):[];
  const aviso=document.querySelector('.report-excluidas');
  return {sub:sub?sub.innerText:'', linhas, kpis, cores, equipe, aviso:aviso?aviso.innerText:''};
 });
}

(async ()=>{
 const browser = await chromium.launch();
 const ctx = await browser.newContext({viewport:{width:1400,height:1000}});
 const erros=[];
 ctx.on('page', p=>{
  p.on('pageerror', e=>erros.push('pageerror: '+e));
  p.on('console', m=>{ if(m.type()==='error') erros.push('console: '+m.text().slice(0,160)); });
 });
 const page = await ctx.newPage();
 await page.goto(URL_APP, {waitUntil:'load'});
 await page.waitForTimeout(1400);

 console.log('=== 1. CARREGAMENTO ===');
 t('Carrega sem erro de JavaScript', erros.length===0, erros.join(' | ')||'nenhum');
 t('Ja abre FECHADO em 19/08/2026 18:55',
   (await page.locator('#closing-badge').innerText()).trim()==='FECHADO');

 const r = await ler(page);
 t('Cabecalho mostra a data e a hora do fechamento',
   /19\/08\/2026/.test(r.sub) && /FECHADO às 18:55/.test(r.sub), r.sub);

 console.log('\n=== 2. OS DIAS BATEM COM A PLANILHA ===');
 // referencia independente: dias = fechamento - inicio
 const refMs = new Date(FECHAMENTO).getTime();
 PLANILHA.forEach(esp=>{
  const linha = r.linhas.find(l=>l.sonda===esp.sonda);
  if(!linha){ t(`${esp.sonda} presente no relatorio`, false, 'nao encontrada'); return; }
  const calc = (refMs - new Date(esp.inicio).getTime())/DIA;
  const calcTxt = calc.toFixed(2).replace('.',',');
  t(`${esp.sonda}: ${linha.dias} dias`,
    linha.dias===esp.dias && calcTxt===esp.dias,
    `planilha ${esp.dias} | calculo independente ${calcTxt}`);
 });

 console.log('\n=== 3. DEMAIS COLUNAS CONFEREM COM A PLANILHA ===');
 PLANILHA.forEach(esp=>{
  const l = r.linhas.find(x=>x.sonda===esp.sonda) || {};
  t(`${esp.sonda}: poco, criticidade e motivo`,
    l.poco===esp.poco && l.crit===esp.crit && l.motivo===esp.motivo,
    `${l.poco} | ${l.crit} | ${l.motivo}`);
 });
 t('Motivos novos nao foram engolidos para "NÃO"',
   r.linhas.some(l=>l.motivo==='FURO REVESTIMENTO') && r.linhas.some(l=>l.motivo==='EXCESSO DE DIAS'));
 t('Metodo "Conversão BM → Água" nao virou "Opex Água"',
   r.linhas.filter(l=>l.metodo==='Conversão BM → Água').length===2);

 console.log('\n=== 4. A SONDA INCOMPLETA E DECLARADA NO RELATORIO ===');
 t(`${EXCLUIDA} nao entra nos indicadores (esta sem poco na planilha)`,
   !r.linhas.some(l=>l.sonda===EXCLUIDA));
 t('...mas o relatorio avisa que ela ficou de fora, e por que',
   new RegExp(EXCLUIDA).test(r.aviso) && /poço/i.test(r.aviso), r.aviso||'SEM AVISO');
 t('O aviso diz quantas sondas restaram', /7 sondas completas/.test(r.aviso));

 console.log('\n=== 5. QUADRO DE EQUIPE E EMPRESA ===');
 t('Quadro de equipe presente', r.equipe.length>0, r.equipe.length+' linhas');
 t('Traz engenheiro, fiscal e encarregado',
   r.equipe.some(l=>l.join('|').includes('Ricardo Freitas')) &&
   r.equipe.some(l=>l.join('|').includes('Antônio Carlos')) &&
   r.equipe.some(l=>l.join('|').includes('Márcio Alves')));
 t('Traz empresa e revestimento',
   r.equipe.some(l=>l.includes('PERBRÁS')) && r.equipe.some(l=>l.includes('7\" - 23 lb/pé')));
 t('Campo em branco na planilha aparece como "—", nao inventado',
   r.equipe.some(l=>l.includes('—')));

 console.log('\n=== 6. FAIXA DE INDICADORES ===');
 {
  const norm = x=>x.toLocaleUpperCase('pt-BR');
  const rot = r.kpis.map(k=>k.rotulo.trim());
  t('Criticidade em sequencia (Critica, Atencao, Normal)',
    rot.slice(0,3).map(norm).join('|')===['Crítica','Atenção','Normal'].map(norm).join('|'), rot.join(' / '));
  const soma = r.kpis.slice(0,3).map(k=>parseInt(k.nota,10)||0).reduce((a,b)=>a+b,0);
  t('Os tres somam ~100%', Math.abs(soma-100)<=1, soma+'%');
  // referencia independente a partir da planilha
  const alto = PLANILHA.filter(p=>p.crit==='CRÍTICA').length;
  const media = PLANILHA.filter(p=>p.crit==='ATENÇÃO').length;
  const normal = PLANILHA.filter(p=>p.crit==='NORMAL').length;
  t('Contagens batem com a planilha (1 critica, 2 atencao, 4 normal)',
    r.kpis[0].valor===String(alto) && r.kpis[1].valor===String(media) && r.kpis[2].valor===String(normal),
    `${r.kpis[0].valor}/${r.kpis[1].valor}/${r.kpis[2].valor}`);
  const pesc = r.kpis.find(k=>/pescaria/i.test(k.rotulo));
  t('Pescaria fora da escala de criticidade, sem porcentagem solta',
    Boolean(pesc) && !/%/.test(pesc.nota), pesc?`"${pesc.rotulo}" nota="${pesc.nota}"`:'ausente');
 }

 console.log('\n=== 7. MESMA SONDA, MESMA COR NOS DOIS PAINEIS ===');
 {
  const conflito = Object.entries(r.cores).filter(([,cs])=>new Set(cs).size>1);
  t('Nenhuma sonda com cores diferentes entre os paineis', conflito.length===0,
    conflito.length? conflito.map(([s,cs])=>`${s}: ${[...new Set(cs)].join(' vs ')}`).join(' | ')
                   : Object.keys(r.cores).length+' sondas conferidas');
 }

 console.log('\n=== 8. GRAFICO DE ENTREGUES COM REFERENCIA DO PLANO ===');
 t('Barras hachuradas do plano presentes', (await page.locator('.bar-ghost').count())>0);
 t('Legenda explicando a hachura', (await page.locator('.ghost-note').count())>0);

 console.log('\n=== 9. FECHADO: o relogio nao pode mudar nada (a correcao principal) ===');
 {
  const page2 = await ctx.newPage();
  await page2.addInitScript(relogio(30));
  await page2.goto(URL_APP, {waitUntil:'load'});
  await page2.waitForTimeout(1400);
  const d = await ler(page2);
  t('Relogio 30 dias a frente NAO altera nenhum dia',
    JSON.stringify(r.linhas)===JSON.stringify(d.linhas),
    JSON.stringify(r.linhas)===JSON.stringify(d.linhas)?'nenhum numero mudou':'MUDOU');
  t('Cabecalho tambem fica congelado', r.sub===d.sub, `"${d.sub}"`);
  await page2.close();
 }

 console.log('\n=== 10. ALTERNAR PARA AO VIVO E VOLTAR ===');
 await page.click('#closing-toggle');
 await page.waitForTimeout(700);
 const vivo = await ler(page);
 t('Selo passa para AO VIVO', (await page.locator('#closing-badge').innerText()).trim()==='AO VIVO');
 t('Cabecalho passa a dizer "Ao vivo"', /Ao vivo/i.test(vivo.sub), vivo.sub);
 t('Os dias mudam (passam a contar ate agora)',
   JSON.stringify(vivo.linhas)!==JSON.stringify(r.linhas));
 await page.click('#closing-toggle');
 await page.waitForTimeout(700);
 t('Voltando a fechar, volta para FECHADO',
   (await page.locator('#closing-badge').innerText()).trim()==='FECHADO');

 console.log('\n=== 11. RECURSOS ORIGINAIS PRESERVADOS ===');
 for(const [rot,sel] of [['Busca','#search-input, input[type=search]'],
                         ['Exportar Excel','#excel-button'],
                         ['Copiar WhatsApp','#copy-button'],
                         ['Relatorio HD','#png-button'],
                         ['Instalar','#install-button']]){
  t(rot+' continua na tela', (await page.locator(sel).count())>0);
 }
 for(const v of ['editor','planning','dashboard']){
  await page.click(`[data-view="${v}"]`); await page.waitForTimeout(450);
  t('Aba '+v+' abre sem erro', (await page.locator(`#${v}-view`).count())>0);
 }

 console.log('\n=== 12. TOTAIS DO PLANEJAMENTO ===');
 {
  await page.click('[data-view="dashboard"]'); await page.waitForTimeout(500);
  const txt = await page.locator('#dashboard-view').innerText();
  t('Total planejado = 33', (txt.match(/TOTAL PLANEJADO:\s*(\d+)/)||[])[1]==='33');
  t('Total entregue = 4', (txt.match(/TOTAL ENTREGUE:\s*(\d+)/)||[])[1]==='4');
  t('Eficiencia = 12% (4/33)', (txt.match(/Eficiência\s*(\d+)%/)||[])[1]==='12');
 }

 console.log('\n=== 13. LISTAS DE ESCOLHA (empresa e revestimento) ===');
 {
  const EMPRESAS = ['CONTERP','PERBRÁS','BRASERV'];
  const REVESTIMENTOS = ['5 1/2" - 14 lb/pé','5 1/2" - 15,5 lb/pé','5 1/2" - 17 lb/pé',
    '5 1/2" - 20 lb/pé','5 1/2" - 23 lb/pé','7" - 20 lb/pé','7" - 23 lb/pé','7" - 26 lb/pé'];

  await page.click('[data-view="editor"]');
  await page.waitForTimeout(800);
  const li = await page.evaluate(()=>{
   const q = x => [...document.querySelectorAll(x)];
   const emp = q('select[data-field="empresa"]'), rev = q('select[data-field="revestimento"]');
   return {
    qtdEmp: emp.length, qtdRev: rev.length,
    opEmp: emp.length ? [...emp[0].options].map(o=>o.value) : [],
    opRev: rev.length ? [...rev[0].options].map(o=>o.value) : [],
    linhas: q('.edit-card').map(c=>({
      sonda:(c.querySelector('input[data-field="sonda"]')||{}).value,
      empresa:(c.querySelector('select[data-field="empresa"]')||{}).value,
      revestimento:(c.querySelector('select[data-field="revestimento"]')||{}).value
    }))
   };
  });

  t('Empresa virou lista de escolha em todas as sondas', li.qtdEmp===8, li.qtdEmp+' selects');
  t('Revestimento virou lista de escolha em todas as sondas', li.qtdRev===8, li.qtdRev+' selects');
  t('Lista de empresa tem exatamente os 3 itens pedidos, mais a opcao vazia',
    li.opEmp.length===4 && li.opEmp[0]==='' && EMPRESAS.every((e,i)=>li.opEmp[i+1]===e),
    li.opEmp.join(' | '));
  t('Lista de revestimento tem exatamente os 8 itens pedidos, mais a opcao vazia',
    li.opRev.length===9 && li.opRev[0]==='' && REVESTIMENTOS.every((r2,i)=>li.opRev[i+1]===r2),
    li.opRev.length+' opcoes');

  // O ponto que mais importa: campo vazio TEM que continuar vazio. Sem a opcao vazia
  // o navegador selecionaria o primeiro item da lista e inventaria dado.
  const vazios = [['SPT-28','empresa'],['SPT-61','revestimento'],['SPT-76','revestimento']];
  vazios.forEach(([sonda,campo])=>{
   const l = li.linhas.find(x=>x.sonda===sonda) || {};
   t(`${sonda}: ${campo} em branco na planilha continua em branco`, l[campo]==='',
     `valor = "${l[campo]}"`);
  });

  // Migracao da grafia antiga
  const esperado = {
   'SPT-28':['', '7" - 26 lb/pé'], 'SPT-53':['BRASERV','7" - 23 lb/pé'],
   'SPT-61':['CONTERP',''], 'SPT-76':['CONTERP',''],
   'SPT-82':['PERBRÁS','7" - 23 lb/pé'], 'SPT-92':['PERBRÁS','7" - 23 lb/pé'],
   'SPT-131':['BRASERV','5 1/2" - 15,5 lb/pé'], 'SPT-154':['BRASERV','5 1/2" - 15,5 lb/pé']
  };
  const migradas = li.linhas.filter(l=>esperado[l.sonda])
    .every(l=>l.empresa===esperado[l.sonda][0] && l.revestimento===esperado[l.sonda][1]);
  t('Todos os valores antigos migraram para a grafia da lista', migradas,
    li.linhas.map(l=>`${l.sonda}:${l.empresa||'-'}/${l.revestimento||'-'}`).join(' | '));

  // Valor fora da lista nao pode ser descartado em silencio
  const fora = await page.evaluate(()=>{
   const bruto = localStorage.getItem('controle-operacional-state-v3');
   const st = JSON.parse(bruto);
   st.rows[0].revestimento = '9 5/8" - 47 lb/pé';
   st.rows[0].empresa = 'EMPRESA NOVA';
   localStorage.setItem('controle-operacional-state-v3', JSON.stringify(st));
   return true;
  });
  await page.reload({waitUntil:'load'});
  await page.waitForTimeout(1300);
  await page.click('[data-view="editor"]');
  await page.waitForTimeout(800);
  const preservado = await page.evaluate(()=>{
   const c = document.querySelector('.edit-card');
   const rev = c.querySelector('select[data-field="revestimento"]');
   const emp = c.querySelector('select[data-field="empresa"]');
   return {rev: rev.value, emp: emp.value,
           rotulo: [...rev.options].find(o=>o.selected).text};
  });
  t('Valor fora da lista e preservado, nao trocado pelo primeiro item',
    preservado.rev==='9 5/8" - 47 lb/pé' && preservado.emp==='EMPRESA NOVA',
    `rev="${preservado.rev}" emp="${preservado.emp}"`);
  t('...e aparece marcado como "(fora da lista)"', /fora da lista/.test(preservado.rotulo),
    preservado.rotulo);
 }

 t('Nenhum erro de JavaScript na sessao inteira', erros.length===0, erros.join(' | ')||'nenhum');

 await browser.close();
 console.log(`\n=== RESUMO: ${ok} OK / ${falha} FALHAS de ${ok+falha} ===`);
 if(falha) process.exitCode = 1;
})();

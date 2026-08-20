'use strict';
/*
 * verificacao_pescaria.js — testes do modulo de pescaria, em Chromium de verdade.
 *
 * Confere: dias de pescaria contados a partir do inicio da PESCARIA (e nao da
 * intervencao), folga contra o ID do revestimento, relacao do peixe com os
 * canhoneados, manobras como registro, limite de manobras, persistencia e o
 * isolamento (as sondas fora de pescaria nao veem o bloco).
 *
 * Rodar: node verificacao_pescaria.js
 */
const {chromium}=require('playwright');
let ok=0,f=0;
const t=(n,c,d)=>{c?ok++:f++;console.log(`${c?'OK  ':'FALHA'} | ${n}${d?'  ->  '+d:''}`);};
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1600,height:1000}});
 const erros=[]; ctx.on('page',p=>{p.on('pageerror',e=>erros.push(String(e)));p.on('console',m=>{if(m.type()==='error')erros.push(m.text().slice(0,180));});});
 const p=await ctx.newPage();
 await p.goto('file://'+require('path').join(__dirname,'index.html'));
 await p.waitForTimeout(1500);
 await p.click('[data-view="editor"]'); await p.waitForTimeout(800);

 const card = p.locator('.edit-card').filter({has:p.locator('input[data-field="sonda"][value="SPT-53"]')});
 const idx = 1; // SPT-53 e a 2a linha

 const set = async (campo,valor)=>{
  await p.fill(`[data-index="${idx}"][data-field="${campo}"]`, valor);
  await p.dispatchEvent(`[data-index="${idx}"][data-field="${campo}"]`,'change');
  await p.waitForTimeout(250);
 };
 const chips = async ()=> p.evaluate(i=>{
   const c=[...document.querySelectorAll('.edit-card')][i];
   return [...c.querySelectorAll('.pesc-chip')].map(x=>({txt:x.innerText.trim(),alerta:x.classList.contains('alerta')}));
 }, idx);
 const avisos = async ()=> p.evaluate(i=>{
   const c=[...document.querySelectorAll('.edit-card')][i];
   return [...c.querySelectorAll('.pesc-avisos div')].map(x=>x.innerText.trim());
 }, idx);

 console.log('=== 1. DIAS DE PESCARIA (separado dos dias de intervencao) ===');
 await set('pescInicio','2026-08-16T08:00');
 // referencia independente: 16/08 08:00 -> 19/08 18:55
 const ref = (new Date('2026-08-19T18:55') - new Date('2026-08-16T08:00'))/86400000;
 const ch1 = await chips();
 const diasChip = ch1.find(c=>/dias de pescaria/.test(c.txt));
 t('Mostra os dias de pescaria', !!diasChip, diasChip?diasChip.txt:'ausente');
 t('Bate com o calculo independente ('+ref.toFixed(2)+' d)',
   diasChip && diasChip.txt.replace(',','.').startsWith(ref.toFixed(2)), diasChip?diasChip.txt:'-');
 const linha = await p.evaluate(()=>{
   const tr=[...document.querySelectorAll('.screen-table tbody tr')].find(x=>/SPT-53/.test(x.innerText));
   return tr?[...tr.querySelectorAll('td')][3].innerText.trim():'';
 });
 t('Dias de INTERVENCAO continuam 5,07 (nao foram afetados)', linha==='5,07', linha);

 console.log('\n=== 2. FOLGA CONTRA O ID DO REVESTIMENTO ===');
 await set('pescDiametroPeixe','3,5');
 let ch = await chips();
 let folga = ch.find(c=>/folga/.test(c.txt));
 // SPT-53 esta em 7" - 23 lb/pe -> ID 6,366"
 t('Calcula a folga (6,366 - 3,5 = 2,866)', folga && /2,866/.test(folga.txt), folga?folga.txt:'ausente');
 t('Folga folgada nao dispara alerta', folga && !folga.alerta);

 await set('pescDiametroPeixe','6,3');
 ch = await chips(); folga = ch.find(c=>/folga/.test(c.txt));
 let av = await avisos();
 t('Folga apertada (0,066") vira alerta', folga && folga.alerta, folga?folga.txt:'-');
 t('...com aviso para conferir o catalogo', av.some(a=>/cat[áa]logo/i.test(a)), av.join(' | '));

 await set('pescDiametroPeixe','6,5');
 ch = await chips(); av = await avisos();
 t('Peixe maior que o revestimento vira alerta de dado incoerente',
   av.some(a=>/maior ou igual/i.test(a)), av.join(' | '));
 await set('pescDiametroPeixe','3,5');

 console.log('\n=== 3. PEIXE X CANHONEADOS ===');
 await set('pescTopoPeixe','1200'); await set('pescExtensaoPeixe','15');
 ch = await chips();
 t('Mostra topo e base do peixe (1200 a 1215)',
   ch.some(c=>/1\.?200.*1\.?215/.test(c.txt)), (ch.find(c=>/peixe de/.test(c.txt))||{}).txt||'-');
 await set('pescCanhTopo','1250'); await set('pescCanhBase','1280');
 ch = await chips();
 t('Peixe acima dos canhoneados', ch.some(c=>/acima dos canhoneados/.test(c.txt)));
 await set('pescCanhTopo','1205'); await set('pescCanhBase','1240');
 ch = await chips(); av = await avisos();
 t('Peixe sobre os canhoneados, com alerta',
   ch.some(c=>/sobre os canhoneados/.test(c.txt) && c.alerta) && av.some(a=>/sobre o intervalo/i.test(a)));
 await set('pescCanhTopo','1100'); await set('pescCanhBase','1150');
 ch = await chips();
 t('Peixe abaixo dos canhoneados', ch.some(c=>/abaixo dos canhoneados/.test(c.txt)));

 console.log('\n=== 4. MANOBRAS SAO REGISTRO, NAO CONTADOR ===');
 for(let i=0;i<3;i++){
  await p.click(`[data-manobra-add="${idx}"]`);
  await p.waitForTimeout(350);
 }
 let qtd = await p.evaluate(i=>[...document.querySelectorAll('.edit-card')][i].querySelectorAll('.pesc-manobra').length, idx);
 t('Tres manobras registradas', qtd===3, qtd+' linhas');
 ch = await chips();
 t('A quantidade sai da contagem das linhas', ch.some(c=>/3 manobras/.test(c.txt)),
   (ch.find(c=>/manobra/.test(c.txt))||{}).txt||'-');

 // preenche a 1a manobra
 await p.selectOption(`[data-manobra-row="${idx}"][data-manobra-index="0"][data-manobra-field="ferramenta"]`,'Overshot');
 await p.waitForTimeout(300);
 await p.selectOption(`[data-manobra-row="${idx}"][data-manobra-index="0"][data-manobra-field="agarramento"]`,'Externo');
 await p.waitForTimeout(300);
 await p.selectOption(`[data-manobra-row="${idx}"][data-manobra-index="0"][data-manobra-field="resultado"]`,'Recuperado parcial');
 await p.waitForTimeout(300);
 await p.fill(`[data-manobra-row="${idx}"][data-manobra-index="0"][data-manobra-field="recuperado"]`,'mandril do packer');
 await p.dispatchEvent(`[data-manobra-row="${idx}"][data-manobra-index="0"][data-manobra-field="recuperado"]`,'change');
 await p.waitForTimeout(400);
 // Le do DOM: scheduleSave() e com atraso, entao o localStorage ainda pode estar
 // defasado neste ponto. A persistencia de verdade e conferida no bloco 6, apos recarregar.
 const m0 = await p.evaluate(i=>{
  const c=[...document.querySelectorAll('.edit-card')][i];
  const v=f=>{const e=c.querySelector('[data-manobra-index="0"][data-manobra-field="'+f+'"]');return e?e.value:null;};
  return {ferramenta:v('ferramenta'),agarramento:v('agarramento'),resultado:v('resultado'),recuperado:v('recuperado')};
 }, idx);
 t('Ferramenta, agarramento, resultado e recuperado ficam gravados',
   m0.ferramenta==='Overshot' && m0.agarramento==='Externo' &&
   m0.resultado==='Recuperado parcial' && m0.recuperado==='mandril do packer',
   JSON.stringify(m0));

 console.log('\n=== 5. LIMITE DE MANOBRAS ===');
 await set('pescLimiteManobras','5');
 ch = await chips();
 t('Sem atingir o limite, sem alerta', !(ch.find(c=>/manobra/.test(c.txt))||{}).alerta,
   (ch.find(c=>/manobra/.test(c.txt))||{}).txt);
 await set('pescLimiteManobras','3');
 ch = await chips(); av = await avisos();
 t('Atingindo o limite, o indicador acende',
   (ch.find(c=>/manobra/.test(c.txt))||{}).alerta===true &&
   av.some(a=>/reavaliar a estrat/i.test(a)), av.join(' | '));

 console.log('\n=== 6. PERSISTENCIA E ISOLAMENTO ===');
 await p.reload({waitUntil:'load'}); await p.waitForTimeout(1500);
 await p.click('[data-view="editor"]'); await p.waitForTimeout(800);
 const depois = await p.evaluate(i=>{
   const c=[...document.querySelectorAll('.edit-card')][i];
   return {
     manobras:c.querySelectorAll('.pesc-manobra').length,
     inicio:(c.querySelector('[data-field="pescInicio"]')||{}).value,
     chips:[...c.querySelectorAll('.pesc-chip')].map(x=>x.innerText.trim())
   };
 }, idx);
 t('Sobrevive ao recarregar', depois.manobras===3 && depois.inicio==='2026-08-16T08:00',
   depois.manobras+' manobras, inicio '+depois.inicio);
 const m0d = await p.evaluate(i=>{
  const c=[...document.querySelectorAll('.edit-card')][i];
  const v=f=>{const e=c.querySelector('[data-manobra-index="0"][data-manobra-field="'+f+'"]');return e?e.value:null;};
  return {ferramenta:v('ferramenta'),agarramento:v('agarramento'),resultado:v('resultado'),recuperado:v('recuperado')};
 }, idx);
 t('Os dados da 1a manobra tambem sobrevivem ao recarregar',
   m0d.ferramenta==='Overshot' && m0d.agarramento==='Externo' &&
   m0d.resultado==='Recuperado parcial' && m0d.recuperado==='mandril do packer',
   JSON.stringify(m0d));
 const outras = await p.evaluate(()=>[...document.querySelectorAll('.edit-card')]
   .filter(c=>!c.querySelector('.pesc-bloco')).length);
 t('As 6 sondas fora de pescaria continuam sem o bloco', outras===6, outras+' sem bloco');
 t('Nenhum erro de JavaScript', erros.length===0, erros.join(' | ')||'nenhum');

 await p.locator('.edit-card').nth(idx).screenshot({path:'/home/claude/co/previa_pescaria.png'});
 await b.close();
 console.log(`\n=== RESUMO: ${ok} OK / ${f} FALHAS de ${ok+f} ===`);
 if(f) process.exitCode=1;
})();

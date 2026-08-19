'use strict';
/*
 * verificar_espelho.js
 *
 * A suite verificacao_nucleo.js so tem valor se o nucleo que ela testa for REALMENTE o mesmo
 * que roda no index.html. Como o nucleo esta duplicado nos dois arquivos (o app precisa dele
 * embutido para funcionar offline como arquivo unico), existe o risco de um ser alterado e o
 * outro nao — e a suite passaria testando codigo morto.
 *
 * Este script compara as duas copias funcao por funcao, ignorando comentarios e espacos.
 * Rodar SEMPRE junto com verificacao_nucleo.js.
 */
const fs = require('fs');
const path = require('path');

// Remove comentarios e TODO espaco em branco — sobra so a estrutura do codigo.
function normalizar(src){
 return src
  .replace(/\/\*[\s\S]*?\*\//g, '')   // comentarios de bloco
  .replace(/\/\/[^\n]*/g, '')         // comentarios de linha
  .replace(/\s+/g, '');               // todo espaco, quebra de linha e tabulacao
}

function extrairFuncao(src, nome){
 const i = src.search(new RegExp('function\\s+' + nome + '\\s*\\('));
 if(i < 0) return null;
 let prof = 0;
 const inicio = src.indexOf('{', i);
 if(inicio < 0) return null;
 for(let k = inicio; k < src.length; k++){
  if(src[k] === '{') prof++;
  else if(src[k] === '}'){ prof--; if(prof === 0) return src.slice(i, k+1); }
 }
 return null;
}

const dir = __dirname;
const html = fs.readFileSync(path.join(dir,'index.html'), 'utf8');
const bloco = html.match(/<script>([\s\S]*?)<\/script>/);
if(!bloco){ console.error('Nao encontrei o bloco <script> no index.html'); process.exit(1); }
const app = bloco[1];
const teste = fs.readFileSync(path.join(dir,'verificacao_nucleo.js'), 'utf8');

const FUNCOES = ['msDe','msDeInicio','msFechamento','diasDeIntervencao','duracaoDTM','contarPor',
                 'comPercentual','somaArredondada','colorir','computar'];

let divergencias = 0;
FUNCOES.forEach(nome=>{
 const a = extrairFuncao(app, nome), b = extrairFuncao(teste, nome);
 if(!a || !b){
  console.log(`AUSENTE   | ${nome} — nao encontrada em ${!a ? 'index.html' : 'verificacao_nucleo.js'}`);
  divergencias++; return;
 }
 const igual = normalizar(a) === normalizar(b);
 console.log(`${igual ? 'IDENTICA ' : 'DIVERGE  '} | ${nome}`);
 if(!igual){
  divergencias++;
  const na = normalizar(a), nb = normalizar(b);
  let i = 0; while(i < na.length && na[i] === nb[i]) i++;
  console.log(`            app  ...${na.slice(Math.max(0,i-40), i+60)}`);
  console.log(`            teste...${nb.slice(Math.max(0,i-40), i+60)}`);
 }
});

console.log(divergencias === 0
 ? `\nAs ${FUNCOES.length} funcoes do nucleo sao identicas nos dois arquivos — a suite esta testando o codigo que roda de verdade no app.`
 : `\nATENCAO: ${divergencias} divergencia(s). A suite NAO esta validando o app real ate isso ser corrigido.`);
process.exitCode = divergencias ? 1 : 0;

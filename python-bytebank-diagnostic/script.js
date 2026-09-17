const SUBMIT_ENDPOINT = '';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1zrUoAwahtWzXlfatGsvoAak9OQZvK3hYE0hyroWDYrs/edit';
const STORAGE_KEY = 'bytebank-python-diagnostic-v2';
const TOTAL_MAX = 40;
const startedAt = Date.now();

const topicNames = {
  basics:'Базовый синтаксис', conditions:'Условия и логика', loops:'Циклы', strings:'Строки',
  lists:'Списки', dicts:'Словари', functions:'Функции', debugging:'Отладка', reading:'Чтение кода', writing:'Самостоятельный код'
};

const sequenceCorrect = [
  'total = 0',
  'for amount in operations:',
  '    if amount > 0:',
  '        total += amount',
  'print(total)'
];
let sequenceState = [sequenceCorrect[2], sequenceCorrect[0], sequenceCorrect[4], sequenceCorrect[1], sequenceCorrect[3]];

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function val(id){return document.getElementById(id)?.value?.trim() || '';}
function radio(name){return document.querySelector(`input[name="${name}"]:checked`)?.value || '';}
function checkedValues(group){return [...document.querySelectorAll(`[data-group="${group}"] input[type="checkbox"]:checked`)].map(x=>x.value);}
function pct(a,b){return b?Math.round(a/b*100):0;}
function normalizeCode(s){return String(s||'').replace(/\s+/g,' ').toLowerCase();}
function sessionId(){let id=localStorage.getItem('bytebank-session-id');if(!id){id='BB-'+Math.random().toString(36).slice(2,8).toUpperCase();localStorage.setItem('bytebank-session-id',id)}return id;}

function renderSequence(){
  document.getElementById('sequenceList').innerHTML = sequenceState.map((line,i)=>`<div class="sequence-item"><code>${esc(line)}</code><div class="seq-controls"><button type="button" data-dir="up" data-i="${i}" aria-label="Поднять строку">↑</button><button type="button" data-dir="down" data-i="${i}" aria-label="Опустить строку">↓</button></div></div>`).join('');
}

document.getElementById('sequenceList').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  const i=Number(b.dataset.i), j=b.dataset.dir==='up'?i-1:i+1;
  if(j<0||j>=sequenceState.length)return;
  [sequenceState[i],sequenceState[j]]=[sequenceState[j],sequenceState[i]];
  renderSequence(); saveProgress();
});

const modal = document.getElementById('storyModal');
const modalContent = document.getElementById('modalContent');
function openStory(id){
  const tpl=document.getElementById(id); if(!tpl)return;
  modalContent.innerHTML=''; modalContent.appendChild(tpl.content.cloneNode(true));
  document.getElementById('modalTitle').textContent = id==='briefingWindow'?'Сообщение команды':id==='atmLogWindow'?'ATM-17 • журнал событий':id==='clientCardWindow'?'Антифрод • карточка операции':id==='dictionaryWindow'?'Клиентское хранилище':id==='callWindow'?'Чат колл-центра':'ByteBank';
  modal.hidden=false; document.body.style.overflow='hidden';
}
function closeStory(){modal.hidden=true;document.body.style.overflow='';}
document.querySelectorAll('.story-open').forEach(b=>b.addEventListener('click',()=>openStory(b.dataset.window)));
modal.addEventListener('click',e=>{if(e.target.closest('[data-close-modal]'))closeStory()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeStory()});

function collect(){
  const matches={}; document.querySelectorAll('[data-match]').forEach(s=>matches[s.dataset.match]=s.value);
  return {
    profile:{
      startMood:radio('startMood'), debugReaction:radio('debugReaction'), experience:checkedValues('experience'),
      interests:checkedValues('interests'), goal:val('goal'), endMood:radio('endMood'), favoritePart:radio('favoritePart')
    },
    matches,
    conditions:{c1:radio('cond1'),c2:radio('cond2'),c3:radio('cond3')},
    loops:{l1:radio('loop1'),l2:radio('loop2'),list1:radio('list1')},
    sequence:[...sequenceState],
    dicts:{d1:radio('dict1'),d2:radio('dict2'),d3:radio('dict3'),d4:radio('dict4')},
    strings:{s1:radio('str1'),s2:radio('str2'),s3:radio('str3'),s4:radio('str4')},
    bugs:{b1:val('bug1'),b2:val('bug2'),b3:val('bug3'),b4:val('bug4')},
    functions:{f1:radio('func1'),f2:radio('func2'),f3:radio('func3'),f4:radio('func4')},
    code:{c1:val('code1'),c2:val('code2'),c3:val('code3')}
  };
}

function grade(data){
  const topics={}; Object.keys(topicNames).forEach(k=>topics[k]={earned:0,max:0});
  let total=0;
  const add=(earned,points,topicList)=>{
    const e=typeof earned==='boolean'?(earned?points:0):Math.max(0,Math.min(points,earned));
    total+=e;
    topicList.forEach(t=>{topics[t].earned+=e;topics[t].max+=points;});
  };

  const expectedMatches={balanceCheck:'if',eachOperation:'for',orderedOperations:'list',cardBalance:'dict',pinLoop:'while',limitFunction:'def'};
  const matchTopics={balanceCheck:['conditions'],eachOperation:['loops'],orderedOperations:['lists'],cardBalance:['dicts'],pinLoop:['loops'],limitFunction:['functions']};
  Object.keys(expectedMatches).forEach(k=>add(data.matches[k]===expectedMatches[k],1,matchTopics[k]));

  add(data.conditions.c1==='amount > limit',1,['conditions','basics']);
  add(data.conditions.c2==='and',1,['conditions','basics']);
  add(data.conditions.c3==='REVIEW',1,['conditions','reading']);

  add(data.loops.l1==='for',1,['loops']);
  add(data.loops.l2==='2',1,['loops','reading']);
  add(JSON.stringify(data.sequence)===JSON.stringify(sequenceCorrect),3,['loops','conditions','reading']);
  add(data.loops.list1==='append',1,['lists']);

  add(data.dicts.d1==='key',1,['dicts']);
  add(data.dicts.d2==='get',1,['dicts']);
  add(data.dicts.d3==='Лев',1,['dicts','conditions','reading']);
  add(data.dicts.d4==='5700',1,['dicts','reading']);

  add(data.strings.s1==='BANK-204',1,['strings','reading']);
  add(data.strings.s2==='204',1,['strings','reading']);
  add(data.strings.s3==='in',1,['strings','conditions']);
  add(data.strings.s4==='len',1,['strings','basics']);

  add(data.bugs.b1==='colon',1,['debugging','conditions','basics']);
  add(data.bugs.b2==='in',1,['debugging','loops','basics']);
  add(data.bugs.b3==='plusEquals',1,['debugging','basics']);
  add(data.bugs.b4==='return',1,['debugging','functions']);

  add(data.functions.f1==='def',1,['functions','basics']);
  add(data.functions.f2==='20',1,['functions','reading']);
  add(data.functions.f3==='returns',1,['functions']);
  add(data.functions.f4==='call',1,['functions']);

  const c1=normalizeCode(data.code.c1); let s1=0;
  if(/\bif\b/.test(c1))s1++;
  if((/amount\s*>\s*0/.test(c1))&&(/amount\s*<=\s*limit/.test(c1))&&/\band\b/.test(c1))s1++;
  if(c1.includes('approve')&&c1.includes('check')&&/\belse\b/.test(c1))s1++;
  add(s1,3,['conditions','writing']);

  const c2=normalizeCode(data.code.c2); let s2=0;
  if(/\bfor\b/.test(c2)&&/\bin\b/.test(c2)&&c2.includes('transactions'))s2++;
  if(/\bif\b/.test(c2)&&/<\s*0/.test(c2))s2++;
  if(/print\s*\(/.test(c2))s2++;
  add(s2,3,['loops','lists','writing']);

  const c3=normalizeCode(data.code.c3); let s3=0;
  if(/def\s+get_balance\s*\(/.test(c3))s3++;
  if(/\breturn\b/.test(c3))s3++;
  if(/\.get\s*\(\s*account\s*,\s*0\s*\)/.test(c3))s3++;
  add(s3,3,['dicts','functions','writing']);

  const percent=pct(total,TOTAL_MAX);
  let level='Стартовый уровень';
  if(percent>=85)level='Уверенное владение базой';
  else if(percent>=68)level='Хорошая рабочая база';
  else if(percent>=48)level='База есть, но отдельные конструкции нестабильны';
  else if(percent>=28)level='Есть знакомые элементы, нужна систематизация';

  const topicPercents={};
  Object.entries(topics).forEach(([k,v])=>topicPercents[k]=pct(v.earned,v.max));
  const strong=Object.keys(topicPercents).filter(k=>topics[k].max>0&&topicPercents[k]>=75).map(k=>topicNames[k]);
  const growth=Object.keys(topicPercents).filter(k=>topics[k].max>0&&topicPercents[k]<50).map(k=>topicNames[k]);
  return {total,max:TOTAL_MAX,percent,level,topics,topicPercents,strong,growth};
}

function completion(data=collect()){
  const units=[data.profile.startMood,data.profile.debugReaction,data.profile.experience.length,data.profile.interests.length,data.profile.goal];
  units.push(...Object.values(data.matches),...Object.values(data.conditions),...Object.values(data.loops),...Object.values(data.dicts),...Object.values(data.strings),...Object.values(data.bugs),...Object.values(data.functions),...Object.values(data.code),data.profile.endMood,data.profile.favoritePart);
  return pct(units.filter(Boolean).length,units.length);
}
function updateProgress(){const p=completion();document.getElementById('progressLabel').textContent=`${p}%`;document.getElementById('progressFill').style.width=`${p}%`;}
function saveProgress(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({data:collect(),sequence:sequenceState}));}catch{}updateProgress();}

function setRadio(name,value){
  if(!value)return;
  [...document.querySelectorAll(`input[name="${name}"]`)].forEach(x=>x.checked=x.value===value);
}
function restore(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); if(!saved?.data)return;
    const d=saved.data; sequenceState=saved.sequence||d.sequence||sequenceState;
    setRadio('startMood',d.profile?.startMood);setRadio('debugReaction',d.profile?.debugReaction);setRadio('endMood',d.profile?.endMood);setRadio('favoritePart',d.profile?.favoritePart);
    ['experience','interests'].forEach(g=>document.querySelectorAll(`[data-group="${g}"] input[type="checkbox"]`).forEach(x=>x.checked=(d.profile?.[g]||[]).includes(x.value)));
    document.getElementById('goal').value=d.profile?.goal||'';
    document.querySelectorAll('[data-match]').forEach(s=>s.value=d.matches?.[s.dataset.match]||'');
    [['cond1',d.conditions?.c1],['cond2',d.conditions?.c2],['cond3',d.conditions?.c3],['loop1',d.loops?.l1],['loop2',d.loops?.l2],['list1',d.loops?.list1],['dict1',d.dicts?.d1],['dict2',d.dicts?.d2],['dict3',d.dicts?.d3],['dict4',d.dicts?.d4],['str1',d.strings?.s1],['str2',d.strings?.s2],['str3',d.strings?.s3],['str4',d.strings?.s4],['func1',d.functions?.f1],['func2',d.functions?.f2],['func3',d.functions?.f3],['func4',d.functions?.f4]].forEach(([n,v])=>setRadio(n,v));
    ['1','2','3','4'].forEach(n=>document.getElementById(`bug${n}`).value=d.bugs?.[`b${n}`]||'');
    ['1','2','3'].forEach(n=>document.getElementById(`code${n}`).value=d.code?.[`c${n}`]||'');
  }catch(e){console.warn('Не удалось восстановить черновик',e)}
}

function makePayload(data,result){
  return {
    timestamp:new Date().toISOString(), sessionId:sessionId(), minutes:Math.max(1,Math.round((Date.now()-startedAt)/60000)),
    startMood:data.profile.startMood,debugReaction:data.profile.debugReaction,experience:data.profile.experience.join(', '),interests:data.profile.interests.join(', '),goal:data.profile.goal,endMood:data.profile.endMood,favoritePart:data.profile.favoritePart,
    topicScores:Object.fromEntries(Object.entries(result.topics).map(([k,v])=>[k,`${v.earned}/${v.max} (${pct(v.earned,v.max)}%)`])),
    total:result.total,max:result.max,percent:result.percent,level:result.level,strong:result.strong.join(', ')||'-',growth:result.growth.join(', ')||'-',
    code1:data.code.c1,code2:data.code.c2,code3:data.code.c3,answersJson:JSON.stringify(data),userAgent:navigator.userAgent
  };
}

async function submitToSheet(body){
  if(!SUBMIT_ENDPOINT)return {sent:false,reason:'endpoint_missing'};
  try{await fetch(SUBMIT_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});return {sent:true};}
  catch(error){return {sent:false,reason:error.message};}
}

function renderResult(data,result,send){
  document.getElementById('resultView').hidden=false;
  document.getElementById('scorePercent').textContent=`${result.percent}%`;
  document.getElementById('scoreFraction').textContent=`${result.total}/${result.max}`;
  document.getElementById('levelBadge').textContent=result.level;
  document.getElementById('moodSummary').textContent=`До смены: ${data.profile.startMood||'не выбрано'}. После смены: ${data.profile.endMood||'не выбрано'}. Больше всего заинтересовало: ${data.profile.favoritePart||'не выбрано'}.`;
  document.getElementById('topicReport').innerHTML=Object.entries(result.topics).filter(([,v])=>v.max>0).map(([k,v])=>{const p=pct(v.earned,v.max);return `<div class="topic-row"><div><strong>${esc(topicNames[k])}</strong><span>${p}%</span></div><small>${v.earned}/${v.max}</small><div class="topic-bar"><i style="width:${p}%"></i></div></div>`}).join('');
  const status=document.getElementById('sendStatus');
  if(send.sent)status.textContent='Технический отчёт отправлен преподавателю.';
  else if(send.reason==='endpoint_missing')status.innerHTML=`Отчёт готов. Автоматическая запись в Google Таблицу включится после подключения Apps Script. <a href="${SHEET_URL}" target="_blank" rel="noopener">Таблица</a>.`;
  else status.textContent='Отчёт готов, но отправка в таблицу не удалась. Черновик сохранён в браузере.';
  document.getElementById('resultView').scrollIntoView({behavior:'smooth',block:'start'});
}

async function finish(){
  const data=collect(); const result=grade(data); const body=makePayload(data,result);
  document.getElementById('finishButton').disabled=true;document.getElementById('sendStatus').textContent='Собираю технический отчёт...';
  const send=await submitToSheet(body);
  document.getElementById('finishButton').disabled=false;
  sessionStorage.setItem('bytebank-last-result',JSON.stringify({body,result,data}));
  renderResult(data,result,send);
}

function copySummary(){
  const raw=sessionStorage.getItem('bytebank-last-result');if(!raw)return;
  const {body,result}=JSON.parse(raw);
  const topics=Object.entries(result.topicPercents).filter(([k])=>result.topics[k].max>0).map(([k,v])=>`${topicNames[k]} ${v}%`).join('; ');
  const text=`ByteBank - диагностика Python\nРезультат: ${result.total}/${result.max} (${result.percent}%) - ${result.level}\nДо смены: ${body.startMood}; после: ${body.endMood}\nИнтересы: ${body.interests}\nТемы: ${topics}\nСильные: ${body.strong}\nПовторить: ${body.growth}`;
  navigator.clipboard.writeText(text).then(()=>document.getElementById('copyStatus').textContent='Краткий результат скопирован.').catch(()=>document.getElementById('copyStatus').textContent='Не удалось скопировать автоматически.');
}

document.querySelectorAll('input,select,textarea').forEach(el=>{el.addEventListener('input',saveProgress);el.addEventListener('change',saveProgress)});
document.getElementById('finishButton').addEventListener('click',finish);
document.getElementById('copyResult').addEventListener('click',copySummary);
document.getElementById('backButton').addEventListener('click',()=>document.getElementById('finish').scrollIntoView({behavior:'smooth'}));
restore();renderSequence();updateProgress();

const SUBMIT_ENDPOINT = ''; // Вставь URL развернутого Google Apps Script Web App из файла Code.gs
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1zrUoAwahtWzXlfatGsvoAak9OQZvK3hYE0hyroWDYrs/edit';
const STORAGE_KEY = 'bytebank-python-diagnostic-v1';
const TOTAL_MAX = 30;
const startedAt = Date.now();

const topicNames = {
  basics:'Основы', conditions:'Условия', loops:'Циклы', strings:'Строки', lists:'Списки',
  dicts:'Словари', functions:'Функции', reading:'Чтение кода', writing:'Написание кода'
};

const sequenceCorrect = [
  'total = 0',
  'for amount in operations:',
  '    if amount > 0:',
  '        total += amount',
  'print(total)'
];
let sequenceState = [sequenceCorrect[2],sequenceCorrect[0],sequenceCorrect[4],sequenceCorrect[1],sequenceCorrect[3]];

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function val(id){return document.getElementById(id)?.value?.trim() || '';}
function checkedValues(group){return [...document.querySelectorAll(`[data-group="${group}"] input:checked`)].map(x=>x.value);}
function radio(name){return document.querySelector(`input[name="${name}"]:checked`)?.value || '';}
function normalizeCode(s){return String(s||'').replace(/\s+/g,' ').toLowerCase();}
function pct(a,b){return b?Math.round(a/b*100):0;}

function renderSequence(){
  const root=document.getElementById('sequenceList');
  root.innerHTML=sequenceState.map((line,i)=>`<div class="sequence-item"><code>${esc(line)}</code><div class="seq-controls"><button type="button" data-dir="up" data-i="${i}" aria-label="Поднять строку">↑</button><button type="button" data-dir="down" data-i="${i}" aria-label="Опустить строку">↓</button></div></div>`).join('');
}

document.getElementById('sequenceList').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  const i=Number(b.dataset.i), j=b.dataset.dir==='up'?i-1:i+1;
  if(j<0||j>=sequenceState.length)return;
  [sequenceState[i],sequenceState[j]]=[sequenceState[j],sequenceState[i]];
  renderSequence(); saveProgress();
});

function collect(){
  const matches={}; document.querySelectorAll('[data-match]').forEach(s=>matches[s.dataset.match]=s.value);
  return {
    profile:{name:val('studentName'),grade:val('studentGrade'),age:val('studentAge'),selfLevel:val('selfLevel'),experience:checkedValues('experience'),interests:checkedValues('interests'),goal:val('goal')},
    matches,
    predict:{p1:radio('predict1'),p2:radio('predict2'),p3:radio('predict3'),p4:radio('predict4'),p5:radio('predict5')},
    blanks:{b1:val('blank1'),b2:val('blank2'),b3:val('blank3'),b4:val('blank4')},
    sequence:[...sequenceState],
    data:{d1:radio('data1'),d2:radio('data2'),d3:radio('data3'),d4:radio('data4')},
    code:{c1:val('code1'),c2:val('code2'),c3:val('code3')}
  };
}

function grade(data){
  const topics={}; Object.keys(topicNames).forEach(k=>topics[k]={earned:0,max:0});
  let total=0;
  const add=(ok,points,topicList)=>{
    const earned=typeof ok==='number'?Math.max(0,Math.min(points,ok)):ok?points:0;
    total+=earned;
    topicList.forEach(t=>{topics[t].earned+=earned;topics[t].max+=points;});
  };

  const matchExpected={age:'if',payments:'for',clients:'list',balance:'dict',pin:'while',repeat:'def'};
  const matchTopics={age:['conditions'],payments:['loops'],clients:['lists'],balance:['dicts'],pin:['loops'],repeat:['functions']};
  Object.keys(matchExpected).forEach(k=>add(data.matches[k]===matchExpected[k],1,matchTopics[k]));

  add(data.predict.p1==='OK',1,['conditions','reading']);
  add(data.predict.p2==='2 1',1,['loops','reading']);
  add(data.predict.p3==='4 Илья',1,['lists','reading']);
  add(data.predict.p4==='Лев',1,['dicts','conditions','reading']);
  add(data.predict.p5==='204',1,['strings','reading']);

  add(data.blanks.b1==='>',1,['conditions','basics']);
  add(data.blanks.b2==='in',1,['loops','basics']);
  add(data.blanks.b3==='+=',1,['basics']);
  add(data.blanks.b4==='*',1,['functions','basics']);

  const seqOk=JSON.stringify(data.sequence)===JSON.stringify(sequenceCorrect);
  add(seqOk,2,['loops','reading']);

  add(data.data.d1==='5700',1,['dicts','reading']);
  add(data.data.d2==='append',1,['lists']);
  add(data.data.d3==='get',1,['dicts']);
  add(data.data.d4==='[-50, 300]',1,['lists','reading']);

  const c1=normalizeCode(data.code.c1);
  let s1=0;
  if(/\bif\b/.test(c1))s1++;
  if((c1.includes('amount <= limit')||c1.includes('amount<=limit'))&&(c1.includes('amount > 0')||c1.includes('amount>0')))s1++;
  if(c1.includes('approve')&&c1.includes('check')&&/\belse\b/.test(c1))s1++;
  add(s1,3,['conditions','writing']);

  const c2=normalizeCode(data.code.c2);
  let s2=0;
  if(/\bfor\b/.test(c2)&&/\bin\b/.test(c2)&&c2.includes('transactions'))s2++;
  if(/\bif\b/.test(c2)&&(/<\s*0/.test(c2)))s2++;
  if(/print\s*\(/.test(c2))s2++;
  add(s2,3,['loops','lists','writing']);

  const c3=normalizeCode(data.code.c3);
  let s3=0;
  if(/def\s+get_balance\s*\(/.test(c3))s3++;
  if(/\breturn\b/.test(c3))s3++;
  if(/\.get\s*\(\s*account\s*,\s*0\s*\)/.test(c3))s3++;
  add(s3,3,['dicts','functions','writing']);

  const percent=pct(total,TOTAL_MAX);
  let level='Нужно восстановить базу';
  if(percent>=80)level='Сильный базовый уровень';
  else if(percent>=60)level='Уверенная база';
  else if(percent>=40)level='База есть, нужна практика';

  const topicPercents={};
  Object.entries(topics).forEach(([k,v])=>topicPercents[k]=pct(v.earned,v.max));
  const strong=Object.keys(topicPercents).filter(k=>topics[k].max>0&&topicPercents[k]>=75).map(k=>topicNames[k]);
  const growth=Object.keys(topicPercents).filter(k=>topics[k].max>0&&topicPercents[k]<50).map(k=>topicNames[k]);
  return {total,max:TOTAL_MAX,percent,level,topics,topicPercents,strong,growth};
}

function completion(data=collect()){
  const units=[];
  units.push(Boolean(data.profile.name),Boolean(data.profile.grade),Boolean(data.profile.selfLevel),data.profile.experience.length>0,data.profile.interests.length>0,Boolean(data.profile.goal));
  Object.values(data.matches).forEach(v=>units.push(Boolean(v)));
  Object.values(data.predict).forEach(v=>units.push(Boolean(v)));
  Object.values(data.blanks).forEach(v=>units.push(Boolean(v)));
  Object.values(data.data).forEach(v=>units.push(Boolean(v)));
  Object.values(data.code).forEach(v=>units.push(Boolean(v)));
  return pct(units.filter(Boolean).length,units.length);
}

function updateProgress(){const p=completion();document.getElementById('progressLabel').textContent=`${p}%`;document.getElementById('progressFill').style.width=`${p}%`;}
function saveProgress(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({data:collect(),sequence:sequenceState}));}catch{}updateProgress();}
function restore(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); if(!saved?.data)return;
    const d=saved.data; sequenceState=saved.sequence||d.sequence||sequenceState;
    document.getElementById('studentName').value=d.profile?.name||'';document.getElementById('studentGrade').value=d.profile?.grade||'';document.getElementById('studentAge').value=d.profile?.age||'';document.getElementById('selfLevel').value=d.profile?.selfLevel||'';document.getElementById('goal').value=d.profile?.goal||'';
    ['experience','interests'].forEach(g=>document.querySelectorAll(`[data-group="${g}"] input`).forEach(x=>x.checked=(d.profile?.[g]||[]).includes(x.value)));
    document.querySelectorAll('[data-match]').forEach(s=>s.value=d.matches?.[s.dataset.match]||'');
    Object.entries({predict1:d.predict?.p1,predict2:d.predict?.p2,predict3:d.predict?.p3,predict4:d.predict?.p4,predict5:d.predict?.p5,data1:d.data?.d1,data2:d.data?.d2,data3:d.data?.d3,data4:d.data?.d4}).forEach(([name,v])=>{const r=document.querySelector(`input[name="${name}"][value="${CSS.escape(v||'')}"]`);if(r)r.checked=true;});
    ['1','2','3','4'].forEach(n=>document.getElementById(`blank${n}`).value=d.blanks?.[`b${n}`]||'');
    ['1','2','3'].forEach(n=>document.getElementById(`code${n}`).value=d.code?.[`c${n}`]||'');
  }catch(e){console.warn('Не удалось восстановить черновик',e)}
}

function payload(data,result){
  const minutes=Math.max(1,Math.round((Date.now()-startedAt)/60000));
  return {
    timestamp:new Date().toISOString(),name:data.profile.name,grade:data.profile.grade,age:data.profile.age,
    experience:data.profile.experience.join(', '),learnedWhere:data.profile.experience.join(', '),selfLevel:data.profile.selfLevel,
    interests:data.profile.interests.join(', '),goal:data.profile.goal,minutes,
    topicScores:Object.fromEntries(Object.entries(result.topics).map(([k,v])=>[k,`${v.earned}/${v.max} (${pct(v.earned,v.max)}%)`])),
    total:result.total,max:result.max,percent:result.percent,level:result.level,strong:result.strong.join(', ')||'-',growth:result.growth.join(', ')||'-',
    code1:data.code.c1,code2:data.code.c2,code3:data.code.c3,answersJson:JSON.stringify(data),userAgent:navigator.userAgent
  };
}

async function submitToSheet(body){
  if(!SUBMIT_ENDPOINT)return {sent:false,reason:'endpoint_missing'};
  try{
    await fetch(SUBMIT_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
    return {sent:true};
  }catch(error){return {sent:false,reason:error.message};}
}

function renderResult(data,result,send){
  document.getElementById('resultView').hidden=false;
  document.getElementById('resultTitle').textContent=data.profile.name?`Результат: ${data.profile.name}`:'Результат диагностики';
  document.getElementById('scorePercent').textContent=`${result.percent}%`;
  document.getElementById('scoreFraction').textContent=`${result.total}/${result.max}`;
  document.getElementById('levelBadge').textContent=result.level;
  document.getElementById('topicReport').innerHTML=Object.entries(result.topics).filter(([,v])=>v.max>0).map(([k,v])=>{const p=pct(v.earned,v.max);return `<div class="topic-row"><div><strong>${esc(topicNames[k])}</strong><span>${p}%</span></div><small>${v.earned}/${v.max}</small><div class="topic-bar"><i style="width:${p}%"></i></div></div>`}).join('');
  const status=document.getElementById('sendStatus');
  if(send.sent)status.textContent='Результат отправлен в таблицу преподавателя.';
  else if(send.reason==='endpoint_missing')status.innerHTML=`Результат посчитан. Автоотправка в Google Таблицу включится после добавления URL Apps Script. <a href="${SHEET_URL}" target="_blank" rel="noopener">Таблица уже создана</a>.`;
  else status.textContent='Результат посчитан, но отправка в таблицу не удалась. Ответы сохранены в браузере.';
  document.getElementById('resultView').scrollIntoView({behavior:'smooth',block:'start'});
}

async function finish(){
  const data=collect();
  if(!data.profile.name){document.getElementById('sendStatus').textContent='Сначала укажи имя сотрудника.';document.getElementById('studentName').focus();return;}
  const result=grade(data); const body=payload(data,result);
  document.getElementById('finishButton').disabled=true;document.getElementById('sendStatus').textContent='Формирую отчёт...';
  const send=await submitToSheet(body);
  document.getElementById('finishButton').disabled=false;
  sessionStorage.setItem('bytebank-last-result',JSON.stringify({body,result}));
  renderResult(data,result,send);
}

function copySummary(){
  const raw=sessionStorage.getItem('bytebank-last-result');if(!raw)return;
  const {body,result}=JSON.parse(raw);
  const topics=Object.entries(result.topicPercents).filter(([k])=>result.topics[k].max>0).map(([k,v])=>`${topicNames[k]} ${v}%`).join('; ');
  const text=`ByteBank - диагностика Python\n${body.name}, ${body.grade?body.grade+' класс':'класс не указан'}\nРезультат: ${result.total}/${result.max} (${result.percent}%) - ${result.level}\nТемы: ${topics}\nСильные: ${body.strong}\nПовторить: ${body.growth}`;
  navigator.clipboard.writeText(text).then(()=>document.getElementById('copyStatus').textContent='Краткий результат скопирован.').catch(()=>document.getElementById('copyStatus').textContent='Не удалось скопировать автоматически.');
}

document.querySelectorAll('input,select,textarea').forEach(el=>{el.addEventListener('input',saveProgress);el.addEventListener('change',saveProgress)});
document.getElementById('finishButton').addEventListener('click',finish);
document.getElementById('copyResult').addEventListener('click',copySummary);
document.getElementById('backButton').addEventListener('click',()=>document.getElementById('finish').scrollIntoView({behavior:'smooth'}));
restore();renderSequence();updateProgress();

const STORAGE_KEY = 'homeworkFractionsV1';
const TOTAL_SCORE = 16;

const state = {
  matches: {},
  activeLeft: null,
  lastResultUrl: ''
};

const numericIds = ['conv1','conv2','conv3','conv4','part1','part2','part3','calc1','calc2','problem1','problem2'];

function numberValue(value){
  if(value === null || value === undefined) return NaN;
  const cleaned = String(value).trim().replace(/\s+/g,'').replace(',','.').replace(/[₽%л]/gi,'');
  if(!cleaned) return NaN;
  return Number(cleaned);
}

function almostEqual(value, expected){
  const n = numberValue(value);
  return Number.isFinite(n) && Math.abs(n - expected) < 1e-7;
}

function escapeHtml(value){
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function setChoiceVisuals(){
  document.querySelectorAll('.choice-card').forEach(label => {
    const input = label.querySelector('input');
    label.classList.toggle('checked', input.checked);
  });
}

function pairNumber(leftKey){
  const order = ['half','threequarters','fifth','seven20'];
  return order.indexOf(leftKey) + 1;
}

function renderMatches(){
  document.querySelectorAll('.match-item').forEach(btn => {
    btn.classList.remove('selected','paired');
    btn.querySelector('.match-order').textContent = '';
  });

  if(state.activeLeft){
    document.querySelector(`.match-item[data-side="left"][data-key="${state.activeLeft}"]`)?.classList.add('selected');
  }

  Object.entries(state.matches).forEach(([left,right]) => {
    const n = pairNumber(left);
    const leftEl = document.querySelector(`.match-item[data-side="left"][data-key="${left}"]`);
    const rightEl = document.querySelector(`.match-item[data-side="right"][data-key="${right}"]`);
    [leftEl,rightEl].forEach(el => {
      if(!el) return;
      el.classList.add('paired');
      el.querySelector('.match-order').textContent = n;
    });
  });
}

function handleMatchClick(event){
  const btn = event.target.closest('.match-item');
  if(!btn) return;
  const side = btn.dataset.side;
  const key = btn.dataset.key;

  if(side === 'left'){
    state.activeLeft = state.activeLeft === key ? null : key;
    renderMatches();
    saveProgress();
    return;
  }

  if(!state.activeLeft) return;
  Object.entries(state.matches).forEach(([left,right]) => {
    if(right === key && left !== state.activeLeft) delete state.matches[left];
  });
  state.matches[state.activeLeft] = key;
  state.activeLeft = null;
  renderMatches();
  saveProgress();
}

function collectAnswers(){
  const selected = [...document.querySelectorAll('#equivalentChoices input:checked')].map(input => input.value).sort();
  const data = {
    name: document.getElementById('studentName').value.trim(),
    eq: selected,
    matches: {...state.matches},
    explanation: document.getElementById('explanation').value.trim()
  };
  numericIds.forEach(id => data[id] = document.getElementById(id).value.trim());
  return data;
}

function grade(data){
  const checks = [];
  const push = (section,label,answer,ok,correct) => checks.push({section,label,answer:String(answer ?? ''),ok,correct});

  const eqCorrect = ['decimal025','percent25','quarter'];
  push('Разминка','Равны 0,25',data.eq.join(', '), JSON.stringify(data.eq) === JSON.stringify(eqCorrect), '1/4, 25%, 0,25');

  const expectedMatches = {half:'50',threequarters:'75',fifth:'20',seven20:'35'};
  const labels = {half:'1/2',threequarters:'3/4',fifth:'1/5',seven20:'7/20'};
  Object.entries(expectedMatches).forEach(([left,right]) => {
    push('Соединение пар', labels[left], data.matches?.[left] ? `${data.matches[left]}%` : '', data.matches?.[left] === right, `${right}%`);
  });

  const numericChecks = [
    ['Переводы','7/20 в десятичную дробь','conv1',0.35,'0,35'],
    ['Переводы','0,48 в процентах','conv2',48,'48%'],
    ['Переводы','35% в десятичную дробь','conv3',0.35,'0,35'],
    ['Переводы','1,25 в процентах','conv4',125,'125%'],
    ['Часть и целое','18 из 72','part1',25,'25%'],
    ['Часть и целое','24 - это 30%','part2',80,'80'],
    ['Часть и целое','35% от 160','part3',56,'56'],
    ['По действиям','3,6 + 1,25 · (4,8 − 2,4)','calc1',6.6,'6,6'],
    ['По действиям','(7,2 − 1,8) : 0,6 + 2,5','calc2',11.5,'11,5'],
    ['Текстовые задачи','Рюкзак и промокод','problem1',3672,'3672 ₽'],
    ['Текстовые задачи','Запас воды','problem2',22.5,'22,5 л']
  ];
  numericChecks.forEach(([section,label,id,expected,correct]) => push(section,label,data[id],almostEqual(data[id],expected),correct));

  const score = checks.filter(item => item.ok).length;
  return {score, checks};
}

function buildCompactPayload(data, result){
  return {
    v:1,
    n:data.name || 'Без имени',
    t:new Date().toISOString(),
    s:result.score,
    a:{
      eq:data.eq,
      m:data.matches,
      c:[data.conv1,data.conv2,data.conv3,data.conv4],
      p:[data.part1,data.part2,data.part3],
      x:[data.calc1,data.calc2],
      w:[data.problem1,data.problem2],
      e:data.explanation
    }
  };
}

function encodePayload(payload){
  const text = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}

function decodePayload(encoded){
  const normalized = encoded.replaceAll('-','+').replaceAll('_','/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function payloadToData(payload){
  const a = payload.a || {};
  return {
    name: payload.n || 'Без имени',
    eq: a.eq || [],
    matches: a.m || {},
    conv1:a.c?.[0] ?? '', conv2:a.c?.[1] ?? '', conv3:a.c?.[2] ?? '', conv4:a.c?.[3] ?? '',
    part1:a.p?.[0] ?? '', part2:a.p?.[1] ?? '', part3:a.p?.[2] ?? '',
    calc1:a.x?.[0] ?? '', calc2:a.x?.[1] ?? '',
    problem1:a.w?.[0] ?? '', problem2:a.w?.[1] ?? '',
    explanation:a.e || ''
  };
}

function reportSection(title, items){
  const rows = items.map(item => `
    <div class="report-row">
      <strong>${escapeHtml(item.label)}</strong>
      <span class="answer">${escapeHtml(item.answer || 'не заполнено')}</span>
      <span class="badge ${item.ok ? 'good' : 'bad'}" title="${item.ok ? 'Верно' : `Правильный ответ: ${item.correct}`}">${item.ok ? '✓' : '×'}</span>
    </div>`).join('');
  return `<section class="report-section"><h3>${escapeHtml(title)}</h3><div class="report-grid">${rows}</div></section>`;
}

function renderResult(data, result, timestamp, isTeacher=false){
  document.body.classList.add('result-mode');
  document.body.classList.toggle('teacher-mode', isTeacher);
  document.getElementById('resultView').hidden = false;
  document.getElementById('resultName').textContent = data.name ? `Работа: ${data.name}` : 'Работа ученика';
  const date = timestamp ? new Date(timestamp) : new Date();
  document.getElementById('resultDate').textContent = `${isTeacher ? 'Результат получен по персональной ссылке' : 'Результат сформирован'} · ${date.toLocaleString('ru-RU',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}`;
  document.getElementById('scoreValue').textContent = result.score;

  const groups = {};
  result.checks.forEach(item => (groups[item.section] ||= []).push(item));
  let html = Object.entries(groups).map(([title,items]) => reportSection(title,items)).join('');
  html += `<section class="report-section"><h3>Ход решения задачи 13</h3><div class="explanation-report">${escapeHtml(data.explanation || 'Ученик не добавил объяснение.')}</div></section>`;
  document.getElementById('resultSummary').innerHTML = html;
  window.scrollTo({top:0,behavior:'smooth'});
}

function makeResultUrl(data, result){
  const payload = buildCompactPayload(data,result);
  const hash = `result=${encodePayload(payload)}`;
  return `${location.origin}${location.pathname}#${hash}`;
}

function saveProgress(){
  if(document.body.classList.contains('teacher-mode')) return;
  const data = collectAnswers();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateProgress(data);
}

function restoreProgress(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if(!saved) return;
    document.getElementById('studentName').value = saved.name || '';
    document.getElementById('explanation').value = saved.explanation || '';
    numericIds.forEach(id => document.getElementById(id).value = saved[id] || '');
    document.querySelectorAll('#equivalentChoices input').forEach(input => input.checked = (saved.eq || []).includes(input.value));
    state.matches = saved.matches || {};
    setChoiceVisuals();
    renderMatches();
  }catch(error){ console.warn('Не удалось восстановить черновик', error); }
}

function completionUnits(data){
  const units = [];
  units.push(data.name.trim().length > 0);
  units.push(data.eq.length > 0);
  ['half','threequarters','fifth','seven20'].forEach(key => units.push(Boolean(data.matches[key])));
  numericIds.forEach(id => units.push(String(data[id]).trim().length > 0));
  units.push(data.explanation.trim().length > 0);
  return units;
}

function updateProgress(data=collectAnswers()){
  const units = completionUnits(data);
  const done = units.filter(Boolean).length;
  const percent = Math.round(done / units.length * 100);
  document.getElementById('progressText').textContent = `${percent}%`;
  document.getElementById('progressFill').style.width = `${percent}%`;
}

function finishWork(){
  const data = collectAnswers();
  const result = grade(data);
  state.lastResultUrl = makeResultUrl(data,result);
  renderResult(data,result,new Date().toISOString(),false);
}

async function shareResult(){
  const url = state.lastResultUrl || location.href;
  const name = document.getElementById('studentName').value.trim() || 'ученика';
  const text = `Домашнее задание по дробям и процентам - результат ${name}`;
  try{
    if(navigator.share){
      await navigator.share({title:'Результат домашнего задания',text,url});
      return;
    }
    await navigator.clipboard.writeText(url);
    document.getElementById('copyStatus').textContent = 'Ссылка скопирована - отправь её преподавателю.';
  }catch(error){
    if(error?.name !== 'AbortError') document.getElementById('copyStatus').textContent = 'Скопируй ссылку кнопкой рядом.';
  }
}

async function copyResult(){
  const url = state.lastResultUrl || location.href;
  try{
    await navigator.clipboard.writeText(url);
    document.getElementById('copyStatus').textContent = 'Ссылка скопирована.';
  }catch(error){
    document.getElementById('copyStatus').textContent = 'Не удалось скопировать автоматически.';
  }
}

function backToWork(){
  document.body.classList.remove('result-mode');
  document.getElementById('resultView').hidden = true;
  history.replaceState(null,'',`${location.pathname}${location.search}`);
  document.getElementById('finish').scrollIntoView({behavior:'smooth'});
}

function startFresh(){
  localStorage.removeItem(STORAGE_KEY);
  document.querySelectorAll('input[type="text"], input[inputmode], textarea').forEach(el => el.value = '');
  document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
  state.matches = {};
  state.activeLeft = null;
  state.lastResultUrl = '';
  setChoiceVisuals();
  renderMatches();
  document.body.classList.remove('result-mode','teacher-mode');
  document.getElementById('resultView').hidden = true;
  history.replaceState(null,'',`${location.pathname}${location.search}`);
  updateProgress();
  window.scrollTo({top:0,behavior:'smooth'});
}

function loadTeacherResult(){
  if(!location.hash.startsWith('#result=')) return false;
  try{
    const payload = decodePayload(location.hash.slice('#result='.length));
    const data = payloadToData(payload);
    const result = grade(data);
    state.lastResultUrl = location.href;
    renderResult(data,result,payload.t,true);
    return true;
  }catch(error){
    console.warn('Некорректная ссылка результата', error);
    return false;
  }
}

document.getElementById('matchBoard').addEventListener('click', handleMatchClick);
document.getElementById('clearMatches').addEventListener('click', () => {
  state.matches = {};
  state.activeLeft = null;
  renderMatches();
  saveProgress();
});

document.querySelectorAll('input, textarea').forEach(el => {
  el.addEventListener('input', saveProgress);
  el.addEventListener('change', () => { setChoiceVisuals(); saveProgress(); });
});

document.getElementById('finishButton').addEventListener('click', finishWork);
document.getElementById('shareResult').addEventListener('click', shareResult);
document.getElementById('copyResult').addEventListener('click', copyResult);
document.getElementById('backToWork').addEventListener('click', backToWork);
document.getElementById('startFresh').addEventListener('click', startFresh);

if(!loadTeacherResult()){
  restoreProgress();
  updateProgress();
}

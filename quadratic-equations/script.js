// Вставьте сюда URL развернутого Google Apps Script, заканчивающийся на /exec.
const SUBMIT_URL = "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
const STORAGE_KEY = "quadratic-equations-workbook-v1";

const testBank = [
  {q:"Какое уравнение является квадратным?", options:["3x + 7 = 0","x² - 4x + 1 = 0","x³ + x = 0","5 / x = 2"], answer:1},
  {q:"Какое условие обязательно для квадратного уравнения ax² + bx + c = 0?", options:["a = 0","b ≠ 0","c ≠ 0","a ≠ 0"], answer:3},
  {q:"Чему равен коэффициент b в уравнении -3x² + 5x - 7 = 0?", options:["-3","5","-7","3"], answer:1},
  {q:"Какое уравнение является неполным?", options:["2x² - 3x + 1 = 0","x² + 6x + 5 = 0","4x² - 16 = 0","7x² + x - 9 = 0"], answer:2},
  {q:"Какое уравнение является приведённым?", options:["2x² + x - 1 = 0","x² - 8x + 7 = 0","-x² + 2x = 0","5x² + 5 = 0"], answer:1},
  {q:"По какой формуле вычисляют дискриминант?", options:["D = b² - 4ac","D = b² + 4ac","D = 2a + b + c","D = a² - 4bc"], answer:0},
  {q:"Если D > 0, сколько действительных корней у квадратного уравнения?", options:["Ни одного","Один","Два","Всегда три"], answer:2},
  {q:"Если D = 0, сколько различных действительных корней?", options:["Ни одного","Один","Два","Зависит только от c"], answer:1},
  {q:"Для x² + px + q = 0 теорема Виета говорит, что x₁ + x₂ равно…", options:["p","-p","q","-q"], answer:1},
  {q:"Для x² + px + q = 0 произведение x₁ · x₂ равно…", options:["p","-p","q","-q"], answer:2},
  {q:"Что удобнее всего сделать с уравнением 6x² + 12x = 0?", options:["Вынести x за скобку","Сразу строить график","Заменить x на y","Умножить на 0"], answer:0},
  {q:"Как называется коэффициент c?", options:["Старший коэффициент","Свободный член","Дискриминант","Корень"], answer:1}
];

const vietaVariants = [
  {eq:"x² - 7x + 12 = 0", sum:7, product:12, roots:[3,4]},
  {eq:"x² + x - 12 = 0", sum:-1, product:-12, roots:[3,-4]},
  {eq:"x² - 9x + 20 = 0", sum:9, product:20, roots:[4,5]},
  {eq:"x² + 5x + 6 = 0", sum:-5, product:6, roots:[-2,-3]},
  {eq:"x² - x - 12 = 0", sum:1, product:-12, roots:[4,-3]},
  {eq:"x² + 7x + 12 = 0", sum:-7, product:12, roots:[-3,-4]},
  {eq:"x² - 11x + 28 = 0", sum:11, product:28, roots:[4,7]},
  {eq:"x² + 2x - 15 = 0", sum:-2, product:-15, roots:[3,-5]}
];

const discriminantVariants = [
  {eq:"2x² - 10x + 12 = 0", a:2,b:-10,c:12,D:4,sqrtD:2,roots:[2,3]},
  {eq:"3x² - 15x + 18 = 0", a:3,b:-15,c:18,D:9,sqrtD:3,roots:[2,3]},
  {eq:"2x² + 2x - 12 = 0", a:2,b:2,c:-12,D:100,sqrtD:10,roots:[2,-3]},
  {eq:"4x² - 4x - 24 = 0", a:4,b:-4,c:-24,D:400,sqrtD:20,roots:[3,-2]},
  {eq:"5x² + 5x - 30 = 0", a:5,b:5,c:-30,D:625,sqrtD:25,roots:[2,-3]},
  {eq:"6x² - 6x - 72 = 0", a:6,b:-6,c:-72,D:1764,sqrtD:42,roots:[4,-3]},
  {eq:"3x² + 9x + 6 = 0", a:3,b:9,c:6,D:9,sqrtD:3,roots:[-1,-2]},
  {eq:"4x² + 4x - 8 = 0", a:4,b:4,c:-8,D:144,sqrtD:12,roots:[1,-2]}
];

const els = Object.fromEntries([
  "studentName","studentClass","progressValue","variantNumber","testContainer","vietaEquation","vietaSum","vietaProduct","vietaRoot1","vietaRoot2",
  "discEquation","discA","discB","discC","discD","discSqrt","discRoot1","discRoot2","submitButton","saveButton","submitStatus","resultPanel","resultScore","resultMax","resultTitle","resultText"
].map(id=>[id,document.getElementById(id)]));

let variantIndex = 0;
let selectedTests = [];
let startedAt = Date.now();
let initializedForKey = "";

function hashString(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h,16777619);
  }
  return h >>> 0;
}

function seededShuffle(array, seed){
  const out=[...array];
  let s=seed || 1;
  for(let i=out.length-1;i>0;i--){
    s = (Math.imul(s,1664525)+1013904223) >>> 0;
    const j=s%(i+1);
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

function studentKey(){
  return `${els.studentName.value.trim().toLowerCase()}|${els.studentClass.value.trim().toLowerCase()}`;
}

function initVariant(force=false){
  const name=els.studentName.value.trim();
  const className=els.studentClass.value.trim();
  if(!name || !className) return;
  const key=studentKey();
  if(!force && key===initializedForKey) return;
  initializedForKey=key;
  const seed=hashString(key);
  variantIndex=seed%vietaVariants.length;
  els.variantNumber.textContent=String(variantIndex+1);
  els.vietaEquation.textContent=vietaVariants[variantIndex].eq;
  els.discEquation.textContent=discriminantVariants[variantIndex%discriminantVariants.length].eq;
  const indexes=seededShuffle(testBank.map((_,i)=>i),seed).slice(0,5);
  selectedTests=indexes;
  renderTest(seed);
  restoreDraftAnswersOnly();
  updateProgress();
}

function renderTest(seed){
  els.testContainer.innerHTML="";
  selectedTests.forEach((bankIndex,position)=>{
    const item=testBank[bankIndex];
    const optionOrder=seededShuffle(item.options.map((_,i)=>i),seed+position*97);
    const block=document.createElement("article");
    block.className="test-question";
    block.dataset.bankIndex=bankIndex;
    block.innerHTML=`<div class="test-question__number">ВОПРОС ${position+1}</div><h3>${item.q}</h3><div class="test-options"></div>`;
    const options=block.querySelector(".test-options");
    optionOrder.forEach(optionIndex=>{
      const label=document.createElement("label");
      label.className="test-option";
      label.innerHTML=`<input type="radio" name="test-${position}" value="${optionIndex}"><span>${item.options[optionIndex]}</span>`;
      options.appendChild(label);
    });
    els.testContainer.appendChild(block);
  });
  els.testContainer.querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{saveDraft(false);updateProgress();}));
}

function parseNumber(value){
  const raw=String(value ?? "").trim().replace(/,/g,".").replace(/−/g,"-");
  if(!raw) return NaN;
  if(/^[-+]?\d+(\.\d+)?\/[-+]?\d+(\.\d+)?$/.test(raw)){
    const [n,d]=raw.split("/").map(Number);
    return d===0?NaN:n/d;
  }
  return Number(raw);
}

function nearlyEqual(a,b){return Number.isFinite(a) && Math.abs(a-b)<1e-9}
function rootsMatch(a,b,expected){
  const e1=expected[0],e2=expected[1];
  return (nearlyEqual(a,e1)&&nearlyEqual(b,e2))||(nearlyEqual(a,e2)&&nearlyEqual(b,e1));
}

function getTestAnswers(){
  return selectedTests.map((bankIndex,pos)=>{
    const checked=document.querySelector(`input[name="test-${pos}"]:checked`);
    return {bankIndex,selected:checked?Number(checked.value):null};
  });
}

function getAnswerPayload(){
  return {
    student:{name:els.studentName.value.trim(),className:els.studentClass.value.trim()},
    variant:variantIndex+1,
    test:getTestAnswers(),
    vieta:{sum:els.vietaSum.value,product:els.vietaProduct.value,root1:els.vietaRoot1.value,root2:els.vietaRoot2.value},
    discriminant:{a:els.discA.value,b:els.discB.value,c:els.discC.value,D:els.discD.value,sqrtD:els.discSqrt.value,root1:els.discRoot1.value,root2:els.discRoot2.value}
  };
}

function grade(){
  let score=0;
  const max=5+4+7;
  const testAnswers=getTestAnswers();
  testAnswers.forEach(a=>{if(a.selected!==null && a.selected===testBank[a.bankIndex].answer) score++;});

  const v=vietaVariants[variantIndex];
  const vs=parseNumber(els.vietaSum.value),vp=parseNumber(els.vietaProduct.value),vr1=parseNumber(els.vietaRoot1.value),vr2=parseNumber(els.vietaRoot2.value);
  if(nearlyEqual(vs,v.sum)) score++;
  if(nearlyEqual(vp,v.product)) score++;
  if(rootsMatch(vr1,vr2,v.roots)) score+=2;

  const d=discriminantVariants[variantIndex%discriminantVariants.length];
  const vals={a:parseNumber(els.discA.value),b:parseNumber(els.discB.value),c:parseNumber(els.discC.value),D:parseNumber(els.discD.value),sqrtD:parseNumber(els.discSqrt.value),r1:parseNumber(els.discRoot1.value),r2:parseNumber(els.discRoot2.value)};
  if(nearlyEqual(vals.a,d.a)) score++;
  if(nearlyEqual(vals.b,d.b)) score++;
  if(nearlyEqual(vals.c,d.c)) score++;
  if(nearlyEqual(vals.D,d.D)) score++;
  if(nearlyEqual(vals.sqrtD,d.sqrtD)) score++;
  if(rootsMatch(vals.r1,vals.r2,d.roots)) score+=2;
  return {score,max,testScore:testAnswers.filter(a=>a.selected===testBank[a.bankIndex].answer).length};
}

function validateComplete(){
  document.querySelectorAll(".invalid").forEach(e=>e.classList.remove("invalid"));
  const missing=[];
  if(!els.studentName.value.trim()){missing.push(els.studentName);}
  if(!els.studentClass.value.trim()){missing.push(els.studentClass);}
  for(let i=0;i<5;i++) if(!document.querySelector(`input[name="test-${i}"]:checked`)) missing.push(document.querySelector(`.test-question:nth-child(${i+1})`));
  [els.vietaSum,els.vietaProduct,els.vietaRoot1,els.vietaRoot2,els.discA,els.discB,els.discC,els.discD,els.discSqrt,els.discRoot1,els.discRoot2].forEach(el=>{if(!el.value.trim())missing.push(el)});
  missing.forEach(el=>el?.classList.add("invalid"));
  if(missing.length){
    const first=missing[0];
    first?.scrollIntoView({behavior:"smooth",block:"center"});
    first?.classList.add("shake");setTimeout(()=>first?.classList.remove("shake"),500);
    return false;
  }
  return true;
}

function saveDraft(showMessage=true){
  const payload=getAnswerPayload();
  payload.startedAt=startedAt;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
  if(showMessage){els.submitStatus.className="submit-status good";els.submitStatus.textContent="Черновик сохранён на этом устройстве.";}
}

function restoreDraft(){
  const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;
  try{
    const data=JSON.parse(raw);
    if(data.student){els.studentName.value=data.student.name||"";els.studentClass.value=data.student.className||"";}
    startedAt=data.startedAt||Date.now();
    initVariant(true);
  }catch(e){console.warn("Не удалось восстановить черновик",e)}
}

function restoreDraftAnswersOnly(){
  const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;
  try{
    const data=JSON.parse(raw);if(!data.student)return;
    if(`${data.student.name?.trim().toLowerCase()||""}|${data.student.className?.trim().toLowerCase()||""}`!==studentKey())return;
    const v=data.vieta||{};els.vietaSum.value=v.sum||"";els.vietaProduct.value=v.product||"";els.vietaRoot1.value=v.root1||"";els.vietaRoot2.value=v.root2||"";
    const d=data.discriminant||{};els.discA.value=d.a||"";els.discB.value=d.b||"";els.discC.value=d.c||"";els.discD.value=d.D||"";els.discSqrt.value=d.sqrtD||"";els.discRoot1.value=d.root1||"";els.discRoot2.value=d.root2||"";
    (data.test||[]).forEach((ans,pos)=>{const radio=document.querySelector(`input[name="test-${pos}"][value="${ans.selected}"]`);if(radio)radio.checked=true;});
  }catch(e){}
}

function updateProgress(){
  const fields=[els.studentName,els.studentClass,els.vietaSum,els.vietaProduct,els.vietaRoot1,els.vietaRoot2,els.discA,els.discB,els.discC,els.discD,els.discSqrt,els.discRoot1,els.discRoot2];
  let done=fields.filter(el=>el.value.trim()).length;
  done+=Array.from({length:5},(_,i)=>document.querySelector(`input[name="test-${i}"]:checked`)).filter(Boolean).length;
  const total=18;
  els.progressValue.textContent=`${Math.round(done/total*100)}%`;
}

function buildSubmission(){
  const gradeResult=grade();
  return {
    submittedAt:new Date().toISOString(),
    studentName:els.studentName.value.trim(),
    studentClass:els.studentClass.value.trim(),
    variant:variantIndex+1,
    score:gradeResult.score,
    maxScore:gradeResult.max,
    testScore:gradeResult.testScore,
    durationSeconds:Math.round((Date.now()-startedAt)/1000),
    answers:getAnswerPayload(),
    page:location.href,
    userAgent:navigator.userAgent
  };
}

function sendToSheet(payload){
  if(!SUBMIT_URL || SUBMIT_URL.includes("PASTE_GOOGLE")) return false;
  const form=document.createElement("form");
  form.method="POST";form.action=SUBMIT_URL;form.target="submissionFrame";form.style.display="none";
  const input=document.createElement("input");
  input.type="hidden";input.name="payload";input.value=JSON.stringify(payload);
  form.appendChild(input);document.body.appendChild(form);form.submit();setTimeout(()=>form.remove(),1000);
  return true;
}

function showResult({score,max}){
  els.resultPanel.hidden=false;els.resultScore.textContent=score;els.resultMax.textContent=max;
  const pct=score/max;
  if(pct>=.88){els.resultTitle.textContent="Отличная работа";els.resultText.textContent="Ты уверенно различаешь виды квадратных уравнений и умеешь применять оба основных способа решения.";}
  else if(pct>=.65){els.resultTitle.textContent="Хорошая база";els.resultText.textContent="Большая часть темы уже понятна. Проверь шаги, где могли потеряться знак, коэффициент или арифметика.";}
  else{els.resultTitle.textContent="Есть что закрепить";els.resultText.textContent="Вернись к блокам про коэффициенты, дискриминант и Виета, а затем попробуй решить задания ещё раз.";}
  els.resultPanel.scrollIntoView({behavior:"smooth",block:"nearest"});
}

els.studentName.addEventListener("input",()=>{initVariant();saveDraft(false);updateProgress();});
els.studentClass.addEventListener("input",()=>{initVariant();saveDraft(false);updateProgress();});
[els.vietaSum,els.vietaProduct,els.vietaRoot1,els.vietaRoot2,els.discA,els.discB,els.discC,els.discD,els.discSqrt,els.discRoot1,els.discRoot2].forEach(el=>el.addEventListener("input",()=>{saveDraft(false);updateProgress();}));

document.querySelectorAll("[data-quick-check] button").forEach(button=>button.addEventListener("click",()=>{
  const feedback=document.getElementById("quickFeedback");document.querySelectorAll("[data-quick-check] button").forEach(b=>b.classList.remove("correct","wrong"));
  if(button.dataset.value==="b"){button.classList.add("correct");feedback.textContent="Верно: перед x² стоит 1, поэтому a = 1.";feedback.style.color="#138a5b";}
  else{button.classList.add("wrong");feedback.textContent="Посмотри именно на коэффициент перед x². Для приведённого уравнения a = 1.";feedback.style.color="#be3d4d";}
}));

els.saveButton.addEventListener("click",()=>saveDraft(true));
els.submitButton.addEventListener("click",()=>{
  if(!initializedForKey) initVariant(true);
  if(!validateComplete()){
    els.submitStatus.className="submit-status error";els.submitStatus.textContent="Заполни все поля перед отправкой.";return;
  }
  saveDraft(false);
  const result=grade();const payload=buildSubmission();const sent=sendToSheet(payload);
  showResult(result);
  if(sent){
    els.submitStatus.className="submit-status good";els.submitStatus.textContent="Работа отправлена преподавателю и сохранена на устройстве.";
    localStorage.setItem(`${STORAGE_KEY}-submitted`,JSON.stringify({at:Date.now(),score:result.score,max:result.max}));
  }else{
    els.submitStatus.className="submit-status error";els.submitStatus.textContent="Проверка выполнена, но отправка преподавателю ещё не подключена. Нужно вставить URL Google Apps Script в script.js.";
  }
});

restoreDraft();
if(!els.studentName.value && !els.studentClass.value){updateProgress();}

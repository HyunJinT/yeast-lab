/* Oxygen inquiry lesson layer.
   Existing YeastSim model and Firebase class/group records are untouched. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const classes = ["B", "C", "D"];
  const originals = new Map();
  const studentState = () => { try { return JSON.parse(localStorage.getItem("yeastStudentStateV1") || "{}"); } catch { return {}; } };
  const activeClass = () => studentState().classId || document.querySelector("#classPicker .active")?.dataset.class || "";
  const controls = cls => window.YeastCloud?.controlSnapshot(cls) || {};
  const isOxygenMode = () => !!activeClass() && controls(activeClass()).lessonMode === "oxygen";
  const sameExceptOxygen = (a,b) => !!a && !!b &&
    a.substrate === b.substrate && Number(a.sugar) === Number(b.sugar) &&
    Number(a.temp) === Number(b.temp) && Number(a.yeast) === Number(b.yeast);
  function matchPair(items) {
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (sameExceptOxygen(a.conditions,b.conditions) && a.conditions.oxygen !== b.conditions.oxygen &&
        ["on","off"].includes(a.conditions.oxygen) && ["on","off"].includes(b.conditions.oxygen)) return [a,b];
    }
    return null;
  }
  function comparisonStatus(group) {
    const items = group?.experiments || [];
    const pair = matchPair(items);
    const hasOff = items.some(e => e.conditions?.oxygen === "off");
    const hasOn = items.some(e => e.conditions?.oxygen === "on");
    const completed = group?.stage === "report" || group?.stage === "challenge";
    const label = pair ? "산소 비교 완료" : hasOff && hasOn ? "변인 통제 확인 필요" :
      hasOff ? "산소 없음 실험 완료" : hasOn ? "산소 공급 실험 완료" : "비교 실험 시작 전";
    return {pair, label, completed};
  }
  function teacherBadge(group) {
    const c = controls(group?.classId || "");
    if (c.lessonMode !== "oxygen") return "";
    const s = comparisonStatus(group);
    const state = s.pair ? "ok" : "pending";
    return '<span class="lesson-teacher-badge lesson-' + state + '">' + s.label +
      (s.completed ? " · 포스터 완료" : "") + "</span>";
  }
  window.YeastLesson = {isOxygenMode, matchPair, comparisonStatus, teacherBadge};

  const style = document.createElement("style");
  style.textContent = [
    ".lesson-oxygen-only{display:none}",
    "body.lesson-oxygen .lesson-oxygen-only{display:block}",
    "body.lesson-oxygen .hypothesis-examples,body.lesson-oxygen #challengeGateBtn{display:none!important}",
    "body.lesson-oxygen.lesson-reveal-0 .lesson-atp,body.lesson-oxygen.lesson-reveal-0 .lesson-ethanol,body.lesson-oxygen.lesson-reveal-1 .lesson-ethanol{display:none!important}",
    ".lesson-panel{margin:12px 0;padding:16px;border-radius:14px;background:rgba(29,112,139,.14);border:1px solid rgba(93,194,214,.35)}",
    ".lesson-panel h3{margin:0 0 7px;font-size:1rem}",
    ".lesson-panel p{margin:3px 0 10px;font-size:.92rem;line-height:1.55}",
    ".lesson-panel button{padding:10px 14px;border:1px solid #68c4d0;border-radius:11px;background:rgba(34,134,162,.24);color:inherit;font-weight:700;cursor:pointer}",
    ".lesson-panel button:disabled{opacity:.45;cursor:not-allowed}",
    ".lesson-panel .lesson-status{margin-top:10px;font-weight:650}",
    ".lesson-oxygen-only.lesson-field{margin:12px 0}",
    ".lesson-field textarea{display:block;width:100%;min-height:72px;box-sizing:border-box;margin-top:6px}",
    ".lesson-teacher-panel{margin:14px 0 22px;padding:20px;border:1px solid #32697c;border-radius:18px;background:rgba(23,81,106,.25)}",
    ".lesson-teacher-panel h2{margin:0 0 6px}",
    ".lesson-teacher-panel p{margin:4px 0 14px;color:#b6d4df;font-size:.9rem}",
    ".lesson-teacher-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}",
    ".lesson-teacher-card{border:1px solid #3a6a7b;border-radius:12px;padding:13px;background:rgba(6,30,43,.35)}",
    ".lesson-teacher-card label{display:block;margin:10px 0;font-size:.88rem}",
    ".lesson-teacher-card select{display:block;width:100%;margin-top:5px;padding:8px;border-radius:8px;background:#102b3b;color:white;border:1px solid #50788b}",
    ".lesson-teacher-badge{display:inline-block;margin-left:8px;padding:3px 9px;border-radius:30px;font-size:.78rem;border:1px solid #889ba4}",
    ".lesson-teacher-badge.lesson-ok{border-color:#50bfa7;color:#68dfc1}",
    ".lesson-teacher-badge.lesson-pending{color:#f2c784}",
    "@media(max-width:600px){.lesson-teacher-panel{padding:12px}.lesson-panel{padding:12px}}"
  ].join("\n");
  document.head.appendChild(style);

  function changeText(selector, content, oxygen) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (!originals.has(selector)) originals.set(selector, el.textContent);
    const next = oxygen ? content : originals.get(selector);
    if (el.textContent !== next) el.textContent = next;
  }
  function ensureStudentFields() {
    const zone = $("experimentSettingsZone");
    if (zone && !$("oxygenLessonPanel")) {
      const div = document.createElement("div");
      div.className = "lesson-panel lesson-oxygen-only";
      div.id = "oxygenLessonPanel";
      div.innerHTML = '<h3>산소 유무 비교 탐구</h3>' +
        '<p>첫 실험: 산소 공급 없음. 두 번째 실험: 다른 조건은 그대로 두고 산소 공급 여부만 바꾸세요.</p>' +
        '<button id="lessonFlipOxygenBtn" type="button">이전 실험과 산소 조건만 바꾸기</button>' +
        '<div id="oxygenLessonStatus" class="lesson-status" aria-live="polite">비교 실험 시작 전</div>';
      const reason = zone.querySelector(".reason-row");
      if (reason) reason.before(div); else zone.appendChild(div);
      $("lessonFlipOxygenBtn").addEventListener("click", () => {
        const s = studentState();
        const previous = s.experiments?.at(-1)?.conditions;
        if (!previous) return window.alert("먼저 첫 번째 실험을 완료하세요.");
        const inputs = {
          substrate:$("substrateSelect"),oxygen:$("oxygenSelect"),
          sugar:$("sugarRange"),temp:$("tempRange"),yeast:$("yeastRange")
        };
        if (Object.values(inputs).some(x=>!x || x.disabled)) return window.alert("진행 중인 실험이 끝난 뒤 변경하세요.");
        const target = {...previous, oxygen:previous.oxygen === "on" ? "off" : "on"};
        for (const [key,el] of Object.entries(inputs)) {
          el.value = target[key];
          el.dispatchEvent(new Event("input",{bubbles:true}));
          el.dispatchEvent(new Event("change",{bubbles:true}));
        }
        $("reasonInput").focus();
        const status = $("oxygenLessonStatus");
        if (status) status.textContent = "산소 조건만 변경했습니다. 선택한 이유를 입력하고 실험을 시작하세요.";
      });
    }
  }
  function ensureTeacherPanel() {
    const anchor = document.querySelector(".teacher-control-panel");
    if (!anchor || $("lessonTeacherPanel")) return;
    const panel = document.createElement("section");
    panel.id = "lessonTeacherPanel";
    panel.className = "lesson-teacher-panel";
    panel.innerHTML = '<h2>반별 탐구 수업 설정</h2>' +
      '<p>자유 탐구는 기존 화면을 유지합니다. 산소 유무 탐구에서는 발효 힌트를 숨기고 자료를 단계별 공개합니다. 설정은 Firebase 반별 제어에 저장됩니다.</p>' +
      '<div class="lesson-teacher-grid">' + classes.map(cls =>
      '<div class="lesson-teacher-card"><strong>' + cls + '반</strong>' +
      '<label>수업 모드<select data-lesson-class="' + cls + '" data-lesson-field="lessonMode">' +
      '<option value="free">자유 탐구</option><option value="oxygen">산소 유무 탐구</option></select></label>' +
      '<label>지표 공개 단계<select data-lesson-class="' + cls + '" data-lesson-field="revealStage">' +
      '<option value="0">1단계 · CO₂ / O₂만</option><option value="1">2단계 · ATP도 공개</option><option value="2">3단계 · 에탄올까지 공개</option></select></label>' +
      '</div>').join("") + '</div>';
    anchor.insertAdjacentElement("afterend",panel);
    panel.querySelectorAll("select[data-lesson-field]").forEach(el => {
      el.addEventListener("change", async () => {
        const cls = el.dataset.lessonClass;
        const field = el.dataset.lessonField;
        let patch = {};
        if (field === "lessonMode") {
          patch = {lessonMode:el.value,revealStage:el.value === "oxygen" ? 0 : 2};
        } else {
          patch = {revealStage:Number(el.value)};
        }
        el.disabled = true;
        try { await YeastCloud.publishLessonControl(cls,patch); }
        catch (e) { console.error("수업 설정 저장 실패",e); window.alert("수업 설정을 저장하지 못했습니다. 연결 상태를 확인하세요."); }
        finally { el.disabled = false; refreshTeacherPanel(); refreshStudentMode(); }
      });
    });
  }
  function refreshTeacherPanel() {
    const panel = $("lessonTeacherPanel");
    if (!panel) return;
    panel.querySelectorAll("select[data-lesson-field]").forEach(el => {
      if (el.disabled) return;
      const c = controls(el.dataset.lessonClass);
      const field = el.dataset.lessonField;
      const next = field === "lessonMode" ? (c.lessonMode || "free") : String(c.revealStage ?? 2);
      if (el.value !== next) el.value = next;
    });
  }
  function refreshStudentMode() {
    const oxygen = isOxygenMode();
    const c = controls(activeClass());
    const reveal = Math.max(0,Math.min(2,Number(c.revealStage ?? (oxygen ? 0 : 2))));
    document.body.classList.toggle("lesson-oxygen",oxygen);
    for (let i=0;i<=2;i++) document.body.classList.toggle("lesson-reveal-" + i,oxygen && reveal===i);
    changeText("#joinView .briefing h2","산소가 없다면 효모는 에너지를 얻을 수 없을까?",oxygen);
    changeText("#joinView .briefing ol li:nth-child(4)","실험 결과를 바탕으로 새로운 궁금증을 찾아봅니다.",oxygen);
    changeText("#hypothesisView .hypothesis-step-card h2","산소의 유무에 따라 CO₂ 발생량은 어떻게 달라질까요?",oxygen);
    changeText("#hypothesisView .hypothesis-guide","산소 공급 여부를 조작 변인으로 정하고, 예상 결과와 이유가 드러나도록 가설을 작성하세요.",oxygen);
    changeText("#hypothesisView .hypothesis-question-box strong","산소의 유무에 따라 효모의 CO₂ 발생량은 어떻게 달라질까?",oxygen);
    changeText("#hypothesisView .hypothesis-frame p","산소를 공급하지 않으면 효모의 CO₂ 발생량은 ________할 것이다. 왜냐하면 ________이기 때문이다.",oxygen);
    changeText("#labView .relative-index-note","※ CO₂와 O₂ 소비량은 교육용 모델의 추정값입니다. 산소 공급 여부만 변경한 비교 실험을 수행하고, 다른 대사 지표는 교사의 공개 이후 확인하세요. 실제 실험 결과와 차이가 있을 수 있습니다.",oxygen);
    changeText("#reportView #researchPoster .poster-col:first-child article:first-child p","산소의 유무에 따라 효모의 CO₂ 발생량은 어떻게 달라질까?",oxygen);
    changeText("#reflectionView label[for=unexpected]","실험 결과가 처음 예상과 같았나요, 달랐나요?",oxygen);
    changeText("#reflectionView label[for=changedThinking]","실험 후 처음 생각이 어떻게 달라지거나 확실해졌나요?",oxygen);
    changeText("#reflectionView label[for=currentExplanation]","산소가 없는데도 CO₂가 발생한 현상을 어떻게 설명할 수 있나요?",oxygen);
    const stageText = $("lessonRevealStageText");
    if(stageText) stageText.textContent = ["CO₂/O₂ 관찰","ATP 공개","에탄올 공개"][reveal];
    const s=studentState(), status=comparisonStatus(s);
    const statusEl=$("oxygenLessonStatus");
    if (statusEl && statusEl.dataset.lastResult !== status.label) {
      statusEl.textContent=status.label;
      statusEl.dataset.lastResult=status.label;
    }
    const flip=$("lessonFlipOxygenBtn");
    if (flip) flip.disabled = !s.experiments?.length || !!$("substrateSelect")?.disabled;
    const e=document.querySelectorAll("#experimentLog .result-chip, #reflectionView .evidence-result, #reportView .poster-trial-result");
    e.forEach(n => {
      if (n.classList.contains("lesson-atp") || n.classList.contains("lesson-ethanol")) return;
      // Specific metric spans in log/reflection/poster are annotated in index.html.
    });
    document.querySelectorAll("#experimentLog .metric-wording").forEach(n=>{
      n.style.display=oxygen?"none":"";
    });
    if (oxygen && $("challengeView")?.classList.contains("active")) {
      $("challengeView").classList.remove("active");
      $("reportView")?.classList.add("active");
    }
  }
  ensureStudentFields();
  ensureTeacherPanel();
  $("atpLive")?.parentElement?.classList.add("lesson-atp");
  $("ethanolLive")?.parentElement?.classList.add("lesson-ethanol");
  $("goReflectionBtn")?.addEventListener("click", e => {
    if (!isOxygenMode()) return;
    const s=studentState();
    if (matchPair(s.experiments || [])) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.alert("산소 이외의 모든 조건을 동일하게 유지한 두 실험(산소 공급 / 공급 없음)을 먼저 완료해 주세요.");
  },true);
  YeastCloud.subscribeControlLocal(payload=>{
    if (payload?.classId && classes.includes(payload.classId)) {
      refreshTeacherPanel();
      refreshStudentMode();
    }
  });
  document.querySelectorAll("#classPicker [data-class]").forEach(b=>b.addEventListener("click",()=>{
    setTimeout(refreshStudentMode,0);
  }));
  $("joinBtn")?.addEventListener("click",()=>setTimeout(refreshStudentMode,0));
  const logs=$("experimentLog");
  if (logs) new MutationObserver(()=>refreshStudentMode()).observe(logs,{childList:true});
  const report=$("researchPoster");
  if (report) new MutationObserver(()=> {
    if(isOxygenMode()) {
      const p=report.querySelector(".poster-col:first-child article:first-child p");
      if(p && p.textContent !== "산소의 유무에 따라 효모의 CO₂ 발생량은 어떻게 달라질까?")
        p.textContent="산소의 유무에 따라 효모의 CO₂ 발생량은 어떻게 달라질까?";
    }
  }).observe(report,{childList:true,subtree:true});
  refreshTeacherPanel();
  refreshStudentMode();
  setInterval(refreshStudentMode,2000);
})();

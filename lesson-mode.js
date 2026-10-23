/* Teacher-paced classroom workflow. Student tutorial and inquiry records stay separate. */
(() => {
  "use strict";
  const classes=["B","C","D"],$=id=>document.getElementById(id);
  const snapshot=cls=>window.YeastCloud?.controlSnapshot(cls)||{};
  const styles=document.createElement("style");
  styles.textContent=`
#inquiryGateBtn{display:none;border:1px solid #34d399;background:rgba(16,185,129,.13);color:#b5f7dd;border-radius:10px;padding:9px 13px;font-weight:900;font-size:12px;white-space:nowrap}
body.student-mode #inquiryGateBtn{display:inline-block}
#inquiryGateBtn:disabled,#tutorialStartBtn:disabled{opacity:.45;cursor:not-allowed}
.lesson-wait-card{max-width:700px;margin:35px auto;padding:32px;text-align:center}
.lesson-wait-card h2{font-size:clamp(24px,3.3vw,32px);margin:14px 0}
.lesson-wait-card p{color:#b6d4df;line-height:1.7}
.lesson-wait-status{padding:14px;background:rgba(23,95,113,.22);border:1px solid #426a7f;border-radius:12px;margin:18px 0}
#tutorialGuide{display:none;padding:16px 20px;border:1px solid #29aab6;border-radius:14px;background:rgba(24,112,128,.16);margin:0 0 18px}
#tutorialGuide b{font-size:18px}
#tutorialGuide p{line-height:1.75;margin:7px 0 0;color:#d1e9ee}
body.lesson-tutorial #tutorialGuide{display:block}
body.lesson-tutorial #goReflectionBtn,
body.lesson-tutorial #labView .head-left>.back-btn,
body.lesson-tutorial #labView .five-result-notice,
body.lesson-tutorial #experimentSettingsZone .reason-row>label,
body.lesson-tutorial #reasonInputWrap,
body.lesson-tutorial #multiVarWarning{display:none!important}
body.lesson-tutorial .controls-grid>label:not(:nth-child(2)){opacity:.6}
body.lesson-tutorial .controls-grid>label:not(:nth-child(2))::after{content:" · 고정값";color:#71d2ca;font-size:11px}
body.lesson-tutorial #experimentSettingsZone .reason-row{justify-content:center}
body.lesson-tutorial #runBtn{min-width:160px}
.lesson-teacher-panel{margin:14px 0 22px;padding:20px;border:1px solid #36697b;border-radius:18px;background:rgba(19,77,96,.24)}
.lesson-teacher-panel h2{margin:0 0 8px}
.lesson-teacher-panel>p{color:#b6d4df;line-height:1.65;font-size:.92rem}
.lesson-teacher-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.lesson-teacher-card{padding:16px;border:1px solid #3b6b7a;border-radius:13px;background:rgba(7,29,43,.44)}
.lesson-teacher-card h3{margin:0 0 12px;font-size:1.1rem}
.lesson-teacher-card p{font-size:.8rem;line-height:1.5;color:#a3c8d5;margin:10px 0}
.lesson-teacher-toggle{width:100%;margin:6px 0 10px;text-align:left;border:1px solid #67828d;border-radius:11px;background:#183245;color:#eefbff;padding:12px;cursor:pointer;line-height:1.5;font-weight:750}
.lesson-teacher-toggle span{display:block;font-size:.8rem;font-weight:500}
.lesson-teacher-toggle.enabled{background:rgba(21,132,111,.3);border-color:#51c9a8;color:#acffe4}
.lesson-teacher-toggle:disabled{opacity:.45;cursor:wait}
@media(max-width:720px){#inquiryGateBtn{padding:8px 9px;font-size:11px}.lesson-wait-card{padding:20px}.lesson-teacher-panel{padding:13px}}
`;
  document.head.appendChild(styles);

  function installTeacherPanel(){
    const anchor=document.querySelector(".teacher-control-panel");
    if(!anchor||$("lessonTeacherPanel"))return;
    const panel=document.createElement("section");
    panel.id="lessonTeacherPanel";
    panel.className="lesson-teacher-panel";
    panel.innerHTML='<h2>반별 수업 진행 제어</h2>'+
      '<p>① 학생들이 반·모둠명 입력 후 대기합니다. ② 해당 반의 튜토리얼을 열면 학생의 <b>실험하러 가기</b> 버튼이 활성화됩니다. ③ 이후 <b>탐구 실행하기</b>를 활성화하면 학생이 가설 작성부터 자유탐구를 시작할 수 있습니다. 단계는 반별로 독립적으로 제어됩니다.</p>'+
      '<div class="lesson-teacher-grid">'+classes.map(cls=>
        '<section class="lesson-teacher-card"><h3>'+cls+'반</h3>'+
        '<button type="button" class="lesson-teacher-toggle" data-classroom="'+cls+'" data-field="tutorialOpen"></button>'+
        '<button type="button" class="lesson-teacher-toggle" data-classroom="'+cls+'" data-field="inquiryEnabled"></button>'+
        '<p>두 항목은 실시간으로 학생 화면에 적용됩니다. 이미 진행 중인 실험은 완료 후 다음 단계로 이동할 수 있습니다.</p></section>'
      ).join("")+'</div>';
    anchor.insertAdjacentElement("afterend",panel);
    panel.querySelectorAll("button[data-classroom]").forEach(button=>{
      button.addEventListener("click",async()=>{
        if(button.disabled)return;
        const cls=button.dataset.classroom,field=button.dataset.field;
        const next=!snapshot(cls)[field];
        button.disabled=true;
        try{await YeastCloud.publishLessonControl(cls,{[field]:next});}
        catch(error){console.error(error);alert("설정을 저장하지 못했습니다. Firebase 연결 상태를 확인해 주세요.");}
        finally{button.disabled=false;refreshTeacherPanel();}
      });
    });
    refreshTeacherPanel();
  }
  function refreshTeacherPanel(){
    document.querySelectorAll("#lessonTeacherPanel [data-classroom]").forEach(button=>{
      const cls=button.dataset.classroom,field=button.dataset.field;
      if(button.disabled)return;
      const enabled=!!snapshot(cls)[field];
      button.classList.toggle("enabled",enabled);
      button.setAttribute("aria-pressed",String(enabled));
      const title=field==="tutorialOpen"?"튜토리얼 페이지 오픈":"탐구 실행하기";
      button.innerHTML='<strong>'+(enabled?"🔓 활성화됨":"🔒 비활성화")+'</strong><span>'+title+'</span>';
    });
  }
  window.YeastLesson={
    isOxygenMode:()=>false,
    matchPair:()=>null,
    teacherBadge:()=>"",
    refreshTeacherPanel
  };
  installTeacherPanel();
  YeastCloud.subscribeControlLocal(payload=>{
    if(payload?.classId&&classes.includes(payload.classId))refreshTeacherPanel();
  });
  refreshTeacherPanel();
})();
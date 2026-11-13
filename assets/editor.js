/* Build Smartly · page editor for staff ("Edit the site").
   Staff with the Site content section open a page exactly as visitors see it, with one slim bar on top. Hovering shows
   what can be changed; a click on a piece of text opens a small box to change it, a click on a picture replaces it,
   an eye button hides or shows a home page section, and the Slides panel edits the banner on the home page.
   Nothing reaches visitors until Save: the changes are kept here, shown on this screen only, and written in one go to
   the same settings the site already reads (content, pic-<key>, site.hide, slides). Exit without saving puts the page
   back as it was. The phone view shows the page, with the unsaved changes, in a phone-sized frame. */
(function(){
  var PREVIEW = /[?&]ed_preview=1/.test(location.search);
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var norm = function(s){ return String(s||'').trim().replace(/\s+/g,' '); };
  var LANGS = [['en','English'],['am','አማርኛ'],['om','Oromoo']];
  var PAGES = [
    ['home','Home page','The banner, sections and everything visitors see first'],
    ['boq','Request form','Where buyers choose materials and send a request'],
    ['signin','Sign in','Sign-in for buyers and suppliers'],
    ['signup-supplier','Supplier registration','The steps a new supplier goes through'],
    ['supplier','Supplier sign-in','The supplier portal before signing in'],
    ['newsletter','Newsletter','The latest issue and the advertising offer'],
    ['members','Members','The public directory of verified members'],
    ['contact','Contact','How to reach Build Smartly'],
    ['faq','FAQ','Questions and answers'],
    ['terms','Terms','Terms of use'],
    ['privacy','Privacy','Privacy policy'],
    ['start','Start here','The page for testers']
  ];
  var ICON = {
    undo:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    pc:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    phone:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
    eye:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeoff:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    pic:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    slides:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M7 21h10"/><path d="m10 10 4 2-4 2z"/></svg>',
    grip:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    close:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    pages:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>'
  };

  /* ---------------- the phone preview frame: it only shows; the editing window sends it the unsaved changes ---------------- */
  if(PREVIEW){
    var st=document.createElement('style'); st.textContent='#helpBtn,#helpPanel{display:none!important}'; document.head.appendChild(st);
    var ask=function(){ try{ if(parent && parent.bsEditorPush) parent.bsEditorPush(window); }catch(e){} };
    if(window.BS && BS.onSettings) BS.onSettings(function(){ setTimeout(ask, 0); });
    window.addEventListener('load', function(){ setTimeout(ask, 50); });
    return;
  }

  var on=false, lang='en', homeLang='en', pend=null, undo=[], view='home', hoverTarget=null, pop=null, phoneOpen=false, slidesOpen=false, slideOpenIx=-1;
  function fresh(){ return {text:{en:{},am:{},om:{}}, pics:{}, hide:null, slides:null}; }

  /* ---------------- styles: everything the editor adds lives under #ed… so the site's own look is untouched ---------------- */
  var css=document.createElement('style'); css.id='edStyle';
  css.textContent=[
    'body.bs-editing{padding-top:56px}',
    'body.bs-editing header.site{top:56px}',
    'body.bs-editing #helpBtn,body.bs-editing #helpPanel,body.bs-editing #alertBar{display:none!important}',
    'body.bs-editing [data-view] *{cursor:default}',
    '#edBar{position:fixed;inset:0 0 auto 0;height:56px;z-index:2000;display:flex;align-items:center;gap:.6rem;padding:0 .9rem;background:#12402F;color:#F3F7F4;font:500 14px/1.2 Manrope,system-ui,sans-serif;box-shadow:0 2px 14px rgba(0,0,0,.25)}',
    '#edBar .edgrp{display:flex;align-items:center;gap:.35rem}',
    '#edBar .edgrow{flex:1}',
    '#edBar .edtag{font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:11px;background:#E3A63A;color:#14241E;border-radius:6px;padding:.25rem .5rem}',
    '#edBar button,#edBar select{font:inherit;color:inherit;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:9px;height:34px;padding:0 .7rem;display:inline-flex;align-items:center;gap:.4rem;cursor:pointer;transition:background .15s}',
    '#edBar button:hover,#edBar select:hover{background:rgba(255,255,255,.16)}',
    '#edBar button:disabled{opacity:.4;cursor:default}',
    '#edBar select{appearance:none;padding-right:1.8rem;background-image:linear-gradient(45deg,transparent 50%,#F3F7F4 50%),linear-gradient(135deg,#F3F7F4 50%,transparent 50%);background-position:calc(100% - 14px) 15px,calc(100% - 9px) 15px;background-size:5px 5px;background-repeat:no-repeat;max-width:13rem}',
    '#edBar select option{color:#14241E}',
    '#edBar .edseg{display:inline-flex;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:9px;padding:2px;height:34px}',
    '#edBar .edseg button{border:0;background:none;height:28px;border-radius:7px;padding:0 .6rem}',
    '#edBar .edseg button.on{background:#F3F7F4;color:#12402F;font-weight:700}',
    '#edBar #edSave{background:#E3A63A;border-color:#E3A63A;color:#14241E;font-weight:700}',
    '#edBar #edSave:hover{background:#efb54d}',
    '#edBar #edSave:disabled{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:#F3F7F4}',
    '#edBar .edcount{background:#14241E;color:#E3A63A;border-radius:999px;font-size:12px;padding:.05rem .45rem;margin-left:.1rem}',
    '@media (max-width:1050px){#edBar .edlbl{display:none}#edBar select{max-width:9rem}}',
    '@media (max-width:640px){#edBar{gap:.3rem;padding:0 .5rem}#edBar .edtag{display:none}#edBar .edseg button{padding:0 .4rem}}',
    '#edHover{position:fixed;z-index:1990;pointer-events:none;border:2px dashed #1E6B4E;border-radius:6px;background:rgba(30,107,78,.06);transition:all .08s ease-out;display:none}',
    '#edHover.pic{border-style:solid;border-color:#E3A63A;background:rgba(227,166,58,.10)}',
    '#edHint{position:fixed;z-index:1991;pointer-events:none;background:#12402F;color:#fff;font:600 12px/1 Manrope,system-ui,sans-serif;padding:.35rem .55rem;border-radius:7px;display:none;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.2)}',
    '#edEye{position:fixed;z-index:1992;display:none;align-items:center;gap:.35rem;font:600 12px/1 Manrope,system-ui,sans-serif;background:#fff;color:#12402F;border:1px solid #c9d6ce;border-radius:999px;padding:.4rem .7rem;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15)}',
    '#edEye:hover{background:#EEF4F0}',
    'body.bs-editing [data-hsec].ed-off{display:block!important;opacity:.38;outline:2px dashed #b9772a;outline-offset:-2px;position:relative}',
    'body.bs-editing [data-hsec].ed-off::before{content:"Hidden from visitors";position:absolute;top:.6rem;left:50%;transform:translateX(-50%);z-index:5;background:#b9772a;color:#fff;font:700 12px/1 Manrope,system-ui,sans-serif;padding:.35rem .7rem;border-radius:999px}',
    '#edPop{position:fixed;z-index:2010;width:min(26rem,calc(100vw - 24px));background:#fff;color:#14241E;border-radius:14px;box-shadow:0 18px 50px rgba(10,30,22,.28),0 0 0 1px rgba(18,64,47,.08);padding:.9rem;display:grid;gap:.6rem;font:14px/1.45 Manrope,system-ui,sans-serif}',
    '#edPop .edph{display:flex;justify-content:space-between;align-items:center;gap:.5rem;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#4c5e56}',
    '#edPop textarea{font:inherit;font-size:15px;line-height:1.5;color:#14241E;width:100%;min-height:2.8rem;resize:vertical;border:1.5px solid #c9d6ce;border-radius:10px;padding:.55rem .65rem;outline:none;background:#fbfcfb}',
    '#edPop textarea:focus{border-color:#1E6B4E;box-shadow:0 0 0 3px rgba(30,107,78,.15)}',
    '#edPop .edorig{font-size:12.5px;color:#4c5e56;background:#F2F5F3;border-radius:8px;padding:.45rem .6rem}',
    '#edPop .ednote{font-size:12.5px;color:#7a5512;background:#FBF3E4;border-radius:8px;padding:.45rem .6rem}',
    '#edPop .edrow{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}',
    '#edPop .edrow .edsp{flex:1}',
    '#edPop button{font:600 13.5px/1 Manrope,system-ui,sans-serif;border-radius:9px;height:34px;padding:0 .85rem;cursor:pointer;border:1px solid #c9d6ce;background:#fff;color:#14241E}',
    '#edPop button:hover{background:#F2F5F3}',
    '#edPop button.pri{background:#1E6B4E;border-color:#1E6B4E;color:#fff}',
    '#edPop button.pri:hover{background:#185a42}',
    '#edPop button.lnk{border:0;background:none;color:#1E6B4E;padding:0 .2rem;text-decoration:underline}',
    '#edPop img{width:100%;max-height:11rem;object-fit:cover;border-radius:10px;background:#eef2ef}',
    '#edPop .edx{border:0;background:none;width:30px;height:30px;padding:0;display:grid;place-items:center;color:#4c5e56}',
    '#edPick,#edPhone,#edSlides{position:fixed;z-index:2020}',
    '#edPick{inset:0;background:rgba(9,26,19,.55);display:grid;place-items:center;padding:1rem;backdrop-filter:blur(3px)}',
    '#edPick .edcard{background:#fff;border-radius:18px;max-width:58rem;width:100%;max-height:calc(100vh - 2rem);overflow:auto;padding:1.4rem;box-shadow:0 30px 80px rgba(0,0,0,.35);font:14px/1.45 Manrope,system-ui,sans-serif;color:#14241E}',
    '#edPick h2{font:700 1.35rem/1.2 Sora,Manrope,system-ui,sans-serif;margin:0;color:#12402F}',
    '#edPick .edsub{color:#4c5e56;margin:.3rem 0 1.1rem}',
    '#edPick .edgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(14.5rem,1fr));gap:.7rem}',
    '#edPick .edpg{display:grid;grid-template-columns:auto 1fr;gap:.2rem .7rem;align-items:start;text-align:left;border:1.5px solid #dfe7e2;border-radius:14px;padding:.85rem;background:#fff;cursor:pointer;font:inherit;color:inherit;transition:border-color .15s,box-shadow .15s,transform .15s}',
    '#edPick .edpg:hover{border-color:#1E6B4E;box-shadow:0 8px 24px rgba(18,64,47,.12);transform:translateY(-1px)}',
    '#edPick .edpg .i{grid-row:span 2;width:36px;height:36px;border-radius:10px;background:#EEF4F0;color:#1E6B4E;display:grid;place-items:center}',
    '#edPick .edpg strong{font-size:15px}',
    '#edPick .edpg span.d{font-size:12.5px;color:#4c5e56}',
    '#edPick .edtop{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}',
    '#edPick .edtop button{border:1px solid #dfe7e2;background:#fff;border-radius:10px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer;color:#4c5e56}',
    '#edPick .edtips{display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:1.1rem;padding-top:1rem;border-top:1px solid #e6ece8;font-size:13px;color:#4c5e56}',
    '#edPick .edtips b{color:#12402F}',
    '#edPhone{top:56px;right:0;bottom:0;width:430px;background:#E8EEEA;border-left:1px solid #cfdad3;display:flex;flex-direction:column;align-items:center;padding:.8rem;gap:.6rem;box-shadow:-10px 0 30px rgba(0,0,0,.12);font:13px/1.4 Manrope,system-ui,sans-serif;color:#4c5e56}',
    '#edPhone .edfr{width:390px;flex:1;max-height:844px;border:10px solid #14241E;border-radius:34px;overflow:hidden;background:#fff;box-shadow:0 14px 40px rgba(0,0,0,.25)}',
    '#edPhone iframe{width:100%;height:100%;border:0;display:block}',
    'body.bs-editing.ed-phone{padding-right:430px}',
    '#edSlides{top:56px;right:0;bottom:0;width:min(440px,100vw);background:#fff;border-left:1px solid #dfe7e2;box-shadow:-12px 0 40px rgba(0,0,0,.15);display:flex;flex-direction:column;font:14px/1.45 Manrope,system-ui,sans-serif;color:#14241E}',
    '#edSlides .edsh{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.1rem .6rem}',
    '#edSlides .edsh h3{margin:0;font:700 1.1rem/1.2 Sora,Manrope,system-ui,sans-serif;color:#12402F}',
    '#edSlides .edsh button{border:1px solid #dfe7e2;background:#fff;border-radius:9px;width:34px;height:34px;display:grid;place-items:center;cursor:pointer;color:#4c5e56}',
    '#edSlides .edsb{flex:1;overflow:auto;padding:0 1.1rem 1rem;display:flex;flex-direction:column;gap:.6rem}',
    '#edSlides .edsb>*{flex:none}',
    '#edSlides .edsec{display:flex;align-items:center;gap:.6rem;font-size:13px;color:#4c5e56;padding:.2rem 0 .5rem}',
    '#edSlides .edsec input{width:4.2rem;height:32px;border:1.5px solid #c9d6ce;border-radius:8px;padding:0 .5rem;font:inherit}',
    '#edSlides .eds{border:1.5px solid #dfe7e2;border-radius:12px;background:#fff;overflow:hidden;transition:border-color .15s,box-shadow .15s}',
    '#edSlides .eds.open{border-color:#1E6B4E;box-shadow:0 8px 24px rgba(18,64,47,.10)}',
    '#edSlides .eds.drag{opacity:.45}',
    '#edSlides .eds.over{border-color:#E3A63A}',
    '#edSlides .edsr{display:grid;grid-template-columns:auto 4.6rem 1fr auto;gap:.6rem;align-items:center;padding:.5rem .6rem;cursor:pointer}',
    '#edSlides .edsr .g{color:#9aaba2;cursor:grab;display:grid;place-items:center;width:20px}',
    '#edSlides .edsr img{width:4.6rem;height:2.6rem;object-fit:cover;border-radius:7px;background:#eef2ef}',
    '#edSlides .edsr>span{min-width:0}',
    '#edSlides .edsr .t{font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#edSlides .edhelp{font-size:12.5px;color:#4c5e56;margin:-.2rem 0 .2rem}',
    '#edSlides .edsr .n{font-size:12px;color:#4c5e56}',
    '#edSlides .edsr .mv{display:flex;gap:.2rem}',
    '#edSlides .edsr .mv button{border:1px solid #dfe7e2;background:#fff;border-radius:7px;width:26px;height:26px;cursor:pointer;color:#4c5e56;font-size:12px}',
    '#edSlides .edsf{display:grid;gap:.55rem;padding:.2rem .8rem .9rem;border-top:1px solid #edf1ee}',
    '#edSlides label{display:grid;gap:.25rem;font-size:12px;font-weight:700;color:#4c5e56;letter-spacing:.02em}',
    '#edSlides input[type=text],#edSlides textarea,#edSlides select{font:14px/1.4 Manrope,system-ui,sans-serif;color:#14241E;border:1.5px solid #c9d6ce;border-radius:9px;padding:.45rem .55rem;width:100%;background:#fbfcfb}',
    '#edSlides input[type=text]:focus,#edSlides textarea:focus{outline:none;border-color:#1E6B4E;box-shadow:0 0 0 3px rgba(30,107,78,.15)}',
    '#edSlides .edtwo{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}',
    '#edSlides .edpicrow{display:grid;grid-template-columns:7rem 1fr;gap:.6rem;align-items:center}',
    '#edSlides .edpicrow img{width:7rem;height:4rem;object-fit:cover;border-radius:8px;background:#eef2ef}',
    '#edSlides .edbtn{font:600 13px/1 Manrope,system-ui,sans-serif;border-radius:9px;height:32px;padding:0 .8rem;cursor:pointer;border:1px solid #c9d6ce;background:#fff;color:#14241E;display:inline-flex;align-items:center;gap:.35rem;justify-content:center}',
    '#edSlides .edbtn:hover{background:#F2F5F3}',
    '#edSlides .edbtn.pri{background:#1E6B4E;border-color:#1E6B4E;color:#fff}',
    '#edSlides .edbtn.del{color:#b3261e;border-color:#efc9c6}',
    '#edSlides .edsfoot{padding:.8rem 1.1rem;border-top:1px solid #e6ece8;display:flex;justify-content:space-between;gap:.5rem;align-items:center;font-size:12.5px;color:#4c5e56}',
    'body.bs-editing.ed-slides{padding-right:440px}',
    '@media (max-width:900px){body.bs-editing.ed-slides,body.bs-editing.ed-phone{padding-right:0}#edPhone{width:100%}}',
    '#edToast{position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%) translateY(20px);opacity:0;z-index:2030;background:#12402F;color:#fff;font:600 14px/1.3 Manrope,system-ui,sans-serif;padding:.75rem 1.1rem;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.25);transition:all .25s;pointer-events:none;max-width:calc(100vw - 2rem);text-align:center}',
    '#edToast.on{opacity:1;transform:translateX(-50%) translateY(0)}',
    '#edTip{position:fixed;top:66px;left:50%;transform:translateX(-50%);z-index:2005;background:#fff;color:#14241E;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.18);padding:.7rem .9rem;display:flex;gap:.8rem;align-items:center;font:13.5px/1.4 Manrope,system-ui,sans-serif;max-width:calc(100vw - 2rem)}',
    '#edTip button{font:600 13px/1 Manrope,system-ui,sans-serif;border:0;background:#1E6B4E;color:#fff;border-radius:8px;height:30px;padding:0 .8rem;cursor:pointer;flex:none}'
  ].join('\n');

  /* ---------------- what is on the page now: saved settings plus the unsaved changes ---------------- */
  function savedContent(){ return JSON.parse(JSON.stringify(BS.CONTENT||{})); }
  function merged(){ var m=savedContent(); ['en','am','om'].forEach(function(l){ var p=pend.text[l]||{}; Object.keys(p).forEach(function(k){ m[l]=m[l]||{}; if(p[k]===null) delete m[l][k]; else m[l][k]=p[k]; }); }); return m; }
  function savedPics(){ return Object.assign({}, BS.PICS||{}); }
  function mergedPics(){ var m=savedPics(); Object.keys(pend.pics).forEach(function(k){ if(pend.pics[k]===null) delete m[k]; else m[k]=pend.pics[k]; }); return m; }
  function savedHide(){ return ((BS.SITE||{}).hide||[]).slice(); }
  function curHide(){ return pend.hide || savedHide(); }
  function savedSlides(){ var s=BS.SLIDES; return s && Array.isArray(s.list) && s.list.length ? {list:JSON.parse(JSON.stringify(s.list)), secs:+s.secs||6} : {list:(window.bsHeroDefault?bsHeroDefault():[]), secs:6}; }
  function curSlides(){ return pend.slides || savedSlides(); }
  function count(){ var n=0; ['en','am','om'].forEach(function(l){ n+=Object.keys(pend.text[l]||{}).length; }); n+=Object.keys(pend.pics).length; if(pend.hide) n++; if(pend.slides) n++; return n; }

  /* show the unsaved state on this screen (and in the phone frame) */
  function show(){
    if(window.bsSetOverrides) bsSetOverrides(merged());
    BS.PICS=mergedPics(); if(window.bsApplyPics) bsApplyPics();
    var hide=curHide(); document.querySelectorAll('[data-hsec]').forEach(function(el){ var off=hide.indexOf(el.dataset.hsec)>=0; el.hidden=false; el.classList.toggle('ed-off', off); });
    if(pend.slides && window.bsHeroRender){ bsHeroRender(pend.slides.list, pend.slides.secs); }
    pushPhone(); bar();
  }
  /* put the page back exactly as visitors see it */
  function restore(){
    if(window.bsSetOverrides) bsSetOverrides(BS.CONTENT||{});
    if(BS.__savedPics) BS.PICS=BS.__savedPics; if(window.bsApplyPics) bsApplyPics();
    document.querySelectorAll('[data-hsec]').forEach(function(el){ el.classList.remove('ed-off'); });
    if(window.bsApplySite) bsApplySite();
    var s=BS.SLIDES; if(window.bsHeroRender){ if(s && s.list && s.list.length) bsHeroRender(s.list, s.secs); else bsHeroRender(null, 6); }
  }
  /* the settings arrive again whenever anyone saves anything: keep showing the unsaved changes on top */
  if(window.BS && BS.onSettings) BS.onSettings(function(){ BS.__savedPics=Object.assign({}, BS.PICS||{}); if(on) setTimeout(show, 0); });

  /* ---------------- the bar ---------------- */
  function bar(){
    var b=$('edBar'); if(!b) return; var n=count();
    $('edSave').disabled=!n; $('edSave').innerHTML='Save'+(n?'<span class="edcount">'+n+'</span>':'');
    $('edUndo').disabled=!undo.length;
    var sel=$('edPage'); if(sel && sel.value!==view) sel.value=PAGES.some(function(p){ return p[0]===view; })?view:'';
    $('edSlidesBtn').hidden = view!=='home';
    b.querySelectorAll('[data-edl]').forEach(function(x){ x.classList.toggle('on', x.dataset.edl===lang); });
    b.querySelectorAll('[data-edd]').forEach(function(x){ x.classList.toggle('on', (x.dataset.edd==='phone')===phoneOpen); });
  }
  function buildBar(){
    var b=document.createElement('div'); b.id='edBar'; b.setAttribute('data-notr','');
    b.innerHTML='<div class="edgrp"><span class="edtag">Editing</span><select id="edPage" aria-label="Page">'+PAGES.map(function(p){ return '<option value="'+p[0]+'">'+esc(p[1])+'</option>'; }).join('')+'<option value="" hidden>This page</option></select><button type="button" id="edAllPages" title="All pages">'+ICON.pages+'<span class="edlbl">All pages</span></button></div>'+
      '<div class="edgrow"></div>'+
      '<div class="edgrp"><span class="edseg" role="group" aria-label="Language">'+LANGS.map(function(l){ return '<button type="button" data-edl="'+l[0]+'">'+l[1]+'</button>'; }).join('')+'</span>'+
      '<span class="edseg" role="group" aria-label="View"><button type="button" data-edd="pc" title="Computer">'+ICON.pc+'<span class="edlbl">Computer</span></button><button type="button" data-edd="phone" title="Phone">'+ICON.phone+'<span class="edlbl">Phone</span></button></span>'+
      '<button type="button" id="edSlidesBtn" hidden>'+ICON.slides+'<span class="edlbl">Slides</span></button></div>'+
      '<div class="edgrow"></div>'+
      '<div class="edgrp"><button type="button" id="edUndo" title="Undo the last change">'+ICON.undo+'<span class="edlbl">Undo</span></button><button type="button" id="edReset" title="Put this page back to the original words"><span class="edlbl">Reset page</span><span class="edlbl" style="display:none">Reset</span></button><button type="button" id="edSave" disabled>Save</button><button type="button" id="edExit">Exit</button></div>';
    document.body.appendChild(b);
    $('edPage').onchange=function(){ if(this.value) goPage(this.value); };
    $('edAllPages').onclick=function(){ picker(); };
    b.querySelectorAll('[data-edl]').forEach(function(x){ x.onclick=function(){ setLang(x.dataset.edl); }; });
    b.querySelectorAll('[data-edd]').forEach(function(x){ x.onclick=function(){ phone(x.dataset.edd==='phone'); }; });
    $('edSlidesBtn').onclick=function(){ slides(!slidesOpen); };
    $('edUndo').onclick=doUndo; $('edSave').onclick=save; $('edExit').onclick=exit; $('edReset').onclick=resetPage;
    ['edHover','edHint'].forEach(function(id){ var d=document.createElement('div'); d.id=id; d.setAttribute('data-notr',''); document.body.appendChild(d); });
    var eye=document.createElement('button'); eye.id='edEye'; eye.type='button'; eye.setAttribute('data-notr',''); document.body.appendChild(eye);
    eye.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); var k=eye.dataset.sec; if(!k) return; var h=curHide().slice(), i=h.indexOf(k); undo.push({kind:'hide', before:pend.hide?pend.hide.slice():null}); if(i>=0) h.splice(i,1); else h.push(k); pend.hide=h; show(); toast(i>=0?'Section shown. Press Save to publish.':'Section hidden from visitors. Press Save to publish.'); eye.style.display='none'; });
  }
  function toast(msg){ var t=$('edToast'); if(!t){ t=document.createElement('div'); t.id='edToast'; t.setAttribute('data-notr',''); document.body.appendChild(t); } t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(function(){ t.classList.remove('on'); }, 2600); }

  /* ---------------- pages ---------------- */
  function picker(){
    closePop(); var o=$('edPick'); if(o) o.remove();
    o=document.createElement('div'); o.id='edPick'; o.setAttribute('data-notr','');
    o.innerHTML='<div class="edcard" role="dialog" aria-label="Choose a page to edit"><div class="edtop"><div><h2>Edit the site</h2><p class="edsub">Choose a page. It opens exactly as visitors see it, and you change it right there.</p></div><button type="button" data-edclose aria-label="Close">'+ICON.close+'</button></div>'+
      '<div class="edgrid">'+PAGES.map(function(p){ return '<button type="button" class="edpg" data-edgo="'+p[0]+'"><span class="i">'+ICON.pages+'</span><strong>'+esc(p[1])+'</strong><span class="d">'+esc(p[2])+'</span></button>'; }).join('')+'</div>'+
      '<div class="edtips"><span><b>Click any text</b> to change it.</span><span><b>Click a picture</b> to replace it.</span><span><b>Nothing changes for visitors</b> until you press Save.</span></div></div>';
    document.body.appendChild(o);
    o.addEventListener('click', function(e){ var g=e.target.closest('[data-edgo]'); if(g){ o.remove(); if(!on) start(g.dataset.edgo); else goPage(g.dataset.edgo); return; } if(e.target===o || e.target.closest('[data-edclose]')){ o.remove(); } });
  }
  function goPage(name){ closePop(); slides(false); if(window.BSRoute) BSRoute.go(name); setTimeout(function(){ view=curView(); bar(); window.scrollTo(0,0); if(phoneOpen) reloadPhone(); }, 60); }
  function curView(){ return (window.BSRoute && BSRoute.current && BSRoute.current()) || 'home'; }
  function setLang(l){ closePop(); lang=l; if(window.bsSetLang) bsSetLang(l, true); setTimeout(function(){ bar(); pushPhone(); }, 30); }

  /* ---------------- start and stop ---------------- */
  function allowed(){ return window.BS && BS.isStaff && BS.isStaff() && (!BS.staffCan || BS.staffCan('content')); }
  function start(page){
    if(!allowed()){ return; }
    on=true; pend=fresh(); undo=[]; BS.__savedPics=Object.assign({}, BS.PICS||{});
    homeLang=(window.bsLang&&bsLang())||'en'; lang=homeLang;
    if(!$('edStyle')) document.head.appendChild(css);
    document.body.classList.add('bs-editing'); buildBar();
    document.addEventListener('mousemove', onMove, true); document.addEventListener('click', onClick, true); document.addEventListener('mousedown', onDown, true); document.addEventListener('submit', block, true); document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', hideHover, true); window.addEventListener('beforeunload', onLeave);
    if(window.BSRoute) BSRoute.go(page||'home');
    setTimeout(function(){ view=curView(); show(); }, 80);
    tip();
    clearInterval(start.iv); start.iv=setInterval(function(){ if(!on) return; var v=curView(); if(v!==view){ view=v; closePop(); bar(); if(/^staff|^admin/.test(v)) exit(true); } }, 400);
  }
  function stop(){
    on=false; closePop(); slides(false); phone(false);
    document.removeEventListener('mousemove', onMove, true); document.removeEventListener('click', onClick, true); document.removeEventListener('mousedown', onDown, true); document.removeEventListener('submit', block, true); document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('scroll', hideHover, true); window.removeEventListener('beforeunload', onLeave);
    ['edBar','edHover','edHint','edEye','edTip','edPick'].forEach(function(id){ var x=$(id); if(x) x.remove(); });
    document.body.classList.remove('bs-editing','ed-phone','ed-slides'); clearInterval(start.iv);
    if(window.bsSetLang) bsSetLang(homeLang, true);
    restore();
  }
  async function exit(force){
    if(!on) return;
    if(force!==true && count()){ var ok = window.bsConfirm ? await bsConfirm('Leave without saving?', 'You have '+count()+' unsaved change'+(count()>1?'s':'')+'. They will be lost.', 'Leave without saving') : confirm('Leave without saving?'); if(!ok) return; }
    stop(); if(force!==true && window.BSRoute){ BSRoute.go('staff'); setTimeout(function(){ if(window.bsAdminTab) bsAdminTab('content'); }, 80); }
  }
  function onLeave(e){ if(on && count()){ e.preventDefault(); e.returnValue=''; } }
  function tip(){ var seen=false; try{ seen=sessionStorage.getItem('bs_ed_tip')==='1'; }catch(e){} if(seen) return; var t=document.createElement('div'); t.id='edTip'; t.setAttribute('data-notr',''); t.innerHTML='<span><strong>Click any text</strong> to change it, or <strong>a picture</strong> to replace it. Nothing changes for visitors until you press <strong>Save</strong>.</span><button type="button">Got it</button>'; document.body.appendChild(t); t.querySelector('button').onclick=function(){ t.remove(); try{ sessionStorage.setItem('bs_ed_tip','1'); }catch(e){} }; setTimeout(function(){ if(t.parentNode) t.remove(); }, 12000); }

  /* ---------------- what the pointer is over ---------------- */
  function isUi(el){ return el && el.closest && el.closest('#edBar,#edPop,#edPick,#edPhone,#edSlides,#edEye,#edToast,#edTip,.ed-file,.modal:not([hidden]),#askGate'); }
  function textAt(x, y){
    var r=null; if(document.caretRangeFromPoint) r=document.caretRangeFromPoint(x, y); else if(document.caretPositionFromPoint){ var p=document.caretPositionFromPoint(x, y); if(p){ r=document.createRange(); r.setStart(p.offsetNode, p.offset); } }
    if(!r) return null; var n=r.startContainer; if(!n || n.nodeType!==3 || !/[A-Za-zሀ-፿]/.test(n.nodeValue)) return null;
    var el=n.parentElement; if(!el || isUi(el) || el.closest('[data-notr],script,style,textarea,select,option,#lang,#lang2,.bellpanel')) return null;
    if(!el.closest('header.site,footer,[data-view]') || (el.closest('[data-view]') && el.closest('[data-view]').hidden)) return null;
    var rg=document.createRange(); rg.selectNodeContents(n); var rs=rg.getClientRects(), hit=null;
    for(var i=0;i<rs.length;i++){ var q=rs[i]; if(x>=q.left-2 && x<=q.right+2 && y>=q.top-2 && y<=q.bottom+2){ hit=rg.getBoundingClientRect(); break; } }
    return hit ? {node:n, rect:hit} : null;
  }
  function picAt(el){ var img=el && el.closest && el.closest('img[data-pic]'); if(img && !isUi(img) && !(img.closest('[data-view]')||{}).hidden) return img; var bg=el && el.closest && el.closest('.hslide'); if(bg){ var im=bg.querySelector('img[data-pic],img.bg,img'); if(im) return im; } return null; }
  function hintAt(r, text){ var h=$('edHint'); h.textContent=text; h.style.display='block'; var w=h.offsetWidth; h.style.left=Math.max(6, Math.min(window.innerWidth-w-6, r.left))+'px'; h.style.top=Math.max(60, r.top-28)+'px'; }
  function outline(r, cls){ var o=$('edHover'); o.className=cls||''; o.style.display='block'; o.style.left=(r.left-4)+'px'; o.style.top=(r.top-3)+'px'; o.style.width=(r.width+8)+'px'; o.style.height=(r.height+6)+'px'; }
  function hideHover(){ var o=$('edHover'), h=$('edHint'); if(o) o.style.display='none'; if(h) h.style.display='none'; hoverTarget=null; }
  var raf=0, lastEv=null;
  function onMove(e){ lastEv=e; if(raf) return; raf=requestAnimationFrame(function(){ raf=0; track(lastEv); }); }
  function track(e){
    if(!on || $('edPick') || (pop && pop.sticky)) return;
    var el=document.elementFromPoint(e.clientX, e.clientY);
    var eye=$('edEye'); if(el===eye || (el && el.closest && el.closest('#edEye'))) return;
    if(isUi(el)){ hideHover(); return; }
    /* home page sections: a small eye to hide or show the whole section */
    var sec=el && el.closest && el.closest('[data-hsec]');
    if(sec && view==='home'){ var sr=sec.getBoundingClientRect(), off=curHide().indexOf(sec.dataset.hsec)>=0; eye.dataset.sec=sec.dataset.hsec; eye.innerHTML=(off?ICON.eye+'Show this section':ICON.eyeoff+'Hide this section'); eye.style.display='inline-flex'; eye.style.top=Math.max(64, sr.top+10)+'px'; eye.style.left=Math.min(window.innerWidth-eye.offsetWidth-14, sr.right-eye.offsetWidth-14)+'px'; }
    else eye.style.display='none';
    var t=textAt(e.clientX, e.clientY);
    if(t){ hoverTarget={kind:'text', node:t.node}; outline(t.rect); hintAt(t.rect, (view==='home' && lang==='en' && t.node.parentElement.closest('#hero')) ? 'Click to edit this slide' : 'Click to change the text'); return; }
    var inp=el && el.closest && el.closest('input[placeholder],textarea[placeholder]');
    if(inp && !isUi(inp) && !inp.closest('[data-notr]')){ var ir=inp.getBoundingClientRect(); hoverTarget={kind:'ph', el:inp}; outline(ir); hintAt(ir, 'Click to change the hint text'); return; }
    var img=picAt(el);
    if(img){ var r=img.getBoundingClientRect(); hoverTarget={kind:'pic', img:img}; outline(r,'pic'); hintAt(r, img.closest('#hero') ? 'Click to edit this slide' : 'Click to replace the picture'); return; }
    hideHover();
  }
  function block(e){ if(on && !isUi(e.target)){ e.preventDefault(); e.stopPropagation(); } }
  function onDown(e){ if(!on || isUi(e.target)) return; if(e.target.closest && e.target.closest('input,textarea,select,button,a,label')){ e.preventDefault(); } }
  function onClick(e){
    if(!on) return; if(isUi(e.target)) return;
    if(e.target.closest && e.target.closest('#edEye')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if(pop){ closePop(); return; }
    track(e); var h=hoverTarget; if(!h) return;
    var hero=view==='home' && ((h.node && h.node.parentElement.closest('#hero')) || (h.img && h.img.closest('#hero')));
    if(hero && (lang==='en' || h.kind==='pic')){ var sl=(h.node||h.img).parentElement.closest('.hslide'); var all=[].slice.call(document.querySelectorAll('#hero .hslide')); slides(true, all.indexOf(sl)); return; }
    if(h.kind==='text') editText(h.node); else if(h.kind==='ph') editPlaceholder(h.el); else if(h.kind==='pic') editPic(h.img);
  }
  function onKey(e){ if(!on) return; if(e.key==='Escape'){ if(pop){ closePop(); e.preventDefault(); } else if($('edPick')){ $('edPick').remove(); } } if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !isUi(e.target)){ e.preventDefault(); doUndo(); } if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); save(); } }

  /* ---------------- the small box that changes a piece of text ---------------- */
  function closePop(){ if(pop && pop.el) pop.el.remove(); pop=null; }
  function place(el, r){ var w=el.offsetWidth, h=el.offsetHeight, x=Math.max(12, Math.min(window.innerWidth-w-12, r.left)), y=r.bottom+10; if(y+h>window.innerHeight-12) y=Math.max(64, r.top-h-10); el.style.left=x+'px'; el.style.top=y+'px'; }
  function dictOf(l){ return (window.BS_LANG||{})[l]||{}; }
  function current(key){ var p=pend.text[lang]||{}; if(key in p) return p[key]; var s=(BS.CONTENT||{})[lang]||{}; if(s[key]!=null && s[key]!=='') return s[key]; if(lang==='en') return key; var d=dictOf(lang); return d[key]!=null?d[key]:''; }
  function hasOwn(key){ var p=pend.text[lang]||{}; if(key in p) return p[key]!==null; var s=(BS.CONTENT||{})[lang]||{}; return s[key]!=null && s[key]!==''; }
  function setText(key, val){ undo.push({kind:'text', lang:lang, key:key, before:(key in pend.text[lang])?pend.text[lang][key]:undefined}); pend.text[lang][key]=val; show(); }
  function sameCount(key){ var n=0, it=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), t; while((t=it.nextNode())){ if(t.parentElement && !t.parentElement.closest('[data-notr]') && norm(window.bsEnglishOf?bsEnglishOf(t):t.nodeValue)===key) n++; } return n; }
  function textBox(title, key, r, apply){
    closePop(); hideHover();
    var el=document.createElement('div'); el.id='edPop'; el.setAttribute('data-notr',''); var cur=current(key), own=hasOwn(key), same=sameCount(key);
    el.innerHTML='<div class="edph"><span>'+esc(title)+' · '+esc(LANGS.filter(function(x){ return x[0]===lang; })[0][1])+'</span><button type="button" class="edx" data-x aria-label="Close">'+ICON.close+'</button></div>'+
      '<textarea rows="2" spellcheck="true">'+esc(cur)+'</textarea>'+
      (lang!=='en'?'<div class="edorig"><b>English:</b> '+esc(key)+'</div>':'')+
      (same>1?'<div class="ednote">This same text appears in '+same+' places; your change shows in all of them.</div>':'')+
      (/\d/.test(key)?'<div class="ednote">This text has a number in it. Your change only applies where the text is exactly the same.</div>':'')+
      '<div class="edrow">'+(own?'<button type="button" class="lnk" data-orig>Back to original</button>':'')+'<span class="edsp"></span><button type="button" data-x>Cancel</button><button type="button" class="pri" data-ok>Done</button></div>';
    document.body.appendChild(el); place(el, r); pop={el:el, sticky:true};
    var ta=el.querySelector('textarea'); var fit=function(){ ta.style.height='auto'; ta.style.height=Math.min(220, ta.scrollHeight+2)+'px'; }; fit(); ta.addEventListener('input', fit); ta.focus(); ta.select();
    var done=function(){ var v=norm(ta.value); closePop(); if(v===norm(cur)) return; if(!v){ toast('Empty text is not allowed. Use Back to original instead.'); return; } apply(v); toast('Changed. Press Save to publish.'); };
    ta.addEventListener('keydown', function(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); done(); } if(e.key==='Escape'){ e.preventDefault(); closePop(); } });
    el.addEventListener('click', function(e){ if(e.target.closest('[data-x]')) closePop(); else if(e.target.closest('[data-ok]')) done(); else if(e.target.closest('[data-orig]')){ closePop(); apply(null); toast('Back to the original text. Press Save to publish.'); } });
  }
  function editText(node){ var key=norm(window.bsEnglishOf?bsEnglishOf(node):node.nodeValue); var rg=document.createRange(); rg.selectNodeContents(node); textBox('Text', key, rg.getBoundingClientRect(), function(v){ setText(key, v); }); }
  function editPlaceholder(inp){ var en=(inp.__bsA && inp.__bsA.placeholder && inp.__bsA.placeholder.en) || inp.getAttribute('placeholder'); var key=norm(en); textBox('Hint in a box', key, inp.getBoundingClientRect(), function(v){ setText(key, v); }); }

  /* ---------------- pictures ---------------- */
  function slotOf(key, img){ var s=(BS.PIC_SLOTS||[]).filter(function(x){ return x.key===key; })[0]; if(s) return s; if(/^cat-|^sc-|^eq-/.test(key)) return {w:480, h:360}; var r=img.naturalWidth && img.naturalHeight ? img.naturalHeight/img.naturalWidth : 0.5; return {w:1200, h:Math.round(1200*r)}; }
  function fit(file, w, h, whole){
    return new Promise(function(res, rej){ var r=new FileReader(); r.onload=function(){ var im=new Image(); im.onload=function(){ var c=document.createElement('canvas'); c.width=w; c.height=h; var ctx=c.getContext('2d');
      if(whole){ var k=Math.min(w/im.width, h/im.height), dw=im.width*k, dh=im.height*k; ctx.drawImage(im, (w-dw)/2, (h-dh)/2, dw, dh); res(c.toDataURL('image/png')); return; }
      var sc=Math.max(w/im.width, h/im.height), sw=w/sc, sh=h/sc; ctx.drawImage(im, (im.width-sw)/2, (im.height-sh)/2, sw, sh, 0, 0, w, h); var q=0.82, out=c.toDataURL('image/jpeg', q); while(out.length>700000 && q>0.4){ q-=0.1; out=c.toDataURL('image/jpeg', q); } res(out); }; im.onerror=function(){ rej(new Error('bad image')); }; im.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); });
  }
  function choose(cb){ var f=document.createElement('input'); f.type='file'; f.accept='image/*'; f.className='ed-file'; f.style.display='none'; document.body.appendChild(f); f.onchange=function(){ var x=f.files&&f.files[0]; f.remove(); if(x) cb(x); }; f.click(); }
  function editPic(img){
    var key=img.dataset.pic; if(!key){ toast('This picture comes from a member or an advert; change it where it was added.'); return; }
    closePop(); hideHover(); var r=img.getBoundingClientRect(), slot=slotOf(key, img), own=(key in pend.pics)?pend.pics[key]!==null:!!(BS.__savedPics||{})[key];
    var el=document.createElement('div'); el.id='edPop'; el.setAttribute('data-notr','');
    el.innerHTML='<div class="edph"><span>Picture</span><button type="button" class="edx" data-x aria-label="Close">'+ICON.close+'</button></div><img src="'+esc(img.currentSrc||img.src)+'" alt=""><div class="small" style="font-size:12.5px;color:#4c5e56">Any photo from your computer or phone. It is cut to fit ('+slot.w+' × '+slot.h+') automatically.</div>'+
      '<div class="edrow">'+(own?'<button type="button" class="lnk" data-orig>Back to original</button>':'')+'<span class="edsp"></span><button type="button" data-x>Cancel</button><button type="button" class="pri" data-new>'+ICON.pic+' Choose a new picture</button></div>';
    document.body.appendChild(el); place(el, {left:r.left, right:r.right, top:r.top, bottom:Math.min(r.bottom, window.innerHeight*0.45)}); pop={el:el, sticky:true};
    el.addEventListener('click', function(e){
      if(e.target.closest('[data-x]')) closePop();
      else if(e.target.closest('[data-orig]')){ closePop(); undo.push({kind:'pic', key:key, before:(key in pend.pics)?pend.pics[key]:undefined}); pend.pics[key]=null; show(); toast('Back to the original picture. Press Save to publish.'); }
      else if(e.target.closest('[data-new]')) choose(async function(file){ try{ var data=await fit(file, slot.w, slot.h, !!slot.whole); closePop(); undo.push({kind:'pic', key:key, before:(key in pend.pics)?pend.pics[key]:undefined}); pend.pics[key]=data; show(); toast('Picture changed. Press Save to publish.'); }catch(err){ toast('That file could not be read as a picture.'); } });
    });
  }

  /* ---------------- banner slides (home page) ---------------- */
  var LINKS=[['#boq','Send a request'],['#signin','Sign in'],['#signup-supplier','Register as a supplier'],['#supplier','Supplier sign-in'],['#how','How it works'],['#newsletter','Newsletter'],['#members','Members'],['#contact','Contact'],['#start','Watch the video']];
  function slideCopy(){ var s=curSlides(); return {list:JSON.parse(JSON.stringify(s.list)), secs:s.secs}; }
  function setSlides(s, msg){ undo.push({kind:'slides', before:pend.slides?JSON.parse(JSON.stringify(pend.slides)):null}); pend.slides=s; show(); drawSlides(); if(msg) toast(msg); }
  function slides(openIt, ix){
    slidesOpen=!!openIt; var p=$('edSlides'); if(p) p.remove(); document.body.classList.toggle('ed-slides', slidesOpen);
    if(!slidesOpen){ bar(); return; }
    if(phoneOpen) phone(false);
    closePop(); hideHover(); if(ix!=null && ix>=0) slideOpenIx=ix;
    p=document.createElement('div'); p.id='edSlides'; p.setAttribute('data-notr',''); document.body.appendChild(p); drawSlides(); bar();
  }
  function linkOpts(v){ var has=LINKS.some(function(l){ return l[0]===v; }); return LINKS.map(function(l){ return '<option value="'+l[0]+'"'+(l[0]===v?' selected':'')+'>'+esc(l[1])+'</option>'; }).join('')+(v && !has?'<option value="'+esc(v)+'" selected>'+esc(v)+'</option>':''); }
  function drawSlides(){
    var p=$('edSlides'); if(!p) return; var s=curSlides(), L=s.list;
    p.innerHTML='<div class="edsh"><h3>Banner slides</h3><button type="button" data-sclose aria-label="Close">'+ICON.close+'</button></div>'+
      '<div class="edsb"><label class="edsec" style="display:flex">Seconds per slide <input type="number" min="3" max="20" step="1" value="'+(+s.secs||6)+'" data-ssecs></label><div class="edhelp">Click a slide to edit it. Drag it, or use the arrows, to change the order.</div>'+
      L.map(function(x, i){ var openS=i===slideOpenIx; return '<div class="eds'+(openS?' open':'')+'" draggable="true" data-si="'+i+'"><div class="edsr" data-stoggle="'+i+'"><span class="g" title="Drag">'+ICON.grip+'</span><img src="'+esc(slidePic(x))+'" alt=""><span><div class="t">'+esc(x.title||'Picture only')+'</div><div class="n">Slide '+(i+1)+(x.title?'':' · no text')+'</div></span><span class="mv"><button type="button" data-sup="'+i+'" title="Move up"'+(i===0?' disabled':'')+'>▲</button><button type="button" data-sdown="'+i+'" title="Move down"'+(i===L.length-1?' disabled':'')+'>▼</button></span></div>'+
        (openS?'<div class="edsf"><div class="edpicrow"><img src="'+esc(slidePic(x))+'" alt=""><span style="display:grid;gap:.35rem"><button type="button" class="edbtn" data-spic="'+i+'">'+ICON.pic+' Change picture</button><span style="font-size:12px;color:#4c5e56">A wide photo works best (it is cut to 1600 × 520).</span></span></div>'+
          '<label>Small label above the headline<input type="text" data-sf="eyebrow" value="'+esc(x.eyebrow||'')+'" placeholder="For example: For contractors and developers"></label>'+
          '<label>Headline<input type="text" data-sf="title" value="'+esc(x.title||'')+'" placeholder="Leave empty for a picture-only slide"></label>'+
          '<label>Supporting line<textarea rows="2" data-sf="text" placeholder="One short sentence">'+esc(x.text||'')+'</textarea></label>'+
          '<div class="edtwo"><label>Main button<input type="text" data-sb="b1" data-k="label" value="'+esc((x.b1||{}).label||'')+'" placeholder="No button"></label><label>Opens<select data-sb="b1" data-k="link">'+linkOpts((x.b1||{}).link||'#boq')+'</select></label></div>'+
          '<div class="edtwo"><label>Second button<input type="text" data-sb="b2" data-k="label" value="'+esc((x.b2||{}).label||'')+'" placeholder="No button"></label><label>Opens<select data-sb="b2" data-k="link">'+linkOpts((x.b2||{}).link||'#how')+'</select></label></div>'+
          '<div style="display:flex;justify-content:space-between;gap:.5rem"><button type="button" class="edbtn del" data-sdel="'+i+'">Delete slide</button><button type="button" class="edbtn pri" data-sdone>Done</button></div></div>':'')+
        '</div>'; }).join('')+
      '<button type="button" class="edbtn" data-sadd style="height:40px;border-style:dashed">+ Add a slide</button></div>'+
      '<div class="edsfoot"><span>'+L.length+' slide'+(L.length!==1?'s':'')+' · changes show on the page at once</span><button type="button" class="edbtn pri" data-sclose>Close</button></div>';
  }
  function slidePic(x){ return x.img || (x.pic && (mergedPics()[x.pic] || ('assets/photos/'+x.pic+'.jpg'))) || ''; }
  function slidesUi(){
    document.addEventListener('click', function(e){
      var p=$('edSlides'); if(!p || !p.contains(e.target)) return; var t=e.target;
      if(t.closest('[data-sclose]')){ slides(false); return; }
      var tg=t.closest('[data-stoggle]'); if(tg && !t.closest('button')){ var i=+tg.dataset.stoggle; slideOpenIx = slideOpenIx===i ? -1 : i; drawSlides(); if(window.bsHeroGo) bsHeroGo(i); return; }
      var up=t.closest('[data-sup]'), dn=t.closest('[data-sdown]');
      if(up||dn){ var s=slideCopy(), a=+(up||dn).dataset[up?'sup':'sdown'], b=a+(up?-1:1); var x=s.list[a]; s.list[a]=s.list[b]; s.list[b]=x; if(slideOpenIx===a) slideOpenIx=b; setSlides(s); return; }
      if(t.closest('[data-sadd]')){ var s2=slideCopy(); s2.list.push({pic:'hero2', eyebrow:'', title:'New slide', text:'', b1:{label:'Send a request', link:'#boq'}, b2:{label:'', link:'#how'}}); slideOpenIx=s2.list.length-1; setSlides(s2, 'Slide added. Write its text, then press Save.'); setTimeout(function(){ var f=p.querySelector('[data-sf=title]'); if(f){ f.focus(); f.select(); } if(window.bsHeroGo) bsHeroGo(slideOpenIx); }, 30); return; }
      var del=t.closest('[data-sdel]'); if(del){ var s3=slideCopy(); if(s3.list.length<=1){ toast('Keep at least one slide.'); return; } s3.list.splice(+del.dataset.sdel,1); slideOpenIx=-1; setSlides(s3, 'Slide deleted. Undo brings it back.'); return; }
      if(t.closest('[data-sdone]')){ slideOpenIx=-1; drawSlides(); return; }
      var sp=t.closest('[data-spic]'); if(sp){ var ix=+sp.dataset.spic; choose(async function(file){ try{ var data=await fit(file, 1600, 520); var s4=slideCopy(); s4.list[ix].img=data; delete s4.list[ix].pic; setSlides(s4, 'Picture changed.'); }catch(err){ toast('That file could not be read as a picture.'); } }); return; }
    });
    var typing=null;
    document.addEventListener('input', function(e){
      var p=$('edSlides'); if(!p || !p.contains(e.target)) return; var t=e.target;
      if(t.matches('[data-ssecs]')) return;
      var box=t.closest('[data-si]'); if(!box) return; var i=+box.dataset.si;
      /* one undo step per field, not per letter */
      if(!typing || typing.i!==i || typing.f!==(t.dataset.sf||t.dataset.sb+t.dataset.k)){ undo.push({kind:'slides', before:pend.slides?JSON.parse(JSON.stringify(pend.slides)):null}); typing={i:i, f:(t.dataset.sf||t.dataset.sb+t.dataset.k)}; }
      var s=pend.slides||slideCopy(); var x=s.list[i]; if(t.dataset.sf) x[t.dataset.sf]=t.value; if(t.dataset.sb){ x[t.dataset.sb]=x[t.dataset.sb]||{}; x[t.dataset.sb][t.dataset.k]=t.value; }
      pend.slides=s; if(window.bsHeroRender){ bsHeroRender(s.list, s.secs, i); } bar(); pushPhone();
      var tt=box.querySelector('.edsr .t'); if(tt && t.dataset.sf==='title') tt.textContent=t.value||'Picture only';
    });
    document.addEventListener('change', function(e){
      var p=$('edSlides'); if(!p || !p.contains(e.target)) return; var t=e.target; typing=null;
      if(t.matches('[data-ssecs]')){ var s=slideCopy(); s.secs=Math.max(3, Math.min(20, +t.value||6)); setSlides(s, 'Each slide now shows for '+s.secs+' seconds.'); return; }
      if(t.tagName==='SELECT'){ var box=t.closest('[data-si]'), i=+box.dataset.si, s2=slideCopy(); s2.list[i][t.dataset.sb]=s2.list[i][t.dataset.sb]||{}; s2.list[i][t.dataset.sb].link=t.value; setSlides(s2); }
    });
    var dragFrom=-1;
    document.addEventListener('dragstart', function(e){ var d=e.target.closest && e.target.closest('#edSlides [data-si]'); if(!d) return; dragFrom=+d.dataset.si; d.classList.add('drag'); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', String(dragFrom)); }catch(err){} });
    document.addEventListener('dragover', function(e){ var d=e.target.closest && e.target.closest('#edSlides [data-si]'); if(!d || dragFrom<0) return; e.preventDefault(); document.querySelectorAll('#edSlides .eds.over').forEach(function(x){ x.classList.remove('over'); }); d.classList.add('over'); });
    document.addEventListener('drop', function(e){ var d=e.target.closest && e.target.closest('#edSlides [data-si]'); if(!d || dragFrom<0) return; e.preventDefault(); var to=+d.dataset.si, from=dragFrom; dragFrom=-1; if(to===from){ drawSlides(); return; } var s=slideCopy(), x=s.list.splice(from,1)[0]; s.list.splice(to,0,x); slideOpenIx=-1; setSlides(s, 'Order changed.'); });
    document.addEventListener('dragend', function(){ dragFrom=-1; document.querySelectorAll('#edSlides .eds').forEach(function(x){ x.classList.remove('drag','over'); }); });
  }
  slidesUi();

  /* ---------------- phone view ---------------- */
  function phone(openIt){
    phoneOpen=!!openIt; var p=$('edPhone'); if(p) p.remove(); document.body.classList.toggle('ed-phone', phoneOpen);
    if(phoneOpen){ if(slidesOpen) slides(false); closePop(); p=document.createElement('div'); p.id='edPhone'; p.setAttribute('data-notr',''); p.innerHTML='<span>How this page looks on a phone, with your unsaved changes.</span><div class="edfr"><iframe title="Phone view" id="edFrame"></iframe></div>'; document.body.appendChild(p); reloadPhone(); }
    bar();
  }
  function reloadPhone(){ var f=$('edFrame'); if(!f) return; f.src=location.pathname+'?ed_preview=1'+(location.hash||''); }
  function pushPhone(){ var f=$('edFrame'); if(f && f.contentWindow) try{ window.bsEditorPush(f.contentWindow); }catch(e){} }
  window.bsEditorPush=function(w){
    if(!on || !w || !w.BS) return;
    try{
      if(w.bsSetLang && (w.bsLang?w.bsLang():'en')!==lang) w.bsSetLang(lang, true);
      if(w.bsSetOverrides) w.bsSetOverrides(merged());
      w.BS.PICS=mergedPics(); if(w.bsApplyPics) w.bsApplyPics();
      var hide=curHide(); w.document.querySelectorAll('[data-hsec]').forEach(function(el){ el.hidden=hide.indexOf(el.dataset.hsec)>=0; });
      if(pend.slides && w.bsHeroRender) w.bsHeroRender(pend.slides.list, pend.slides.secs);
      if(w.BSRoute && w.BSRoute.current() !== view) w.BSRoute.go(view);
    }catch(e){}
  };

  /* ---------------- undo, reset, save ---------------- */
  function doUndo(){
    var u=undo.pop(); if(!u) return; closePop();
    if(u.kind==='text'){ if(u.before===undefined) delete pend.text[u.lang][u.key]; else pend.text[u.lang][u.key]=u.before; }
    if(u.kind==='pic'){ if(u.before===undefined) delete pend.pics[u.key]; else pend.pics[u.key]=u.before; }
    if(u.kind==='hide') pend.hide=u.before;
    if(u.kind==='slides'){ pend.slides=u.before; if(!pend.slides) restoreHero(); drawSlides(); }
    show(); toast('Undone.');
  }
  function restoreHero(){ var s=BS.SLIDES; if(window.bsHeroRender){ if(s && s.list && s.list.length) bsHeroRender(s.list, s.secs); else bsHeroRender(null, 6); } }
  async function resetPage(){
    var root=document.querySelector('[data-view]:not([hidden])'); if(!root) return;
    var keys={}, it=document.createTreeWalker(root, NodeFilter.SHOW_TEXT), t; while((t=it.nextNode())){ var k=norm(window.bsEnglishOf?bsEnglishOf(t):t.nodeValue); if(k && hasOwn(k)) keys[k]=1; }
    var list=Object.keys(keys); if(!list.length){ toast('This page already shows the original words in this language.'); return; }
    var ok = window.bsConfirm ? await bsConfirm('Put this page back to the original words?', list.length+' changed piece'+(list.length>1?'s':'')+' of text on this page go back to the original ('+LANGS.filter(function(x){ return x[0]===lang; })[0][1]+'). You can still Undo before saving.', 'Reset this page') : true; if(!ok) return;
    list.forEach(function(k){ undo.push({kind:'text', lang:lang, key:k, before:(k in pend.text[lang])?pend.text[lang][k]:undefined}); pend.text[lang][k]=null; });
    show(); toast('Page back to the original words. Press Save to publish.');
  }
  async function save(){
    var n=count(); if(!n) return; closePop(); var b=$('edSave'); b.disabled=true; b.textContent='Saving…';
    try{
      var who=(BS.staffName&&BS.staffName())||'Staff', jobs=[];
      var textChanged=['en','am','om'].some(function(l){ return Object.keys(pend.text[l]).length; });
      if(textChanged) jobs.push(BS.set('settings','content',{map:merged(), setBy:who}));
      Object.keys(pend.pics).forEach(function(k){ jobs.push(BS.set('settings','pic-'+k,{data:pend.pics[k]||'', setBy:who})); });
      if(pend.hide){ var site=Object.assign({}, BS.SITE||{}); delete site.id; site.hide=pend.hide.slice(); site.setBy=who; jobs.push(BS.set('settings','site',site)); }
      if(pend.slides){ jobs.push(BS.set('settings','slides',{list:pend.slides.list, secs:pend.slides.secs, setBy:who})); }
      var res=await Promise.all(jobs);
      if(res.some(function(x){ return x===null; })){ toast('Some changes were not saved: they need a staff login with Site content.'); bar(); return; }
      /* what was just saved is now the site's own state */
      if(textChanged){ BS.CONTENT=merged(); }
      BS.__savedPics=mergedPics(); BS.PICS=Object.assign({}, BS.__savedPics);
      if(pend.hide){ BS.SITE=Object.assign({}, BS.SITE||{}, {hide:pend.hide.slice()}); }
      if(pend.slides){ BS.SLIDES={list:pend.slides.list, secs:pend.slides.secs}; }
      pend=fresh(); undo=[]; show(); toast(n+' change'+(n>1?'s':'')+' saved. Visitors see them now.');
    }catch(e){ toast('Saving failed. Check the connection and press Save again.'); bar(); }
  }

  window.bsEditor={ open:function(){ if(!allowed()){ if(window.bsToast) bsToast('Editing the site needs a staff login with Site content.'); return; } if(!$('edStyle')) document.head.appendChild(css); picker(); }, start:start, exit:function(){ return exit(); }, active:function(){ return on; }, count:function(){ return on?count():0; } };
})();

/* Build Smartly · language switch (English, Amharic, Afaan Oromoo).
   Every piece of text on the page is looked up in the chosen language's dictionary (assets/lang-am.js, assets/lang-om.js),
   including text the pages draw later (offers, orders, staff lists, pop-ups, messages from the site): a watcher translates
   new text as it appears. Numbers inside a sentence are kept: the dictionary holds "Request {1} sent" and the number is
   put back in its place. Names, prices and anything not in the dictionary stay as they are.
   The English original is remembered on each piece of text, so switching back to English restores it exactly.
   Drop-down options keep their English value, so the site's own logic never sees translated words. */
(function(){
  var sel=document.getElementById('lang'), note=document.getElementById('langNote');
  var cur='en', dict=null, busy=false, loading={};
  /* text the staff changed under Staff → Site content: {en:{original:new}, am:{…}, om:{…}}, keyed by the original English */
  var OVR=(window.BS && BS.CONTENT) || {};
  var SKIP=/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|svg)$/i, SKIPEL=/^(SCRIPT|STYLE|NOSCRIPT|svg)$/i, ATTRS=['placeholder','title','aria-label']; /* text boxes keep what people type; their hints are translated */
  var NUM=/\d[\d,]*(?:\.\d+)?/g;

  function load(code){
    window.BS_LANG=window.BS_LANG||{};
    if(window.BS_LANG[code]) return Promise.resolve(window.BS_LANG[code]);
    if(loading[code]) return loading[code];
    var v=(document.querySelector('script[src*="assets/i18n.js"]')||{}).src||''; v=(v.split('?')[1]||'');
    loading[code]=new Promise(function(res){ var s=document.createElement('script'); s.src='assets/lang-'+code+'.js'+(v?'?'+v:''); s.onload=function(){ res(window.BS_LANG[code]||{}); }; s.onerror=function(){ res({}); }; document.head.appendChild(s); });
    return loading[code];
  }
  /* look a text up: exactly; then with its numbers taken out; then with "1 item" read as "{1} items" (the dictionary holds
     the plural); then piece by piece where the page joins parts with " · " (so a part with a company name in it does not
     stop the other parts being translated) */
  var PL={item:'items',line:'lines',day:'days',offer:'offers',supplier:'suppliers',order:'orders',document:'documents',request:'requests',hour:'hours',minute:'minutes',category:'categories',contract:'contracts',quote:'quotes',week:'weeks',month:'months',thread:'threads',profile:'profiles',problem:'problems',task:'tasks',record:'records',trip:'trips',delivery:'deliveries'};
  var SG={}; Object.keys(PL).forEach(function(k){ SG[PL[k]]=k; });
  var AFTER=/(\{\d+\}\s)([a-z]+)\b/g; /* the word right after a number */
  function look(core){
    var t=dict[core]; if(t!=null) return t;
    var nums=[], i=0, key=core.replace(NUM, function(m){ nums.push(m); return '{'+(++i)+'}'; });
    if(!nums.length) return null;
    t=dict[key];
    if(t==null) t=dict[key.replace(AFTER, function(m,a,w){ return a+(PL[w]||w); })];   /* "{1} item" → "{1} items" */
    if(t==null) t=dict[key.replace(AFTER, function(m,a,w){ return a+(SG[w]||w); })];   /* and the other way round */
    if(t==null) return null;
    return t.replace(/\{(\d+)\}/g, function(m,k){ return nums[k-1]!=null ? nums[k-1] : m; });
  }
  function tr(en){
    var core=en.trim(); if(!core) return null;
    var o=OVR[cur] && OVR[cur][core.replace(/\s+/g,' ')]; /* staff edits are stored with single spaces */
    if(o!=null && o!==''){ return en.match(/^\s*/)[0]+o+en.match(/\s*$/)[0]; }
    if(!dict || !/[A-Za-z]/.test(core)) return null;
    var t=look(core);
    /* lists: a part that is itself a list ("Cement, Blocks, Electrical") is translated item by item */
    var piece=function(y){ var z=y && /[A-Za-z]/.test(y) ? look(y) : null; if(z!=null) return z; if(y.indexOf(', ')>0){ var hit=false, its=y.split(', ').map(function(w){ var v=/[A-Za-z]/.test(w)?look(w.trim()):null; if(v!=null){ hit=true; return v; } return w; }); if(hit) return its.join(', '); } return null; };
    if(t==null && core.indexOf(' · ')>0){ var any=false, parts=core.split(' · ').map(function(x){ var y=x.trim(), z=piece(y); if(z!=null){ any=true; return z; } return y; }); if(any) t=parts.join(' · '); }
    if(t==null && core.indexOf(' · ')<0 && core.indexOf(', ')>0 && !/[.?!]$/.test(core)) t=piece(core); /* a bare list, not a sentence */
    if(t==null) return null;
    var lead=en.match(/^\s*/)[0], trail=en.match(/\s*$/)[0];
    return lead+t+trail;
  }
  function doText(n){
    var p=n.parentElement; if(!p || SKIP.test(p.tagName) || p.closest('#lang,[data-notr]')) return;
    var v=n.nodeValue, en;
    if(n.__bsT!==undefined && v===n.__bsT) en=n.__bsEn; /* still our translation: start again from the English */
    else { en=v; n.__bsEn=v; }                          /* new or changed by the page: this is English */
    var t=tr(en);
    if(t!=null){ n.__bsT=t; if(v!==t) n.nodeValue=t; }
    else { n.__bsT=undefined; if(v!==en) n.nodeValue=en; }
  }
  function doEl(el){
    if(el.closest && el.closest('#lang,[data-notr]')) return;
    if(el.tagName==='OPTION' && !el.hasAttribute('value')) el.setAttribute('value', el.textContent); /* keep the value English */
    var store=el.__bsA||(el.__bsA={});
    ATTRS.forEach(function(a){
      if(!el.hasAttribute(a)) return; var v=el.getAttribute(a), s=store[a], en;
      if(s && s.t!==undefined && v===s.t) en=s.en; else { en=v; store[a]=s={en:v}; }
      var t=tr(en);
      if(t!=null){ s.t=t; if(v!==t) el.setAttribute(a, t); }
      else { s.t=undefined; if(v!==en) el.setAttribute(a, en); }
    });
  }
  function walk(root){
    if(root.nodeType===3){ doText(root); return; }
    if(root.nodeType!==1 || SKIPEL.test(root.tagName)) return;
    doEl(root);
    var it=document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT, null), n;
    while((n=it.nextNode())){ if(n.nodeType===3) doText(n); else if(!SKIPEL.test(n.tagName)) doEl(n); }
  }
  var mo=new MutationObserver(function(ms){
    if(busy) return; busy=true;
    try{ ms.forEach(function(m){
      if(m.type==='characterData') doText(m.target);
      else if(m.type==='attributes') doEl(m.target);
      else m.addedNodes.forEach(walk);
    }); mo.takeRecords(); } finally { busy=false; } /* drop the records our own changes just made */
  });
  function apply(code, noSave){
    cur=code; if(!noSave){ try{ localStorage.setItem('bs_lang', code); }catch(e){} }
    document.documentElement.lang = code==='am'?'am':code==='om'?'om':'en';
    if(note) note.hidden = code==='en';
    var go=function(d){ if(cur!==code) return; dict=code==='en'?null:d; busy=true; try{ walk(document.body); mo.takeRecords(); } finally { busy=false; } };
    if(code==='en') go(null); else load(code).then(go);
  }
  window.bsLang=function(){ return cur; };
  window.bsSetLang=function(code, noSave){ if(sel) sel.value=code; var s2=document.getElementById('lang2'); if(s2) s2.value=code; apply(code, noSave); }; /* noSave: for one page only (the driver's page) */
  window.bsTr=function(en){ return tr(en)||en; };
  function rewalk(){ busy=true; try{ walk(document.body); mo.takeRecords(); } finally { busy=false; } }
  window.bsSetOverrides=function(map){ OVR=map||{}; rewalk(); };
  window.bsLoadLang=load;                                            /* the staff editor shows the current translations */
  window.bsEnglishOf=function(n){ return n.__bsEn!==undefined ? n.__bsEn : n.nodeValue; };
  mo.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTRS});
  var saved='en'; try{ saved=localStorage.getItem('bs_lang')||'en'; }catch(e){}
  if(sel){ sel.value=saved; sel.addEventListener('change', function(){ apply(sel.value); }); }
  if(saved!=='en') apply(saved); else if(Object.keys(OVR).length) rewalk();
})();

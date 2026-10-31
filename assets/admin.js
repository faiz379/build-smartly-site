/* Build Smartly · staff page (#admin). Reads the same records as buyers and suppliers:
   requests (boqs), offers, support messages, member profiles, newsletter items, supplier verifications and settings.
   On the public site staff sign in with their own email and password (owner adds them); on the local test server and the mirror the
   test staff numbers and the staff password still work. The session is kept per browser tab. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var data={boqs:[],offers:[],messages:[],profiles:[],news:[],verifications:[],settings:[],issues:[],promotions:[],suppliers:[],tasks:[],staff:[],tracks:[]}, query='';
  var tab='overview', mode='local', booted=false, adTilesHtml='', actN=8;
  var CATS=BS.CATEGORIES.filter(function(c){ return c.indexOf('Other')<0; });
  function esc(t){ return String(t||'').replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function when(iso){ if(!iso) return ''; var d=new Date(iso); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
  function digits(p){ return String(p||'').replace(/\D/g,'').replace(/^251/,'').replace(/^0/,''); }
  function fmtPhone(d){ d=digits(d); return d ? '0'+d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6) : ''; }
  function issueLabel(){ return new Date().toLocaleDateString('en-GB',{month:'long',year:'numeric'}); }
  function isAdmin(){ return BS.isStaff(); }
  function staffName(){ return BS.staffName(); }
  function canFinance(){ return BS.staffCan('finance'); }

  /* ---- sign in ---- */
  function signedIn(name){ resubStaffOnly(); BS.clearMeTab(); $('adPw').value=''; $('adPw2').value=''; showPanel(); if(window.BSAuth) BSAuth.refresh(); bsToast('Signed in as '+name+'.'); }
  $('adGo').onclick=async function(){
    if(BS.staffAuth()){
      $('adErr').hidden=true; $('adGo').disabled=true;
      try{ var st=await BS.staffSignIn($('adEmail').value, $('adPw2').value); signedIn(st.name||st.email); }
      catch(err){ $('adErr').textContent=BS.authErr(err); $('adErr').hidden=false; $('adPw2').focus(); }
      $('adGo').disabled=false; return;
    }
    var d=digits($('adPhone').value), st=BS.STAFF.filter(function(a){ return a.phone===d; })[0];
    var ok=!!st && $('adPw').value===BS.STAFF_PASSWORD; $('adErr').textContent='No staff account with that number and password.'; $('adErr').hidden=ok; if(!ok){ $('adPw').focus(); return; }
    BS.setStaffCache({name:st.person, role:/owner/i.test(st.person)?'owner':'staff', finance:true}); signedIn(st.person);
  };
  $('adPw').addEventListener('keydown', function(e){ if(e.key==='Enter') $('adGo').click(); });
  $('adPw2').addEventListener('keydown', function(e){ if(e.key==='Enter') $('adGo').click(); });
  $('adForgot').onclick=async function(){
    var em=$('adEmail').value.trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ $('adErr').textContent='Type your email above first, then press "Forgot your password?".'; $('adErr').hidden=false; $('adEmail').focus(); return; }
    try{ await BS.staffPasswordEmail(em); }catch(err){} /* the same answer either way, so the page does not reveal which emails have a login */
    $('adErr').hidden=true; bsToast('If '+em+' has a staff login, an email to set a new password is on its way.');
  };
  $('osGo').onclick=async function(){
    var n=$('osName').value.trim(), em=$('osEmail').value.trim(), p1=$('osPw').value, p2=$('osPw2').value, bad='';
    if(!n) bad='Please type your name.'; else if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) bad='Please type a valid email.'; else if(p1.length<8) bad='The password needs at least 8 characters.'; else if(p1!==p2) bad='The two passwords are not the same.';
    $('osErr').textContent=bad; $('osErr').hidden=!bad; if(bad) return;
    $('osGo').disabled=true;
    try{ if(await BS.ownerExists()){ bsToast('The owner login already exists. Sign in instead.'); showLogin(); } else { await BS.setupOwner(n, em, p1); $('osPw').value=''; $('osPw2').value=''; signedIn(n); } }
    catch(err){ $('osErr').textContent=BS.authErr(err); $('osErr').hidden=false; }
    $('osGo').disabled=false;
  };
  $('adLogout').onclick=async function(){ await BS.staffSignOut(); showLogin(); if(window.BSAuth) BSAuth.refresh(); bsToast('Signed out of the staff page.'); };
  async function showLogin(){
    $('adPanel').hidden=true; var fb=BS.staffAuth(); $('adOld').hidden=fb; $('adNew').hidden=!fb; $('adSetup').hidden=true; $('adLogin').hidden=false;
    if(fb && !(await BS.ownerExists()) && $('adPanel').hidden){ $('adLogin').hidden=true; $('adSetup').hidden=false; }
  }
  /* the sign-in listener settles after a reload; follow it */
  BS.onStaffChange=function(on){ if(window.BSAuth) BSAuth.refresh(); if(document.getElementById('view-admin').hidden) return; if(on) resubStaffOnly(); if(on && $('adPanel').hidden) showPanel(); else if(!on && !$('adPanel').hidden) showLogin(); };
  function showPanel(){ $('adLogin').hidden=true; $('adSetup').hidden=true; $('adPanel').hidden=false; $('adMeta').textContent='Signed in as '+staffName(); render(); }
  BSRoute.on('admin', function(){ if(isAdmin()) showPanel(); else showLogin(); });
  BS.ready().then(function(m){ mode=m; if(!isAdmin() && !document.getElementById('view-admin').hidden) showLogin(); if(isAdmin() && !$('adPanel').hidden) $('adMeta').textContent='Signed in as '+staffName(); });
  var subs={};
  function sub(c){ if(subs[c]) subs[c](); subs[c]=BS.subscribe(c, function(d){ data[c]=d||[];
    if(c==='tracks'){ if(isAdmin() && !$('adPanel').hidden && window.bsTrack) bsTrack.mountFleet(data.tracks, data.offers); return; } /* positions move often: update the map only */
    if(c==='staff' && BS.staffAuth() && isAdmin()){ var mine=data.staff.filter(function(x){ return x.id===BS.staffUid(); })[0]; /* the owner's changes reach this tab at once */
      if(!data.staff.length){ BS.recheckStaff(); } /* the list was refused: this login may have been removed or switched off */
      else if(mine && mine.active===true){ BS.setStaffCache(Object.assign({uid:mine.id}, mine)); } else if(mine){ BS.staffSignOut().then(function(){ showLogin(); if(window.BSAuth) BSAuth.refresh(); bsToast('Your staff login was switched off.'); }); return; } } if(c==='settings') BS.applySettings(d||[]); if(isAdmin() && !$('adPanel').hidden) render(); }); }
  ['boqs','offers','messages','profiles','news','verifications','settings','issues','promotions','suppliers','tasks','staff','tracks'].forEach(sub);
  /* staff-only lists are refused before sign-in; ask again once signed in */
  function resubStaffOnly(){ sub('tasks'); sub('staff'); sub('tracks'); }
  $('adTabs').addEventListener('click', function(e){ var b=e.target.closest('[data-tab]'); if(!b) return; tab=b.dataset.tab; render(); $('adLayout').classList.remove('open'); $('adBurger').setAttribute('aria-expanded','false'); window.scrollTo({top:0,behavior:'smooth'}); });
  /* three-line button: on a phone it opens the menu as a drawer; on a wide screen it folds the sidebar to icons */
  $('adBurger').onclick=function(){ var L=$('adLayout'); if(window.matchMedia('(max-width:860px)').matches){ var o=!L.classList.contains('open'); L.classList.toggle('open', o); $('adBurger').setAttribute('aria-expanded', o?'true':'false'); } else { L.classList.toggle('fold'); try{ localStorage.setItem('bs_adfold', L.classList.contains('fold')?'1':''); }catch(e){} } };
  $('adScrim').onclick=function(){ $('adLayout').classList.remove('open'); $('adBurger').setAttribute('aria-expanded','false'); };
  try{ if(localStorage.getItem('bs_adfold')==='1') $('adLayout').classList.add('fold'); }catch(e){}

  /* ---- helpers over the records ---- */
  function boqOf(id){ return data.boqs.filter(function(b){ return b.id===id; })[0]; }
  function lineOf(b, n){ return b ? (b.lines||[]).filter(function(l){ return l.n===n; })[0] : null; }
  function openBoq(b){ return b.status!=='withdrawn' && new Date(b.deadlineAt)>new Date(); }
  function unclassified(){ var out=[]; data.boqs.forEach(function(b){ (b.lines||[]).forEach(function(l){ if(/Other/.test(l.cat||'')) out.push({b:b,l:l}); }); }); return out; }
  function threads(){
    var by={}; data.messages.forEach(function(m){ if(m.orderId) return; var k=m.phone||'?'; (by[k]=by[k]||{phone:k,name:'',msgs:[]}).msgs.push(m); if(m.name) by[k].name=m.name; });
    return Object.keys(by).map(function(k){ var t=by[k]; t.msgs.sort(function(a,c){ return (a.createdAt||'').localeCompare(c.createdAt||''); }); var last=t.msgs[t.msgs.length-1]; t.last=last; t.waiting = t.msgs.filter(function(m){ return m.who==='customer'; }).length>0 && !t.msgs.some(function(m){ return m.who==='staff' && m.staff; }) || (last && last.who==='customer'); return t; }).sort(function(a,c){ return (c.last.createdAt||'').localeCompare(a.last.createdAt||''); });
  }
  function paid(){ return data.offers.filter(function(o){ return o.paidAt; }).sort(function(a,c){ return (c.paidAt||'').localeCompare(a.paidAt||''); }); }
  function offerTotal(o){ return o.qtyOffered*o.unitPrice+(+o.deliveryCost||0); }

  /* ---- render ---- */
  function render(){
    var pendV=data.verifications.filter(function(v){ return v.status==='pending'; }).length;
    var waiting=threads().filter(function(t){ return t.waiting; }).length;
    var pendN=data.news.filter(function(x){ return x.status==='pending'; }).length;
    var openI=data.issues.filter(function(x){ return x.status!=='resolved'; }).length;
    var inProg=data.offers.filter(function(o){ return o.status==='accepted' && !o.paidAt; }).length;
    var fees=0; paid().forEach(function(o){ fees+=offerTotal(o)*BS.FEE_RATE; });
    var tiles=[[data.boqs.filter(openBoq).length,'Open requests','requests'],[unclassified().length,'Lines to classify','requests'],[pendV,'Suppliers awaiting verification','suppliers'],[waiting,'Support threads waiting','support'],[pendN,'Newsletter items pending','news'],[openI,'Problems open','support'],[inProg,'Orders in progress','finance'],[paid().length,'Orders paid','finance'],[BS.fmt(fees),'Fees earned ('+BS.pct(BS.FEE_RATE)+')','finance']];
    tiles=tiles.filter(function(t){ return BS.staffCan(t[2]); });
    adTilesHtml='<div class="queue" id="adTiles">'+tiles.map(function(t){ return '<button type="button" class="q" data-go="'+t[2]+'" style="text-align:left;cursor:pointer;font:inherit"><strong style="font-size:1.4rem">'+t[0]+'</strong><span class="small muted">'+t[1]+'</span></button>'; }).join('')+'</div>';
    $('adTabs').querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.dataset.tab===tab); });
    try{ var badges={support: threads().filter(function(t){ return t.waiting; }).length + data.issues.filter(function(i){ return i.status!=='resolved'; }).length, suppliers: data.verifications.filter(function(v){ return v.status==='pending'; }).length, requests: unclassified().length, news: data.news.filter(function(x){ return x.status==='pending'; }).length};
      $('adTabs').querySelectorAll('button').forEach(function(b){ var n=badges[b.dataset.tab]||0; var old=b.querySelector('.badge'); if(old) old.remove(); if(n){ var sp=document.createElement('span'); sp.className='badge'; sp.textContent=n; b.appendChild(sp); } }); }catch(e){}
    if(tab!=='overview' && !BS.staffCan(tab)) tab='overview';
    $('adTabs').querySelectorAll('[data-tab]').forEach(function(b){ b.hidden=b.dataset.tab!=='overview' && !BS.staffCan(b.dataset.tab); });
    var r={overview:renderOverview, requests:renderRequests, suppliers:renderSuppliers, support:renderSupport, news:renderNews, promos:renderPromos, brands:renderBrandsTab, members:renderMembers, finance:renderFinance, insights:renderInsights, catalogue:renderCatalogue, content:renderContent, settings:renderSettings}[tab]||renderOverview;
    $('adBody').innerHTML=searchHtml()+r();
    if(window.bsTrack) bsTrack.mountFleet(data.tracks, data.offers);
  }
  $('adBody').addEventListener('click', function(e){ var b=e.target.closest('[data-go]'); if(!b) return; tab=b.dataset.go; render(); });

  function searchHtml(){
    var q=query.trim().toLowerCase(); if(!q) return '';
    var hit=function(){ return Array.prototype.slice.call(arguments).some(function(v){ return String(v||'').toLowerCase().indexOf(q)>=0; }); };
    var rows=[];
    data.boqs.forEach(function(b){ if(hit(b.ref,b.company,b.ownerPhone,b.customerNo,b.subcity)) rows.push('<div class="doc"><span class="ico">RQ</span><span><strong>'+esc(b.ref)+'</strong> · '+esc(b.company)+' · '+esc(b.subcity)+' · '+(b.lines||[]).length+' lines · '+esc(b.status)+'</span><a class="btn btn-ghost btn-sm" href="#" data-tab-go="requests">Open</a></div>'); });
    data.offers.filter(function(o){ return o.status==='accepted'; }).forEach(function(o){ if(hit(o.poRef,o.supplierName,o.customerRevealed,o.paymentRef,o.handoverCode)) rows.push('<div class="doc"><span class="ico">PO</span><span><strong>'+esc(o.poRef)+'</strong> · '+esc(o.customerRevealed)+' ← '+esc(o.supplierName)+' · '+BS.fmt(offerTotal(o))+' · '+(o.paidAt?'paid':o.deliveredAt?'delivered':o.dispatchedAt?'on the way':o.contractAt?'contract':'PO')+'</span><a class="btn btn-ghost btn-sm" href="#order-'+o.id+'">Order page</a></div>'); });
    data.verifications.forEach(function(v){ if(hit(v.company,v.phone,v.tin,v.lic)) rows.push('<div class="doc"><span class="ico">SU</span><span><strong>'+esc(v.company)+'</strong> · '+fmtPhone(v.phone)+' · '+esc(v.status)+'</span><a class="btn btn-ghost btn-sm" href="#" data-tab-go="suppliers">Open</a></div>'); });
    BS.suppliersAll().forEach(function(x){ if(hit(x.name,x.sub,x.phone)) rows.push('<div class="doc"><span class="ico">SU</span><span><strong>'+esc(x.name)+'</strong> · '+esc(x.cats.join(', '))+'</span><span class="tag tag-green">Verified</span></div>'); });
    data.issues.forEach(function(x){ if(hit(x.poRef,x.who,x.text)) rows.push('<div class="doc"><span class="ico">!</span><span><strong>'+esc(x.poRef)+'</strong> · '+esc(x.text)+' · '+esc(x.status)+'</span><a class="btn btn-ghost btn-sm" href="#order-'+x.offerId+'">Order page</a></div>'); });
    return card('Search · '+esc(query), rows.length+' result'+(rows.length===1?'':'s')+' across requests, orders, suppliers and problems.', rows.length?'<div class="docs">'+rows.slice(0,30).join('')+'</div>':'<div class="empty">Nothing matches.</div>');
  }
  $('adSearch').addEventListener('input', function(){ query=this.value; render(); });
  /* staff asked for less text (27 Oct 2026): a card shows only the first sentence of its explanation */
  function short(sub){ if(!sub) return ''; var m=String(sub).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : sub; }
  function card(title, sub, body){ return '<section class="card" style="display:grid;gap:.7rem"><div><strong style="font-family:var(--display);font-size:1.05rem">'+title+'</strong>'+(sub?'<p class="small muted">'+short(sub)+'</p>':'')+'</div>'+body+'</section>'; }
  function renderOverview(){
    var recent=[];
    data.boqs.forEach(function(b){ recent.push([b.createdAt,'Request '+b.ref+' from '+esc(b.company)+' · '+(b.lines||[]).length+' lines · '+esc(b.subcity)]); });
    data.offers.forEach(function(o){ var b=boqOf(o.boqId); recent.push([o.createdAt,'Offer from '+esc(o.supplierName)+' on '+(b?b.ref:'')+' line '+o.lineN+' · '+BS.fmt(offerTotal(o))]); if(o.acceptedAt && !recent.some(function(r){ return r[2]==='po'+o.poRef; })) recent.push([o.acceptedAt,'Order '+esc(o.poRef)+' placed · '+esc(o.supplierName),'po'+o.poRef]); if(o.paidAt && !recent.some(function(r){ return r[2]==='pay'+o.poRef; })) recent.push([o.paidAt,'Paid '+esc(o.poRef)+' · '+BS.fmt(o.paidTotal||offerTotal(o))+' · '+esc(o.paymentRef||''),'pay'+o.poRef]); });
    data.verifications.forEach(function(v){ recent.push([v.submittedAt||v.createdAt,'Documents from '+esc(v.company)+' · '+esc(v.status)]); });
    data.news.forEach(function(x){ recent.push([x.createdAt,'Newsletter item from '+esc(x.company)+' · '+esc(x.status)]); });
    recent.sort(function(a,c){ return (c[0]||'').localeCompare(a[0]||''); });
    var todo=[];
    if(unclassified().length) todo.push('<a href="#" data-tab-go="requests">'+unclassified().length+' line(s) typed by customers need a category</a>');
    var pv=data.verifications.filter(function(v){return v.status==='pending';}).length; if(pv) todo.push('<a href="#" data-tab-go="suppliers">'+pv+' supplier(s) waiting for verification</a>');
    var w=threads().filter(function(t){return t.waiting;}).length; if(w) todo.push('<a href="#" data-tab-go="support">'+w+' support thread(s) waiting for an answer</a>');
    var pn=data.news.filter(function(x){return x.status==='pending';}).length; if(pn) todo.push('<a href="#" data-tab-go="news">'+pn+' newsletter item(s) to check</a>');
    var oi=data.issues.filter(function(x){return x.status!=='resolved';}).length; if(oi) todo.push('<a href="#" data-tab-go="support">'+oi+' problem(s) reported on orders, open or in progress</a>');
    var pp=data.profiles.filter(function(x){ return x.status==='pending'; }).length; if(pp) todo.push('<a href="#" data-tab-go="members">'+pp+' profile(s) to approve</a>');
    var late=lateSuppliers().length; if(late) todo.push('<a href="#" data-tab-go="requests">'+late+' supplier(s) have not quoted yet</a>');
    todo=todo.filter(function(t){ var m=/data-tab-go="(\w+)"/.exec(t); return !m || BS.staffCan(m[1]); }); /* only what this staff member may open */
    var tasks=data.tasks.slice().sort(function(a,c){ return (a.done?1:0)-(c.done?1:0) || (c.createdAt||'').localeCompare(a.createdAt||''); });
    var taskHtml='<div class="todo">'+todo.map(function(t){ return '<div class="row waiting"><i></i><span>'+t+'</span><span class="tag tag-ochre">Waiting</span></div>'; }).join('')+
      tasks.map(function(t){ return '<div class="row'+(t.done?' done':'')+'"><input type="checkbox" data-task="'+t.id+'"'+(t.done?' checked':'')+' style="width:20px;height:20px;accent-color:var(--green)"><span'+(t.done?' style="text-decoration:line-through;color:var(--fg-2)"':'')+'>'+esc(t.text)+' <span class="small muted">· '+esc(t.by||'')+(t.done?' · done '+when(t.doneAt):'')+'</span></span><button class="btn btn-ghost btn-sm" type="button" data-taskdel="'+t.id+'" aria-label="Delete">×</button></div>'; }).join('')+
      ((todo.length||tasks.length)?'':'<div class="empty">Nothing waiting.</div>')+'</div><div class="chat-in"><div class="field"><input id="adTaskIn" placeholder="Add a task for the team…"></div><button class="btn btn-primary btn-sm" type="button" id="adTaskAdd">Add</button></div>';
    var onWay=BS.orderGroups(data.offers).filter(function(g){ return g.first.dispatchedAt && !g.first.deliveredAt; });
    var fleet=onWay.length ? card('Deliveries on the way', onWay.length+' order'+(onWay.length>1?'s':'')+' dispatched, not yet delivered.', '<div id="fleetSlot" hidden></div><div class="docs" id="fleetList"></div>'+(onWay.filter(function(g){ return !g.first.trackId; }).length?'<p class="small muted">Without tracking: '+onWay.filter(function(g){ return !g.first.trackId; }).map(function(g){ return '<a href="#order-'+g.id+'">'+esc(g.poRef)+'</a>'; }).join(', ')+'</p>':'')) : '';
    return adTilesHtml+fleet+'<div class="grid2" style="align-items:start">'+card('To do today','', taskHtml)+'<div hidden>'+card('x','', todo.length?'<ul style="margin:0;padding-left:1.1rem;display:grid;gap:.3rem">'+todo.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>':'<div class="empty">Nothing waiting. New requests, documents and messages appear here as they come in.</div>')+'</div>'+
      card('Latest activity','Across all members, newest first.','<div class="docs">'+(recent.slice(0,actN).map(function(r){ return '<div class="doc"><span class="small muted" style="white-space:nowrap">'+when(r[0])+'</span><span>'+r[1]+'</span><span></span></div>'; }).join('')||'<div class="empty">No activity yet.</div>')+'</div>'+
        (recent.length>actN?'<div><button class="btn btn-ghost btn-sm" type="button" data-actmore>See more ('+(recent.length-actN)+' older)</button></div>':(actN>8&&recent.length>8?'<div><button class="btn btn-ghost btn-sm" type="button" data-actless>Show less</button></div>':'')))+'</div>';
  }
  $('adBody').addEventListener('click', function(e){ var a=e.target.closest('[data-tab-go]'); if(a){ e.preventDefault(); tab=a.dataset.tabGo; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
    if(e.target.closest('[data-actmore]')){ actN+=20; render(); return; } if(e.target.closest('[data-actless]')){ actN=8; render(); return; } });

  function supplierPhone(sp){ var t=BS.TEST_ACCOUNTS.filter(function(x){ return x.supplierId===sp.id; })[0]; return sp.phone || (t?t.phone:''); }
  function invitedFor(b){ return BS.activeSuppliers().filter(function(sp){ return (b.lines||[]).some(function(l){ return sp.cats.indexOf(l.cat)>=0; }) && supplierPhone(sp)!==b.ownerPhone; }); }
  /* suppliers who were sent an open request and have not quoted on any line of it yet */
  function lateSuppliers(){ var out=[]; data.boqs.forEach(function(b){ if(!openBoq(b)) return; invitedFor(b).forEach(function(sp){ if(!data.offers.some(function(o){ return o.boqId===b.id && o.supplierId===sp.id; })) out.push({b:b, sp:sp}); }); }); return out; }
  var reqFilter='open';
  function renderRequests(){
    var list=data.boqs.slice().sort(function(a,c){ return (c.createdAt||'').localeCompare(a.createdAt||''); });
    var f={open:function(b){ return openBoq(b) && !data.offers.some(function(o){ return o.boqId===b.id && o.status==='accepted'; }); }, orders:function(b){ return data.offers.some(function(o){ return o.boqId===b.id && o.status==='accepted'; }); }, all:function(){ return true; }};
    var bar='<div class="subtabs">'+[['open','Waiting for offers'],['orders','With orders'],['all','All']].map(function(x){ return '<button type="button" class="'+(reqFilter===x[0]?'on':'')+'" data-reqf="'+x[0]+'">'+x[1]+' · '+list.filter(f[x[0]]).length+'</button>'; }).join('')+'</div>';
    list=list.filter(f[reqFilter]);
    if(!list.length) return bar+'<div class="empty">Nothing here.</div>';
    return bar+list.map(function(b){
      var os=data.offers.filter(function(o){ return o.boqId===b.id; }); var left=BS.days(new Date(b.deadlineAt)-Date.now());
      var inv=invitedFor(b), groups=BS.orderGroups(os);
      var state = b.status==='withdrawn' ? '<span class="tag">Withdrawn</span>' : groups.length ? '<span class="tag tag-green">'+groups.length+' order'+(groups.length>1?'s':'')+'</span>' : left>0 ? '<span class="tag tag-ochre">Open · '+left+' d left</span>' : '<span class="tag">Closed</span>';
      var who=inv.map(function(sp){ var n=os.filter(function(o){ return o.supplierId===sp.id; }).length; var nudged=data.messages.some(function(m){ return m.nudge===b.id+'|'+sp.id; });
        return '<span class="sup-pill'+(n?' ok':'')+'">'+esc(sp.name)+' · '+(n?n+' offer'+(n>1?'s':''):'no offer yet')+(!n && openBoq(b)?' <button class="btn btn-ghost btn-sm" type="button" data-nudge="'+b.id+'" data-sup="'+sp.id+'">'+(nudged?'Nudge again':'Nudge')+'</button>':'')+'</span>'; }).join('');
      var rows=(b.lines||[]).map(function(l){
        var lo=os.filter(function(o){ return o.lineN===l.n; }).sort(function(x,y){ return BS.offerTotal(x)-BS.offerTotal(y); });
        var other=/Other/.test(l.cat||'');
        return '<div class="doc" style="grid-template-columns:auto 1fr auto"><span class="ico">'+l.n+'</span><span><strong>'+esc(l.item)+'</strong> · '+l.qty+' '+esc(l.unit)+(l.returnBy?' · '+l.needed+' to '+l.returnBy:l.needed?' · by '+l.needed:'')+'<br>'+
          (lo.length ? lo.map(function(o){ return '<span class="small">'+esc(o.supplierName)+' · '+esc(o.brand)+' · '+BS.fmt(o.unitPrice)+' · total '+BS.fmt(BS.offerTotal(o))+' · <em>'+(o.status==='accepted'?'in '+esc(o.poRef):o.status==='rejected'?'rejected':(o.counter&&o.counter.state==='open')?'counter '+BS.fmt(o.counter.price)+' open':(b.chosen||{})[l.n]===o.id?'chosen':'open')+'</em></span>'; }).join('<br>') : '<span class="small muted">'+(other?'Typed by the customer, not in the catalogue':'No offers yet')+'</span>')+'</span>'+
          (other ? '<select data-classify="'+b.id+'" data-line="'+l.n+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--ochre);border-radius:8px"><option value="">Category…</option>'+CATS.map(function(c){ return '<option>'+c+'</option>'; }).join('')+'</select>' : '<span class="small muted">'+esc(l.cat)+'</span>')+'</div>';
      }).join('');
      var ordersHtml=groups.map(function(g){ var st=BS.orderStatus(g.first); return '<a class="order-row" href="#order-'+g.id+'"><span><strong>'+esc(g.poRef)+'</strong> · '+esc(g.supplierName)+'</span><span class="tag '+st.c+'">'+esc(st.t)+'</span><span class="btn btn-ghost btn-sm">Open</span></a>'; }).join('');
      return card(esc(b.ref)+' · '+esc(b.company), esc(b.subcity)+' · '+esc(b.deliveryTerm)+' · '+when(b.createdAt)+' · '+fmtPhone(b.ownerPhone),
        '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">'+state+(b.status!=='withdrawn' && !groups.length ? '<button class="btn btn-ghost btn-sm" type="button" data-close="'+b.id+'">Close request</button>':'')+'</div>'+
        '<div class="small muted">Sent to:</div><div style="display:flex;gap:.4rem;flex-wrap:wrap">'+(who||'<span class="small muted">No supplier sells these categories yet.</span>')+'</div><div class="docs">'+rows+'</div>'+ordersHtml);
    }).join('');
  }
  $('adBody').addEventListener('click', async function(e){
    var rf=e.target.closest('[data-reqf]'); if(rf){ reqFilter=rf.dataset.reqf; render(); return; }
    var n=e.target.closest('[data-nudge]'); if(n){ var b=boqOf(n.dataset.nudge), sp=BS.supplierById(n.dataset.sup); if(!b||!sp) return; n.disabled=true;
      await BS.add('messages', {phone:digits(supplierPhone(sp)), who:'staff', staff:staffName(), name:sp.name, nudge:b.id+'|'+sp.id, text:'Reminder from Build Smartly: request '+b.ref+' is waiting for your offer. It closes in '+Math.max(0,BS.days(new Date(b.deadlineAt)-Date.now()))+' day(s).'});
      bsToast('Reminder sent to '+sp.name+' (support thread and SMS).'); return; }
    var tk=e.target.closest('[data-taskdel]'); if(tk){ await BS.remove('tasks', tk.dataset.taskdel); return; }
    if(e.target.id==='adTaskAdd'){ var v=$('adTaskIn').value.trim(); if(!v) return; $('adTaskIn').value=''; await BS.add('tasks', {text:v, done:false, by:staffName()}); return; }
  });
  $('adBody').addEventListener('change', async function(e){ var t=e.target.closest('[data-task]'); if(t){ await BS.update('tasks', t.dataset.task, {done:t.checked, doneAt:t.checked?new Date().toISOString():'', doneBy:staffName()}); } });
  $('adBody').addEventListener('keydown', function(e){ if(e.target.id==='adTaskIn' && e.key==='Enter'){ e.preventDefault(); $('adTaskAdd').click(); } });
  $('adBody').addEventListener('change', async function(e){
    var s=e.target.closest('[data-classify]'); if(!s || !s.value) return;
    var b=boqOf(s.dataset.classify); if(!b) return; var lines=(b.lines||[]).map(function(l){ return l.n===+s.dataset.line ? Object.assign({}, l, {cat:s.value}) : l; });
    await BS.update('boqs', b.id, {lines:lines}); bsToast('Line '+s.dataset.line+' sent to the '+s.value+' suppliers.');
  });

  function renderSuppliers(){
    var list=data.verifications.slice().sort(function(a,c){ return (a.status==='pending'?0:1)-(c.status==='pending'?0:1) || (c.submittedAt||'').localeCompare(a.submittedAt||''); });
    var seeded=supplierListHtml();
    var rows=list.map(function(v){
      var tag = v.status==='verified' ? '<span class="tag tag-green">Verified</span>' : v.status==='rejected' ? '<span class="tag">Rejected</span>' : '<span class="tag tag-ochre">Pending</span>';
      return '<div class="card" style="display:grid;gap:.5rem"><div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><div><strong style="font-family:var(--display)">'+esc(v.company)+'</strong><br><span class="small muted">'+fmtPhone(v.phone)+' · TIN '+esc(v.tin||'')+' · '+esc((v.cats||[]).join(', '))+' · dispatch '+esc(v.sub||'')+'</span></div>'+tag+'</div>'+
        '<div class="small">Licence <strong>'+esc(v.lic||'—')+'</strong>'+(v.exp?' · expires '+esc(v.exp):'')+' · VAT: '+esc(v.vat||'')+' · files: '+esc((v.files||[]).join(', ')||'none attached')+' · submitted '+when(v.submittedAt)+(v.reason?'<br>Reason given: '+esc(v.reason):'')+'</div>'+
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">'+(v.status!=='verified'?'<button class="btn btn-primary btn-sm" type="button" data-verify="'+v.id+'">Approve</button>':'')+(v.status!=='rejected'?'<input placeholder="Reason (for a rejection)" data-reason="'+v.id+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px;min-width:14rem"><button class="btn btn-ghost btn-sm" type="button" data-reject="'+v.id+'">Reject</button>':'')+'</div></div>';
    }).join('');
    var pending=list.filter(function(v){ return v.status==='pending'; }).length;
    var tabs=[['list','All suppliers'],['edit','Edit a supplier'],['add','Add a supplier'],['verify','Verification'+(pending?' · '+pending:'')]];
    var bar='<div class="subtabs" style="margin-bottom:.2rem">'+tabs.map(function(t){ return '<button type="button" class="'+(supSub===t[0]?'on':'')+'" data-supsub="'+t[0]+'">'+t[1]+'</button>'; }).join('')+'</div>';
    return bar+(supSub==='edit' ? supplierEditCard() : supSub==='add' ? supplierAddCard() : supSub==='verify' ? card('Verification queue','Suppliers who submitted a licence and TIN. Approving unlocks quoting; the supplier is told by SMS.', rows||'<div class="empty">No documents waiting. New registrations appear here when they submit their licence.</div>') : card('All suppliers','', '<div class="field" style="max-width:24rem"><input id="supSearch" type="search" placeholder="Search name, category, sub-city, number" value="'+esc(supQ)+'"></div><div class="docs">'+(seeded||'<div class="empty">No supplier matches.</div>')+'</div>'));
  }
  $('adBody').addEventListener('click', async function(e){
    var v=e.target.closest('[data-verify]'); if(v){ v.disabled=true; await BS.update('verifications', v.dataset.verify, {status:'verified', verifiedAt:new Date().toISOString(), by:staffName(), reason:''}); if(BS.supplierDoc(v.dataset.verify)) await BS.update('suppliers', v.dataset.verify, {status:'active'}); bsToast('Approved. The supplier can quote now.'); return; }
    var r=e.target.closest('[data-reject]'); if(r){ var inp=document.querySelector('[data-reason="'+r.dataset.reject+'"]'); var why=(inp&&inp.value.trim())||'Documents not readable'; r.disabled=true; await BS.update('verifications', r.dataset.reject, {status:'rejected', rejectedAt:new Date().toISOString(), by:staffName(), reason:why}); bsToast('Rejected. The supplier sees the reason and can resubmit.'); return; }
    var c=e.target.closest('[data-close]'); if(c){ c.disabled=true; await BS.update('boqs', c.dataset.close, {status:'withdrawn', withdrawnAt:new Date().toISOString(), closedBy:staffName()}); bsToast('Request closed.'); return; }
  });

  /* problems reported: a small case tracker. open → in progress (taken by a staff member) → resolved, with a note timeline */
  var issueFilter='active';
  function ageOf(iso){ var h=(Date.now()-new Date(iso).getTime())/3600000; return h<1?Math.round(h*60)+' min':h<48?Math.round(h)+' h':Math.round(h/24)+' d'; }
  function renderIssues(){
    var all=data.issues.slice(); var counts={open:0,progress:0,resolved:0}; all.forEach(function(x){ counts[x.status==='resolved'?'resolved':x.status==='progress'?'progress':'open']++; });
    var list=all.filter(function(x){ return issueFilter==='all' || (issueFilter==='active' ? x.status!=='resolved' : x.status===issueFilter); }).sort(function(a,c){ var r={open:0,progress:1,resolved:2}; return (r[a.status]||0)-(r[c.status]||0) || (c.createdAt||'').localeCompare(a.createdAt||''); });
    var filters=[['active','Open and in progress',counts.open+counts.progress],['open','Open',counts.open],['progress','In progress',counts.progress],['resolved','Resolved',counts.resolved],['all','All',all.length]];
    var bar='<div class="subtabs">'+filters.map(function(f){ return '<button type="button" data-ifilter="'+f[0]+'" class="'+(issueFilter===f[0]?'on':'')+'">'+f[1]+' · '+f[2]+'</button>'; }).join('')+'</div>';
    var rows=list.map(function(x){
      var st = x.status==='resolved' ? '<span class="tag tag-green">Resolved</span>' : x.status==='progress' ? '<span class="tag tag-ochre">In progress · '+esc(x.owner||'')+'</span>' : '<span class="tag" style="background:color-mix(in srgb,var(--warn,#B3261E) 14%,transparent);color:var(--warn,#B3261E)">Open · '+ageOf(x.createdAt)+'</span>';
      var notes=(x.notes||[]).map(function(nn){ return '<div class="small muted">· '+when(nn.at)+' '+esc(nn.by)+': '+esc(nn.text)+'</div>'; }).join('');
      var act = x.status==='resolved' ? '' : '<div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-top:.4rem">'+(x.status==='open'?'<button class="btn btn-ghost btn-sm" type="button" data-itake="'+x.id+'">Take it</button>':'')+'<input placeholder="Add a note or the resolution" data-inote="'+x.id+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px;min-width:12rem;flex:1"><button class="btn btn-ghost btn-sm" type="button" data-inoteadd="'+x.id+'">Add note</button><button class="btn btn-primary btn-sm" type="button" data-iresolve="'+x.id+'">Resolve</button></div>';
      return '<div class="card" style="display:grid;gap:.3rem;padding:.9rem 1rem"><div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><div><strong><a href="#order-'+x.offerId+'">'+esc(x.poRef)+'</a></strong> <span class="small muted">· '+esc(x.who)+' ('+esc(x.role)+') · '+when(x.createdAt)+'</span></div>'+st+'</div><div>'+esc(x.text)+'</div>'+notes+act+'</div>';
    }).join('');
    return card('Problems and reports', 'Everything members report on their orders, tracked until resolved. Take a case, add notes, resolve with a note; both parties see the state on the order page.', bar+(rows?'<div style="display:grid;gap:.5rem;margin-top:.5rem">'+rows+'</div>':'<div class="empty" style="margin-top:.5rem">Nothing here.</div>'));
  }
  $('adBody').addEventListener('click', async function(e){
    var f=e.target.closest('[data-ifilter]'); if(f){ issueFilter=f.dataset.ifilter; render(); return; }
    var tk=e.target.closest('[data-itake]'); if(tk){ tk.disabled=true; await BS.update('issues', tk.dataset.itake, {status:'progress', owner:staffName(), takenAt:new Date().toISOString()}); bsToast('Taken. The member sees it is in progress.'); return; }
    var na=e.target.closest('[data-inoteadd]'); if(na){ var x=data.issues.filter(function(i){ return i.id===na.dataset.inoteadd; })[0]; var inp=document.querySelector('[data-inote="'+na.dataset.inoteadd+'"]'); var text=inp?inp.value.trim():''; if(!x||!text) return; await BS.update('issues', x.id, {notes:(x.notes||[]).concat([{at:new Date().toISOString(), by:staffName(), text:text}]), status:x.status==='open'?'progress':x.status, owner:x.owner||staffName()}); return; }
    var r=e.target.closest('[data-iresolve]'); if(r){ var x2=data.issues.filter(function(i){ return i.id===r.dataset.iresolve; })[0]||{}; var note=(document.querySelector('[data-inote="'+r.dataset.iresolve+'"]')||{}).value||''; r.disabled=true; await BS.update('issues', r.dataset.iresolve, {status:'resolved', note:note, by:staffName(), owner:x2.owner||staffName(), resolvedAt:new Date().toISOString(), notes:(x2.notes||[]).concat(note?[{at:new Date().toISOString(), by:staffName(), text:'Resolved: '+note}]:[])}); bsToast('Resolved. Both parties are notified.'); return; }
  });
  /* ---- Suppliers: one shared record per supplier (collection `suppliers`); staff add, edit categories, dispatch point, status and prices, or remove ---- */
  var esId=null, esDraft=null, supSub='list';
  $('adBody').addEventListener('click', function(e){ var b=e.target.closest('[data-supsub]'); if(!b) return; supSub=b.dataset.supsub; render(); });
  function subOptions(sel){ return BS.SUBCITIES.map(function(x){ return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'; }).join(''); }
  function catTicks(prefix, chosen){ return '<div class="chips">'+CATS.map(function(c){ var on=chosen.indexOf(c)>=0; return '<label class="chip'+(on?' on':'')+'" style="cursor:pointer"><input type="checkbox" '+prefix+'="'+esc(c)+'"'+(on?' checked':'')+' style="margin:0 .3rem 0 0;accent-color:var(--green)">'+esc(c)+'</label>'; }).join('')+'</div>'; }
  function statusTag(st){ return st==='active'?'<span class="tag tag-green">Active</span>':st==='pending'?'<span class="tag tag-ochre">Pending approval</span>':st==='suspended'?'<span class="tag">Paused</span>':'<span class="tag">'+esc(st)+'</span>'; }
  var supQ='';
  function supplierListHtml(){
    var all=BS.suppliersAll().filter(function(x){ return !supQ || (x.name+' '+(x.cats||[]).join(' ')+' '+(x.sub||'')+' '+(x.phone||'')).toLowerCase().indexOf(supQ.toLowerCase())>=0; }).slice().sort(function(a,c){ return (a.status==='pending'?0:1)-(c.status==='pending'?0:1) || a.name.localeCompare(c.name); });
    return all.map(function(x){ var kind = x.own ? (x.source==='staff'?'added by staff':'registered on the site') : x.auto ? 'supplier' : 'supplier';
      return '<div class="doc"><span class="ico">'+(x.status==='active'?'OK':'·')+'</span><span><strong>'+esc(x.name)+'</strong><br><span class="small muted">'+esc((x.cats||[]).join(', ')||'no categories yet')+' · dispatch '+esc(x.sub||'')+(x.phone?' · '+fmtPhone(x.phone):'')+' · '+kind+(x.prices&&x.prices.length?' · '+x.prices.length+' price'+(x.prices.length===1?'':'s'):'')+'</span></span><span style="display:flex;gap:.3rem;align-items:center;flex-wrap:wrap">'+statusTag(x.status)+'<button class="btn btn-ghost btn-sm" type="button" data-esopen="'+esc(x.id)+'">Edit</button></span></div>'; }).join('');
  }
  function supplierAddCard(){
    return card('Add a supplier','A supplier you signed up by phone or in person. They sign in to the supplier portal with this mobile number and password, receive only the requests in their categories, and can keep their own price list. Documents can be added later from their portal.',
      '<div class="grid3"><div class="field"><label for="nsName">Company name</label><input id="nsName" placeholder="e.g. Kality Cement Distributors PLC"></div><div class="field"><label for="nsPhone">Mobile (their sign-in)</label><input id="nsPhone" type="tel" inputmode="numeric" placeholder="09…"></div><div class="field"><label for="nsTin">TIN</label><input id="nsTin" inputmode="numeric" placeholder="10 digits"></div></div>'+
      '<div class="grid3"><div class="field"><label for="nsSub">Dispatch point (sub-city)</label><select id="nsSub">'+subOptions('Akaki Kaliti')+'</select></div><div class="field"><label for="nsPw">Portal password</label><input id="nsPw" placeholder="They can change it later"></div><div class="field"><label for="nsStatus">Status</label><select id="nsStatus"><option value="active">Active: receives requests now</option><option value="pending">Pending: documents still to approve</option></select></div></div>'+
      '<div class="field"><label>What they supply</label>'+catTicks('data-nscat', [])+'</div>'+
      '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><button class="btn btn-primary btn-sm" type="button" id="nsAdd">Add supplier</button><span class="small muted" id="nsMsg"></span></div>');
  }
  function supplierEditCard(){
    var all=BS.suppliersAll(); var groups=[['Suppliers', all.filter(function(x){ return !x.own; })],['Registered or added on the site', all.filter(function(x){ return x.own; })]];
    var sel='<div class="field" style="max-width:30rem"><label for="esSel">Choose a supplier</label><select id="esSel"><option value="">Choose…</option>'+groups.map(function(g){ return g[1].length?'<optgroup label="'+esc(g[0])+'">'+g[1].map(function(x){ return '<option value="'+esc(x.id)+'"'+(x.id===esId?' selected':'')+'>'+esc(x.name)+(x.status!=='active'?' ('+x.status+')':'')+'</option>'; }).join('')+'</optgroup>':''; }).join('')+'</select></div>';
    var sp=all.filter(function(x){ return x.id===esId; })[0]; if(!sp) return card('Edit a supplier','Categories, dispatch point, status and the price list of any supplier. Prices you save here are what the supplier sees in the portal and what requests are pre-filled from.', sel);
    if(!esDraft || esDraft.id!==sp.id){ var pm={}; (sp.prices||[]).forEach(function(r){ pm[r.name]=r; }); esDraft={id:sp.id, name:sp.name, phone:sp.phone||'', tin:sp.tin||'', sub:sp.sub||'', status:sp.status||'active', cats:(sp.cats||[]).slice(), prices:pm, password:''}; }
    var d=esDraft; var items=BS.CATALOGUE.filter(function(c){ return !c.hidden && d.cats.indexOf(c.cat)>=0; });
    var byCat={}; items.forEach(function(c){ (byCat[c.cat]=byCat[c.cat]||[]).push(c); });
    var priceRows=Object.keys(byCat).map(function(c){ return '<div class="small muted" style="margin-top:.4rem;font-weight:600">'+esc(c)+'</div><table class="doctable" style="width:100%"><thead><tr><th>Item</th><th>Unit</th><th>Price (ETB)</th><th>Valid (days)</th><th>Stock</th></tr></thead><tbody>'+byCat[c].map(function(it){ var r=d.prices[it.name]||{}; return '<tr><td>'+esc(it.name)+'</td><td>'+esc(it.unit)+'</td><td><input data-esp="price" data-item="'+esc(it.name)+'" type="number" min="0" value="'+(r.price||'')+'" placeholder="'+(it.base||'')+'" style="width:7rem"></td><td><input data-esp="valid" data-item="'+esc(it.name)+'" type="number" min="1" value="'+(r.valid||3)+'" style="width:4.5rem"></td><td><select data-esp="stock" data-item="'+esc(it.name)+'">'+['In stock','Low stock','Out of stock'].map(function(o){ return '<option'+((r.stock||'In stock')===o?' selected':'')+'>'+o+'</option>'; }).join('')+'</select></td></tr>'; }).join('')+'</tbody></table>'; }).join('');
    var form='<div class="grid3"><div class="field"><label for="esName">Company name</label><input id="esName" value="'+esc(d.name)+'"></div><div class="field"><label for="esPhone">Mobile (sign-in)</label><input id="esPhone" value="'+esc(d.phone)+'"'+(sp.own?'':' disabled placeholder="set at registration"')+'></div><div class="field"><label for="esSub">Dispatch point (sub-city)</label><select id="esSub">'+subOptions(d.sub)+'</select></div></div>'+
      '<div class="grid3"><div class="field"><label for="esStatus">Status</label><select id="esStatus"><option value="active"'+(d.status==='active'?' selected':'')+'>Active: receives requests</option><option value="pending"'+(d.status==='pending'?' selected':'')+'>On hold: can sign in, cannot quote (documents or review)</option><option value="suspended"'+(d.status==='suspended'?' selected':'')+'>Blocked for now: cannot sign in or quote</option></select></div>'+(sp.own?'<div class="field"><label for="esPw">New portal password</label><input id="esPw" value="'+esc(d.password)+'" placeholder="Leave empty to keep the current one" autocomplete="off"></div><div class="field"><label for="esTin">TIN</label><input id="esTin" value="'+esc(d.tin)+'"></div>':'')+'</div>'+
      '<div class="field"><label>What they supply (tick to add a category; its items appear in the price list below)</label>'+catTicks('data-escat', d.cats)+'</div>'+
      '<div><strong style="font-family:var(--display)">Price list</strong><p class="small muted" style="margin:.1rem 0 .3rem">Leave a price empty for items they do not stock. Saving confirms every price for today; the supplier sees the same list in the portal.</p>'+(priceRows||'<div class="empty">Tick at least one category.</div>')+'</div>'+
      '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><button class="btn btn-primary btn-sm" type="button" id="esSave">Save supplier</button><button class="btn btn-ghost btn-sm" type="button" id="esCancel">Cancel</button><span style="flex:1"></span><button class="btn btn-ghost btn-sm" type="button" id="esRemove" style="color:#9b2c2c">Remove supplier</button><span class="small muted" id="esMsg"></span></div>';
    return card('Edit a supplier','Categories, dispatch point, status and the price list of any supplier. Prices you save here are what the supplier sees in the portal and what requests are pre-filled from.', sel+form);
  }
  function esRead(){ if(!esDraft) return; var d=esDraft; var g=function(id){ var el=$(id); return el?el.value:undefined; };
    if(g('esName')!==undefined) d.name=g('esName').trim(); if(g('esPhone')!==undefined && !$('esPhone').disabled) d.phone=digits(g('esPhone')); if(g('esSub')!==undefined) d.sub=g('esSub'); if(g('esStatus')!==undefined) d.status=g('esStatus'); if(g('esPw')!==undefined) d.password=g('esPw'); if(g('esTin')!==undefined) d.tin=g('esTin').trim();
    d.cats=[].slice.call(document.querySelectorAll('[data-escat]:checked')).map(function(i){ return i.dataset.escat; });
    document.querySelectorAll('[data-esp]').forEach(function(i){ var r=d.prices[i.dataset.item]=d.prices[i.dataset.item]||{}; r[i.dataset.esp]= i.dataset.esp==='stock' ? i.value : +i.value; }); }
  $('adBody').addEventListener('change', function(e){ if(e.target.id==='esSel'){ esId=e.target.value||null; esDraft=null; render(); return; } if(e.target.closest('[data-escat]')){ esRead(); render(); } });
  $('adBody').addEventListener('click', async function(e){
    var t=e.target; var op=t.closest('[data-esopen]'); if(op){ esId=op.dataset.esopen; esDraft=null; supSub='edit'; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
    if(t.id==='esCancel'){ esId=null; esDraft=null; supSub='list'; render(); return; }
    if(t.id==='esSave'){ esRead(); var d=esDraft; var sp=BS.suppliersAll().filter(function(x){ return x.id===d.id; })[0]; if(!sp) return; if(!d.name){ $('esMsg').textContent='The company needs a name.'; return; }
      var now=new Date().toISOString(); var prices=[]; BS.CATALOGUE.forEach(function(it){ if(d.cats.indexOf(it.cat)<0) return; var r=d.prices[it.name]; if(r && r.price>0) prices.push({name:it.name, unit:it.unit, price:+r.price, vat:'incl', min:0, stock:r.stock||'In stock', valid:+r.valid||3, confirmedAt:now}); });
      t.disabled=true; var id=sp.docId; var patch={name:d.name, cats:d.cats, sub:d.sub, status:d.status, prices:prices, setBy:staffName()}; if(sp.own){ if(d.phone!==(sp.phone||'') && !d.password){ t.disabled=false; bsToast('A new mobile number needs a new portal password too.'); return; } patch.phone=d.phone; patch.tin=d.tin; if(d.password){ patch.pwHash=await BS.hashPw(d.phone, d.password); patch.password=''; } }
      if(BS.supplierDoc(id)) await BS.update('suppliers', id, patch); else await BS.set('suppliers', id, Object.assign({seedId:sp.id, source:'seed'}, patch));
      esDraft=null; bsToast('Supplier saved. The portal and the requests use the new list now.'); render(); return; }
    if(t.id==='esRemove'){ var sp2=BS.suppliersAll().filter(function(x){ return x.id===esId; })[0]; if(!sp2) return; if(!(await bsConfirm('Remove '+sp2.name+'?','They stop receiving requests and cannot sign in. Orders already placed stay.','Remove'))) return;
      if(BS.supplierDoc(sp2.docId)) await BS.update('suppliers', sp2.docId, {status:'removed', removedAt:new Date().toISOString(), by:staffName()}); else await BS.set('suppliers', sp2.docId, {seedId:sp2.id, source:'seed', name:sp2.name, cats:sp2.cats, sub:sp2.sub, status:'removed', removedAt:new Date().toISOString(), by:staffName()});
      esId=null; esDraft=null; supSub='list'; bsToast('Supplier removed.'); render(); return; }
    if(t.id==='nsAdd'){ var name=$('nsName').value.trim(), ph=digits($('nsPhone').value), cats=[].slice.call(document.querySelectorAll('[data-nscat]:checked')).map(function(i){ return i.dataset.nscat; });
      if(!name){ $('nsMsg').textContent='The company needs a name.'; return; } if(!/^[97]\d{8}$/.test(ph)){ $('nsMsg').textContent='Enter their mobile number, for example 0912345678.'; return; } if(!cats.length){ $('nsMsg').textContent='Tick at least one category.'; return; } if($('nsPw').value.length<6){ $('nsMsg').textContent='Give them a portal password of at least 6 characters.'; return; }
      if(BS.suppliersAll().some(function(x){ return x.phone===ph; })){ $('nsMsg').textContent='A supplier with that number exists already; edit it above.'; return; }
      t.disabled=true; var nid=await BS.add('suppliers', {name:name, phone:ph, tin:$('nsTin').value.trim(), cats:cats, sub:$('nsSub').value, pwHash:await BS.hashPw(ph, $('nsPw').value), status:$('nsStatus').value, source:'staff', prices:[], setBy:staffName()});
      esId=nid; esDraft=null; supSub='edit'; bsToast('Supplier added. Set their prices below.'); render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  });
  $('adBody').addEventListener('input', function(e){ if(e.target.id!=='supSearch') return; supQ=e.target.value; var pos=e.target.selectionStart; render(); var el=$('supSearch'); if(el){ el.focus(); try{ el.setSelectionRange(pos,pos); }catch(err){} } });
  /* open a staff section from a link or the bell */
  window.bsAdminTab=function(t){ if(!isAdmin()) return; tab=({requests:'requests',suppliers:'suppliers',support:'support',members:'members',promos:'promos',finance:'finance',news:'news',brands:'brands',overview:'overview'})[t]||'overview'; if(!$('adPanel').hidden) render(); };
  function renderSupport(){
    var ts=threads(); var issuesHtml=renderIssues(); var w=ts.filter(function(t){ return t.waiting; }).length;
    var head='<div style="display:flex;justify-content:space-between;align-items:end;gap:.6rem;flex-wrap:wrap"><div><strong style="font-family:var(--display);font-size:1.05rem">Support inbox</strong><p class="small muted" style="margin:.1rem 0 0">Every message members send from their Mailbox, the help box or the supplier portal. Reply here; the member sees it in the Mailbox and gets an SMS.</p></div>'+(w?'<span class="tag tag-ochre">'+w+' waiting for an answer</span>':'<span class="tag">Nothing waiting</span>')+'</div>';
    var orderHtml=renderOrderChats();
    if(!ts.length) return '<section class="card" style="display:grid;gap:.6rem">'+head+'<div class="empty">No messages yet.</div></section>'+orderHtml+issuesHtml;
    return '<section class="card" style="display:grid;gap:.6rem">'+head+'</section>'+ts.map(function(t){
      var msgs=t.msgs.map(function(m){ return '<div class="msg '+(m.who==='staff'?'me':'')+'"><div class="t">'+(m.who==='staff'?(m.staff?esc(m.staff):'Auto-reply'):esc(t.name||'Member'))+' · '+when(m.createdAt)+'</div>'+esc(m.text)+'</div>'; }).join('');
      return '<section class="card" style="display:grid;gap:.6rem"><div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><div><strong style="font-family:var(--display)">'+esc(t.name||'Member')+'</strong> <span class="small muted">'+fmtPhone(t.phone)+'</span></div>'+(t.waiting?'<span class="tag tag-ochre">Waiting for an answer</span>':'<span class="tag tag-green">Answered</span>')+'</div><div class="chat" style="max-height:16rem;overflow:auto">'+msgs+'</div><div class="chat-in"><div class="field"><input placeholder="Reply as Build Smartly support…" data-reply="'+esc(t.phone)+'"></div><button class="btn btn-primary btn-sm" type="button" data-send="'+esc(t.phone)+'">Send</button></div></section>';
    }).join('')+orderHtml+issuesHtml;
  }
  function renderOrderChats(){
    var by={}; data.messages.forEach(function(m){ if(!m.orderId) return; (by[m.orderId]=by[m.orderId]||[]).push(m); });
    var ids=Object.keys(by); var intro='<div><strong style="font-family:var(--display);font-size:1.05rem">Conversations on orders</strong><p class="small muted" style="margin:.1rem 0 0">What buyers and suppliers write to each other on each purchase order. Staff can read every thread and answer on the order page.</p></div>';
    if(!ids.length) return '<section class="card" style="display:grid;gap:.6rem">'+intro+'<div class="empty">No conversations on orders yet.</div></section>';
    var rows=ids.map(function(id){ var ms=by[id].sort(function(a,c){ return (a.createdAt||'').localeCompare(c.createdAt||''); }); var o=data.offers.filter(function(x){ return x.id===id; })[0]||{}; var b=boqOf(o.boqId)||{}; return {id:id, ms:ms, o:o, b:b, last:ms[ms.length-1]}; }).sort(function(a,c){ return (c.last.createdAt||'').localeCompare(a.last.createdAt||''); });
    return '<section class="card" style="display:grid;gap:.6rem">'+intro+rows.map(function(r){ var o=r.o;
      var msgs=r.ms.map(function(m){ return '<div class="msg '+(m.who==='staff'?'me':'')+'"><div class="t">'+(m.who==='buyer'?esc(o.customerRevealed||r.b.company||'Buyer'):m.who==='supplier'?esc(o.supplierName||'Supplier'):'Build Smartly staff')+' · '+when(m.createdAt)+'</div>'+esc(m.text)+'</div>'; }).join('');
      return '<details class="card" style="padding:.7rem .9rem"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><span><strong style="font-family:var(--display)">'+esc(o.poRef||'Order')+'</strong> <span class="small muted">'+esc(o.customerRevealed||r.b.company||'Buyer')+' ↔ '+esc(o.supplierName||'Supplier')+' · '+esc(o.item||'')+'</span></span><span class="small muted">'+r.ms.length+' message'+(r.ms.length>1?'s':'')+' · last '+when(r.last.createdAt)+'</span></summary><div class="chat" style="margin-top:.6rem">'+msgs+'</div><div style="margin-top:.5rem"><a class="btn btn-ghost btn-sm" href="#order-'+esc(r.id)+'">Open the order and reply</a></div></details>';
    }).join('')+'</section>';
  }
  /* Promotions: the slides on the home page, in every workspace and on the newsletter page. Collection `promotions`; the four example banners can be hidden (settings doc `ads`). */
  var promoEditing=null, promoPic='';
  var PLACES={all:'Everywhere', home:'Home page only', workspace:'Members\' workspace only', newsletter:'Newsletter page only'};
  function renderPromos(){
    var list=(data.promotions||[]).slice().sort(function(a,c){ return (c.createdAt||'').localeCompare(a.createdAt||''); });
    var ed=promoEditing ? list.filter(function(x){ return x.id===promoEditing; })[0] : null; var v=function(k){ return esc(ed?ed[k]||'':''); };
    var form='<div class="grid3"><div class="field"><label for="prCompany">Company or brand</label><input id="prCompany" value="'+v('company')+'" placeholder="e.g. Dangote Cement"></div><div class="field"><label for="prWho">Who is it</label><select id="prWho">'+['Brand','Supplier','Contractor','Partner'].map(function(w){ return '<option'+(ed&&ed.who===w?' selected':'')+'>'+w+'</option>'; }).join('')+'</select></div><div class="field"><label for="prPlace">Where it shows</label><select id="prPlace">'+Object.keys(PLACES).map(function(k){ return '<option value="'+k+'"'+(ed&&ed.placement===k?' selected':'')+'>'+PLACES[k]+'</option>'; }).join('')+'</select></div></div>'+
      '<div class="field"><label for="prTitle">Headline on the slide</label><input id="prTitle" maxlength="90" value="'+v('title')+'" placeholder="e.g. OPC 42.5 in stock at Kality, 48-hour delivery"></div>'+
      '<div class="grid3"><div class="field"><label for="prLink">Link when tapped (optional)</label><input id="prLink" value="'+v('link')+'" placeholder="#members or https://…"></div><div class="field"><label for="prUntil">Show until (optional)</label><input id="prUntil" type="date" value="'+v('until')+'"></div><div class="field"><label>Picture (3:1 works best)</label><label class="btn btn-ghost btn-sm" style="cursor:pointer;justify-self:start">Choose a picture<input type="file" accept="image/*" hidden id="prPic"></label></div></div>'+
      '<img id="prPicPrev" alt="" '+((promoPic||(ed&&ed.img))?'src="'+(promoPic||ed.img)+'"':'hidden')+' style="width:100%;max-width:36rem;aspect-ratio:3/1;object-fit:cover;border-radius:12px">'+
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center"><button class="btn btn-primary btn-sm" type="button" id="prSave">'+(ed?'Save changes':'Add to the slideshow')+'</button>'+(ed?'<button class="btn btn-ghost btn-sm" type="button" id="prCancel">Cancel</button>':'')+'<span class="small muted" id="prMsg"></span></div>';
    var rows=list.length?list.map(function(x){ var off=x.active===false || (x.until && x.until<new Date().toISOString().slice(0,10)); return '<div class="doc" style="grid-template-columns:9rem 1fr auto;'+(off?'opacity:.55':'')+'"><img src="'+esc(x.img||'')+'" alt="" style="width:9rem;aspect-ratio:3/1;object-fit:cover;border-radius:8px;background:var(--bg-2)"><span><strong>'+esc(x.company)+'</strong> <span class="tag">'+esc(x.who||'Partner')+'</span><br><span class="small">'+esc(x.title)+'</span><br><span class="small muted">'+esc(PLACES[x.placement]||PLACES.all)+(x.until?' · until '+esc(x.until):'')+(x.setBy?' · added by '+esc(x.setBy):'')+(off?' · not showing':'')+'</span></span><span style="display:flex;gap:.3rem;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" type="button" data-pedit="'+esc(x.id)+'">Edit</button><button class="btn btn-ghost btn-sm" type="button" data-ptoggle="'+esc(x.id)+'">'+(x.active===false?'Show':'Pause')+'</button><button class="btn btn-ghost btn-sm" type="button" data-pdel="'+esc(x.id)+'">Delete</button></span></div>'; }).join(''):'<div class="empty">No promotions added yet. The examples below show until you add real ones.</div>';
    var news=data.news.filter(function(x){ return x.status==='published' && x.img; });
    var newsRows=news.length?news.map(function(x){ return '<div class="doc" style="grid-template-columns:9rem 1fr auto"><img src="'+esc(x.img)+'" alt="" style="width:9rem;aspect-ratio:3/1;object-fit:cover;border-radius:8px"><span><strong>'+esc(x.company)+'</strong><br><span class="small">'+esc(x.title)+'</span><br><span class="small muted">From the newsletter · shows everywhere</span></span><button class="btn btn-ghost btn-sm" type="button" data-pnewsrm="'+esc(x.id)+'">Remove from slides</button></div>'; }).join(''):'';
    var ex=BS.ADS.map(function(a){ var hid=(BS.ADS_HIDDEN||[]).indexOf(a.key)>=0; return '<div class="doc" style="grid-template-columns:9rem 1fr auto;'+(hid?'opacity:.55':'')+'"><img src="'+esc((BS.PICS&&BS.PICS[a.key])||a.img)+'" alt="" style="width:9rem;aspect-ratio:3/1;object-fit:cover;border-radius:8px"><span><strong>'+esc(a.company)+'</strong> <span class="tag">'+esc(a.who)+'</span><br><span class="small">'+esc(a.title)+'</span><br><span class="small muted">Example banner'+(hid?' · hidden':'')+'</span></span><button class="btn btn-ghost btn-sm" type="button" data-pex="'+esc(a.key)+'">'+(hid?'Show':'Hide')+'</button></div>'; }).join('');
    var reqs=data.news.filter(function(x){ return x.status==='pending'; }).sort(function(a,c){ return (c.createdAt||'').localeCompare(a.createdAt||''); });
    var reqHtml=reqs.length ? reqs.map(function(x){ return '<div class="card" style="display:grid;gap:.5rem;border-color:var(--ochre)"><div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><span><strong>'+esc(x.company||'')+'</strong> <span class="small muted">'+esc(x.who||'')+' · '+esc(x.kindLabel||x.kind||'')+' · '+fmtPhone(x.phone)+' · '+when(x.createdAt)+'</span></span><span class="tag tag-ochre">Waiting for approval</span></div>'+(x.img?'<img src="'+x.img+'" alt="" style="width:100%;max-width:36rem;aspect-ratio:3/1;object-fit:cover;border-radius:10px">':'<span class="small muted">No picture: newsletter text only.</span>')+'<strong>'+esc(x.title||'')+'</strong><p style="margin:0">'+esc(x.text||'')+'</p><div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center"><button class="btn btn-primary btn-sm" type="button" data-publish="'+x.id+'">Approve and publish</button><input placeholder="Reason, if you reject" data-nreason="'+x.id+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px"><button class="btn btn-ghost btn-sm" type="button" data-nreject="'+x.id+'">Reject</button></div></div>'; }).join('') : '<div class="empty">No requests waiting.</div>';
    return card('Requests to advertise · '+reqs.length, 'Sent from the Newsletter page by brands, suppliers and contractors.', reqHtml)+card(ed?'Edit promotion':'Add a promotion', 'A slide with the picture, the company and one headline. It appears within seconds on the home page, in every member\'s workspace and on the newsletter page. Brands, suppliers and contractors who pay for a slide are set up here.', form)+
      card('Current promotions', 'Edit the text, pause, or delete when the paid period ends.', rows)+
      (newsRows?card('Newsletter items with a picture', 'Published newsletter items that carry a picture are also slides.', newsRows):'')+
      card('Standard banners', 'Shown until real promotions are added. Hide any you do not want.', ex);
  }
  $('adBody').addEventListener('change', async function(e){ if(e.target.id!=='prPic') return; var f=e.target.files&&e.target.files[0]; if(!f) return; try{ promoPic=await fitPicture(f, 1200, 400); var pv=$('prPicPrev'); pv.src=promoPic; pv.hidden=false; }catch(err){ $('prMsg').textContent='That file could not be read. Use a JPG or PNG.'; } });
  $('adBody').addEventListener('click', async function(e){
    var t=e.target;
    if(t.id==='prSave'){ var company=$('prCompany').value.trim(), title=$('prTitle').value.trim(); var ed=promoEditing ? (data.promotions||[]).filter(function(x){ return x.id===promoEditing; })[0] : null; var img=promoPic||(ed&&ed.img)||'';
      if(!company||!title){ $('prMsg').textContent='Company and headline are needed.'; return; } if(!img){ $('prMsg').textContent='Choose a picture for the slide.'; return; }
      t.disabled=true; var doc={company:company, who:$('prWho').value, title:title, placement:$('prPlace').value, link:$('prLink').value.trim(), until:$('prUntil').value, img:img, setBy:staffName()};
      if(ed){ await BS.update('promotions', ed.id, doc); bsToast('Promotion updated on every device.'); } else { doc.active=true; await BS.add('promotions', doc); bsToast('Added. It is in the slideshow now.'); }
      promoEditing=null; promoPic=''; render(); return; }
    if(t.id==='prCancel'){ promoEditing=null; promoPic=''; render(); return; }
    var pe=t.closest('[data-pedit]'); if(pe){ promoEditing=pe.dataset.pedit; promoPic=''; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
    var pt=t.closest('[data-ptoggle]'); if(pt){ var x=(data.promotions||[]).filter(function(y){ return y.id===pt.dataset.ptoggle; })[0]; if(x){ await BS.update('promotions', x.id, {active: x.active===false}); } return; }
    var pd=t.closest('[data-pdel]'); if(pd){ if(!(await bsConfirm('Delete this promotion?','It disappears from the slideshow on every device.','Delete'))) return; await BS.remove('promotions', pd.dataset.pdel); bsToast('Deleted.'); return; }
    var pn=t.closest('[data-pnewsrm]'); if(pn){ await BS.update('news', pn.dataset.pnewsrm, {img:''}); bsToast('Removed from the slides. The newsletter text stays.'); return; }
    var px=t.closest('[data-pex]'); if(px){ var hid=(BS.ADS_HIDDEN||[]).slice(); var k=px.dataset.pex; if(hid.indexOf(k)>=0) hid=hid.filter(function(z){ return z!==k; }); else hid.push(k); await BS.set('settings','ads',{hidden:hid, setBy:staffName()}); return; }
  });
  async function sendReply(phone){ var inp=document.querySelector('[data-reply="'+phone+'"]'); var text=inp?inp.value.trim():''; if(!text) return; inp.value=''; await BS.add('messages', {phone:phone, who:'staff', staff:staffName(), text:text}); bsToast('Sent. The member sees it in the Mailbox and gets an SMS.'); }
  $('adBody').addEventListener('click', function(e){ var b=e.target.closest('[data-send]'); if(b) sendReply(b.dataset.send); });
  $('adBody').addEventListener('keydown', function(e){ var i=e.target.closest('[data-reply]'); if(i && e.key==='Enter'){ e.preventDefault(); sendReply(i.dataset.reply); } });

  var adNwPicData='';
  $('adBody').addEventListener('change', async function(e){ if(e.target.id!=='adNwPic') return; var f=e.target.files&&e.target.files[0]; if(!f) return; try{ adNwPicData=await fitPicture(f, 1200, 400); $('adNwPicMsg').textContent='Picture ready: '+f.name; }catch(err){ $('adNwPicMsg').textContent='That file could not be read.'; } });
  var nwEdit=null, neImg='';
  $('adBody').addEventListener('change', async function(e){ if(e.target.id!=='neImg') return; var f=e.target.files&&e.target.files[0]; if(!f) return; neImg=await fitPicture(f, 1200, 400); render(); });
  $('adBody').addEventListener('click', async function(e){
    var ed=e.target.closest('[data-nedit]'); if(ed){ nwEdit=ed.dataset.nedit; neImg=''; render(); return; }
    if(e.target.closest('[data-necancel]')){ nwEdit=null; neImg=''; render(); return; }
    var sv=e.target.closest('[data-nesave]'); if(sv){ var patch={editedBy:staffName(), editedAt:new Date().toISOString()}; document.querySelectorAll('[data-ne]').forEach(function(i){ patch[i.dataset.ne]=i.value.trim(); }); if(neImg) patch.img=neImg; await BS.update('news', sv.dataset.nesave, patch); nwEdit=null; neImg=''; bsToast('Saved. Members see the new version.'); return; }
    var ir=e.target.closest('[data-neimgrm]'); if(ir){ await BS.update('news', ir.dataset.neimgrm, {img:''}); bsToast('Picture removed; the item is no longer in the slideshow.'); return; }
  });
  function renderNews(){
    var pend=data.news.filter(function(x){ return x.status==='pending'; }), pub=data.news.filter(function(x){ return x.status==='published'; }).sort(function(a,c){ return (c.createdAt||'').localeCompare(a.createdAt||''); });
    var KIND={news:'Newsletter item', feature:'Featured supplier', pulse:'Price pulse tile', banner:'Member banner', directory:'Directory highlight', platform:'From Build Smartly'};
    var item=function(x, actions){ if(nwEdit===x.id) return '<div class="doc" style="grid-template-columns:1fr;gap:.5rem"><div class="grid3"><div class="field"><label>Company</label><input data-ne="company" value="'+esc(x.company)+'"></div><div class="field"><label>Headline</label><input data-ne="title" value="'+esc(x.title)+'"></div><div class="field"><label>Link when the banner is tapped (optional)</label><input data-ne="link" value="'+esc(x.link||'')+'" placeholder="www.company.com"></div><div class="field"><label>New picture (optional)</label><label class="btn btn-ghost btn-sm" style="cursor:pointer;justify-self:start">Choose<input type="file" accept="image/*" hidden id="neImg"></label></div></div><div class="field"><label>Text</label><textarea data-ne="text" rows="3" style="font:inherit;padding:.5rem;border:1.5px solid var(--line);border-radius:10px">'+esc(x.text)+'</textarea></div>'+((neImg||x.img)?'<img src="'+(neImg||x.img)+'" alt="" style="width:100%;max-width:30rem;aspect-ratio:3/1;object-fit:cover;border-radius:8px">':'')+'<div style="display:flex;gap:.4rem"><button class="btn btn-primary btn-sm" type="button" data-nesave="'+x.id+'">Save changes</button><button class="btn btn-ghost btn-sm" type="button" data-necancel>Cancel</button>'+(x.img?'<button class="btn btn-ghost btn-sm" type="button" data-neimgrm="'+x.id+'">Remove picture</button>':'')+'</div></div>';
      return '<div class="doc" style="grid-template-columns:'+(x.img?'12rem ':'')+'1fr auto">'+(x.img?'<img src="'+x.img+'" alt="" style="width:12rem;aspect-ratio:3/1;object-fit:cover;border-radius:6px">':'')+'<span><span class="tag '+(x.kind==='platform'?'tag-green':'tag-ochre')+'">'+esc(KIND[x.kind]||x.kind)+'</span> <span class="small muted">'+esc(x.who||'')+(x.who?' · ':'')+esc(x.company)+' · '+fmtPhone(x.phone)+' · '+when(x.createdAt)+(x.issue?' · '+esc(x.issue):'')+'</span><br><strong>'+esc(x.title)+'</strong><br><span class="small">'+esc(x.text)+'</span></span><span style="display:flex;gap:.4rem;flex-wrap:wrap">'+actions+'</span></div>'; };
    return card('Items to check', 'Check the text (no phone numbers, addresses or prices), then publish. Finance invoices the placement.', pend.length? '<div class="docs">'+pend.map(function(x){ return item(x, '<button class="btn btn-primary btn-sm" type="button" data-publish="'+x.id+'">Publish</button><button class="btn btn-ghost btn-sm" type="button" data-unpublish="'+x.id+'">Reject</button>'); }).join('')+'</div>' : '<div class="empty">Nothing pending.</div>')+
      card('Write an item or set up a banner','Platform news, or a banner for a brand, a supplier or a contractor who asked you to set it up. With a picture it also appears in the slideshow on the home page and in every workspace.','<div class="grid3"><div class="field"><label for="adNwWho">On behalf of</label><select id="adNwWho"><option>Build Smartly</option><option>Brand or manufacturer</option><option>Supplier</option><option>Contractor or developer</option></select></div><div class="field"><label for="adNwCompany">Company or brand</label><input id="adNwCompany" placeholder="e.g. Dangote Cement Ethiopia" value="Build Smartly"></div><div class="field"><label for="adNwKind">Placement</label><select id="adNwKind"><option value="platform">Platform notice</option><option value="news">Newsletter item</option><option value="feature">Featured supplier</option></select></div></div><div class="field"><label for="adNwTitle">Headline</label><input id="adNwTitle" maxlength="90"></div><div class="field"><label for="adNwLink">Link when the banner is tapped (optional)</label><input id="adNwLink" placeholder="www.company.com"></div><div class="field"><label for="adNwText">Text</label><textarea id="adNwText" rows="2" maxlength="300" style="font:inherit;font-size:.95rem;padding:.6rem;border:1.5px solid var(--line);border-radius:10px;background:var(--white);color:var(--fg);width:100%"></textarea></div><div class="field"><label>Banner picture (optional, 3:1 works best)</label><div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap"><label class="btn btn-ghost btn-sm" style="cursor:pointer">Choose a picture<input type="file" accept="image/*" hidden id="adNwPic"></label><span class="small muted" id="adNwPicMsg">'+(adNwPicData?'Picture ready.':'No picture yet.')+'</span></div></div><div><button class="btn btn-primary btn-sm" type="button" id="adNwSend">Publish in the '+issueLabel()+' issue</button></div>')+
      card('Published · '+issueLabel(),'What members see under Newsletter, on top of the example issue.', pub.length? '<div class="docs">'+pub.map(function(x){ return item(x, '<button class="btn btn-ghost btn-sm" type="button" data-nedit="'+x.id+'">Edit</button><button class="btn btn-ghost btn-sm" type="button" data-unpublish="'+x.id+'">Take down</button>'); }).join('')+'</div>' : '<div class="empty">Nothing published yet.</div>');
  }
  $('adBody').addEventListener('click', async function(e){
    var nr=e.target.closest('[data-nreject]'); if(nr){ var why=(document.querySelector('[data-nreason="'+nr.dataset.nreject+'"]')||{}).value||'Does not follow the advertising rules'; await BS.update('news', nr.dataset.nreject, {status:'rejected', reason:why, by:staffName(), reviewedAt:new Date().toISOString()}); bsToast('Rejected. The sender is told why.'); return; }
    var p=e.target.closest('[data-publish]'); if(p){ p.disabled=true; await BS.update('news', p.dataset.publish, {status:'published', issue:issueLabel(), publishedAt:new Date().toISOString(), by:staffName()}); bsToast('Published. Members see it under Newsletter.'); return; }
    var u=e.target.closest('[data-unpublish]'); if(u){ if(!(await bsConfirm('Take this item down?','It disappears from the newsletter and the slideshow.','Take it down'))) return; await BS.update('news', u.dataset.unpublish, {status:'taken down', by:staffName()}); bsToast('Taken down.'); return; }
    if(e.target.id==='adNwSend'){ var t=$('adNwTitle').value.trim(), x=$('adNwText').value.trim(), co=$('adNwCompany').value.trim()||'Build Smartly', who=$('adNwWho').value, kind=$('adNwKind').value; if(!t||!x){ bsToast('Headline and text are needed.'); return; } e.target.disabled=true; await BS.add('news', {company:co, who:who==='Build Smartly'?'Build Smartly':who, kind:kind, title:t, text:x, link:($('adNwLink')||{}).value?$('adNwLink').value.trim():'', img:adNwPicData||'', phone:'', status:'published', issue:issueLabel(), by:staffName()}); adNwPicData=''; bsToast('Published.'+(x&&adNwPicData===''?'':'')); }
  });

  /* member profiles: everything the member sent, pictures included; approve to publish, reject with a reason */
  function renderMembers(){
    var list=data.profiles.slice().sort(function(a,c){ return (a.status==='pending'?0:1)-(c.status==='pending'?0:1) || (c.updatedAt||'').localeCompare(a.updatedAt||''); });
    var one=function(p){ var st=p.status||'pending';
      return '<div class="card" style="display:grid;gap:.5rem;'+(st==='pending'?'border-color:var(--ochre)':'')+'"><div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><span><strong>'+esc(p.name||'?')+'</strong> <span class="small muted">'+(p.kind==='supplier'?'Supplier':'Buyer')+' · '+fmtPhone(p.phone)+' · '+when(p.updatedAt||p.createdAt)+'</span></span>'+(st==='pending'?'<span class="tag tag-ochre">Waiting for approval</span>':st==='approved'?'<span class="tag tag-green">Published</span>':st==='rejected'?'<span class="tag">Rejected</span>':'<span class="tag">Hidden</span>')+'</div>'+
        (p.cats&&p.cats.length?'<div class="small">Supplies: '+esc(p.cats.join(', '))+'</div>':'')+'<p style="margin:0">'+esc(p.intro||'(no introduction)')+'</p>'+
        ((p.pics||[]).length?'<div style="display:flex;gap:.4rem;flex-wrap:wrap">'+p.pics.map(function(u){ return '<img src="'+u+'" alt="" style="width:9rem;aspect-ratio:4/3;object-fit:cover;border-radius:8px">'; }).join('')+'</div>':'')+
        (p.reason?'<div class="small muted">Reason given: '+esc(p.reason)+'</div>':'')+
        '<div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">'+(st!=='approved'?'<button class="btn btn-primary btn-sm" type="button" data-papprove="'+p.id+'">Approve and publish</button>':'<button class="btn btn-ghost btn-sm" type="button" data-hide="'+p.id+'">Hide</button>')+(st==='pending'?'<input placeholder="Reason, if you reject" data-preason="'+p.id+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px"><button class="btn btn-ghost btn-sm" type="button" data-preject="'+p.id+'">Reject</button>':'')+'</div></div>'; };
    var pend=list.filter(function(p){ return (p.status||'pending')==='pending'; }), rest=list.filter(function(p){ return (p.status||'pending')!=='pending'; });
    return card('Profiles to approve · '+pend.length, 'Check text and pictures: no phone numbers, addresses or prices.', pend.length?pend.map(one).join(''):'<div class="empty">Nothing to approve.</div>')+card('All member profiles','', rest.length?rest.map(one).join(''):'<div class="empty">None yet.</div>')+(list.length?'':card('How a profile gets here','',
      '<p class="small">A company writes its public profile in its own account, ticks <strong>Publish</strong> and saves. It then waits here for approval and, once approved, shows on the Members page.</p><p class="small"><strong>To test:</strong> sign in as the buyer 0911 000 201, open <strong>Settings</strong> in the account, write a short introduction, add a picture if you like, tick <strong>Publish in the Members directory</strong> and save. Suppliers do the same under <strong>Settings</strong> in the supplier portal.</p>'));
  }
  $('adBody').addEventListener('click', async function(e){
    var ap=e.target.closest('[data-papprove]'); if(ap){ await BS.update('profiles', ap.dataset.papprove, {status:'approved', reviewedAt:new Date().toISOString(), by:staffName(), reason:''}); bsToast('Published in the Members directory. The member is told.'); return; }
    var rj=e.target.closest('[data-preject]'); if(rj){ var r=(document.querySelector('[data-preason="'+rj.dataset.preject+'"]')||{}).value||'Does not follow the profile rules'; await BS.update('profiles', rj.dataset.preject, {status:'rejected', reason:r, reviewedAt:new Date().toISOString(), by:staffName()}); bsToast('Rejected. The member is told why.'); return; }
    var h=e.target.closest('[data-hide]'); if(h){ await BS.update('profiles', h.dataset.hide, {status:'hidden', by:staffName()}); bsToast('Hidden from the directory.'); return; }
  });

  function renderFinance(){
    var rows=paid(), goods=0, fees=0;
    var html=rows.map(function(o){ var b=boqOf(o.boqId)||{}; var t=offerTotal(o), f=Math.round(t*BS.FEE_RATE); goods+=t; fees+=f; return '<tr><td>'+when(o.paidAt)+'</td><td><a href="#order-'+o.id+'">'+esc(o.poRef)+'</a></td><td>'+esc(b.company||o.customerRevealed||'')+'</td><td>'+esc(o.supplierName)+'</td><td style="text-align:right">'+BS.fmt(t)+'</td><td style="text-align:right">'+BS.fmt(f)+'</td><td>'+esc(o.paymentRef||'')+'</td></tr>'; }).join('');
    var inprog=data.offers.filter(function(o){ return o.status==='accepted' && !o.paidAt; });
    return card('Completed sales and fees','Fee '+BS.pct(BS.FEE_RATE)+' of each paid order. Settled with the supplier when the gateway confirms.',
      (rows.length? '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.9rem"><thead><tr style="text-align:left;color:var(--fg-2)"><th>Paid</th><th>PO</th><th>Buyer</th><th>Supplier</th><th style="text-align:right">Order value</th><th style="text-align:right">Fee</th><th>Payment ref</th></tr></thead><tbody>'+html+'</tbody><tfoot><tr style="font-weight:700"><td colspan="4">Total · '+rows.length+' orders</td><td style="text-align:right">'+BS.fmt(goods)+'</td><td style="text-align:right">'+BS.fmt(fees)+'</td><td></td></tr></tfoot></table></div><div><button class="btn btn-ghost btn-sm" type="button" id="adCsv">Download as CSV</button></div>' : '<div class="empty">No paid orders yet.</div>'))+
      card('Orders in progress','Accepted, not yet paid.', inprog.length? '<div class="docs">'+inprog.map(function(o){ var b=boqOf(o.boqId)||{}; return '<div class="doc"><span class="ico">PO</span><span><strong><a href="#order-'+o.id+'">'+esc(o.poRef)+'</a></strong> · '+esc(b.company||'')+' ← '+esc(o.supplierName)+' · '+BS.fmt(offerTotal(o))+'</span><span class="tag">'+(o.deliveredAt?'Delivered, payment due':o.dispatchedAt?'On the way':o.readyAt?'Goods ready':o.contractAt?'Contract in force':o.supplierConfirmed?'Awaiting buyer agreement':'Awaiting reconfirmation')+'</span></div>'; }).join('')+'</div>' : '<div class="empty">None.</div>');
  }
  $('adBody').addEventListener('click', function(e){
    if(e.target.id!=='adCsv') return;
    var lines=[['Paid','PO','Buyer','Supplier','Order value ETB','Fee ETB','Payment ref']];
    paid().forEach(function(o){ var b=boqOf(o.boqId)||{}; var t=offerTotal(o); lines.push([o.paidAt, o.poRef, b.company||'', o.supplierName, t, Math.round(t*BS.FEE_RATE), o.paymentRef||'']); });
    var csv=lines.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
    var a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='build-smartly-fees.csv'; document.body.appendChild(a); a.click(); a.remove();
  });

  /* ---- Insights: market data from the platform's own records, for the owner and for sales conversations ---- */
  function median(arr){ if(!arr.length) return 0; var a=arr.slice().sort(function(x,y){return x-y;}); var m=Math.floor(a.length/2); return a.length%2 ? a[m] : (a[m-1]+a[m])/2; }
  function bar(v, max, color){ var w=max? Math.round(100*v/max):0; return '<span style="display:inline-block;height:.55rem;width:'+w+'%;min-width:2px;background:'+(color||'var(--green)')+';border-radius:3px;vertical-align:middle"></span>'; }
  function insights(){
    var since=Date.now()-30*86400000, boqs=data.boqs, offers=data.offers;
    var buyers={}, cats={}, items={}, subs={}, sups={}, lines=0, goods=0;
    boqs.forEach(function(b){ buyers[b.ownerPhone||b.company]=1; subs[b.subcity]=(subs[b.subcity]||0)+1;
      (b.lines||[]).forEach(function(l){ lines++; var c=l.cat||'Other'; var v=BS.goodsValue([l]); goods+=v; var C=cats[c]=cats[c]||{lines:0, qty:0, value:0, offers:0, accepted:0, paid:0, paidValue:0, unit:''}; C.lines++; C.value+=v;
        var I=items[l.item]=items[l.item]||{cat:c, unit:l.unit, qty:0, lines:0, prices:[], recent:[], older:[]}; I.lines++; I.qty+=(+l.qty||0); if(l.unit===I.unit) C.qty+=(+l.qty||0); }); });
    offers.forEach(function(o){ var b=boqOf(o.boqId); var l=lineOf(b,o.lineN); if(!l) return; var c=l.cat||'Other'; var C=cats[c]; if(C){ C.offers++; if(o.status==='accepted'){ C.accepted++; } if(o.paidAt){ C.paid++; C.paidValue+=offerTotal(o); } }
      var I=items[l.item]; if(I && o.unitPrice>0){ I.prices.push(o.unitPrice); (new Date(o.createdAt).getTime()>=since ? I.recent : I.older).push(o.unitPrice); }
      var S=sups[o.supplierId]=sups[o.supplierId]||{name:o.supplierName, sent:0, won:0, paid:0, value:0, hours:[]}; S.sent++; if(o.status==='accepted') S.won++; if(o.paidAt){ S.paid++; S.value+=offerTotal(o); } if(b && b.createdAt && o.createdAt) S.hours.push((new Date(o.createdAt)-new Date(b.createdAt))/3600000); });
    var withOffers=boqs.filter(function(b){ return offers.some(function(o){ return o.boqId===b.id; }); }).length;
    var withAccepted=boqs.filter(function(b){ return offers.some(function(o){ return o.boqId===b.id && o.status==='accepted'; }); }).length;
    var withPaid=boqs.filter(function(b){ return offers.some(function(o){ return o.boqId===b.id && o.paidAt; }); }).length;
    var paidValue=0; paid().forEach(function(o){ paidValue+=offerTotal(o); });
    return { requests:boqs.length, lines:lines, buyers:Object.keys(buyers).length, suppliers:Object.keys(sups).length, goods:goods, paidValue:paidValue, cats:cats, items:items, subs:subs, sups:sups, funnel:[['Requests sent',boqs.length],['Received offers',withOffers],['Accepted an offer',withAccepted],['Paid',withPaid]], members:data.profiles.length+BS.SUPPLIERS.length+BS.TEST_ACCOUNTS.filter(function(a){return a.buyer;}).length };
  }
  function renderInsights(){
    var x=insights(); if(!x.requests) return card('Insights','Market data from the platform\'s own records.','<div class="empty">No requests yet. Insights fill up as buyers send requests and suppliers quote.</div>');
    var catKeys=Object.keys(x.cats).sort(function(a,b){ return x.cats[b].value-x.cats[a].value; }); var maxV=x.cats[catKeys[0]].value;
    var head='<div class="queue">'+[[x.requests,'Requests'],[x.lines,'Lines requested'],[BS.fmt(x.goods),'Demand at list prices'],[BS.fmt(x.paidValue),'Paid through the platform'],[x.buyers,'Buying companies'],[x.suppliers,'Suppliers who quoted'],[x.members,'Members reached by the newsletter'],[Object.keys(x.subs).length,'Sub-cities with demand']].map(function(t){ return '<div class="q"><strong style="font-size:1.3rem">'+t[0]+'</strong><span class="small muted">'+t[1]+'</span></div>'; }).join('')+'</div>';
    var fmax=x.funnel[0][1]; var funnel='<div style="display:grid;gap:.4rem">'+x.funnel.map(function(f){ return '<div style="display:grid;grid-template-columns:11rem 1fr 4rem;gap:.6rem;align-items:center"><span class="small">'+f[0]+'</span>'+bar(f[1],fmax,'var(--ochre)')+'<strong class="small" style="text-align:right">'+f[1]+(fmax?' · '+Math.round(100*f[1]/fmax)+' %':'')+'</strong></div>'; }).join('')+'</div>';
    var catRows=catKeys.map(function(c){ var C=x.cats[c]; return '<tr><td>'+esc(c)+'</td><td style="text-align:right">'+C.lines+'</td><td style="text-align:right">'+BS.fmt(C.value)+'</td><td>'+bar(C.value,maxV)+'</td><td style="text-align:right">'+(C.lines?(C.offers/C.lines).toFixed(1):'0')+'</td><td style="text-align:right">'+C.accepted+'</td><td style="text-align:right">'+BS.fmt(C.paidValue)+'</td></tr>'; }).join('');
    var itemKeys=Object.keys(x.items).filter(function(k){ return x.items[k].prices.length; }).sort(function(a,b){ return x.items[b].prices.length-x.items[a].prices.length; });
    var priceRows=itemKeys.map(function(k){ var I=x.items[k]; var med=median(I.prices), lo=Math.min.apply(null,I.prices), hi=Math.max.apply(null,I.prices); var ch = (I.recent.length && I.older.length) ? Math.round(1000*(median(I.recent)-median(I.older))/median(I.older))/10 : null; var base=BS.baseOf(k)||0; return '<tr><td>'+esc(k)+'<br><span class="small muted">'+esc(I.cat)+'</span></td><td>'+esc(I.unit)+'</td><td style="text-align:right">'+I.qty.toLocaleString('en-US')+'</td><td style="text-align:right">'+I.prices.length+'</td><td style="text-align:right"><strong>'+BS.fmt(med)+'</strong></td><td style="text-align:right">'+BS.fmt(lo)+' – '+BS.fmt(hi)+'</td><td style="text-align:right">'+(ch===null?'<span class="muted">–</span>':(ch>0?'+':'')+ch+' %')+'</td><td style="text-align:right">'+(base?(med<base?'<span style="color:var(--ok)">'+Math.round(100*(base-med)/base)+' % below list</span>':'<span class="muted">at list</span>'):'')+'</td></tr>'; }).join('');
    var subKeys=Object.keys(x.subs).sort(function(a,b){ return x.subs[b]-x.subs[a]; }); var smax=x.subs[subKeys[0]]||1;
    var subRows=subKeys.map(function(k){ return '<div style="display:grid;grid-template-columns:9rem 1fr 3rem;gap:.6rem;align-items:center"><span class="small">'+esc(k)+'</span>'+bar(x.subs[k],smax)+'<strong class="small" style="text-align:right">'+x.subs[k]+'</strong></div>'; }).join('');
    var supKeys=Object.keys(x.sups).sort(function(a,b){ return x.sups[b].value-x.sups[a].value || x.sups[b].sent-x.sups[a].sent; });
    var supRows=supKeys.map(function(k){ var S=x.sups[k]; var h=median(S.hours); return '<tr><td>'+esc(S.name)+'</td><td style="text-align:right">'+S.sent+'</td><td style="text-align:right">'+(S.sent?Math.round(100*S.won/S.sent):0)+' %</td><td style="text-align:right">'+(S.hours.length?(h<1?Math.round(h*60)+' min':h.toFixed(1)+' h'):'–')+'</td><td style="text-align:right">'+S.paid+'</td><td style="text-align:right">'+BS.fmt(S.value)+'</td></tr>'; }).join('');
    var top=catKeys[0], topC=x.cats[top]||{};
    var pitch='In the last period, '+x.buyers+' buying compan'+(x.buyers===1?'y':'ies')+' sent '+x.requests+' request'+(x.requests===1?'':'s')+' with '+x.lines+' lines worth about '+BS.fmt(x.goods)+' at list prices, across '+catKeys.length+' categor'+(catKeys.length===1?'y':'ies')+' and '+Object.keys(x.subs).length+' sub-cit'+(Object.keys(x.subs).length===1?'y':'ies')+' of Addis Ababa. '+(top?esc(top)+' led demand with '+topC.lines+' line'+(topC.lines===1?'':'s')+' (about '+BS.fmt(topC.value)+'). ':'')+x.suppliers+' supplier'+(x.suppliers===1?'':'s')+' quoted, '+(itemKeys.length?'and quoted prices ran '+(function(){ var d=[]; itemKeys.slice(0,3).forEach(function(k){ var I=x.items[k]; var base=BS.baseOf(k)||0; if(base) d.push(Math.round(100*(base-median(I.prices))/base)); }); return d.length? (Math.round(d.reduce(function(a,b){return a+b;},0)/d.length))+' % below list on the most requested items':'close to list prices'; })()+'. ':'')+BS.fmt(x.paidValue)+' was paid through the platform. The newsletter reaches '+x.members+' registered members.';
    var tbl=function(h,rows){ return '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.88rem"><thead><tr style="text-align:left;color:var(--fg-2)">'+h.map(function(c,i){ return '<th'+(i>0?' style="text-align:right"':'')+'>'+c+'</th>'; }).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'; };
    return head+
      card('Summary for a sales conversation','Written from the records above. Copy it into a proposal to a brand, a supplier or a partner.','<p style="margin:0">'+pitch+'</p><div style="margin-top:.5rem"><button class="btn btn-ghost btn-sm" type="button" id="adInsightsCsv">Download the tables as CSV</button></div>')+
      '<div class="grid2" style="align-items:start">'+card('Where requests go','Requests → offers → acceptance → payment.', funnel)+card('Demand by sub-city','Requests per delivery area.', subRows)+'</div>'+
      card('Demand by category','Lines requested, their value at list prices, offers per line, acceptances and money paid.', tbl(['Category','Lines','Demand','','Offers per line','Accepted','Paid'], catRows))+
      card('Price index','Median quoted unit price per item, the range, the change in the last 30 days against earlier quotes, and how it compares with the list price. This is the data a brand or a supplier cannot get elsewhere.', priceRows? tbl(['Item','Unit','Qty requested','Quotes','Median price','Range','30-day change','vs list'], priceRows) : '<div class="empty">No quotes yet.</div>')+
      card('Supplier performance','Offers sent, win rate, median response time, orders paid.', supRows? tbl(['Supplier','Offers','Win rate','Response','Paid orders','Value paid'], supRows) : '<div class="empty">No offers yet.</div>');
  }
  $('adBody').addEventListener('click', function(e){
    if(e.target.id!=='adInsightsCsv') return; var x=insights(); var L=[['Category','Lines','Demand ETB','Offers','Accepted','Paid ETB']];
    Object.keys(x.cats).forEach(function(c){ var C=x.cats[c]; L.push([c,C.lines,C.value,C.offers,C.accepted,C.paidValue]); });
    L.push([]); L.push(['Item','Category','Unit','Qty requested','Quotes','Median price','Min','Max','List price']);
    Object.keys(x.items).forEach(function(k){ var I=x.items[k]; if(!I.prices.length) return; L.push([k,I.cat,I.unit,I.qty,I.prices.length,median(I.prices),Math.min.apply(null,I.prices),Math.max.apply(null,I.prices),BS.baseOf(k)||'']); });
    L.push([]); L.push(['Supplier','Offers','Won','Paid orders','Value paid ETB']);
    Object.keys(x.sups).forEach(function(k){ var S=x.sups[k]; L.push([S.name,S.sent,S.won,S.paid,S.value]); });
    var csv=L.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
    var a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='build-smartly-insights.csv'; document.body.appendChild(a); a.click(); a.remove();
  });
  /* ---- Catalogue: the materials buyers tick and suppliers price. Edited here, saved for every device. ---- */
  var catDraft=null, catEditing=null;
  function catItems(){ if(!catDraft) catDraft=BS.CATALOGUE.map(function(c){ return Object.assign({}, c, {units:(c.units||[c.unit]).slice()}); }); return catDraft; }
  var STAGES=[['foundation','Foundation'],['structure','Structure'],['services','Electrical and plumbing'],['finishing','Finishing'],['equipment','Equipment rental']];
  /* Brands page: one category at a time, a row per brand with its logo; add, change logo, remove, then Save */
  var brandCat=null;
  function renderBrandsTab(){
    var m=brandsNow(), L=logosNow(); if(!brandCat || CATS.indexOf(brandCat)<0) brandCat=CATS[0];
    var list=(m[brandCat]||[]);
    var chips='<div class="subtabs">'+CATS.map(function(c){ return '<button type="button" class="'+(c===brandCat?'on':'')+'" data-bcat="'+esc(c)+'">'+esc(c)+' · '+(m[c]||[]).length+'</button>'; }).join('')+'</div>';
    var rows=list.length ? list.map(function(b){ return '<div class="doc" style="grid-template-columns:6rem 1fr auto"><span style="width:6rem;height:3rem;border:1px solid var(--line);border-radius:8px;display:grid;place-items:center;background:#fff;overflow:hidden">'+(L[b]?'<img src="'+L[b]+'" alt="" style="max-width:100%;max-height:100%">':'<span class="small muted">no logo</span>')+'</span><strong>'+esc(b)+'</strong><span style="display:flex;gap:.3rem;flex-wrap:wrap"><label class="btn btn-ghost btn-sm" style="cursor:pointer">'+(L[b]?'Change logo':'Add logo')+'<input type="file" accept="image/*" hidden data-blogo="'+esc(b)+'"></label><button class="btn btn-ghost btn-sm" type="button" data-bdel="'+esc(b)+'">Remove</button></span></div>'; }).join('') : '<div class="empty">No brands in this category yet.</div>';
    var add='<div class="chat-in"><div class="field"><input id="bNew" placeholder="New brand in '+esc(brandCat)+'"></div><label class="btn btn-ghost btn-sm" style="cursor:pointer">Logo<input type="file" accept="image/*" hidden id="bNewLogo"></label><button class="btn btn-primary btn-sm" type="button" id="bAdd">Add</button></div><span class="small muted" id="bNewMsg"></span>';
    return card('Brands', 'Suppliers pick a brand when they quote; buyers see the brand and its logo, never the supplier, until the order.', chips+'<div class="docs">'+rows+'</div>'+add+'<div style="display:flex;gap:.5rem;align-items:center"><button class="btn btn-primary" type="button" id="adSaveBrands">Save brands</button><span class="small muted" id="adBrandMsg">Changes apply on every device once saved.</span></div>');
  }
  var bNewLogo='';
  $('adBody').addEventListener('click', async function(e){
    var bc=e.target.closest('[data-bcat]'); if(bc){ brandCat=bc.dataset.bcat; render(); return; }
    var bd=e.target.closest('[data-bdel]'); if(bd){ var m=brandsNow(); m[brandCat]=m[brandCat].filter(function(x){ return x!==bd.dataset.bdel; }); render(); return; }
    if(e.target.id==='bAdd'){ var v=$('bNew').value.trim(); if(!v){ bsToast('Type the brand name.'); return; } var m2=brandsNow(); if(m2[brandCat].indexOf(v)<0) m2[brandCat].splice(Math.max(0,m2[brandCat].length-(m2[brandCat][m2[brandCat].length-1]==='Other'?1:0)),0,v); if(bNewLogo){ logosNow()[v]=bNewLogo; bNewLogo=''; } render(); return; }
  });
  $('adBody').addEventListener('change', async function(e){
    var bl=e.target.closest('[data-blogo]'); var f=e.target.files&&e.target.files[0];
    if(bl && f){ try{ logosNow()[bl.dataset.blogo]=await fitLogo(f,240,120); brandsNow(); render(); }catch(err){ bsToast('Use a JPG or PNG.'); } return; }
    if(e.target.id==='bNewLogo' && f){ try{ bNewLogo=await fitLogo(f,240,120); $('bNewMsg').textContent='Logo ready: '+f.name; }catch(err){ bsToast('Use a JPG or PNG.'); } }
  });
  function brandsCard(){ return card('Brands', 'Why this matters: a supplier picks a brand from this list when quoting, and the buyer sees the brand instead of the supplier name until the purchase order. Keep one list per category so offers compare like with like. Add a logo and it shows next to the brand on every offer.', brandsHtml()+'<div><button class="btn btn-primary btn-sm" type="button" id="adSaveBrands">Save brands</button> <span class="small muted" id="adBrandMsg"></span></div>'); }
  var catSub='items';
  function renderCatalogue(){
    var tabs=[['items','Items'],['add','Add an item or a category']];
    var bar='<div class="subtabs" style="margin-bottom:.2rem">'+tabs.map(function(t){ return '<button type="button" class="'+(catSub===t[0]?'on':'')+'" data-catsub="'+t[0]+'">'+t[1]+'</button>'; }).join('')+'</div>';
    var parts=renderCatalogueItems();
    return bar+(catSub==='brands'?brandsCard():catSub==='add'?parts.add:parts.items);
  }
  function renderCatalogueItems(){
    var items=catItems(); var cats=BS.CATEGORIES.filter(function(c){ return c.indexOf('Other')<0; });
    var groups=cats.map(function(c){ var rows=items.map(function(it,i){ return [it,i]; }).filter(function(p){ return p[0].cat===c; }); if(!rows.length) return ''; 
      var cpk=BS.CAT_PICS[c], cpic=BS.catPic(c);
      return '<div style="display:grid;gap:.4rem"><div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">'+(cpic?'<img src="'+esc(cpic)+'" alt="" style="width:4.2rem;height:2.9rem;object-fit:cover;border-radius:8px;background:var(--bg-2)" onerror="this.remove()">':'')+'<strong style="font-family:var(--display)">'+esc(c)+' <span class="small muted">· '+rows.length+' item'+(rows.length===1?'':'s')+' · '+esc(BS.DESKS[c]||'')+'</span></strong>'+(cpk?'<label class="btn btn-ghost btn-sm" style="cursor:pointer">Change picture<input type="file" accept="image/*" hidden data-cpic-up="'+esc(cpk)+'"></label>':'')+'</div><div class="docs">'+rows.map(function(p){ var it=p[0], i=p[1]; var ipk=BS.ITEM_PICS[it.name], ipic=BS.itemPic(it.name);
        if(catEditing===i) return '<div class="doc" style="grid-template-columns:1fr;gap:.5rem"><div class="grid3"><div class="field"><label>Name</label><input data-cf="name" value="'+esc(it.name)+'"></div><div class="field"><label>Category</label><select data-cf="cat">'+cats.map(function(x){ return '<option'+(x===it.cat?' selected':'')+'>'+esc(x)+'</option>'; }).join('')+'</select></div><div class="field"><label>Stage</label><select data-cf="stage">'+STAGES.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===it.stage?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div><div class="field"><label>Units (first is the usual one)</label><input data-cf="units" value="'+esc(it.units.join(', '))+'"></div><div class="field"><label>Minimum order</label><input data-cf="min" type="number" value="'+(it.min||1)+'"></div><div class="field"><label>List price (ETB per usual unit)</label><input data-cf="base" type="number" value="'+(it.base||0)+'"></div></div><div style="display:flex;gap:.4rem"><button class="btn btn-primary btn-sm" type="button" data-cat-save="'+i+'">Done</button><button class="btn btn-ghost btn-sm" type="button" data-cat-cancel="1">Cancel</button></div></div>';
        return '<div class="doc" style="'+(it.hidden?'opacity:.55':'')+'">'+(ipic?'<img src="'+esc(ipic)+'" alt="" style="width:3.4rem;height:2.5rem;object-fit:cover;border-radius:7px;background:var(--bg-2)" onerror="this.outerHTML=\'<span class=ico>✓</span>\'">':'<span class="ico">'+(it.hidden?'–':'✓')+'</span>')+'<span><strong>'+esc(it.name)+'</strong> <span class="small muted">· '+esc(it.units.join(', '))+' · min '+(it.min||1)+' '+esc(it.units[0])+' · list '+BS.fmt(it.base||0)+' · '+esc((STAGES.filter(function(x){return x[0]===it.stage;})[0]||['',''])[1])+(it.hidden?' · hidden from buyers':'')+'</span></span><span style="display:flex;gap:.3rem;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" type="button" data-cat-edit="'+i+'">Edit</button><button class="btn btn-ghost btn-sm" type="button" data-cat-hide="'+i+'">'+(it.hidden?'Show':'Hide')+'</button>'+(ipk?'<label class="btn btn-ghost btn-sm" style="cursor:pointer">Picture<input type="file" accept="image/*" hidden data-cpic-up="'+esc(ipk)+'"></label>':'')+'</span></div>'; }).join('')+'</div></div>'; }).join('');
    var addForm='<div class="grid3"><div class="field"><label for="ncName">Name</label><input id="ncName" placeholder="e.g. Gabion box 1x1x2"></div><div class="field"><label for="ncCat">Category</label><select id="ncCat">'+cats.map(function(x){ return '<option>'+esc(x)+'</option>'; }).join('')+'</select></div><div class="field"><label for="ncStage">Stage</label><select id="ncStage">'+STAGES.map(function(x){ return '<option value="'+x[0]+'">'+x[1]+'</option>'; }).join('')+'</select></div><div class="field"><label for="ncUnits">Units (comma separated, first is the usual one)</label><input id="ncUnits" placeholder="pcs, bundle"></div><div class="field"><label for="ncMin">Minimum order</label><input id="ncMin" type="number" value="1"></div><div class="field"><label for="ncBase">List price (ETB)</label><input id="ncBase" type="number" value="0"></div></div><div><button class="btn btn-primary btn-sm" type="button" id="ncAdd">Add item</button></div>';
    var catForm='<div class="grid3"><div class="field"><label for="nccName">New category</label><input id="nccName" placeholder="e.g. Glass and aluminium"></div><div class="field"><label for="nccDesk">Desk that handles it</label><input id="nccDesk" placeholder="e.g. Finishing desk"></div><div class="field"><label for="nccBrands">Brands (comma separated)</label><input id="nccBrands" placeholder="e.g. Local, Imported, Other"></div></div><div><button class="btn btn-ghost btn-sm" type="button" id="nccAdd">Add category</button></div>';
    return {items: card('Catalogue', items.length+' items in '+cats.length+' categories. Buyers tick these; suppliers price them; minimum orders and list prices feed the estimates and the Insights price index. Changes reach every device when you press Save.', '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.6rem"><button class="btn btn-primary btn-sm" type="button" id="catSave">Save catalogue</button><button class="btn btn-ghost btn-sm" type="button" id="catReset">Discard changes</button><span class="small muted" id="adCatMsg">'+(BS.catalogueSetBy?'Last saved by '+esc(BS.catalogueSetBy):'Built-in catalogue')+'</span></div><div style="display:grid;gap:1rem">'+groups+'</div>'),
      add: card('Add an item','A new material buyers can tick from today.', addForm)+card('Add a category','The five main groups stay as they are; this adds a material category inside them, with the desk that handles its requests and the brand list suppliers choose from.', catForm)};
  }
  $('adBody').addEventListener('click', function(e){ var b=e.target.closest('[data-catsub]'); if(!b) return; catSub=b.dataset.catsub; render(); });
  $('adBody').addEventListener('click', async function(e){
    var t=e.target; var items=catItems();
    var ed=t.closest('[data-cat-edit]'); if(ed){ catEditing=+ed.dataset.catEdit; render(); return; }
    var hd=t.closest('[data-cat-hide]'); if(hd){ items[+hd.dataset.catHide].hidden=!items[+hd.dataset.catHide].hidden; render(); return; }
    if(t.closest('[data-cat-cancel]')){ catEditing=null; render(); return; }
    var sv=t.closest('[data-cat-save]'); if(sv){ var row=sv.closest('.doc'); var g=function(k){ return (row.querySelector('[data-cf="'+k+'"]')||{}).value||''; }; var it=items[+sv.dataset.catSave]; it.name=g('name').trim()||it.name; it.cat=g('cat'); it.stage=g('stage'); it.units=g('units').split(',').map(function(u){ return u.trim(); }).filter(Boolean); if(!it.units.length) it.units=[it.unit||'pcs']; it.unit=it.units[0]; it.min=+g('min')||1; it.base=+g('base')||0; catEditing=null; render(); return; }
    if(t.id==='ncAdd'){ var nm=$('ncName').value.trim(); if(!nm){ bsToast('Type the item name.'); return; } catSub='items'; var units=$('ncUnits').value.split(',').map(function(u){ return u.trim(); }).filter(Boolean); if(!units.length) units=['pcs']; items.push({name:nm, cat:$('ncCat').value, unit:units[0], units:units, min:+$('ncMin').value||1, base:+$('ncBase').value||0, stage:$('ncStage').value}); render(); bsToast('Added. Press Save catalogue to publish it.'); return; }
    if(t.id==='nccAdd'){ var cn=$('nccName').value.trim(); if(!cn){ bsToast('Type the category name.'); return; } var list=(BS.extraCategories||[]).slice(); list.push({name:cn, desk:$('nccDesk').value.trim()||'Technical supervisor', brands:$('nccBrands').value.split(',').map(function(b){ return b.trim(); }).filter(Boolean)}); t.disabled=true; await BS.set('settings','categories',{list:list, setBy:staffName()}); bsToast('Category added for every device.'); return; }
    if(t.id==='catSave'){ t.disabled=true; await BS.set('settings','catalogue',{items:items, setBy:staffName()}); catDraft=null; catEditing=null; bsToast('Catalogue saved. Buyers see it at once.'); return; }
    if(t.id==='catReset'){ catDraft=null; catEditing=null; render(); return; }
  });
  function isOwner(){ return BS.staffRole()==='owner'; }
  $('adBody').addEventListener('click', async function(e){
    if(e.target.id!=='adReset' || !isOwner()) return;
    if(!(await bsConfirm('Clear all test data?','Every request, offer, order, message, problem, newsletter item, promotion, profile, task and supplier change is deleted for everyone. This cannot be undone.','Yes, clear it'))) return;
    if(!(await bsConfirm('Are you sure?','Last check before deleting.','Delete everything'))) return;
    var cols=['boqs','offers','messages','issues','news','promotions','verifications','profiles','suppliers','tasks','tracks'], n=0; e.target.disabled=true;
    for(var i=0;i<cols.length;i++){ var docs=(data[cols[i]]||[]).slice(); for(var j=0;j<docs.length;j++){ await BS.remove(cols[i], docs[j].id); n++; $('adResetMsg').textContent='Deleted '+n+'…'; } }
    try{ Object.keys(localStorage).forEach(function(k){ if(/^bs_demo_(draft|prices_|supprofile_|locs)|^bs_bell_seen_/.test(k)) localStorage.removeItem(k); }); }catch(err){}
    e.target.disabled=false; $('adResetMsg').textContent='Done: '+n+' records deleted.'; bsToast('Test data cleared. The site starts clean.');
  });

  /* ---- Site content: the words on every page (per language), look and feel, pictures and logo, contact and social,
     home page sections and announcement bar, extra FAQ questions. All saved as settings docs (content, style, site,
     pic-*), so every device shows the change within seconds. Changed words are keyed by the original English text and
     applied by the language engine (assets/i18n.js), so they survive redraws and work in every language. ---- */
  var cSub='text', cPage='home', cLang='en', cQ='', cEdits={}, cDoc=null, cLoading=false;
  var C_PAGES=[['home','Home page'],['__chrome','Header, menu and footer'],['boq','Send a request'],['signup','Sign in and register'],['supplier','Supplier portal'],['workspace','Buyer account'],['advertise','Newsletter'],['members','Members'],['contact','Contact'],['faq','Questions and answers'],['terms','Terms'],['privacy','Privacy'],['start','Start here (testers)'],['order','Order page']];
  var C_HSEC=[['numbers','Numbers band (suppliers, materials, sub-cities, offers)'],['pulse','Price pulse strip'],['promos','Partners and promotions slideshow'],['categories','Top categories circles'],['catinfo','What each category covers'],['how','How it works'],['forsuppliers','For suppliers'],['safe','Why it is safe'],['members','Members cards'],['about','About us'],['cta','Ready to send your first request?']];
  function cSettings(id){ return data.settings.filter(function(x){ return x.id===id; })[0]||{}; }
  function cTexts(){
    if(!cDoc) return null;
    var roots = cPage==='__chrome' ? [cDoc.querySelector('header'), cDoc.querySelector('footer.site')] : [cDoc.getElementById('view-'+cPage)];
    var out=[], seen={};
    roots.forEach(function(root){ if(!root) return; var w=cDoc.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
      while((n=w.nextNode())){ var p=n.parentElement; if(!p || p.closest('script,style,select,option,textarea,svg,[data-notr]')) continue;
        var t=n.nodeValue.replace(/\s+/g,' ').trim(); if(!t || !/[A-Za-z]{2}/.test(t) || seen[t]) continue; seen[t]=1;
        var tag=p.closest('h1,h2,h3,h4')?'Heading':p.closest('button,.btn')?'Button':p.closest('a')?'Link':p.closest('label')?'Field name':p.closest('summary')?'Question':p.closest('li')?'List item':'Text';
        out.push({en:t, kind:tag}); } });
    return out;
  }
  function cLoad(){ if(cDoc || cLoading) return; cLoading=true;
    fetch((window.BS_CLEAN?'/':location.pathname.replace(/[^/]*$/,''))+'index.html', {cache:'no-store'}).then(function(r){ return r.text(); }).then(function(h){ cDoc=new DOMParser().parseFromString(h,'text/html'); })
      .catch(function(){ cDoc=document.cloneNode(true); }).then(function(){ cLoading=false; if(tab==='content') render(); }); }
  function cDict(lang){ return lang==='en' ? null : (window.BS_LANG||{})[lang]; }
  function cCurrent(en){ var m=(cSettings('content').map||{})[cLang]||{}; if(m[en]!=null) return m[en]; var d=cDict(cLang); return d && d[en]!=null ? d[en] : (cLang==='en'?en:''); }
  function renderContent(){
    var subs=[['text','Words on the pages'],['look','Look and feel'],['pics','Pictures and logo'],['contact','Contact and social'],['home','Home page and announcement'],['faq','Extra FAQ questions']];
    var head='<div style="display:flex;gap:.4rem;flex-wrap:wrap">'+subs.map(function(x){ return '<button type="button" class="btn btn-sm '+(cSub===x[0]?'btn-primary':'btn-ghost')+'" data-csub="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
    var help=card('How to use Site content','Change what visitors see without touching any code. Pick a part below, change it and press Save: every phone and computer shows it within seconds. Reset brings back the original.','');
    return help+head+({text:cTextHtml, look:cLookHtml, pics:picturesCard, contact:cContactHtml, home:cHomeHtml, faq:cFaqHtml}[cSub]||cTextHtml)();
  }
  function cTextHtml(){
    cLoad(); if(cLang!=='en' && !cDict(cLang) && window.bsLoadLang) bsLoadLang(cLang).then(function(){ if(tab==='content') render(); });
    var sel='<div class="grid3"><div class="field"><label for="cPage">Page</label><select id="cPage">'+C_PAGES.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===cPage?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label for="cLang">Language</label><select id="cLang"><option value="en"'+(cLang==='en'?' selected':'')+'>English</option><option value="am"'+(cLang==='am'?' selected':'')+'>Amharic</option><option value="om"'+(cLang==='om'?' selected':'')+'>Afaan Oromoo</option></select></div>'+
      '<div class="field"><label for="cQ">Find a word</label><input id="cQ" value="'+esc(cQ)+'" placeholder="Type to filter"></div></div>';
    var list=cTexts();
    if(!list) return card('Words on the pages','', sel+'<p class="small muted">Loading the pages…</p>');
    var map=(cSettings('content').map||{})[cLang]||{}, q=cQ.toLowerCase();
    var rows=list.filter(function(x){ return !q || x.en.toLowerCase().indexOf(q)>=0 || String(cCurrent(x.en)).toLowerCase().indexOf(q)>=0; }).map(function(x,i){
      var k=cLang+'|'+x.en, val=cEdits[k]!=null?cEdits[k]:cCurrent(x.en), changed=map[x.en]!=null;
      return '<div class="doc" style="grid-template-columns:1fr;gap:.35rem"><span class="small muted">'+x.kind+(cLang!=='en'?' · English: '+esc(x.en):'')+(changed?' · <strong style="color:var(--ochre-ink)">changed</strong>':'')+'</span>'+
        '<textarea data-ctext="'+esc(x.en)+'" rows="'+Math.min(6,Math.max(1,Math.ceil(val.length/90)))+'" style="font:inherit;width:100%;padding:.45rem .55rem;border:1.5px solid var(--line);border-radius:8px;background:var(--white);color:var(--fg)">'+esc(val)+'</textarea>'+
        '<span style="display:flex;gap:.4rem"><button class="btn btn-primary btn-sm" type="button" data-csave="'+esc(x.en)+'">Save</button>'+(changed?'<button class="btn btn-ghost btn-sm" type="button" data-creset="'+esc(x.en)+'">Reset</button>':'')+'</span></div>'; }).join('');
    return card('Words on the pages','Choose a page and a language. Each box is one piece of text as visitors see it. Change it and press Save. After changing English, also check Amharic and Afaan Oromoo.', sel+'<div class="docs" data-notr>'+(rows||'<div class="empty">No text matches.</div>')+'</div>');
  }
  function cLookHtml(){
    var st=cSettings('style'), f=function(id,label,list,v,def){ return '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'">'+list.map(function(x){ return '<option'+((v||def)===x?' selected':'')+'>'+x+'</option>'; }).join('')+'</select></div>'; };
    return card('Look and feel','Fonts, colours and text size for the whole site. Dark mode on phones keeps its own colours.',
      '<div class="grid3">'+f('lkDisplay','Font for headings',BS.FONTS.display,st.display,'Sora')+f('lkBody','Font for text',BS.FONTS.body,st.body,'Manrope')+
      '<div class="field"><label for="lkScale">Text size</label><select id="lkScale"><option value="1"'+(!st.scale||+st.scale===1?' selected':'')+'>Normal</option><option value="1.08"'+(+st.scale===1.08?' selected':'')+'>Larger</option><option value="1.16"'+(+st.scale===1.16?' selected':'')+'>Largest</option></select></div>'+
      '<div class="field"><label for="lkGreen">Main colour (buttons, links)</label><input id="lkGreen" type="color" value="'+(st.green||'#1E6B4E')+'"></div>'+
      '<div class="field"><label for="lkOchre">Accent colour (highlights)</label><input id="lkOchre" type="color" value="'+(st.ochre||'#E3A63A')+'"></div></div>'+
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-primary btn-sm" type="button" id="lkSave">Save look and feel</button><button class="btn btn-ghost btn-sm" type="button" id="lkReset">Back to the original</button></div>');
  }
  function cContactHtml(){
    var c=(cSettings('site').contact)||{}, f=function(k,label,ph){ return '<div class="field"><label for="ct_'+k+'">'+label+'</label><input id="ct_'+k+'" value="'+esc(c[k]||'')+'" placeholder="'+ph+'"></div>'; };
    return card('Contact and social','Shown on the Contact page and in the footer. Leave a box empty to hide that line.',
      '<div class="grid3">'+f('phone','Phone','+251 11 …')+f('email','Email','info@…')+f('address','Address','Bole, Addis Ababa')+f('telegram','Telegram','@BuildSmartly')+f('whatsapp','WhatsApp number','+251 9…')+f('facebook','Facebook page','page name or link')+f('linkedin','LinkedIn page','company name or link')+'</div>'+
      '<div><button class="btn btn-primary btn-sm" type="button" id="ctSave">Save contact details</button></div>');
  }
  function cHomeHtml(){
    var st=cSettings('site'), hide=st.hide||[], an=st.announce||{};
    return card('Announcement bar','A short message at the top of every page, for example a holiday notice or an offer.',
        '<label class="small" style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" id="anOn"'+(an.on?' checked':'')+'> Show the announcement</label>'+
        '<div class="grid3"><div class="field"><label for="anText">Message</label><input id="anText" value="'+esc(an.text||'')+'" placeholder="e.g. Free delivery in Bole this week"></div><div class="field"><label for="anLabel">Button text (optional)</label><input id="anLabel" value="'+esc(an.label||'')+'" placeholder="e.g. Send a request"></div><div class="field"><label for="anLink">Button link (optional)</label><input id="anLink" value="'+esc(an.link||'')+'" placeholder="#boq or https://…"></div></div>'+
        '<div><button class="btn btn-primary btn-sm" type="button" id="anSave">Save announcement</button></div>')+
      card('Home page sections','Untick a section to hide it from the home page. Tick it again to bring it back.',
        '<div style="display:grid;gap:.35rem">'+C_HSEC.map(function(x){ return '<label class="small" style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" data-hsec-show="'+x[0]+'"'+(hide.indexOf(x[0])<0?' checked':'')+'> '+x[1]+'</label>'; }).join('')+'</div>'+
        '<div><button class="btn btn-primary btn-sm" type="button" id="hsSave">Save sections</button></div>');
  }
  function cFaqHtml(){
    var faq=(cSettings('site').faq)||[];
    return card('Extra FAQ questions','Added below the standard questions on the Questions and answers page. The standard ones are changed under "Words on the pages".',
      '<div class="docs">'+(faq.map(function(q,i){ return '<div class="doc" style="grid-template-columns:1fr auto"><span><strong>'+esc(q.q)+'</strong><br><span class="small muted">'+esc(q.a)+'</span></span><button class="btn btn-ghost btn-sm" type="button" data-faqrm="'+i+'">Remove</button></div>'; }).join('')||'<div class="empty">No extra questions yet.</div>')+'</div>'+
      '<div class="field"><label for="fqQ">Question</label><input id="fqQ"></div><div class="field"><label for="fqA">Answer</label><textarea id="fqA" rows="3" style="font:inherit;width:100%;padding:.45rem .55rem;border:1.5px solid var(--line);border-radius:8px;background:var(--white);color:var(--fg)"></textarea></div>'+
      '<div><button class="btn btn-primary btn-sm" type="button" id="fqAdd">Add the question</button></div>');
  }
  async function cSaveSite(patch, msg){ var cur=Object.assign({}, cSettings('site')); delete cur.id; Object.assign(cur, patch, {setBy:staffName()}); await BS.set('settings','site', cur); bsToast(msg); }
  $('adBody').addEventListener('input', function(e){ var t=e.target;
    if(t.dataset && t.dataset.ctext!=null) cEdits[cLang+'|'+t.dataset.ctext]=t.value;
    if(t.id==='cQ'){ cQ=t.value; var pos=t.selectionStart; render(); var n=$('cQ'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(err){} } } });
  $('adBody').addEventListener('change', function(e){ var t=e.target; if(t.id==='cPage'){ cPage=t.value; render(); } if(t.id==='cLang'){ cLang=t.value; render(); } });
  $('adBody').addEventListener('click', async function(e){
    var t=e.target; if(tab!=='content') return;
    if(t.dataset.csub){ cSub=t.dataset.csub; render(); return; }
    var sv=t.closest('[data-csave]'), rs=t.closest('[data-creset]');
    if(sv || rs){ var en=(sv||rs).getAttribute(sv?'data-csave':'data-creset'), k=cLang+'|'+en, all=JSON.parse(JSON.stringify(cSettings('content').map||{})); all[cLang]=all[cLang]||{};
      if(sv){ var v=(cEdits[k]!=null?cEdits[k]:cCurrent(en)).trim(); if(cLang==='en' && v===en) delete all.en[en]; else all[cLang][en]=v; }
      else delete all[cLang][en];
      delete cEdits[k]; await BS.set('settings','content',{map:all, setBy:staffName()}); bsToast(sv?'Saved. Every device shows the new text now.':'Back to the original text.'); return; }
    if(t.id==='lkSave'){ await BS.set('settings','style',{display:$('lkDisplay').value, body:$('lkBody').value, scale:+$('lkScale').value, green:$('lkGreen').value, ochre:$('lkOchre').value, setBy:staffName()}); bsToast('Look and feel saved for every device.'); return; }
    if(t.id==='lkReset'){ if(!(await bsConfirm('Back to the original look?','Fonts, colours and text size go back to how the site was built.','Reset'))) return; await BS.set('settings','style',{setBy:staffName()}); bsToast('Original look restored.'); return; }
    if(t.id==='ctSave'){ var c={}; ['phone','email','address','telegram','whatsapp','facebook','linkedin'].forEach(function(k){ c[k]=$('ct_'+k).value.trim(); }); await cSaveSite({contact:c},'Contact details saved. They show on the Contact page and in the footer.'); return; }
    if(t.id==='anSave'){ await cSaveSite({announce:{on:$('anOn').checked, text:$('anText').value.trim(), label:$('anLabel').value.trim(), link:$('anLink').value.trim()}}, $('anOn').checked?'Announcement is showing on every page.':'Announcement saved and hidden.'); return; }
    if(t.id==='hsSave'){ var hide=[].slice.call(document.querySelectorAll('[data-hsec-show]')).filter(function(i){ return !i.checked; }).map(function(i){ return i.getAttribute('data-hsec-show'); }); await cSaveSite({hide:hide},'Home page sections saved.'); return; }
    if(t.id==='fqAdd'){ var q=$('fqQ').value.trim(), a=$('fqA').value.trim(); if(!q||!a){ bsToast('Type a question and an answer.'); return; } var list=((cSettings('site').faq)||[]).concat([{q:q,a:a}]); await cSaveSite({faq:list},'Question added to the FAQ page.'); return; }
    var fr=t.closest('[data-faqrm]'); if(fr){ var l2=((cSettings('site').faq)||[]).slice(); l2.splice(+fr.dataset.faqrm,1); await cSaveSite({faq:l2},'Question removed.'); return; }
  });
  /* ---- staff logins (owner only, public site) ----
     Each login has a tick box per staff-page section (`access`); Overview is always shown, the owner sees everything.
     Remove switches the login off and hides it from the list (removed:true); nothing the person did on the site is deleted.
     Adding the same email again switches that login back on (the person keeps their own password). */
  function accessOf(x){ return Array.isArray(x.access) ? x.access : BS.STAFF_SECTIONS.map(function(s){ return s[0]; }).filter(function(k){ return k!=='finance' || x.finance; }); }
  function accessBoxes(attr, list, uid){ return '<div style="display:flex;flex-wrap:wrap;gap:.3rem .9rem">'+BS.STAFF_SECTIONS.map(function(sec){ return '<label class="small" style="display:flex;gap:.35rem;align-items:center;white-space:nowrap"><input type="checkbox" '+attr+'="'+(uid?uid+'|':'')+sec[0]+'"'+(list.indexOf(sec[0])>=0?' checked':'')+'> '+sec[1]+'</label>'; }).join('')+'</div>'; }
  function staffCard(){
    var me=BS.staffUid(), list=data.staff.filter(function(x){ return !x.removed; }).sort(function(a,b){ return (a.role==='owner'?0:1)-(b.role==='owner'?0:1) || (a.name||'').localeCompare(b.name||''); });
    var rows=list.map(function(x){
      var self=x.id===me, owner=x.role==='owner';
      return '<div class="staffrow" style="grid-template-columns:1fr"><div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><span><strong>'+esc(x.name||'')+'</strong> · '+esc(x.email||'')+'<br><span class="small muted">'+(owner?'Owner · sees everything':'Staff')+(x.active?'':' · <strong style="color:#9b2c2c">switched off</strong>')+'</span></span>'+
        '<span style="display:flex;gap:.4rem;flex-wrap:wrap;justify-content:flex-end">'+
        (owner?'':'<button class="btn btn-ghost btn-sm" type="button" data-sact="'+x.id+'">'+(x.active?'Switch off':'Switch on')+'</button>')+
        '<button class="btn btn-ghost btn-sm" type="button" data-sreset="'+esc(x.email||'')+'">'+(self?'Change my password':'Send password email')+'</button>'+
        (owner?'':'<button class="btn btn-ghost btn-sm" type="button" data-sdel="'+x.id+'" style="color:#9b2c2c;border-color:#9b2c2c">Remove</button>')+'</span></div>'+
        (owner?'':'<div><span class="small muted">Can open:</span>'+accessBoxes('data-sacc', accessOf(x), x.id)+'</div>')+'</div>';
    }).join('');
    return card('Staff logins','Owner only. Each staff member signs in with their own email and password. Tick the pages each person may open.',
      '<div>'+(rows||'<p class="small muted">No staff logins yet.</p>')+'</div>'+
      '<p class="small muted">Forgotten password: press <strong>Send password email</strong>; they choose a new one from the email. A new password cannot be typed in for someone else here.</p>'+
      '<details><summary class="btn btn-ochre btn-sm" style="display:inline-block;cursor:pointer">Add a staff login</summary><div style="display:grid;gap:.6rem;margin-top:.7rem;max-width:34rem">'+
      '<div class="field"><label for="snName">Name</label><input id="snName"></div>'+
      '<div class="field"><label for="snEmail">Email</label><input id="snEmail" type="email" autocomplete="off"></div>'+
      '<div class="field"><label for="snPw">First password (at least 8 characters; tell them, they can change it)</label><input id="snPw" type="text" autocomplete="off"></div>'+
      '<div><span class="small muted">Can open:</span>'+accessBoxes('data-snacc', BS.STAFF_DEFAULT_ACCESS)+'</div>'+
      '<span class="err small" id="snErr" hidden></span><div><button class="btn btn-primary btn-sm" type="button" id="snGo">Add the login</button></div></div></details>');
  }
  $('adBody').addEventListener('change', async function(e){
    var t=e.target; if(!isOwner() || t.type!=='checkbox') return;
    var v=t.getAttribute('data-sacc'); if(!v) return; var id=v.split('|')[0], key=v.split('|')[1];
    var x=data.staff.filter(function(s){ return s.id===id; })[0]; if(!x) return;
    var acc=accessOf(x).filter(function(k){ return k!==key; }); if(t.checked) acc.push(key);
    await BS.update('staff', id, {access:acc, finance:acc.indexOf('finance')>=0});
    bsToast(x.name+(t.checked?' can now open ':' can no longer open ')+(BS.STAFF_SECTIONS.filter(function(s){ return s[0]===key; })[0]||[,''])[1]+'.');
  });
  $('adBody').addEventListener('click', async function(e){
    var t=e.target; if(!isOwner()) return;
    if(t.id==='snGo'){
      var n=$('snName').value.trim(), em=$('snEmail').value.trim(), pw=$('snPw').value, bad='';
      var acc=[].slice.call(document.querySelectorAll('[data-snacc]:checked')).map(function(i){ return i.getAttribute('data-snacc'); });
      var old=data.staff.filter(function(x){ return (x.email||'').toLowerCase()===em.toLowerCase(); })[0];
      if(!n) bad='Please type a name.'; else if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) bad='Please type a valid email.'; else if(old && old.role==='owner') bad='That is the owner login.'; else if(!old && pw.length<8) bad='The password needs at least 8 characters.';
      $('snErr').textContent=bad; $('snErr').hidden=!bad; if(bad) return;
      t.disabled=true;
      if(old){ await BS.update('staff', old.id, {name:n, access:acc, finance:acc.indexOf('finance')>=0, active:true, removed:false}); bsToast(n+' had a login before; it is switched on again. They sign in with their own password, or press "Forgot your password?".'); t.disabled=false; return; }
      try{ await BS.createStaff(n, em, pw, acc); bsToast('Login added for '+n+'. Give them the email and first password.'); }
      catch(err){ $('snErr').textContent=BS.authErr(err)+(err&&err.code==='auth/email-already-in-use'?' Use another email for this person.':''); $('snErr').hidden=false; }
      t.disabled=false; return;
    }
    var id=t.dataset.sact||t.dataset.sdel, x=id&&data.staff.filter(function(s){ return s.id===id; })[0];
    if(x && t.dataset.sact){ if(x.active && !(await bsConfirm('Switch off '+x.name+'?','They can no longer sign in to the staff page. You can switch the login on again later.','Switch off'))) return; await BS.update('staff', x.id, {active:!x.active}); bsToast(x.name+(x.active?' is switched off.':' can sign in again.')); return; }
    if(x && t.dataset.sdel){ if(!(await bsConfirm('Remove '+x.name+'?','Their login stops working and leaves this list. Everything they did on the site stays: replies, approvals, notes and orders are not deleted.','Remove the login'))) return; await BS.update('staff', x.id, {active:false, removed:true, removedAt:new Date().toISOString(), removedBy:staffName()}); bsToast(x.name+' is removed. Their work on the site stays.'); return; }
    if(t.dataset.sreset){ try{ await BS.staffPasswordEmail(t.dataset.sreset); bsToast('Email to set a new password sent to '+t.dataset.sreset+'.'); }catch(err){ bsToast(BS.authErr(err)); } }
  });
  function renderSettings(){
    var T=BS.TRUCK, I=BS.INSURANCE;
    var f=function(id,label,val,step){ return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="number" step="'+(step||1)+'" value="'+val+'"></div>'; };
    return card('Tariffs and rules', 'Saved for every device'+(BS.tariffsSetBy?' · last set by '+esc(BS.tariffsSetBy):'')+'.',
      '<div class="grid3">'+f('tPerTrip','Truck: fixed cost per trip (ETB)',T.perTrip)+f('tPerKm','Truck: cost per km (ETB)',T.perKm)+f('tCap','Truck capacity (tonnes)',T.capacityT)+f('tMob','Equipment mobilisation per hire (ETB)',T.mobilisation)+f('tInsRate','Transit insurance rate (% of goods)',Math.round(I.rate*1000)/10,0.1)+f('tInsMin','Insurance minimum (ETB)',I.min)+f('tFee','Platform fee (% of each sale)',Math.round(BS.FEE_RATE*1000)/10,0.1)+f('tLead','Minimum needed-by lead time (days)',BS.MIN_LEAD_DAYS)+f('tValid','Days suppliers have to reply',BS.VALIDITY_DAYS)+'</div><div><button class="btn btn-primary btn-sm" type="button" id="adSaveTariffs">Save tariffs</button> <span class="small muted" id="adTariffMsg"></span></div>')+
      (isOwner()&&BS.staffAuth()?staffCard():'')+
      (isOwner()?card('Clear test data','Owner only. Deletes every request, offer, order, message, problem, newsletter item, promotion, profile, task and supplier change, on every device. Tariffs, catalogue, brands and pictures stay.','<div><button class="btn btn-ghost" type="button" id="adReset" style="color:#9b2c2c;border-color:#9b2c2c">Clear all test data</button> <span class="small muted" id="adResetMsg"></span></div>'):'')+
      picturesCard();
  }
  function picturesCard(){ return card('Site pictures','Replace the drawn placeholders with real photos. JPG or PNG from your computer or phone; the picture is resized and cropped to fit and shown on every device within seconds. Use photos you have the right to use (your own, or free-licence stock photos).',
        '<div class="docs">'+BS.PIC_SLOTS.map(function(sl){ var cur=BS.PICS[sl.key]; var def=sl.def||('assets/photos/'+sl.key+'.jpg'); return '<div class="doc" style="grid-template-columns:7rem 1fr auto"><img src="'+(cur||def)+'" alt="" style="width:7rem;aspect-ratio:'+sl.w+'/'+sl.h+';object-fit:'+(sl.whole?'contain':'cover')+';border-radius:'+(sl.w===sl.h?'50%':'6px')+'"><span><strong>'+esc(sl.label)+'</strong><br><span class="small muted">'+sl.w+' × '+sl.h+' px · '+(cur?'photo set by staff':'site photo')+'</span></span><span style="display:flex;gap:.4rem;flex-wrap:wrap"><label class="btn btn-primary btn-sm" style="cursor:pointer">'+(cur?'Replace':'Upload photo')+'<input type="file" accept="image/*" hidden data-pic-up="'+sl.key+'"></label>'+(cur?'<button class="btn btn-ghost btn-sm" type="button" data-pic-rm="'+sl.key+'">Remove</button>':'')+'</span></div>'; }).join('')+'</div><p class="small muted" id="adPicMsg"></p>'); }
  /* site pictures: resize and crop in the browser, store as a JPEG data URL in settings/pic-<key> */
  function fitPicture(file, w, h, whole){
    return new Promise(function(res, rej){ var r=new FileReader(); r.onload=function(){ var img=new Image(); img.onload=function(){ var c=document.createElement('canvas'); c.width=w; c.height=h; var ctx=c.getContext('2d');
      if(whole){ var k=Math.min(w/img.width, h/img.height), dw=img.width*k, dh=img.height*k; ctx.drawImage(img, (w-dw)/2, (h-dh)/2, dw, dh); res(c.toDataURL('image/png')); return; } /* a logo: whole picture, transparent background */
      var sc=Math.max(w/img.width, h/img.height), sw=w/sc, sh=h/sc, sx=(img.width-sw)/2, sy=(img.height-sh)/2; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); var q=0.82, out=c.toDataURL('image/jpeg', q); while(out.length>700000 && q>0.4){ q-=0.1; out=c.toDataURL('image/jpeg', q); } res(out); }; img.onerror=function(){ rej(new Error('bad image')); }; img.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); });
  }
  $('adBody').addEventListener('change', async function(e){
    var i=e.target.closest('[data-pic-up]'); if(!i) return; var f=i.files&&i.files[0]; if(!f) return; var sl=BS.PIC_SLOTS.filter(function(x){ return x.key===i.dataset.picUp; })[0]; if(!sl) return;
    $('adPicMsg').textContent='Preparing '+f.name+'…';
    try{ var data=await fitPicture(f, sl.w, sl.h, !!sl.whole); await BS.set('settings', 'pic-'+sl.key, {data:data, setBy:staffName(), name:f.name}); $('adPicMsg').textContent='Saved. It shows on every device now.'; bsToast('Picture saved.'); }
    catch(err){ $('adPicMsg').textContent='That file could not be read. Use a JPG or PNG.'; }
  });
  $('adBody').addEventListener('change', async function(e){
    var i=e.target.closest('[data-cpic-up]'); if(!i) return; var f=i.files&&i.files[0]; if(!f) return;
    try{ var data=await fitPicture(f, 480, 360); await BS.set('settings', 'pic-'+i.dataset.cpicUp, {data:data, setBy:staffName(), name:f.name}); bsToast('Picture saved. It shows in every list on every device.'); }
    catch(err){ bsToast('That file could not be read. Use a JPG or PNG.'); }
  });
  $('adBody').addEventListener('click', async function(e){ var b=e.target.closest('[data-pic-rm]'); if(!b) return; b.disabled=true; await BS.set('settings', 'pic-'+b.dataset.picRm, {data:'', setBy:staffName()}); bsToast('Back to the drawn placeholder.'); });
  var brandDraft=null, logoDraft=null;
  function brandsNow(){ if(!brandDraft){ brandDraft={}; CATS.forEach(function(c){ brandDraft[c]=(BS.BRANDS[c]||[]).slice(); }); } return brandDraft; }
  function logosNow(){ if(!logoDraft){ logoDraft=Object.assign({}, BS.BRAND_LOGOS||{}); } return logoDraft; }
  function brandChips(c){ var m=brandsNow(), L=logosNow(); return m[c].map(function(b){ return '<span class="chip on">'+(L[b]?'<img src="'+L[b]+'" alt="">':'')+esc(b)+' <span data-rmbrand="'+esc(b)+'" title="Remove" style="cursor:pointer;margin-left:.2rem">×</span></span>'; }).join(''); }
  function brandsHtml(){
    return '<div class="docs">'+CATS.map(function(c){ return '<div class="doc" style="grid-template-columns:1fr;gap:.45rem"><strong style="font-family:var(--display)">'+esc(c)+'</strong><div class="chips" data-brandcat="'+esc(c)+'">'+brandChips(c)+'</div><div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center"><input placeholder="New brand name" data-addbrand="'+esc(c)+'" style="font:inherit;font-size:.9rem;padding:.4rem .6rem;border:1.5px solid var(--line);border-radius:8px;background:var(--white);color:var(--fg);min-width:11rem"><label class="btn btn-ghost btn-sm" style="cursor:pointer">Logo (optional)<input type="file" accept="image/*" hidden data-brandlogo="'+esc(c)+'"></label><span class="small muted" data-logoname="'+esc(c)+'"></span><button class="btn btn-primary btn-sm" type="button" data-brandadd="'+esc(c)+'">Add</button></div></div>'; }).join('')+'</div>';
  }
  function redrawBrands(){ document.querySelectorAll('[data-brandcat]').forEach(function(box){ box.innerHTML=brandChips(box.dataset.brandcat); }); }
  var pendingLogo={};
  async function addBrand(c){ var inp=document.querySelector('[data-addbrand="'+c+'"]'); var v=inp?inp.value.trim():''; if(!v){ bsToast('Type the brand name first.'); return; } var m=brandsNow(); if(m[c].indexOf(v)<0) m[c].push(v); if(pendingLogo[c]){ logosNow()[v]=pendingLogo[c]; delete pendingLogo[c]; var n=document.querySelector('[data-logoname="'+c+'"]'); if(n) n.textContent=''; } inp.value=''; redrawBrands(); }
  $('adBody').addEventListener('keydown', function(e){ var i=e.target.closest('[data-addbrand]'); if(!i || e.key!=='Enter') return; e.preventDefault(); addBrand(i.dataset.addbrand); });
  $('adBody').addEventListener('change', async function(e){ var i=e.target.closest('[data-brandlogo]'); if(!i) return; var f=i.files&&i.files[0]; if(!f) return; try{ pendingLogo[i.dataset.brandlogo]=await fitLogo(f, 240, 120); var n=document.querySelector('[data-logoname="'+i.dataset.brandlogo+'"]'); if(n) n.textContent='Logo ready: '+f.name; }catch(err){ bsToast('That file could not be read. Use a JPG or PNG.'); } });
  /* logo: fit inside a white box without cropping */
  function fitLogo(file, w, h){
    return new Promise(function(res, rej){ var r=new FileReader(); r.onload=function(){ var img=new Image(); img.onload=function(){ var c=document.createElement('canvas'); c.width=w; c.height=h; var ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); var sc=Math.min((w-12)/img.width, (h-12)/img.height); var dw=img.width*sc, dh=img.height*sc; ctx.drawImage(img, (w-dw)/2, (h-dh)/2, dw, dh); res(c.toDataURL('image/jpeg', 0.85)); }; img.onerror=rej; img.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); });
  }
  $('adBody').addEventListener('click', async function(e){
    var x=e.target.closest('[data-rmbrand]'); if(x){ var box=x.closest('[data-brandcat]'); var m=brandsNow(); m[box.dataset.brandcat]=m[box.dataset.brandcat].filter(function(b){ return b!==x.dataset.rmbrand; }); redrawBrands(); return; }
    var ab=e.target.closest('[data-brandadd]'); if(ab){ addBrand(ab.dataset.brandadd); return; }
    if(e.target.id==='adSaveBrands'){ e.target.disabled=true; var m=brandsNow(); await BS.set('settings','brands',{map:m, setBy:staffName()}); await BS.set('settings','brandLogos',{map:logosNow(), setBy:staffName()}); brandDraft=null; logoDraft=null; $('adBrandMsg').textContent='Saved for every device.'; bsToast('Brands saved.'); e.target.disabled=false; return; }
    if(e.target.id==='adSaveTariffs'){ e.target.disabled=true; var v=function(id){ return +document.getElementById(id).value; };
      await BS.set('settings','tariffs',{perTrip:v('tPerTrip'), perKm:v('tPerKm'), capacityT:v('tCap'), mobilisation:v('tMob'), insuranceRate:v('tInsRate')/100, insuranceMin:v('tInsMin'), feeRate:v('tFee')/100, minLeadDays:v('tLead'), validityDays:v('tValid'), setBy:staffName()});
      $('adTariffMsg').textContent='Saved and applied.'; bsToast('Tariffs saved. Estimates and fees now use them everywhere.'); e.target.disabled=false; return; }
  });
})();

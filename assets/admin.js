/* Build Smartly · staff page (#admin). Reads the same records as buyers and suppliers:
   requests (boqs), offers, support messages, member profiles, newsletter items, supplier verifications and settings.
   Staff sign in with a staff number and the staff password; the session is kept per browser tab. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var data={boqs:[],offers:[],messages:[],profiles:[],news:[],verifications:[],settings:[],issues:[]}, query='';
  var tab='overview', mode='local', booted=false, adTilesHtml='';
  var CATS=BS.CATEGORIES.filter(function(c){ return c.indexOf('Other')<0; });
  function esc(t){ return String(t||'').replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function when(iso){ if(!iso) return ''; var d=new Date(iso); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
  function digits(p){ return String(p||'').replace(/\D/g,'').replace(/^251/,'').replace(/^0/,''); }
  function fmtPhone(d){ d=digits(d); return d ? '0'+d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6) : ''; }
  function issueLabel(){ return new Date().toLocaleDateString('en-GB',{month:'long',year:'numeric'}); }
  function isAdmin(){ try{ return sessionStorage.getItem('bs_demo_admin')==='1'; }catch(e){ return false; } }
  function staffName(){ try{ return sessionStorage.getItem('bs_demo_admin_name')||'Staff'; }catch(e){ return 'Staff'; } }
  function setAdmin(on, name){ try{ sessionStorage.setItem('bs_demo_admin', on?'1':''); sessionStorage.setItem('bs_demo_admin_name', name||''); }catch(e){} }

  /* ---- sign in ---- */
  $('adGo').onclick=function(){
    var d=digits($('adPhone').value), st=BS.STAFF.filter(function(a){ return a.phone===d; })[0];
    var ok=!!st && $('adPw').value===BS.STAFF_PASSWORD; $('adErr').hidden=ok; if(!ok){ $('adPw').focus(); return; }
    setAdmin(true, st.person); BS.clearMeTab(); $('adPw').value=''; showPanel(); if(window.BSAuth) BSAuth.refresh(); bsToast('Signed in as '+st.person+'.');
  };
  $('adPw').addEventListener('keydown', function(e){ if(e.key==='Enter') $('adGo').click(); });
  $('adLogout').onclick=function(){ setAdmin(false,''); showLogin(); if(window.BSAuth) BSAuth.refresh(); bsToast('Signed out of the staff page.'); };
  function showLogin(){ $('adLogin').hidden=false; $('adPanel').hidden=true; }
  function showPanel(){ $('adLogin').hidden=true; $('adPanel').hidden=false; $('adMeta').textContent='Signed in as '+staffName()+' · '+(mode==='shared'?'shared database: every device sees the same records':'this device only: shared database not configured yet'); render(); }
  BSRoute.on('admin', function(){ if(isAdmin()) showPanel(); else showLogin(); });
  BS.ready().then(function(m){ mode=m; if(isAdmin() && !$('adPanel').hidden) $('adMeta').textContent='Signed in as '+staffName()+' · '+(m==='shared'?'shared database':'this device only'); });
  ['boqs','offers','messages','profiles','news','verifications','settings','issues'].forEach(function(c){ BS.subscribe(c, function(d){ data[c]=d||[]; if(c==='settings') BS.applySettings(d||[]); if(isAdmin() && !$('adPanel').hidden) render(); }); });
  $('adTabs').addEventListener('click', function(e){ var b=e.target.closest('[data-tab]'); if(!b) return; tab=b.dataset.tab; render(); });

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
    adTilesHtml='<div class="queue" id="adTiles">'+tiles.map(function(t){ return '<button type="button" class="q" data-go="'+t[2]+'" style="text-align:left;cursor:pointer;font:inherit"><strong style="font-size:1.4rem">'+t[0]+'</strong><span class="small muted">'+t[1]+'</span></button>'; }).join('')+'</div>';
    $('adTabs').querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.dataset.tab===tab); });
    var r={overview:renderOverview, requests:renderRequests, suppliers:renderSuppliers, support:renderSupport, news:renderNews, members:renderMembers, finance:renderFinance, insights:renderInsights, settings:renderSettings}[tab]||renderOverview;
    $('adBody').innerHTML=searchHtml()+r();
  }
  $('adBody').addEventListener('click', function(e){ var b=e.target.closest('[data-go]'); if(!b) return; tab=b.dataset.go; render(); });

  function searchHtml(){
    var q=query.trim().toLowerCase(); if(!q) return '';
    var hit=function(){ return Array.prototype.slice.call(arguments).some(function(v){ return String(v||'').toLowerCase().indexOf(q)>=0; }); };
    var rows=[];
    data.boqs.forEach(function(b){ if(hit(b.ref,b.company,b.ownerPhone,b.customerNo,b.subcity)) rows.push('<div class="doc"><span class="ico">RQ</span><span><strong>'+esc(b.ref)+'</strong> · '+esc(b.company)+' · '+esc(b.subcity)+' · '+(b.lines||[]).length+' lines · '+esc(b.status)+'</span><a class="btn btn-ghost btn-sm" href="#" data-tab-go="requests">Open</a></div>'); });
    data.offers.filter(function(o){ return o.status==='accepted'; }).forEach(function(o){ if(hit(o.poRef,o.supplierName,o.customerRevealed,o.paymentRef,o.handoverCode)) rows.push('<div class="doc"><span class="ico">PO</span><span><strong>'+esc(o.poRef)+'</strong> · '+esc(o.customerRevealed)+' ← '+esc(o.supplierName)+' · '+BS.fmt(offerTotal(o))+' · '+(o.paidAt?'paid':o.deliveredAt?'delivered':o.dispatchedAt?'on the way':o.contractAt?'contract':'PO')+'</span><a class="btn btn-ghost btn-sm" href="#order-'+o.id+'">Order page</a></div>'); });
    data.verifications.forEach(function(v){ if(hit(v.company,v.phone,v.tin,v.lic)) rows.push('<div class="doc"><span class="ico">SU</span><span><strong>'+esc(v.company)+'</strong> · '+fmtPhone(v.phone)+' · '+esc(v.status)+'</span><a class="btn btn-ghost btn-sm" href="#" data-tab-go="suppliers">Open</a></div>'); });
    BS.SUPPLIERS.forEach(function(x){ if(hit(x.name,x.sub)) rows.push('<div class="doc"><span class="ico">SU</span><span><strong>'+esc(x.name)+'</strong> · '+esc(x.cats.join(', '))+'</span><span class="tag tag-green">Verified</span></div>'); });
    data.issues.forEach(function(x){ if(hit(x.poRef,x.who,x.text)) rows.push('<div class="doc"><span class="ico">!</span><span><strong>'+esc(x.poRef)+'</strong> · '+esc(x.text)+' · '+esc(x.status)+'</span><a class="btn btn-ghost btn-sm" href="#order-'+x.offerId+'">Order page</a></div>'); });
    return card('Search · '+esc(query), rows.length+' result'+(rows.length===1?'':'s')+' across requests, orders, suppliers and problems.', rows.length?'<div class="docs">'+rows.slice(0,30).join('')+'</div>':'<div class="empty">Nothing matches.</div>');
  }
  $('adSearch').addEventListener('input', function(){ query=this.value; render(); });
  function card(title, sub, body){ return '<section class="card" style="display:grid;gap:.7rem"><div><strong style="font-family:var(--display);font-size:1.05rem">'+title+'</strong>'+(sub?'<p class="small muted">'+sub+'</p>':'')+'</div>'+body+'</section>'; }
  function renderOverview(){
    var recent=[];
    data.boqs.forEach(function(b){ recent.push([b.createdAt,'Request '+b.ref+' from '+esc(b.company)+' · '+(b.lines||[]).length+' lines · '+esc(b.subcity)]); });
    data.offers.forEach(function(o){ var b=boqOf(o.boqId); recent.push([o.createdAt,'Offer from '+esc(o.supplierName)+' on '+(b?b.ref:'')+' line '+o.lineN+' · '+BS.fmt(offerTotal(o))]); if(o.acceptedAt) recent.push([o.acceptedAt,'PO '+esc(o.poRef)+' issued · '+esc(o.supplierName)]); if(o.paidAt) recent.push([o.paidAt,'Paid '+esc(o.poRef)+' · '+BS.fmt(offerTotal(o))+' · '+esc(o.paymentRef||'')]); });
    data.verifications.forEach(function(v){ recent.push([v.submittedAt||v.createdAt,'Documents from '+esc(v.company)+' · '+esc(v.status)]); });
    data.news.forEach(function(x){ recent.push([x.createdAt,'Newsletter item from '+esc(x.company)+' · '+esc(x.status)]); });
    recent.sort(function(a,c){ return (c[0]||'').localeCompare(a[0]||''); });
    var todo=[];
    if(unclassified().length) todo.push('<a href="#" data-tab-go="requests">'+unclassified().length+' line(s) typed by customers need a category</a>');
    var pv=data.verifications.filter(function(v){return v.status==='pending';}).length; if(pv) todo.push('<a href="#" data-tab-go="suppliers">'+pv+' supplier(s) waiting for verification</a>');
    var w=threads().filter(function(t){return t.waiting;}).length; if(w) todo.push('<a href="#" data-tab-go="support">'+w+' support thread(s) waiting for an answer</a>');
    var pn=data.news.filter(function(x){return x.status==='pending';}).length; if(pn) todo.push('<a href="#" data-tab-go="news">'+pn+' newsletter item(s) to check</a>');
    var oi=data.issues.filter(function(x){return x.status!=='resolved';}).length; if(oi) todo.push('<a href="#" data-tab-go="support">'+oi+' problem(s) reported on orders, open or in progress</a>');
    return adTilesHtml+'<div class="grid2" style="align-items:start">'+card('To do today','', todo.length?'<ul style="margin:0;padding-left:1.1rem;display:grid;gap:.3rem">'+todo.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>':'<div class="empty">Nothing waiting. New requests, documents and messages appear here as they come in.</div>')+
      card('Latest activity','Across all members, newest first.','<div class="docs">'+(recent.slice(0,15).map(function(r){ return '<div class="doc"><span class="small muted" style="white-space:nowrap">'+when(r[0])+'</span><span>'+r[1]+'</span><span></span></div>'; }).join('')||'<div class="empty">No activity yet.</div>')+'</div>')+'</div>';
  }
  $('adBody').addEventListener('click', function(e){ var a=e.target.closest('[data-tab-go]'); if(a){ e.preventDefault(); tab=a.dataset.tabGo; render(); } });

  function renderRequests(){
    var list=data.boqs.slice().sort(function(a,c){ return (c.createdAt||'').localeCompare(a.createdAt||''); });
    if(!list.length) return card('Requests','','<div class="empty">No requests yet.</div>');
    return list.map(function(b){
      var os=data.offers.filter(function(o){ return o.boqId===b.id; }); var left=BS.days(new Date(b.deadlineAt)-Date.now());
      var state = b.status==='withdrawn' ? '<span class="tag">Withdrawn</span>' : os.some(function(o){return o.paidAt;}) ? '<span class="tag tag-green">Paid</span>' : os.some(function(o){return o.status==='accepted';}) ? '<span class="tag tag-green">PO issued</span>' : left>0 ? '<span class="tag tag-ochre">Open · '+left+' d left</span>' : '<span class="tag">Deadline passed</span>';
      var rows=(b.lines||[]).map(function(l){
        var lo=os.filter(function(o){ return o.lineN===l.n; }); var acc=lo.filter(function(o){ return o.status==='accepted'; })[0];
        var other=/Other/.test(l.cat||'');
        return '<div class="doc" style="grid-template-columns:auto 1fr auto auto"><span class="ico">'+l.n+'</span><span><strong>'+esc(l.item)+'</strong> · '+l.qty+' '+esc(l.unit)+(l.needed?' · by '+l.needed:'')+'<br><span class="small muted">'+(other?'Typed by the customer, not in the catalogue':esc(l.cat))+'</span></span>'+
          (other ? '<select data-classify="'+b.id+'" data-line="'+l.n+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--ochre);border-radius:8px"><option value="">Choose a category…</option>'+CATS.map(function(c){ return '<option>'+c+'</option>'; }).join('')+'</select>' : '<span class="small muted">'+lo.length+' offer'+(lo.length!==1?'s':'')+'</span>')+
          '<span>'+(acc?'<span class="tag tag-green">'+(acc.paidAt?'Paid':acc.deliveredAt?'Delivered':acc.dispatchedAt?'On the way':'PO')+' · '+esc(acc.supplierName)+'</span>':'')+'</span></div>';
      }).join('');
      return card(esc(b.ref)+' · '+esc(b.company)+' · '+esc(b.customerNo||''), esc(b.subcity)+', '+esc(b.city||'')+' · '+esc(b.deliveryTerm)+' · '+esc(b.paymentTerm)+(b.insurance?' · insurance':'')+(b.pin?' · site pinned':'')+' · sent '+when(b.createdAt)+' · owner '+fmtPhone(b.ownerPhone),
        '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">'+state+(b.status!=='withdrawn' && !os.some(function(o){return o.status==='accepted';}) ? '<button class="btn btn-ghost btn-sm" type="button" data-close="'+b.id+'">Close request</button>':'')+'</div><div class="docs">'+rows+'</div>');
    }).join('');
  }
  $('adBody').addEventListener('change', async function(e){
    var s=e.target.closest('[data-classify]'); if(!s || !s.value) return;
    var b=boqOf(s.dataset.classify); if(!b) return; var lines=(b.lines||[]).map(function(l){ return l.n===+s.dataset.line ? Object.assign({}, l, {cat:s.value}) : l; });
    await BS.update('boqs', b.id, {lines:lines}); bsToast('Line '+s.dataset.line+' sent to the '+s.value+' suppliers.');
  });

  function renderSuppliers(){
    var list=data.verifications.slice().sort(function(a,c){ return (a.status==='pending'?0:1)-(c.status==='pending'?0:1) || (c.submittedAt||'').localeCompare(a.submittedAt||''); });
    var seeded=BS.SUPPLIERS.map(function(s){ return '<div class="doc"><span class="ico">OK</span><span><strong>'+esc(s.name)+'</strong><br><span class="small muted">'+esc(s.cats.join(', '))+' · '+esc(s.sub||'')+(s.auto?' · answers requests automatically on the test site':' · played by a shareholder')+'</span></span><span class="tag tag-green">Verified</span></div>'; }).join('');
    var rows=list.map(function(v){
      var tag = v.status==='verified' ? '<span class="tag tag-green">Verified</span>' : v.status==='rejected' ? '<span class="tag">Rejected</span>' : '<span class="tag tag-ochre">Pending</span>';
      return '<div class="card" style="display:grid;gap:.5rem"><div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><div><strong style="font-family:var(--display)">'+esc(v.company)+'</strong><br><span class="small muted">'+fmtPhone(v.phone)+' · TIN '+esc(v.tin||'')+' · '+esc((v.cats||[]).join(', '))+' · dispatch '+esc(v.sub||'')+'</span></div>'+tag+'</div>'+
        '<div class="small">Licence <strong>'+esc(v.lic||'—')+'</strong>'+(v.exp?' · expires '+esc(v.exp):'')+' · VAT: '+esc(v.vat||'')+' · files: '+esc((v.files||[]).join(', ')||'none attached')+' · submitted '+when(v.submittedAt)+(v.reason?'<br>Reason given: '+esc(v.reason):'')+'</div>'+
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">'+(v.status!=='verified'?'<button class="btn btn-primary btn-sm" type="button" data-verify="'+v.id+'">Approve</button>':'')+(v.status!=='rejected'?'<input placeholder="Reason (for a rejection)" data-reason="'+v.id+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px;min-width:14rem"><button class="btn btn-ghost btn-sm" type="button" data-reject="'+v.id+'">Reject</button>':'')+'</div></div>';
    }).join('');
    return card('Verification queue','Suppliers who submitted a licence and TIN. Approving unlocks quoting; the supplier is told by SMS.', rows||'<div class="empty">No documents waiting. New registrations appear here when they submit their licence.</div>')+card('Suppliers on the platform','', '<div class="docs">'+seeded+'</div>');
  }
  $('adBody').addEventListener('click', async function(e){
    var v=e.target.closest('[data-verify]'); if(v){ v.disabled=true; await BS.update('verifications', v.dataset.verify, {status:'verified', verifiedAt:new Date().toISOString(), by:staffName(), reason:''}); bsToast('Approved. The supplier can quote now.'); return; }
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
  function renderSupport(){
    var ts=threads(); var issuesHtml=renderIssues(); if(!ts.length) return issuesHtml+card('Support inbox','Messages members send from their Mailbox.','<div class="empty">No messages yet.</div>');
    return issuesHtml+ts.map(function(t){
      var msgs=t.msgs.map(function(m){ return '<div class="msg '+(m.who==='staff'?'me':'')+'"><div class="t">'+(m.who==='staff'?(m.staff?esc(m.staff):'Auto-reply'):esc(t.name||'Member'))+' · '+when(m.createdAt)+'</div>'+esc(m.text)+'</div>'; }).join('');
      return '<section class="card" style="display:grid;gap:.6rem"><div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><div><strong style="font-family:var(--display)">'+esc(t.name||'Member')+'</strong> <span class="small muted">'+fmtPhone(t.phone)+'</span></div>'+(t.waiting?'<span class="tag tag-ochre">Waiting for an answer</span>':'<span class="tag tag-green">Answered</span>')+'</div><div class="chat" style="max-height:16rem;overflow:auto">'+msgs+'</div><div class="chat-in"><div class="field"><input placeholder="Reply as Build Smartly support…" data-reply="'+esc(t.phone)+'"></div><button class="btn btn-primary btn-sm" type="button" data-send="'+esc(t.phone)+'">Send</button></div></section>';
    }).join('');
  }
  async function sendReply(phone){ var inp=document.querySelector('[data-reply="'+phone+'"]'); var text=inp?inp.value.trim():''; if(!text) return; inp.value=''; await BS.add('messages', {phone:phone, who:'staff', staff:staffName(), text:text}); bsToast('Sent. The member sees it in the Mailbox and gets an SMS.'); }
  $('adBody').addEventListener('click', function(e){ var b=e.target.closest('[data-send]'); if(b) sendReply(b.dataset.send); });
  $('adBody').addEventListener('keydown', function(e){ var i=e.target.closest('[data-reply]'); if(i && e.key==='Enter'){ e.preventDefault(); sendReply(i.dataset.reply); } });

  function renderNews(){
    var pend=data.news.filter(function(x){ return x.status==='pending'; }), pub=data.news.filter(function(x){ return x.status==='published'; }).sort(function(a,c){ return (c.createdAt||'').localeCompare(a.createdAt||''); });
    var KIND={news:'Newsletter item', feature:'Featured supplier', pulse:'Price pulse tile', banner:'Member banner', directory:'Directory highlight', platform:'From Build Smartly'};
    var item=function(x, actions){ return '<div class="doc" style="grid-template-columns:'+(x.img?'8rem ':'')+'1fr auto">'+(x.img?'<img src="'+x.img+'" alt="" style="width:8rem;aspect-ratio:3/1;object-fit:cover;border-radius:6px">':'')+'<span><span class="tag '+(x.kind==='platform'?'tag-green':'tag-ochre')+'">'+esc(KIND[x.kind]||x.kind)+'</span> <span class="small muted">'+esc(x.who||'')+(x.who?' · ':'')+esc(x.company)+' · '+fmtPhone(x.phone)+' · '+when(x.createdAt)+(x.issue?' · '+esc(x.issue):'')+'</span><br><strong>'+esc(x.title)+'</strong><br><span class="small">'+esc(x.text)+'</span></span><span style="display:flex;gap:.4rem;flex-wrap:wrap">'+actions+'</span></div>'; };
    return card('Items to check', 'Check the text (no phone numbers, addresses or prices), then publish. Finance invoices the placement.', pend.length? '<div class="docs">'+pend.map(function(x){ return item(x, '<button class="btn btn-primary btn-sm" type="button" data-publish="'+x.id+'">Publish</button><button class="btn btn-ghost btn-sm" type="button" data-unpublish="'+x.id+'">Reject</button>'); }).join('')+'</div>' : '<div class="empty">Nothing pending.</div>')+
      card('Write an item from Build Smartly','Platform news for the next issue: price pulse, new categories, notices.','<div class="field"><label for="adNwTitle">Headline</label><input id="adNwTitle" maxlength="90"></div><div class="field"><label for="adNwText">Text</label><textarea id="adNwText" rows="2" maxlength="300" style="font:inherit;font-size:.95rem;padding:.6rem;border:1.5px solid var(--line);border-radius:10px;background:var(--white);color:var(--fg);width:100%"></textarea></div><div><button class="btn btn-primary btn-sm" type="button" id="adNwSend">Publish in the '+issueLabel()+' issue</button></div>')+
      card('Published · '+issueLabel(),'What members see under Newsletter, on top of the example issue.', pub.length? '<div class="docs">'+pub.map(function(x){ return item(x, '<button class="btn btn-ghost btn-sm" type="button" data-unpublish="'+x.id+'">Take down</button>'); }).join('')+'</div>' : '<div class="empty">Nothing published yet.</div>');
  }
  $('adBody').addEventListener('click', async function(e){
    var p=e.target.closest('[data-publish]'); if(p){ p.disabled=true; await BS.update('news', p.dataset.publish, {status:'published', issue:issueLabel(), publishedAt:new Date().toISOString(), by:staffName()}); bsToast('Published. Members see it under Newsletter.'); return; }
    var u=e.target.closest('[data-unpublish]'); if(u){ u.disabled=true; await BS.update('news', u.dataset.unpublish, {status:'rejected', by:staffName()}); bsToast('Taken down.'); return; }
    if(e.target.id==='adNwSend'){ var t=$('adNwTitle').value.trim(), x=$('adNwText').value.trim(); if(!t||!x){ bsToast('Headline and text are needed.'); return; } e.target.disabled=true; await BS.add('news', {company:'Build Smartly', kind:'platform', title:t, text:x, phone:'', status:'published', issue:issueLabel(), by:staffName()}); bsToast('Published.'); }
  });

  function renderMembers(){
    var list=data.profiles.slice().sort(function(a,c){ return (c.updatedAt||'').localeCompare(a.updatedAt||''); });
    return card('Member profiles','Profiles members asked to publish in the directory. Hide one that breaks the rules (phone numbers, addresses, prices in the text or pictures).', list.length? '<div class="docs">'+list.map(function(p){ var hidden=p.status==='hidden'; return '<div class="doc"><span class="ico">'+esc((p.name||'?').slice(0,2).toUpperCase())+'</span><span><strong>'+esc(p.name)+'</strong> <span class="small muted">'+(p.kind==='supplier'?'Supplier':'Buyer')+' · '+fmtPhone(p.phone)+' · '+(p.publish?'wants it published':'not published')+'</span><br><span class="small">'+esc(p.intro||'(no introduction)')+'</span></span><span>'+(hidden?'<button class="btn btn-ghost btn-sm" type="button" data-show="'+p.id+'">Show again</button>':'<button class="btn btn-ghost btn-sm" type="button" data-hide="'+p.id+'">Hide</button>')+'</span></div>'; }).join('')+'</div>' : '<div class="empty">No member profiles yet. The seeded suppliers on the Members page are part of the site itself.</div>');
  }
  $('adBody').addEventListener('click', async function(e){
    var h=e.target.closest('[data-hide]'); if(h){ await BS.update('profiles', h.dataset.hide, {status:'hidden', by:staffName()}); bsToast('Hidden from the directory.'); return; }
    var s=e.target.closest('[data-show]'); if(s){ await BS.update('profiles', s.dataset.show, {status:'approved', by:staffName()}); bsToast('Visible again.'); return; }
  });

  function renderFinance(){
    var rows=paid(), goods=0, fees=0;
    var html=rows.map(function(o){ var b=boqOf(o.boqId)||{}; var t=offerTotal(o), f=Math.round(t*BS.FEE_RATE); goods+=t; fees+=f; return '<tr><td>'+when(o.paidAt)+'</td><td><a href="#order-'+o.id+'">'+esc(o.poRef)+'</a></td><td>'+esc(b.company||o.customerRevealed||'')+'</td><td>'+esc(o.supplierName)+'</td><td style="text-align:right">'+BS.fmt(t)+'</td><td style="text-align:right">'+BS.fmt(f)+'</td><td>'+esc(o.paymentRef||'')+'</td></tr>'; }).join('');
    var inprog=data.offers.filter(function(o){ return o.status==='accepted' && !o.paidAt; });
    return card('Completed sales and fees','Fee '+BS.pct(BS.FEE_RATE)+' of each paid order (example rate until the owner sets it). Settled with the supplier when the gateway confirms.',
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
  function renderSettings(){
    var T=BS.TRUCK, I=BS.INSURANCE;
    var f=function(id,label,val,step){ return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="number" step="'+(step||1)+'" value="'+val+'"></div>'; };
    var brands=CATS.map(function(c){ return '<div class="field"><label>'+esc(c)+'</label><div class="chips" data-brandcat="'+esc(c)+'">'+(BS.BRANDS[c]||[]).map(function(b){ return '<span class="chip on">'+esc(b)+' <span data-rmbrand="'+esc(b)+'" style="cursor:pointer;margin-left:.2rem">×</span></span>'; }).join('')+'<input placeholder="Add a brand, press Enter" data-addbrand="'+esc(c)+'" style="font:inherit;font-size:.85rem;padding:.3rem .5rem;border:1.5px solid var(--line);border-radius:999px;min-width:12rem"></div></div>'; }).join('');
    return card('Tariffs and rules', 'Example figures until the owner sets them. Saved for every device'+(BS.tariffsSetBy?' · last set by '+esc(BS.tariffsSetBy):'')+'.',
      '<div class="grid3">'+f('tPerTrip','Truck: fixed cost per trip (ETB)',T.perTrip)+f('tPerKm','Truck: cost per km (ETB)',T.perKm)+f('tCap','Truck capacity (tonnes)',T.capacityT)+f('tMob','Equipment mobilisation per hire (ETB)',T.mobilisation)+f('tInsRate','Transit insurance rate (% of goods)',Math.round(I.rate*1000)/10,0.1)+f('tInsMin','Insurance minimum (ETB)',I.min)+f('tFee','Platform fee (% of each sale)',Math.round(BS.FEE_RATE*1000)/10,0.1)+f('tLead','Minimum needed-by lead time (days)',BS.MIN_LEAD_DAYS)+f('tValid','Days suppliers have to reply',BS.VALIDITY_DAYS)+'</div><div><button class="btn btn-primary btn-sm" type="button" id="adSaveTariffs">Save tariffs</button> <span class="small muted" id="adTariffMsg"></span></div>')+
      card('Brands per category','The list suppliers choose from when they quote, and what buyers see on each offer. Supplier names are never shown before the PO.', brands+'<div><button class="btn btn-primary btn-sm" type="button" id="adSaveBrands">Save brands</button> <span class="small muted" id="adBrandMsg"></span></div>')+
      card('Site pictures','Replace the drawn placeholders with real photos. JPG or PNG from your computer or phone; the picture is resized and cropped to fit and shown on every device within seconds. Use photos you have the right to use (your own, or free-licence stock photos).',
        '<div class="docs">'+BS.PIC_SLOTS.map(function(sl){ var cur=BS.PICS[sl.key]; var def='assets/photos/'+sl.key+'.jpg'; return '<div class="doc" style="grid-template-columns:7rem 1fr auto"><img src="'+(cur||def)+'" alt="" style="width:7rem;aspect-ratio:'+sl.w+'/'+sl.h+';object-fit:cover;border-radius:'+(sl.w===sl.h?'50%':'6px')+'"><span><strong>'+esc(sl.label)+'</strong><br><span class="small muted">'+sl.w+' × '+sl.h+' px · '+(cur?'photo set by staff':'site photo')+'</span></span><span style="display:flex;gap:.4rem;flex-wrap:wrap"><label class="btn btn-primary btn-sm" style="cursor:pointer">'+(cur?'Replace':'Upload photo')+'<input type="file" accept="image/*" hidden data-pic-up="'+sl.key+'"></label>'+(cur?'<button class="btn btn-ghost btn-sm" type="button" data-pic-rm="'+sl.key+'">Remove</button>':'')+'</span></div>'; }).join('')+'</div><p class="small muted" id="adPicMsg"></p>');
  }
  /* site pictures: resize and crop in the browser, store as a JPEG data URL in settings/pic-<key> */
  function fitPicture(file, w, h){
    return new Promise(function(res, rej){ var r=new FileReader(); r.onload=function(){ var img=new Image(); img.onload=function(){ var c=document.createElement('canvas'); c.width=w; c.height=h; var ctx=c.getContext('2d'); var sc=Math.max(w/img.width, h/img.height), sw=w/sc, sh=h/sc, sx=(img.width-sw)/2, sy=(img.height-sh)/2; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); var q=0.82, out=c.toDataURL('image/jpeg', q); while(out.length>700000 && q>0.4){ q-=0.1; out=c.toDataURL('image/jpeg', q); } res(out); }; img.onerror=function(){ rej(new Error('bad image')); }; img.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); });
  }
  $('adBody').addEventListener('change', async function(e){
    var i=e.target.closest('[data-pic-up]'); if(!i) return; var f=i.files&&i.files[0]; if(!f) return; var sl=BS.PIC_SLOTS.filter(function(x){ return x.key===i.dataset.picUp; })[0]; if(!sl) return;
    $('adPicMsg').textContent='Preparing '+f.name+'…';
    try{ var data=await fitPicture(f, sl.w, sl.h); await BS.set('settings', 'pic-'+sl.key, {data:data, setBy:staffName(), name:f.name}); $('adPicMsg').textContent='Saved. It shows on every device now.'; bsToast('Picture saved.'); }
    catch(err){ $('adPicMsg').textContent='That file could not be read. Use a JPG or PNG.'; }
  });
  $('adBody').addEventListener('click', async function(e){ var b=e.target.closest('[data-pic-rm]'); if(!b) return; b.disabled=true; await BS.set('settings', 'pic-'+b.dataset.picRm, {data:'', setBy:staffName()}); bsToast('Back to the drawn placeholder.'); });
  var brandDraft=null;
  function brandsNow(){ if(!brandDraft){ brandDraft={}; CATS.forEach(function(c){ brandDraft[c]=(BS.BRANDS[c]||[]).slice(); }); } return brandDraft; }
  function redrawBrands(){ var m=brandsNow(); document.querySelectorAll('[data-brandcat]').forEach(function(box){ var c=box.dataset.brandcat; var inp=box.querySelector('input'); var v=inp?inp.value:''; box.innerHTML=m[c].map(function(b){ return '<span class="chip on">'+esc(b)+' <span data-rmbrand="'+esc(b)+'" style="cursor:pointer;margin-left:.2rem">×</span></span>'; }).join('')+'<input placeholder="Add a brand, press Enter" data-addbrand="'+esc(c)+'" style="font:inherit;font-size:.85rem;padding:.3rem .5rem;border:1.5px solid var(--line);border-radius:999px;min-width:12rem" value="'+esc(v)+'">'; }); }
  $('adBody').addEventListener('keydown', function(e){ var i=e.target.closest('[data-addbrand]'); if(!i || e.key!=='Enter') return; e.preventDefault(); var v=i.value.trim(); if(!v) return; var m=brandsNow(); if(m[i.dataset.addbrand].indexOf(v)<0) m[i.dataset.addbrand].push(v); i.value=''; redrawBrands(); });
  $('adBody').addEventListener('click', async function(e){
    var x=e.target.closest('[data-rmbrand]'); if(x){ var box=x.closest('[data-brandcat]'); var m=brandsNow(); m[box.dataset.brandcat]=m[box.dataset.brandcat].filter(function(b){ return b!==x.dataset.rmbrand; }); redrawBrands(); return; }
    if(e.target.id==='adSaveBrands'){ e.target.disabled=true; var m=brandsNow(); await BS.set('settings','brands',{map:m, setBy:staffName()}); brandDraft=null; $('adBrandMsg').textContent='Saved.'; bsToast('Brand lists saved for every device.'); e.target.disabled=false; return; }
    if(e.target.id==='adSaveTariffs'){ e.target.disabled=true; var v=function(id){ return +document.getElementById(id).value; };
      await BS.set('settings','tariffs',{perTrip:v('tPerTrip'), perKm:v('tPerKm'), capacityT:v('tCap'), mobilisation:v('tMob'), insuranceRate:v('tInsRate')/100, insuranceMin:v('tInsMin'), feeRate:v('tFee')/100, minLeadDays:v('tLead'), validityDays:v('tValid'), setBy:staffName()});
      $('adTariffMsg').textContent='Saved and applied.'; bsToast('Tariffs saved. Estimates and fees now use them everywhere.'); e.target.disabled=false; return; }
  });
})();

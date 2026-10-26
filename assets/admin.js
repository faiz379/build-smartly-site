/* Build Smartly · staff page (#admin). Reads the same records as buyers and suppliers:
   requests (boqs), offers, support messages, member profiles, newsletter items, supplier verifications and settings.
   Staff sign in with a staff number and the staff password; the session is kept per browser tab. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var data={boqs:[],offers:[],messages:[],profiles:[],news:[],verifications:[],settings:[]};
  var tab='overview', mode='local', booted=false;
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
  ['boqs','offers','messages','profiles','news','verifications','settings'].forEach(function(c){ BS.subscribe(c, function(d){ data[c]=d||[]; if(isAdmin() && !$('adPanel').hidden) render(); }); });
  $('adTabs').addEventListener('click', function(e){ var b=e.target.closest('[data-tab]'); if(!b) return; tab=b.dataset.tab; render(); });

  /* ---- helpers over the records ---- */
  function boqOf(id){ return data.boqs.filter(function(b){ return b.id===id; })[0]; }
  function lineOf(b, n){ return b ? (b.lines||[]).filter(function(l){ return l.n===n; })[0] : null; }
  function openBoq(b){ return b.status!=='withdrawn' && new Date(b.deadlineAt)>new Date(); }
  function unclassified(){ var out=[]; data.boqs.forEach(function(b){ (b.lines||[]).forEach(function(l){ if(/Other/.test(l.cat||'')) out.push({b:b,l:l}); }); }); return out; }
  function threads(){
    var by={}; data.messages.forEach(function(m){ var k=m.phone||'?'; (by[k]=by[k]||{phone:k,name:'',msgs:[]}).msgs.push(m); if(m.name) by[k].name=m.name; });
    return Object.keys(by).map(function(k){ var t=by[k]; t.msgs.sort(function(a,c){ return (a.createdAt||'').localeCompare(c.createdAt||''); }); var last=t.msgs[t.msgs.length-1]; t.last=last; t.waiting = t.msgs.filter(function(m){ return m.who==='customer'; }).length>0 && !t.msgs.some(function(m){ return m.who==='staff' && m.staff; }) || (last && last.who==='customer'); return t; }).sort(function(a,c){ return (c.last.createdAt||'').localeCompare(a.last.createdAt||''); });
  }
  function paid(){ return data.offers.filter(function(o){ return o.paidAt; }).sort(function(a,c){ return (c.paidAt||'').localeCompare(a.paidAt||''); }); }
  function offerTotal(o){ return o.qtyOffered*o.unitPrice+(+o.deliveryCost||0); }

  /* ---- render ---- */
  function render(){
    var pendV=data.verifications.filter(function(v){ return v.status==='pending'; }).length;
    var waiting=threads().filter(function(t){ return t.waiting; }).length;
    var pendN=data.news.filter(function(x){ return x.status==='pending'; }).length;
    var inProg=data.offers.filter(function(o){ return o.status==='accepted' && !o.paidAt; }).length;
    var fees=0; paid().forEach(function(o){ fees+=offerTotal(o)*BS.FEE_RATE; });
    var tiles=[[data.boqs.filter(openBoq).length,'Open requests','requests'],[unclassified().length,'Lines to classify','requests'],[pendV,'Suppliers awaiting verification','suppliers'],[waiting,'Support threads waiting','support'],[pendN,'Newsletter items pending','news'],[inProg,'Orders in progress','finance'],[paid().length,'Orders paid','finance'],[BS.fmt(fees),'Fees earned ('+BS.pct(BS.FEE_RATE)+')','finance']];
    $('adTiles').innerHTML=tiles.map(function(t){ return '<button type="button" class="q" data-go="'+t[2]+'" style="text-align:left;cursor:pointer;font:inherit"><strong style="font-size:1.4rem">'+t[0]+'</strong><span class="small muted">'+t[1]+'</span></button>'; }).join('');
    $('adTabs').querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.dataset.tab===tab); });
    var r={overview:renderOverview, requests:renderRequests, suppliers:renderSuppliers, support:renderSupport, news:renderNews, members:renderMembers, finance:renderFinance, settings:renderSettings}[tab]||renderOverview;
    $('adBody').innerHTML=r();
  }
  $('adTiles').addEventListener('click', function(e){ var b=e.target.closest('[data-go]'); if(!b) return; tab=b.dataset.go; render(); });

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
    return '<div class="grid2" style="align-items:start">'+card('To do today','', todo.length?'<ul style="margin:0;padding-left:1.1rem;display:grid;gap:.3rem">'+todo.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>':'<div class="empty">Nothing waiting. New requests, documents and messages appear here as they come in.</div>')+
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

  function renderSupport(){
    var ts=threads(); if(!ts.length) return card('Support inbox','Messages members send from their Mailbox.','<div class="empty">No messages yet.</div>');
    return ts.map(function(t){
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
    var html=rows.map(function(o){ var b=boqOf(o.boqId)||{}; var t=offerTotal(o), f=Math.round(t*BS.FEE_RATE); goods+=t; fees+=f; return '<tr><td>'+when(o.paidAt)+'</td><td>'+esc(o.poRef)+'</td><td>'+esc(b.company||o.customerRevealed||'')+'</td><td>'+esc(o.supplierName)+'</td><td style="text-align:right">'+BS.fmt(t)+'</td><td style="text-align:right">'+BS.fmt(f)+'</td><td>'+esc(o.paymentRef||'')+'</td></tr>'; }).join('');
    var inprog=data.offers.filter(function(o){ return o.status==='accepted' && !o.paidAt; });
    return card('Completed sales and fees','Fee '+BS.pct(BS.FEE_RATE)+' of each paid order (example rate until the owner sets it). Settled with the supplier when the gateway confirms.',
      (rows.length? '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.9rem"><thead><tr style="text-align:left;color:var(--fg-2)"><th>Paid</th><th>PO</th><th>Buyer</th><th>Supplier</th><th style="text-align:right">Order value</th><th style="text-align:right">Fee</th><th>Payment ref</th></tr></thead><tbody>'+html+'</tbody><tfoot><tr style="font-weight:700"><td colspan="4">Total · '+rows.length+' orders</td><td style="text-align:right">'+BS.fmt(goods)+'</td><td style="text-align:right">'+BS.fmt(fees)+'</td><td></td></tr></tfoot></table></div><div><button class="btn btn-ghost btn-sm" type="button" id="adCsv">Download as CSV</button></div>' : '<div class="empty">No paid orders yet.</div>'))+
      card('Orders in progress','Accepted, not yet paid.', inprog.length? '<div class="docs">'+inprog.map(function(o){ var b=boqOf(o.boqId)||{}; return '<div class="doc"><span class="ico">PO</span><span><strong>'+esc(o.poRef)+'</strong> · '+esc(b.company||'')+' ← '+esc(o.supplierName)+' · '+BS.fmt(offerTotal(o))+'</span><span class="tag">'+(o.deliveredAt?'Delivered, payment due':o.dispatchedAt?'On the way':o.readyAt?'Goods ready':o.supplierConfirmed?'Contract':'Awaiting reconfirmation')+'</span></div>'; }).join('')+'</div>' : '<div class="empty">None.</div>');
  }
  $('adBody').addEventListener('click', function(e){
    if(e.target.id!=='adCsv') return;
    var lines=[['Paid','PO','Buyer','Supplier','Order value ETB','Fee ETB','Payment ref']];
    paid().forEach(function(o){ var b=boqOf(o.boqId)||{}; var t=offerTotal(o); lines.push([o.paidAt, o.poRef, b.company||'', o.supplierName, t, Math.round(t*BS.FEE_RATE), o.paymentRef||'']); });
    var csv=lines.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
    var a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='build-smartly-fees.csv'; document.body.appendChild(a); a.click(); a.remove();
  });

  function renderSettings(){
    var T=BS.TRUCK, I=BS.INSURANCE;
    var f=function(id,label,val,step){ return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="number" step="'+(step||1)+'" value="'+val+'"></div>'; };
    var brands=CATS.map(function(c){ return '<div class="field"><label>'+esc(c)+'</label><div class="chips" data-brandcat="'+esc(c)+'">'+(BS.BRANDS[c]||[]).map(function(b){ return '<span class="chip on">'+esc(b)+' <span data-rmbrand="'+esc(b)+'" style="cursor:pointer;margin-left:.2rem">×</span></span>'; }).join('')+'<input placeholder="Add a brand, press Enter" data-addbrand="'+esc(c)+'" style="font:inherit;font-size:.85rem;padding:.3rem .5rem;border:1.5px solid var(--line);border-radius:999px;min-width:12rem"></div></div>'; }).join('');
    return card('Tariffs and rules', 'Example figures until the owner sets them. Saved for every device'+(BS.tariffsSetBy?' · last set by '+esc(BS.tariffsSetBy):'')+'.',
      '<div class="grid3">'+f('tPerTrip','Truck: fixed cost per trip (ETB)',T.perTrip)+f('tPerKm','Truck: cost per km (ETB)',T.perKm)+f('tCap','Truck capacity (tonnes)',T.capacityT)+f('tMob','Equipment mobilisation per hire (ETB)',T.mobilisation)+f('tInsRate','Transit insurance rate (% of goods)',Math.round(I.rate*1000)/10,0.1)+f('tInsMin','Insurance minimum (ETB)',I.min)+f('tFee','Platform fee (% of each sale)',Math.round(BS.FEE_RATE*1000)/10,0.1)+f('tLead','Minimum needed-by lead time (days)',BS.MIN_LEAD_DAYS)+f('tValid','Days suppliers have to reply',BS.VALIDITY_DAYS)+'</div><div><button class="btn btn-primary btn-sm" type="button" id="adSaveTariffs">Save tariffs</button> <span class="small muted" id="adTariffMsg"></span></div>')+
      card('Brands per category','The list suppliers choose from when they quote, and what buyers see on each offer. Supplier names are never shown before the PO.', brands+'<div><button class="btn btn-primary btn-sm" type="button" id="adSaveBrands">Save brands</button> <span class="small muted" id="adBrandMsg"></span></div>');
  }
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

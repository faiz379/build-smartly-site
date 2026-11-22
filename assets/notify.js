/* Build Smartly · notification bell (decided 27 Oct 2026). One bell at the top right for buyers, suppliers and staff.
   The list is worked out from the shared records, so it is the same on every device: what arrived or what waits for you
   in the last 30 days, newest first, each linking to the place where you act. Each item stays new until it is opened
   (or "Mark all as read"); read state is kept per account on the device. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var data={boqs:[],offers:[],messages:[],news:[],verifications:[],profiles:[],issues:[],suppliers:[],amendments:[]};
  var DAY=86400000, open=false;
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function digits(p){ return String(p||'').replace(/\D/g,'').replace(/^251/,'').replace(/^0/,''); }
  function ago(iso){ var m=Math.round((Date.now()-new Date(iso).getTime())/60000); if(m<1) return 'just now'; if(m<60) return m+' min ago'; var h=Math.round(m/60); if(h<24) return h+' h ago'; var d=Math.round(h/24); return d+' day'+(d>1?'s':'')+' ago'; }
  function recent(iso){ return iso && (Date.now()-new Date(iso).getTime()) < 30*DAY; }
  function who(){ var m=BS.me()||{}; if(BS.isStaff && BS.isStaff()) return {role:'staff', key:'staff'}; if(!m.phone) return null; return {role: m.supplierId ? 'supplier' : 'buyer', key:digits(m.phone), phone:digits(m.phone), supplierId:m.supplierId||'', cats:(BS.supplierById(m.supplierId)||{}).cats||[]}; }
  function boqOf(id){ return data.boqs.filter(function(b){ return b.id===id; })[0]||{}; }
  function lineName(b,n){ return ((b.lines||[]).filter(function(l){ return l.n===n; })[0]||{}).item||''; }

  function items(){
    var w=who(); if(!w) return [];
    var out=[]; function add(t, kind, text, href){ if(recent(t)) out.push({t:t, kind:kind, text:text, href:href}); }
    var groups=BS.orderGroups(data.offers);
    if(w.role==='staff'){
      data.boqs.forEach(function(b){ if(b.status==='review') add(b.createdAt, b.upload?'List to type in':'Request to check', b.ref+' · '+((b.upload||{}).name||'a file')+' from '+(b.company||'a buyer'), '#staff-requests'); else add(b.createdAt, 'Request', b.ref+' · '+(b.lines||[]).length+' lines from '+(b.company||'a buyer'), '#staff-requests'); });
      data.messages.forEach(function(m){ if(m.orderId){ if(m.who!=='staff') add(m.createdAt, 'Order message', (m.name||'')+': '+m.text, '#order-'+m.orderId); } else if(m.who==='customer') add(m.createdAt, 'Support', (m.name||'A member')+': '+m.text, '#staff-support'); });
      data.verifications.forEach(function(v){ if(v.status!=='pending') return; if(v.kind==='buyer') add(v.submittedAt||v.createdAt, 'Buyer to verify', (v.company||v.name||'A buyer')+' asks to be verified', '#staff-members'); else add(v.submittedAt||v.createdAt, 'Supplier documents', v.company+' asks to be verified', '#staff-suppliers'); });
      data.profiles.forEach(function(p){ if(p.status==='pending') add(p.updatedAt||p.createdAt, 'Profile to approve', (p.name||'A member')+' asks to publish a profile', '#staff-members'); });
      data.news.forEach(function(n){ if(n.status==='pending') add(n.createdAt, n.img?'Advert to approve':'Newsletter item', (n.company||'')+': '+(n.title||''), '#staff-promos'); if(n.status==='approved') add(n.approvedAt, 'Advert waiting for payment', (n.company||'')+': '+BS.fmt(n.amount||0), '#staff-promos'); });
      data.issues.forEach(function(x){ if(x.status!=='resolved') add(x.createdAt, 'Problem reported', (x.poRef||'')+': '+x.text, '#staff-support'); });
      groups.forEach(function(g){ add(g.first.acceptedAt, 'Order placed', g.poRef+' · '+g.first.customerRevealed+' → '+g.supplierName, '#order-'+g.id); if(g.first.paidAt) add(g.first.paidAt, 'Paid', g.poRef+' · '+BS.fmt(g.first.paidTotal||0), '#staff-finance'); });
    } else if(w.role==='supplier'){
      var meSup=BS.supplierById(w.supplierId);
      data.boqs.forEach(function(b){ if(b.status!=='open' || b.ownerPhone===w.phone || (meSup && !BS.supplierSees(meSup, b, w.phone))) return; var n=(b.lines||[]).filter(function(l){ return w.cats.indexOf(l.cat)>=0; }).length; if(n) add(b.sentAt||b.createdAt, 'New request', b.ref+' · '+n+' line'+(n>1?'s':'')+' for you · '+b.subcity, '#supplier-requests'); });
      data.offers.forEach(function(o){ if(o.supplierId!==w.supplierId) return; var b=boqOf(o.boqId);
        if(o.counter && o.counter.state==='open') add(o.counter.at, 'Counter-offer', 'The customer proposes '+BS.fmt(o.counter.price)+' on '+b.ref+' · '+lineName(b,o.lineN), '#supplier-deals');
        if(o.status==='rejected') add(o.rejectedAt, 'Offer rejected', b.ref+' · '+lineName(b,o.lineN), '#supplier-deals'); });
      groups.forEach(function(g){ if(g.supplierId!==w.supplierId) return; var o=g.first, h='#order-'+g.id, b=boqOf(g.boqId)||{};
        if(o.heldForVerify) add(o.acceptedAt, 'New PO/SA', g.poRef+' from Customer '+(b.customerNo||'')+'. Held while our team verifies the buyer; you can confirm once they are.', h);
        else add(o.verifiedAt||o.acceptedAt, 'New PO/SA', g.poRef+(BS.namesShown(o)?' from '+(o.customerRevealed||'a buyer'):' from Customer '+(b.customerNo||''))+'. Confirm it within '+BS.CONFIRM_HOURS+' hours, or decline it.', h);
        if(o.buyerAgreedAt && o.supplierConfirmed && o.buyerAgreedAt>o.confirmedAt) add(o.buyerAgreedAt, 'PO/SA accepted', 'The buyer accepted the PO/SA '+g.poRef+'.', h);
        add(o.deliveredAt, 'Handed over', (o.deliveredHow==='code'?'Your driver entered the buyer\'s handover code for ':o.deliveredHow==='note'?'The buyer entered the delivery-note code for ':'The buyer confirmed delivery of ')+g.poRef+'.', h);
        g.offers.forEach(function(x){ if(x.check && !x.check.auto) add(x.check.at, x.check.state==='ok'?'Item received':'Problem reported', g.poRef+' · '+lineName(b,x.lineN)+(x.check.state==='ok'?' · received in full':' · the buyer reported a problem'), h); });
        add(o.depositAt, 'Deposit paid', g.poRef+' deposit paid · '+BS.fmt(o.depositAmt||0)+(!o.readyAt?'. Prepare the goods.':''), h);
        add(o.paidAt, 'Paid', g.poRef+' paid · '+BS.fmt(o.paidTotal||0)+(BS.payFirst(o)&&!o.readyAt?'. Prepare the goods.':''), h);
        if(BS.payOverdue(o)) add(new Date(BS.payDueAt(o)).toISOString(), 'Payment overdue', g.poRef+': the buyer\'s payment is overdue. Build Smartly follows it up.', h); });
    } else {
      var mine=data.boqs.filter(function(b){ return b.ownerPhone===w.phone; }).map(function(b){ return b.id; });
      data.offers.forEach(function(o){ if(mine.indexOf(o.boqId)<0) return; var b=boqOf(o.boqId);
        add(o.createdAt, 'New offer', b.ref+' · '+lineName(b,o.lineN)+' · brand '+o.brand+' · '+BS.fmt(BS.offerTotal(o)), '#boq-mine');
        if(o.correctedAt && o.status==='sent') add(o.correctedAt, 'Offer revised', b.ref+' · '+lineName(b,o.lineN)+' · brand '+o.brand+' · now '+BS.fmt(BS.offerTotal(o)), '#boq-mine');
        if(o.counter && o.counter.answeredAt) add(o.counter.answeredAt, 'Answer to your price', 'The supplier '+(o.counter.state==='accepted'?'accepted':'declined')+' '+BS.fmt(o.counter.price)+' on '+b.ref+' · '+lineName(b,o.lineN), '#boq-mine'); });
      var offSeen={}; data.offers.forEach(function(o){ if(mine.indexOf(o.boqId)<0 || (o.status!=='declined' && o.status!=='expired') || offSeen[o.poRef]) return; offSeen[o.poRef]=1;
        add(o.declinedAt||o.expiredAt, o.status==='declined'?'PO/SA declined':'PO/SA lapsed', (o.poRef||'')+(o.status==='declined'?' was declined by the supplier':' was not confirmed in time')+'. Choose another offer.', '#boq-mine'); });
      data.boqs.forEach(function(b){ if(b.ownerPhone===w.phone && b.status==='rejected' && b.rejectedAt) add(b.rejectedAt, 'Request not sent', b.ref+': '+(b.rejectReason||'')+'.', '#boq-mine'); if(b.ownerPhone===w.phone && !b.upload && b.sentAt) add(b.sentAt, 'Your request went out', b.ref+' was checked by our team and sent to suppliers.', '#boq-mine'); });
      data.boqs.forEach(function(b){ if(b.ownerPhone===w.phone && b.upload && b.sentAt) add(b.sentAt, 'Your list went out', b.ref+': our team typed in '+(b.lines||[]).length+' item'+((b.lines||[]).length!==1?'s':'')+' from your file and sent them to suppliers.', '#boq-mine'); });
      data.offers.forEach(function(o){ if(mine.indexOf(o.boqId)<0 || o.status!=='cancelled' || offSeen['c'+o.poRef]) return; offSeen['c'+o.poRef]=1; add(o.cancelledAt, 'PO/SA cancelled', (o.poRef||'')+' was cancelled by Build Smartly. Choose another offer.', '#boq-mine'); });
      groups.forEach(function(g){ if(mine.indexOf(g.boqId)<0) return; var o=g.first, h='#order-'+g.id;
        if(o.buyerAgreedAt && o.buyerAgreedAt<=(o.confirmedAt||'')) add(o.confirmedAt, 'PO/SA confirmed', g.poRef+' is confirmed by the supplier. It is binding now.', h);
        else add(o.confirmedAt, 'PO/SA to accept', g.poRef+' is confirmed by the supplier. Read and accept it.', h);
        add(o.readyAt, 'Ready for dispatch', g.poRef+' is ready at '+g.supplierName+'.', h);
        add(o.dispatchedAt, 'Dispatched', g.poRef+' is on its way'+(o.trackId?'; follow the truck on the map':'')+'. Handover code '+(o.handoverCode||'')+'.', h);
        var tk=BS.termOf(o).kind, chkT=o.checkedAt||(BS.isChecked(o)?new Date(BS.checkDue(o)).toISOString():'');
        if(tk==='before') add(o.contractAt, 'Payment due', 'Pay '+g.poRef+' so the supplier can prepare the goods.', h);
        if(tk==='deposit') add(o.contractAt, 'Deposit due', 'Pay the deposit for '+g.poRef+' so the supplier can prepare the goods.', h);
        if(chkT && !o.paidAt){ if(tk==='deposit') add(chkT, 'Balance due', 'Pay the balance of '+g.poRef+'.', h); else if(tk==='after') add(chkT, 'Payment due', 'The items are checked. Pay '+g.poRef+'.', h); else if(tk==='credit') add(chkT, 'Payment due', 'Pay '+g.poRef+' by '+new Date(BS.creditDue(o)).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' (credit).', h); }
        if(BS.payOverdue(o)) add(new Date(BS.payDueAt(o)).toISOString(), 'Payment overdue', g.poRef+': your payment is overdue. Please pay now.', h);
        add(o.depositAt, 'Receipt', 'Deposit for '+g.poRef+' received. Receipt in your Statements.', '#statements');
        add(o.deliveredAt, 'Handed over', g.poRef+' was handed over'+(o.deliveredHow==='code'?' with your handover code':'')+'. Check each item within '+BS.CHECK_HOURS+' hours.', h);
        add(o.paidAt, 'Receipt', 'Payment for '+g.poRef+' received. Receipt in your Statements.', '#statements'); });
      data.news.forEach(function(n){ if(n.status==='published') add(n.publishedAt||n.createdAt, 'Newsletter', (n.company?n.company+': ':'')+(n.title||''), '#newsletter'); });
    }
    if(w.role!=='staff'){
      data.amendments.forEach(function(a){ var g=data.offers.filter(function(o){ return o.poRef===a.poRef && o.boqId===a.boqId; })[0]; if(!g) return; var b=boqOf(a.boqId), isBuyer=b.ownerPhone===w.phone, isSup=w.role==='supplier' && g.supplierId===w.supplierId; if(!isBuyer && !isSup) return; var mine=(a.by==='buyer')===isBuyer;
        if(!mine && a.status==='pending') add(a.at, 'Change asked', (a.poRef||'')+': Amendment '+a.n+' waits for your answer.', '#order-'+(a.orderId||g.id));
        if(mine && a.answeredAt) add(a.answeredAt, a.status==='accepted'?'Change accepted':'Change declined', (a.poRef||'')+': Amendment '+a.n+(a.status==='accepted'?' is part of the PO/SA now.':' was declined.'), '#order-'+(a.orderId||g.id)); });
      data.messages.forEach(function(m){
        if(!m.orderId && m.phone===w.phone && m.who==='staff' && m.staff) add(m.createdAt, 'Support', 'Build Smartly staff: '+m.text, '#support');
        if(m.orderId && m.phone!==w.phone && ((w.role==='supplier' && m.toSupplier===w.supplierId) || (w.role==='buyer' && m.toBuyer===w.phone))) add(m.createdAt, 'Message on your order', (m.name||'')+': '+m.text, '#order-'+m.orderId); });
      data.profiles.forEach(function(p){ if(p.phone===w.phone && p.reviewedAt) add(p.reviewedAt, 'Public profile', p.status==='approved'?'Your profile is published in the Members directory.':'Your profile was not approved: '+(p.reason||''), '#workspace'); });
      data.verifications.forEach(function(v){ if(v.phone!==w.phone) return;
        var ex=v.kind==='buyer'?v.licExp:v.exp, ls=BS.licenceState(ex); /* licence reminders: 30 days before, and when it has ended */
        if(v.status==='verified' && ls==='soon') add(new Date(new Date(ex).getTime()-30*86400000).toISOString(), 'Licence ends soon', 'Your business licence is valid until '+ex+'. Send the renewed licence to keep '+(v.kind==='buyer'?'your Verified badge':'quoting')+'.', v.kind==='buyer'?'#workspace':'#supplier-settings');
        if(v.status==='verified' && ls==='expired') add(new Date(ex+'T23:59:59').toISOString(), 'Licence expired', 'Your business licence ended on '+ex+'.'+(v.kind==='buyer'?'':' Quoting is paused until our team has checked the renewed licence.'), v.kind==='buyer'?'#workspace':'#supplier-settings');
        if(v.kind==='buyer'){ if(v.status==='verified' && v.verifiedAt) add(v.verifiedAt, 'You are verified', 'Our team verified you. You can place orders; orders on hold go to the suppliers now.', '#workspace'); if(v.status==='rejected' && v.rejectedAt) add(v.rejectedAt, 'Verification not accepted', 'Reason: '+(v.reason||'')+'. Open your account to try again.', '#workspace'); return; }
        if(v.verifiedAt) add(v.verifiedAt, 'Verified', 'Your documents were approved. You can quote.', '#supplier'); });
      var p9=function(x){ return String(x||'').replace(/\D/g,'').replace(/^251/,'').slice(-9); };
      data.news.forEach(function(n){ if(!n.phone || p9(n.phone)!==p9(w.phone)) return;
        if(n.approvedAt) add(n.approvedAt, 'Advert approved', (n.title||'')+': invoice '+(n.invoiceRef||'')+' · '+BS.fmt(n.amount||0)+'. It goes live when paid.', '#newsletter');
        if(n.status==='rejected' && n.reviewedAt) add(n.reviewedAt, 'Advert not accepted', (n.title||'')+': '+(n.reason||''), '#newsletter'); });
    }
    return out.sort(function(a,b){ return (b.t||'').localeCompare(a.t||''); }).slice(0,40);
  }
  function seenKey(){ var w=who(); return w ? 'bs_bell_seen_'+w.key : ''; }
  function seen(){ try{ return localStorage.getItem(seenKey())||''; }catch(e){ return ''; } } /* everything up to this time counts as read */
  function readKey(){ var w=who(); return w ? 'bs_bell_read_'+w.key : ''; }
  function readSet(){ try{ return JSON.parse(localStorage.getItem(readKey())||'[]'); }catch(e){ return []; } }
  function idOf(i){ return i.kind+'|'+i.t+'|'+i.href; }
  function isNew(i, s, r){ return i.t>s && r.indexOf(idOf(i))<0; }
  function markRead(id){ var r=readSet(); if(r.indexOf(id)<0){ r.push(id); if(r.length>400) r=r.slice(-400); try{ localStorage.setItem(readKey(), JSON.stringify(r)); }catch(e){} } }
  function draw(){
    var w=who(); $('bellBox').hidden=!w; if(!w) return;
    var list=items(), s=seen(), r=readSet(), unread=list.filter(function(i){ return isNew(i,s,r); }).length;
    $('bellN').hidden=!unread; $('bellN').textContent=unread>9?'9+':unread;
    $('bellList').innerHTML = list.length ? list.map(function(i){ return '<a class="bellitem'+(isNew(i,s,r)?' new':'')+'" href="'+i.href+'" data-bid="'+esc(idOf(i))+'"><span class="k">'+esc(i.kind)+' · '+ago(i.t)+'</span><span>'+esc(i.text)+'</span></a>'; }).join('') : '<div class="empty">Nothing new in the last 30 days.</div>';
  }
  function setOpen(v){ open=v; $('bellPanel').hidden=!v; $('bellBtn').setAttribute('aria-expanded', v?'true':'false'); if(v) draw(); }
  $('bellAll').onclick=function(e){ e.stopPropagation(); try{ localStorage.setItem(seenKey(), new Date().toISOString()); localStorage.removeItem(readKey()); }catch(err){} draw(); };
  $('bellBtn').onclick=function(e){ e.stopPropagation(); setOpen(!open); };
  document.addEventListener('click', function(e){ if(open && !e.target.closest('#bellBox')) setOpen(false); var it=e.target.closest('.bellitem'); if(it){ markRead(it.getAttribute('data-bid')); setOpen(false); draw(); } });
  BS.ready().then(function(){ Object.keys(data).forEach(function(c){ BS.subscribe(c, function(d){ data[c]=d||[]; draw(); }); }); });
  window.bsBellRefresh=draw; setInterval(draw, 60000);
  window.addEventListener('hashchange', draw); document.addEventListener('click', function(){ setTimeout(draw, 300); });
})();

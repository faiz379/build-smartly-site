/* Build Smartly · notification bell (decided 27 Oct 2026). One bell at the top right for buyers, suppliers and staff.
   The list is worked out from the shared records, so it is the same on every device: what arrived or what waits for you
   in the last 30 days, newest first, each linking to the place where you act. Read state is kept per account on the device. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var data={boqs:[],offers:[],messages:[],news:[],verifications:[],profiles:[],issues:[],suppliers:[]};
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
      data.boqs.forEach(function(b){ add(b.createdAt, 'Request', b.ref+' · '+(b.lines||[]).length+' lines from '+(b.company||'a buyer'), '#staff-requests'); });
      data.messages.forEach(function(m){ if(m.orderId){ if(m.who!=='staff') add(m.createdAt, 'Order message', (m.name||'')+': '+m.text, '#order-'+m.orderId); } else if(m.who==='customer') add(m.createdAt, 'Support', (m.name||'A member')+': '+m.text, '#staff-support'); });
      data.verifications.forEach(function(v){ if(v.status==='pending') add(v.submittedAt||v.createdAt, 'Supplier documents', v.company+' asks to be verified', '#staff-suppliers'); });
      data.profiles.forEach(function(p){ if(p.status==='pending') add(p.updatedAt||p.createdAt, 'Profile to approve', (p.name||'A member')+' asks to publish a profile', '#staff-members'); });
      data.news.forEach(function(n){ if(n.status==='pending') add(n.createdAt, n.img?'Advert to approve':'Newsletter item', (n.company||'')+': '+(n.title||''), '#staff-promos'); });
      data.issues.forEach(function(x){ if(x.status!=='resolved') add(x.createdAt, 'Problem reported', (x.poRef||'')+': '+x.text, '#staff-support'); });
      groups.forEach(function(g){ add(g.first.acceptedAt, 'Order placed', g.poRef+' · '+g.first.customerRevealed+' → '+g.supplierName, '#order-'+g.id); if(g.first.paidAt) add(g.first.paidAt, 'Paid', g.poRef+' · '+BS.fmt(g.first.paidTotal||0), '#staff-finance'); });
    } else if(w.role==='supplier'){
      data.boqs.forEach(function(b){ if(b.status!=='open' || b.ownerPhone===w.phone) return; var n=(b.lines||[]).filter(function(l){ return w.cats.indexOf(l.cat)>=0; }).length; if(n) add(b.createdAt, 'New request', b.ref+' · '+n+' line'+(n>1?'s':'')+' for you · '+b.subcity, '#supplier-requests'); });
      data.offers.forEach(function(o){ if(o.supplierId!==w.supplierId) return; var b=boqOf(o.boqId);
        if(o.counter && o.counter.state==='open') add(o.counter.at, 'Counter-offer', 'The customer proposes '+BS.fmt(o.counter.price)+' on '+b.ref+' · '+lineName(b,o.lineN), '#supplier-deals');
        if(o.status==='rejected') add(o.rejectedAt, 'Offer rejected', b.ref+' · '+lineName(b,o.lineN), '#supplier-deals'); });
      groups.forEach(function(g){ if(g.supplierId!==w.supplierId) return; var o=g.first, h='#order-'+g.id;
        add(o.acceptedAt, 'New order', g.poRef+' from '+(o.customerRevealed||'a buyer')+'. Reconfirm price and stock.', h);
        add(o.buyerAgreedAt, 'Contract', 'The buyer agreed to the contract for '+g.poRef+'.', h);
        add(o.deliveredAt, 'Delivered', 'The buyer confirmed delivery of '+g.poRef+'.', h);
        add(o.paidAt, 'Paid', g.poRef+' paid · '+BS.fmt(o.paidTotal||0), h); });
    } else {
      var mine=data.boqs.filter(function(b){ return b.ownerPhone===w.phone; }).map(function(b){ return b.id; });
      data.offers.forEach(function(o){ if(mine.indexOf(o.boqId)<0) return; var b=boqOf(o.boqId);
        add(o.createdAt, 'New offer', b.ref+' · '+lineName(b,o.lineN)+' · brand '+o.brand+' · '+BS.fmt(BS.offerTotal(o)), '#boq-mine');
        if(o.counter && o.counter.answeredAt) add(o.counter.answeredAt, 'Answer to your price', 'The supplier '+(o.counter.state==='accepted'?'accepted':'declined')+' '+BS.fmt(o.counter.price)+' on '+b.ref+' · '+lineName(b,o.lineN), '#boq-mine'); });
      groups.forEach(function(g){ if(mine.indexOf(g.boqId)<0) return; var o=g.first, h='#order-'+g.id;
        add(o.confirmedAt, 'Contract to agree', g.supplierName+' reconfirmed '+g.poRef+'. Read and agree to the contract.', h);
        add(o.readyAt, 'Ready for dispatch', g.poRef+' is ready at '+g.supplierName+'.', h);
        add(o.dispatchedAt, 'Dispatched', g.poRef+' is on its way. Handover code '+(o.handoverCode||'')+'.', h);
        add(o.paidAt, 'Receipt', 'Payment for '+g.poRef+' received. Receipt in your Statements.', '#statements'); });
      data.news.forEach(function(n){ if(n.status==='published') add(n.publishedAt||n.createdAt, 'Newsletter', (n.company?n.company+': ':'')+(n.title||''), '#newsletter'); });
    }
    if(w.role!=='staff'){
      data.messages.forEach(function(m){
        if(!m.orderId && m.phone===w.phone && m.who==='staff' && m.staff) add(m.createdAt, 'Support', 'Build Smartly staff: '+m.text, '#support');
        if(m.orderId && m.phone!==w.phone && ((w.role==='supplier' && m.toSupplier===w.supplierId) || (w.role==='buyer' && m.toBuyer===w.phone))) add(m.createdAt, 'Message on your order', (m.name||'')+': '+m.text, '#order-'+m.orderId); });
      data.profiles.forEach(function(p){ if(p.phone===w.phone && p.reviewedAt) add(p.reviewedAt, 'Public profile', p.status==='approved'?'Your profile is published in the Members directory.':'Your profile was not approved: '+(p.reason||''), '#workspace'); });
      data.verifications.forEach(function(v){ if(v.phone===w.phone && v.verifiedAt) add(v.verifiedAt, 'Verified', 'Your documents were approved. You can quote.', '#supplier'); });
    }
    return out.sort(function(a,b){ return (b.t||'').localeCompare(a.t||''); }).slice(0,40);
  }
  function seenKey(){ var w=who(); return w ? 'bs_bell_seen_'+w.key : ''; }
  function seen(){ try{ return localStorage.getItem(seenKey())||''; }catch(e){ return ''; } }
  function draw(){
    var w=who(); $('bellBox').hidden=!w; if(!w) return;
    var list=items(), s=seen(), unread=list.filter(function(i){ return i.t>s; }).length;
    $('bellN').hidden=!unread; $('bellN').textContent=unread>9?'9+':unread;
    $('bellList').innerHTML = list.length ? list.map(function(i){ return '<a class="bellitem'+(i.t>s?' new':'')+'" href="'+i.href+'"><span class="k">'+esc(i.kind)+' · '+ago(i.t)+'</span><span>'+esc(i.text)+'</span></a>'; }).join('') : '<div class="empty">Nothing new in the last 30 days.</div>';
  }
  function setOpen(v){ open=v; $('bellPanel').hidden=!v; $('bellBtn').setAttribute('aria-expanded', v?'true':'false'); if(v){ draw(); setTimeout(function(){ try{ localStorage.setItem(seenKey(), new Date().toISOString()); }catch(e){} $('bellN').hidden=true; }, 1500); } }
  $('bellBtn').onclick=function(e){ e.stopPropagation(); setOpen(!open); };
  document.addEventListener('click', function(e){ if(open && !e.target.closest('#bellBox')) setOpen(false); if(e.target.closest('.bellitem')) setOpen(false); });
  BS.ready().then(function(){ Object.keys(data).forEach(function(c){ BS.subscribe(c, function(d){ data[c]=d||[]; draw(); }); }); });
  window.bsBellRefresh=draw; setInterval(draw, 60000);
  window.addEventListener('hashchange', draw); document.addEventListener('click', function(){ setTimeout(draw, 300); });
})();

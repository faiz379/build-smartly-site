/* Build Smartly · order page (#order-<offerId>). One page per purchase order, for the buyer, the supplier and staff.
   A purchase order holds every line the buyer chose from one supplier on one request (offers sharing a poRef);
   the contract, reconfirmation, dispatch, delivery and payment happen once for the whole order. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var data={boqs:[],offers:[],messages:[],issues:[]}, cur=null, payMethod='Telebirr';
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function when(iso){ if(!iso) return ''; var d=new Date(iso); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
  function day(iso){ if(!iso) return ''; return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }
  function digits(p){ return String(p||'').replace(/\D/g,'').replace(/^251/,'').replace(/^0/,''); }
  function offerOf(id){ return data.offers.filter(function(o){ return o.id===id; })[0]; }
  function boqOf(id){ return data.boqs.filter(function(b){ return b.id===id; })[0]; }
  function lineOf(b,n){ return b ? (b.lines||[]).filter(function(l){ return l.n===n; })[0] : null; }
  function extras(b,l,o){ if(window.bsLineExtras) return bsLineExtras(b,l,o); var g=BS.offerTotal(o); return {goods:g, delivery:0, insurance:0, total:g}; }
  function groupOf(o){ return BS.orderGroup(data.offers, o); }
  function sums(g,b){ var t={goods:0, delivery:0, insurance:0, total:0}; g.forEach(function(o){ var e=extras(b, lineOf(b,o.lineN)||{}, o); t.goods+=e.goods; t.delivery+=e.delivery; t.insurance+=e.insurance; t.total+=e.total; }); return t; }
  function roleFor(o,b){ var m=BS.me()||{}; if(BS.isStaff && BS.isStaff()) return 'staff'; if(b && digits(m.phone) && digits(m.phone)===digits(b.ownerPhone)) return 'buyer'; if(m.supplierId && m.supplierId===o.supplierId) return 'supplier'; return 'none'; }
  function hash(s){ var h=0; for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return h; }
  function supplierTin(o){ var s=BS.supplierById(o.supplierId); return (s&&s.tin) || (s ? '00'+String(Math.abs(hash(s.id))%100000000).padStart(8,'0') : 'on file'); }
  function ids(g){ return g.map(function(o){ return o.id; }); }
  function deliveryTerm(o,b){ return o.platformDelivery ? 'Build Smartly delivers' : (/^Build Smartly/.test(b.deliveryTerm||'') ? 'Collected by the buyer' : b.deliveryTerm); }

  BSRoute.on('order', function(id){ cur=id; render(); window.scrollTo(0,0); });
  ['boqs','offers','messages','issues'].forEach(function(c){ BS.subscribe(c, function(d){ data[c]=d||[]; if(cur && !$('view-order').hidden) render(); }); });

  function card(title, body, sub, id){ return '<section class="card ocard" '+(id?'id="'+id+'" ':'')+'style="display:grid;gap:.7rem"><div><strong style="font-family:var(--display);font-size:1.05rem">'+title+'</strong>'+(sub?'<p class="small muted">'+sub+'</p>':'')+'</div>'+body+'</section>'; }

  function render(){
    var box=$('orderBody'); var o0=offerOf(cur);
    if(!o0){ box.innerHTML='<div class="empty">This order could not be found. Open it from your orders, the supplier portal or the staff page.</div>'; return; }
    var g=groupOf(o0), o=g[0]||o0, b=boqOf(o.boqId)||{}, role=roleFor(o,b), ex=sums(g,b), st=BS.orderStatus(o);
    if(role==='none'){ box.innerHTML='<div class="empty">Sign in as the buyer or the supplier of this order to see it. <a href="#signin">Sign in</a></div>'; return; }
    var names=g.map(function(x){ return (lineOf(b,x.lineN)||{}).item||''; });
    var head='<div class="topbar"><div><span class="eyebrow">Purchase order · '+(role==='buyer'?'you are the buyer':role==='supplier'?'you are the supplier':'staff view')+'</span><h1 style="font-size:1.5rem">'+esc(o.poRef)+'</h1><p class="small muted">'+g.length+' line'+(g.length>1?'s':'')+': '+esc(names.join(', '))+' · request '+esc(b.ref)+' · placed '+when(o.acceptedAt)+'</p></div><div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><span class="tag '+st.c+'">'+esc(st.t)+'</span><a class="btn btn-ghost btn-sm" href="'+(role==='supplier'?'#supplier':role==='staff'?'#staff':'#boq-mine')+'">Back</a></div></div>';
    var parties='<div class="grid2"><div class="doc"><span class="ico">B</span><span><span class="small muted">Buyer</span><br><strong>'+esc(o.customerRevealed||b.company)+'</strong><br><span class="small muted">TIN '+esc(o.customerTin||'on file')+' · '+esc(b.subcity)+', '+esc(b.city||'Addis Ababa')+'</span></span><span></span></div><div class="doc"><span class="ico">S</span><span><span class="small muted">Supplier</span><br><strong>'+esc(o.supplierName)+'</strong><br><span class="small muted">Verified supplier · dispatch from '+esc(o.supplierSub||'their store')+'</span></span><span></span></div></div>';
    var items='<table class="doctable"><thead><tr><th>Item</th><th>Brand</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>'+g.map(function(x){ var l=lineOf(b,x.lineN)||{}; return '<tr><td>'+esc(l.item)+(l.returnBy?'<br><span class="small muted">'+esc(l.needed)+' to '+esc(l.returnBy)+'</span>':'')+'</td><td>'+esc(x.brand)+'</td><td>'+x.qtyOffered+' '+esc(l.unit)+'</td><td>'+BS.fmt(x.unitPrice)+(BS.isHire(l)?' per '+esc(l.unit):'')+'</td><td>'+BS.fmt(BS.offerTotal(x))+'</td></tr>'; }).join('')+'</tbody></table>';
    /* timeline */
    var notes={acceptedAt:'The buyer placed the order; Build Smartly issued the purchase order.', confirmedAt:'The supplier confirmed price and stock in writing.', contractAt:'Both parties agreed to the contract.', readyAt:'Packed and ready.', dispatchedAt:o.handoverCode?'Handover code '+o.handoverCode+' sent to the buyer.':'', deliveredAt:'The buyer confirmed receipt.', paidAt:o.paymentRef?'Yagout Pay · '+o.paymentRef:''};
    var steps=BS.ORDER_STEPS.map(function(s){ return [s[1], o[s[0]], notes[s[0]]]; });
    var nowIdx=steps.map(function(s){ return !!s[1]; }).lastIndexOf(true)+1;
    var tl='<ol class="tl">'+steps.map(function(s,i){ var cls=s[1]?'done':i===nowIdx?'now':''; return '<li class="'+cls+'"><span class="dot"></span><span><strong>'+s[0]+'</strong>'+(s[1]?'<br><span class="small muted">'+when(s[1])+(s[2]?' · '+esc(s[2]):'')+'</span>':i===nowIdx?'<br><span class="small muted">Next</span>':'')+'</span></li>'; }).join('')+'</ol>';
    /* what happens next */
    var next='', needed=(lineOf(b,o.lineN)||{}).needed||'the agreed date';
    if(role==='buyer'){
      next = o.paidAt ? '<p>This order is complete. Your receipt is under Documents and in your Statements.</p><div class="btns"><button class="btn btn-primary btn-sm" type="button" data-doc="receipt">Open the receipt</button><a class="btn btn-ghost btn-sm" href="#boq">Send another request</a></div>'
        : o.deliveredAt ? '<p>The goods are delivered. Pay through Yagout Pay; the supplier is paid when the gateway confirms.</p><div class="btns"><a class="btn btn-ochre" href="#orderPay" data-scroll="orderPay">Pay '+BS.fmt(ex.total)+' now</a></div>'
        : o.dispatchedAt ? '<p>The goods are on the way. Give the driver the handover code <strong style="font-size:1.2rem">'+esc(o.handoverCode)+'</strong>, check the goods, then confirm.</p><div class="btns"><button class="btn btn-primary" type="button" data-received="'+o.id+'">Goods received, all in order</button><button class="btn btn-ghost btn-sm" type="button" data-scroll="orderIssue">Something is wrong</button></div>'
        : o.readyAt ? '<p>The goods are ready for dispatch. You get a notification with a handover code when they leave.</p>'
        : o.contractAt ? '<p>The contract is agreed. The supplier is preparing the goods for '+esc(needed)+'.</p>'
        : o.supplierConfirmed ? '<p>The supplier reconfirmed price and stock. Read the contract and agree to it.</p><div class="btns"><button class="btn btn-ochre" type="button" data-doc="contract">Read and agree to the contract</button></div>'
        : '<p>The order is with the supplier, who reconfirms price and stock. You then agree to the contract.</p><div class="btns"><button class="btn btn-ghost btn-sm" type="button" data-doc="contract">Read the contract draft</button></div>';
    } else if(role==='supplier'){
      next = o.paidAt ? '<p>Paid. Build Smartly settles the amount to you less the platform fee ('+BS.pct(BS.FEE_RATE)+').</p><div class="btns"><button class="btn btn-primary btn-sm" type="button" data-doc="receipt">Open the receipt</button></div>'
        : o.deliveredAt ? '<p>The buyer confirmed delivery. Payment is due; you are notified when it arrives.</p>'
        : o.dispatchedAt ? '<p>Dispatched. The buyer confirms with handover code <strong>'+esc(o.handoverCode)+'</strong>; give it to your driver.</p>'
        : o.readyAt ? '<p>Ready for dispatch. Send the goods to '+esc(b.subcity)+(b.pin?' (exact site under Delivery)':'')+' and mark them dispatched.</p><div class="btns"><button class="btn btn-primary" type="button" data-dispatch="'+o.id+'">Dispatched</button></div>'
        : o.contractAt ? '<p>The contract is agreed. Prepare the goods for '+esc(needed)+' and mark them ready.</p><div class="btns"><button class="btn btn-primary" type="button" data-ready="'+o.id+'">Ready for dispatch</button></div>'
        : !o.supplierConfirmed ? '<p>The buyer placed this order with you. Reconfirm price and stock: that is your agreement to the contract.</p><div class="btns"><button class="btn btn-ochre" type="button" data-doc="contract">Read the contract and reconfirm</button></div>'
        : '<p>You reconfirmed. Waiting for the buyer to agree to the contract.</p>';
    } else next='<p>'+esc(st.t)+'. Staff can read every document and message on this order.</p>';
    /* delivery */
    var est = o.supplierSub ? BS.deliveryEstimate(g.map(function(x){ var l=lineOf(b,x.lineN)||{}; return {item:l.item, qty:x.qtyOffered, unit:l.unit}; }), o.supplierSub, b.pin||b.subcity) : null;
    var delivery='<div class="kv"><span>Delivery</span><strong>'+esc(deliveryTerm(o,b))+'</strong><span>Site</span><strong>'+esc(b.subcity)+', '+esc(b.city||'Addis Ababa')+(b.pin && role!=='none'?' · <a href="https://www.openstreetmap.org/?mlat='+(+b.pin.lat)+'&mlon='+(+b.pin.lng)+'#map=16/'+(+b.pin.lat)+'/'+(+b.pin.lng)+'" target="_blank" rel="noopener">pinned on the map</a>':'')+'</strong><span>Needed by</span><strong>'+esc(needed)+'</strong>'+(est?'<span>Distance</span><strong>about '+est.km+' km from '+esc(o.supplierSub)+'</strong>':'')+(o.handoverCode?'<span>Handover code</span><strong>'+esc(o.handoverCode)+'</strong>':'')+(ex.insurance?'<span>Transit insurance</span><strong>'+BS.fmt(ex.insurance)+'</strong>':'')+'</div>';
    /* documents */
    var docs='<div class="docs">'+
      '<div class="doc"><span class="ico">PO</span><span><strong>Purchase order '+esc(o.poRef)+'</strong><br><span class="small muted">'+when(o.acceptedAt)+'</span></span><button class="btn btn-ghost btn-sm" type="button" data-doc="po">View</button></div>'+
      '<div class="doc"><span class="ico">CT</span><span><strong>Sale contract</strong><br><span class="small muted">'+(o.contractAt?'Agreed '+when(o.contractAt):o.supplierConfirmed?'Waiting for the buyer':'Waiting for the supplier')+'</span></span><button class="btn '+((role==='buyer'&&o.supplierConfirmed&&!o.buyerAgreedAt)||(role==='supplier'&&!o.supplierConfirmed)?'btn-ochre':'btn-ghost')+' btn-sm" type="button" data-doc="contract">'+((role==='buyer'&&o.supplierConfirmed&&!o.buyerAgreedAt)?'Agree':(role==='supplier'&&!o.supplierConfirmed)?'Reconfirm':'View')+'</button></div>'+
      (o.paidAt?'<div class="doc"><span class="ico">RC</span><span><strong>Receipt '+esc(o.paymentRef)+'</strong><br><span class="small muted">'+when(o.paidAt)+'</span></span><button class="btn btn-ghost btn-sm" type="button" data-doc="receipt">View</button></div>':'')+'</div>';
    /* payment */
    var payRows='<div class="kv"><span>Goods</span><strong>'+BS.fmt(ex.goods)+'</strong>'+(ex.delivery?'<span>Build Smartly delivery</span><strong>'+BS.fmt(ex.delivery)+'</strong>':'')+(ex.insurance?'<span>Transit insurance</span><strong>'+BS.fmt(ex.insurance)+'</strong>':'')+'<span>Total</span><strong style="font-size:1.1rem">'+BS.fmt(ex.total)+'</strong><span>Payment term</span><strong>'+esc(b.paymentTerm||'On delivery')+'</strong></div>';
    var pay = o.paidAt ? '<div class="doc" style="border-color:var(--green)"><span class="ico">✓</span><span><strong>Paid '+BS.fmt(o.paidTotal||ex.total)+'</strong><br><span class="small muted">'+when(o.paidAt)+' · '+esc(o.paymentMethod||'Yagout Pay')+' · '+esc(o.paymentRef)+'</span></span><button class="btn btn-ghost btn-sm" type="button" data-doc="receipt">Receipt</button></div>'
      : (role==='buyer' && o.deliveredAt) ? '<div class="payform"><div><strong>Pay through Yagout Pay</strong><p class="small muted">Secure payment through the Yagout Pay gateway.</p></div><div class="su-choices">'+[['Telebirr','Mobile money'],['CBE Birr or bank transfer','Commercial Bank of Ethiopia and others'],['Bank card','Visa or Mastercard']].map(function(m,i){ return '<div class="choice"><input type="radio" name="opayM" id="opm'+i+'" value="'+m[0]+'"'+(m[0]===payMethod?' checked':'')+'><label for="opm'+i+'"><strong>'+m[0]+'</strong><span>'+m[1]+'</span></label></div>'; }).join('')+'</div><label class="check"><input type="checkbox" id="payAgree"><span>I checked the goods and authorise '+BS.fmt(ex.total)+' to '+esc(o.supplierName)+'.</span></label><div class="btns"><button class="btn btn-ochre" type="button" data-paynow="'+o.id+'">Pay '+BS.fmt(ex.total)+'</button></div></div>'
      : '<p class="small muted">'+(o.deliveredAt?'Waiting for the buyer\'s payment.':'Payment opens when the buyer confirms delivery.')+'</p>';
    /* messages: kept on the first line's id so older threads still show */
    var gids=ids(g); var msgs=data.messages.filter(function(m){ return gids.indexOf(m.orderId)>=0; }).sort(function(a,c){ return (a.createdAt||'').localeCompare(c.createdAt||''); });
    var chat='<div class="chat" id="orderChat">'+(msgs.length?msgs.map(function(m){ var mine = m.who===role; return '<div class="msg '+(mine?'me':'')+'"><div class="t">'+(m.who==='buyer'?esc(o.customerRevealed||'Buyer'):m.who==='supplier'?esc(o.supplierName):'Build Smartly staff')+' · '+when(m.createdAt)+'</div>'+esc(m.text)+'</div>'; }).join(''):'<div class="empty">No messages yet. The other party and Build Smartly staff see what you write here.</div>')+'</div><div class="chat-in"><div class="field"><input id="orderMsgIn" placeholder="Message '+esc(role==='buyer'?'the supplier':role==='supplier'?'the buyer':'both parties')+'…"></div><button class="btn btn-primary btn-sm" type="button" data-msg="'+o.id+'">Send</button></div>';
    var iss=data.issues.filter(function(x){ return gids.indexOf(x.offerId)>=0; }).sort(function(a,c){ return (c.createdAt||'').localeCompare(a.createdAt||''); });
    var issues=(iss.length?'<div class="docs">'+iss.map(function(x){ return '<div class="doc"><span class="ico">!</span><span><strong>'+esc(x.text)+'</strong><br><span class="small muted">'+esc(x.who)+' · '+when(x.createdAt)+(x.status==='resolved'?' · resolved: '+esc(x.note||''):'')+'</span></span>'+(x.status==='resolved'?'<span class="tag tag-green">Resolved</span>':x.status==='progress'?'<span class="tag tag-ochre">In progress</span>':role==='staff'?'<span style="display:flex;gap:.3rem"><input placeholder="Resolution note" data-note="'+x.id+'" style="font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px;min-width:10rem"><button class="btn btn-primary btn-sm" type="button" data-resolve="'+x.id+'">Resolve</button></span>':'<span class="tag tag-ochre">Open · staff told</span>')+'</div>'; }).join('')+'</div>':'')+
      (role!=='staff'?'<div class="chat-in"><div class="field"><input id="orderIssueIn" placeholder="Wrong quantity, damage, delay…"></div><button class="btn btn-ghost btn-sm" type="button" data-issue="'+o.id+'">Report</button></div>':'');
    box.innerHTML=head+parties+card('What happens next', next, '', 'orderNext')+card('Items', items)+'<div class="ogrid">'+card('Delivery', delivery)+card('Payment', payRows+pay, '', 'orderPay')+'</div><div class="ogrid">'+card('Progress', tl)+card('Documents', docs)+'</div><div class="ogrid">'+card('Messages', chat)+card('Report a problem', issues||'<p class="small muted">Nothing reported.</p>', '', 'orderIssue')+'</div>';
    var chatEl=$('orderChat'); if(chatEl) chatEl.scrollTop=chatEl.scrollHeight;
  }

  /* ---- documents (printable) ---- */
  function docHtml(kind, g, b, role){
    var o=g[0], ex=sums(g,b);
    var head='<div class="dochead"><div><strong style="font-family:var(--display);font-size:1.2rem">Build Smartly</strong><br><span class="small muted">Construction materials · Addis Ababa, Ethiopia</span></div><div style="text-align:right"><span class="small muted">'+(kind==='po'?'Purchase order':kind==='contract'?'Sale contract':'Payment receipt')+'</span><br><strong>'+esc(kind==='receipt'?(o.paymentRef||''):o.poRef)+'</strong></div></div>';
    var parties='<div class="grid2 docparties"><div><span class="small muted">Buyer</span><br><strong>'+esc(o.customerRevealed||b.company)+'</strong><br><span class="small">TIN '+esc(o.customerTin||'on file')+'<br>'+esc(b.subcity)+', '+esc(b.city||'Addis Ababa')+'</span></div><div><span class="small muted">Supplier</span><br><strong>'+esc(o.supplierName)+'</strong><br><span class="small">TIN '+esc(supplierTin(o))+'<br>Dispatch: '+esc(o.supplierSub||'main store')+'</span></div></div>';
    var table='<table class="doctable"><thead><tr><th>Item</th><th>Brand</th><th>Qty</th><th>Price</th><th>VAT</th><th>Delivery</th><th>Total</th></tr></thead><tbody>'+g.map(function(x){ var l=lineOf(b,x.lineN)||{}; return '<tr><td>'+esc(l.item)+'<br><span class="small muted">'+(l.returnBy?esc(l.needed)+' to '+esc(l.returnBy):'needed by '+esc(l.needed||'—'))+'</span></td><td>'+esc(x.brand)+'</td><td>'+x.qtyOffered+' '+esc(l.unit)+'</td><td>'+BS.fmt(x.unitPrice)+'</td><td>'+(x.vat==='incl'?'incl.':'excl.')+'</td><td>'+BS.fmt(x.deliveryCost||0)+'</td><td>'+BS.fmt(BS.offerTotal(x))+'</td></tr>'; }).join('')+
      (ex.delivery?'<tr><td colspan="6">Build Smartly delivery</td><td>'+BS.fmt(ex.delivery)+'</td></tr>':'')+(ex.insurance?'<tr><td colspan="6">Transit insurance · '+BS.pct(BS.INSURANCE.rate)+'</td><td>'+BS.fmt(ex.insurance)+'</td></tr>':'')+'<tr class="tot"><td colspan="6">Total</td><td>'+BS.fmt(ex.total)+'</td></tr></tbody></table>';
    if(kind==='po') return head+'<p class="small muted">Date '+day(o.acceptedAt)+' · request '+esc(b.ref)+' · placed by the buyer on the Build Smartly platform.</p>'+parties+table+
      '<div class="kv"><span>Delivery</span><strong>'+esc(deliveryTerm(o,b))+'</strong><span>Site</span><strong>'+esc(b.subcity)+', '+esc(b.city||'Addis Ababa')+(b.pin?' · pinned':'')+'</strong><span>Payment</span><strong>'+esc(b.paymentTerm)+' · Yagout Pay</strong></div><p class="small muted">Issued by Build Smartly on behalf of the buyer. It becomes a contract when the supplier reconfirms and the buyer agrees.</p>';
    if(kind==='contract'){
      var clauses=['<strong>1. Parties and object.</strong> The supplier sells and the buyer buys the goods listed above, of the stated brand and quantity, at the stated price. Build Smartly records the deal and is not a party to the sale.',
        '<strong>2. Price.</strong> The total payable is '+BS.fmt(ex.total)+', fixed for this order.',
        '<strong>3. Delivery.</strong> '+esc(deliveryTerm(o,b))+' to '+esc(b.subcity)+', '+esc(b.city||'Addis Ababa')+'. Goods are handed over against the 4-digit code the buyer receives. Hired equipment is returned on the return date as arranged between the parties.',
        '<strong>4. Payment.</strong> '+esc(b.paymentTerm)+', through the Yagout Pay gateway; the platform fee of '+BS.pct(BS.FEE_RATE)+' is charged to the supplier.',
        '<strong>5. Claims.</strong> A problem found at handover is reported on the platform within 24 hours; Build Smartly mediates within one working day.',
        '<strong>6. Binding effect.</strong> Once the supplier reconfirms and the buyer agrees, neither party may withdraw.',
        '<strong>7. Law.</strong> Ethiopian law; Build Smartly mediation first, then the courts of Addis Ababa. Draft, for legal review.'];
      var sig='<div class="grid2 docsign"><div><span class="small muted">Supplier</span><br><strong>'+esc(o.supplierName)+'</strong><br>'+(o.supplierConfirmed?'<span class="small" style="color:var(--green)">Reconfirmed · '+when(o.confirmedAt)+'</span>':'<span class="small muted">Not yet reconfirmed</span>')+'</div><div><span class="small muted">Buyer</span><br><strong>'+esc(o.customerRevealed||b.company)+'</strong><br>'+(o.buyerAgreedAt?'<span class="small" style="color:var(--green)">Agreed · '+when(o.buyerAgreedAt)+'</span>':'<span class="small muted">Not yet agreed</span>')+'</div></div>';
      var act='';
      if(role==='buyer' && !o.buyerAgreedAt) act='<div class="noprint docact"><label class="check"><input type="checkbox" id="ctAgree"><span>I have read the contract and agree on behalf of '+esc(o.customerRevealed||b.company)+'.</span></label><button class="btn btn-ochre" type="button" data-agree="'+o.id+'">Agree to the contract</button></div>';
      if(role==='supplier' && !o.supplierConfirmed) act='<div class="noprint docact"><label class="check"><input type="checkbox" id="ctAgree"><span>I reconfirm price, brand and stock and agree on behalf of '+esc(o.supplierName)+'.</span></label><button class="btn btn-ochre" type="button" data-confirm="'+o.id+'">Reconfirm and agree</button></div>';
      return head+'<p class="small muted">Contract for '+esc(o.poRef)+' · '+(o.contractAt?'agreed '+day(o.contractAt):'draft until both parties agree')+'</p>'+parties+table+'<div class="clauses">'+clauses.map(function(c){ return '<p>'+c+'</p>'; }).join('')+'</div>'+sig+act;
    }
    return head+'<p class="small muted">Receipt for '+esc(o.poRef)+' · '+when(o.paidAt)+' · '+esc(o.customerRevealed||b.company)+' to '+esc(o.supplierName)+' through Yagout Pay ('+esc(o.paymentMethod||'')+').</p>'+parties+table+
      '<div class="kv"><span>Amount paid</span><strong>'+BS.fmt(o.paidTotal||ex.total)+'</strong><span>Reference</span><strong>'+esc(o.paymentRef)+'</strong><span>To the supplier</span><strong>'+BS.fmt(Math.round((o.paidTotal||ex.total)-(ex.goods*BS.FEE_RATE)))+' after the platform fee</strong></div>';
  }
  function openDoc(kind, id){ var o=offerOf(id||cur); if(!o) return; var g=groupOf(o), b=boqOf(o.boqId)||{}; $('docBody').innerHTML=docHtml(kind,g,b,roleFor(o,b)); $('docGate').hidden=false; $('docBody').scrollTop=0; }
  /* used by Statements: open any document of any order the viewer may see */
  window.bsOpenOrderDoc=function(id, kind){ openDoc(kind, id); };
  $('docClose').onclick=function(){ $('docGate').hidden=true; };
  $('docPrint').onclick=function(){ window.print(); };

  /* ---- actions: every step applies to the whole order ---- */
  function gids(id){ return ids(groupOf(offerOf(id))); }
  async function agree(id){ var o=offerOf(id); if(!o) return; var now=new Date().toISOString(); var patch={buyerAgreedAt:now}; if(o.supplierConfirmed) patch.contractAt=now; var done=gids(id); await BS.updateMany('offers', done, patch); $('docGate').hidden=true;
    /* more contracts waiting for this buyer: offer the next one in the same pop-up, without leaving the page */
    var b=boqOf(o.boqId)||{}, owner=digits(b.ownerPhone), next=BS.orderGroups(data.offers).filter(function(g){ var bb=boqOf(g.boqId)||{}; return done.indexOf(g.id)<0 && !g.offers.some(function(x){ return done.indexOf(x.id)>=0; }) && digits(bb.ownerPhone)===owner && g.first.supplierConfirmed && !g.first.buyerAgreedAt && !g.first.dispatchedAt; });
    if(!next.length){ bsToast(patch.contractAt?'Contract agreed. The supplier prepares the goods.':'Agreed. It applies when the supplier reconfirms.'); return; }
    var go=await bsConfirm('Contract agreed for '+(o.poRef||'this order'), next.length+' more contract'+(next.length>1?'s wait':' waits')+' for you: '+next.map(function(g){ return g.poRef+' ('+g.supplierName+')'; }).join(', ')+'. Read and agree to the next one now?', 'Read the next contract');
    if(go) openDoc('contract', next[0].id); }
  async function confirmIt(id){ var o=offerOf(id); if(!o) return; var now=new Date().toISOString(); var patch={supplierConfirmed:true, confirmedAt:now}; if(o.buyerAgreedAt) patch.contractAt=now; await BS.updateMany('offers', gids(id), patch); $('docGate').hidden=true; bsToast(patch.contractAt?'Reconfirmed. The contract is agreed.':'Reconfirmed. The buyer is asked to agree to the contract.'); }
  window.bsOrderAction=async function(kind, id){
    if(kind==='confirm') return confirmIt(id);
    if(kind==='ready'){ await BS.updateMany('offers', gids(id), {readyAt:new Date().toISOString()}); bsToast('The buyer is told the goods are ready.'); return; }
    if(kind==='dispatch'){ var code=String(Math.floor(1000+Math.random()*9000)); await BS.updateMany('offers', gids(id), {dispatchedAt:new Date().toISOString(), handoverCode:code}); bsToast('Dispatched. The buyer received handover code '+code+'.'); return; }
    if(kind==='received'){ await BS.updateMany('offers', gids(id), {deliveredAt:new Date().toISOString()}); bsToast('Delivery confirmed. You can pay now.'); return; }
  };
  document.addEventListener('click', async function(e){
    var t=e.target;
    var d=t.closest('[data-doc]'); if(d && t.closest('#view-order, #docGate')){ openDoc(d.dataset.doc); return; }
    var s=t.closest('[data-scroll]'); if(s){ e.preventDefault(); var el=$(s.dataset.scroll); if(el) el.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    var ag=t.closest('[data-agree]'); if(ag){ var cb=$('ctAgree'); if(cb && !cb.checked){ bsToast('Tick the box first.'); return; } ag.disabled=true; await agree(ag.dataset.agree); return; }
    var cf=t.closest('[data-confirm]'); if(cf && t.closest('#docGate')){ var cb2=$('ctAgree'); if(cb2 && !cb2.checked){ bsToast('Tick the box first.'); return; } cf.disabled=true; await confirmIt(cf.dataset.confirm); return; }
    if(!t.closest('#view-order')) return;
    var rd=t.closest('[data-ready]'); if(rd){ rd.disabled=true; await bsOrderAction('ready', rd.dataset.ready); return; }
    var dp=t.closest('[data-dispatch]'); if(dp){ dp.disabled=true; await bsOrderAction('dispatch', dp.dataset.dispatch); return; }
    var rc=t.closest('[data-received]'); if(rc){ rc.disabled=true; await bsOrderAction('received', rc.dataset.received); return; }
    var pn=t.closest('[data-paynow]'); if(pn){ var ok=$('payAgree'); if(ok && !ok.checked){ bsToast('Tick the box to authorise the payment.'); return; } var m=(document.querySelector('input[name=opayM]:checked')||{}).value||'Telebirr'; payMethod=m; var o=offerOf(pn.dataset.paynow); var g=groupOf(o), b=boqOf(o.boqId)||{}; var ex=sums(g,b); pn.disabled=true; pn.textContent='Paying…';
      var ref='YP-'+Math.floor(100000+Math.random()*900000); await BS.updateMany('offers', ids(g), {paidAt:new Date().toISOString(), paymentRef:ref, paymentMethod:m, paidTotal:ex.total}); bsToast('Paid through Yagout Pay ('+m+'). Receipt ready.'); setTimeout(function(){ openDoc('receipt'); }, 400); return; }
    var mg=t.closest('[data-msg]'); if(mg){ var inp=$('orderMsgIn'); var text=inp.value.trim(); if(!text) return; var o2=offerOf(mg.dataset.msg); var b2=boqOf(o2.boqId)||{}; var role=roleFor(o2,b2); inp.value=''; await BS.add('messages', {orderId:o2.id, poRef:o2.poRef||'', phone:digits((BS.me()||{}).phone), who:role, text:text, name:role==='buyer'?(o2.customerRevealed||b2.company):role==='supplier'?o2.supplierName:'Build Smartly staff', toSupplier:o2.supplierId, toBuyer:digits(b2.ownerPhone)}); bsToast('Sent. The other party and staff see it.'); return; }
    var is=t.closest('[data-issue]'); if(is){ var inp2=$('orderIssueIn'); var text2=inp2.value.trim(); if(!text2) return; var o3=offerOf(is.dataset.issue); var b3=boqOf(o3.boqId)||{}; var role3=roleFor(o3,b3); inp2.value=''; await BS.add('issues', {offerId:o3.id, boqId:o3.boqId, poRef:o3.poRef, phone:digits((BS.me()||{}).phone), who:role3==='buyer'?(o3.customerRevealed||b3.company):o3.supplierName, role:role3, text:text2, status:'open'}); bsToast('Reported to Build Smartly staff.'); return; }
    var rs=t.closest('[data-resolve]'); if(rs){ var note=(document.querySelector('[data-note="'+rs.dataset.resolve+'"]')||{}).value||''; rs.disabled=true; await BS.update('issues', rs.dataset.resolve, {status:'resolved', note:note, by:(BS.staffName&&BS.staffName())||'staff', resolvedAt:new Date().toISOString()}); bsToast('Resolved.'); return; }
  });
  document.addEventListener('keydown', function(e){ if(e.key!=='Enter') return; if(e.target.id==='orderMsgIn'){ e.preventDefault(); var b=document.querySelector('[data-msg]'); if(b) b.click(); } if(e.target.id==='orderIssueIn'){ e.preventDefault(); var b2=document.querySelector('[data-issue]'); if(b2) b2.click(); } });
})();

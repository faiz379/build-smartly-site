/* Build Smartly · help assistant. A floating chat box on every page that answers the common questions from a built-in
   knowledge base, knows where the member is in the process, and hands over to Build Smartly support when needed. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var open=false, history=[], boqs=[], offers=[], lastQ='';
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function digits(p){ return String(p||'').replace(/\D/g,'').replace(/^251/,'').replace(/^0/,''); }
  function me(){ return BS.me()||{}; }
  function isSup(){ var m=me(); return !!(m.supplierId || (m.role && m.role!=='Request materials')); }
  function mine(){ var ph=digits(me().phone); return boqs.filter(function(b){ return ph && digits(b.ownerPhone)===ph && b.status!=='withdrawn'; }); }
  function waiting(){ var ids=mine().map(function(b){ return b.id; }); return offers.filter(function(o){ return ids.indexOf(o.boqId)>=0 && o.status==='sent' && !(o.counter&&o.counter.state==='open'); }); }
  function toAgree(){ var ids=mine().map(function(b){ return b.id; }); return offers.filter(function(o){ return ids.indexOf(o.boqId)>=0 && o.status==='accepted' && o.supplierConfirmed && !o.buyerAgreedAt; }); }
  function toPay(){ var ids=mine().map(function(b){ return b.id; }); return offers.filter(function(o){ return ids.indexOf(o.boqId)>=0 && o.status==='accepted' && o.deliveredAt && !o.paidAt; }); }

  /* knowledge base: keywords → answer, links */
  var KB=[
    {k:['send','request','boq','quote','list','item','order materials','how do i start','start','begin'], a:'Go to Send a request, tick the materials you need, type the quantity and the date you need them, choose the delivery site and press Send. You sign in with your mobile number and the SMS code at that moment; no form to fill. You can also download the Excel template, let your engineer fill it, and upload it.', l:[['Send a request','#boq'],['Excel template','#boq']]},
    {k:['offer','offers','quotation','quote arrived','compare','best price','cheapest','where are my offers','my requests'], a:'Offers appear under My requests, cheapest delivered price first, with the brand but not the supplier name. Press Accept best on a line, or Accept the best price on all lines. You can also counter a price or reject an offer. You get an SMS when offers arrive.', l:[['My requests','#boq-mine']]},
    {k:['counter','negotiate','lower price','discount','cheaper'], a:'Under each offer there is a box "Your price per unit" and a Counter button. The supplier accepts or declines; if accepted the order is issued at your price. The original offer stays valid meanwhile.', l:[['My requests','#boq-mine']]},
    {k:['contract','agree','po','purchase order','binding','sign'], a:'When you accept an offer, Build Smartly issues the purchase order and reveals the supplier. The supplier reconfirms price and stock, then you read the contract on the order page and press Agree. From then on both sides are bound. The PO, the contract and later the receipt can be printed or saved as PDF from the order page.', l:[['My requests','#boq-mine']]},
    {k:['pay','payment','yagout','telebirr','cbe','card','money','receipt','invoice'], a:'You pay after the goods are delivered and you confirmed receipt with the handover code. On the order page press Pay, choose Telebirr, CBE Birr, bank transfer or card, and authorise. Yagout Pay confirms, the supplier is paid, and your receipt is under Documents. On the test site no money moves.', l:[['My requests','#boq-mine']]},
    {k:['deliver','delivery','truck','transport','handover','code','driver','site','map','pin','insurance'], a:'Choose on the request whether the supplier delivers, you collect, or Build Smartly arranges transport. You can pin the exact site on the map or use your location, and add transit insurance (0.4 % of the goods value, example rate). When the truck leaves you get a 4-digit handover code by SMS; give it to the driver and confirm receipt on the order page.', l:[['Send a request','#boq']]},
    {k:['supplier','register','sell','quote on requests','become a supplier','licence','tin','verification','verify','documents'], a:'Press Register as a supplier: mobile and code, then company, TIN, what you supply, dispatch sub-city and a password, then your licence and TIN certificate. Build Smartly staff verify within 2 working days and quoting opens. You then receive only the requests in your categories, pre-filled from your price list.', l:[['Register as a supplier','#signup-supplier'],['Supplier sign-in','#supplier']]},
    {k:['price list','prices','excel','upload','template'], a:'Suppliers keep a price list under Price list in the portal: tick the items, type the price, Save all. Or download the Excel template, fill it and upload it. Requests are pre-filled from it so a quote is one tap.', l:[['Supplier portal','#supplier']]},
    {k:['sign in','login','log in','password','sms','code','account','number','phone'], a:'Buyers sign in with their mobile number and the SMS code (on the test site the code is 123456). Suppliers use the supplier sign-in with number and password. One number can be both a buyer and a supplier.', l:[['Sign in','#signin'],['Supplier sign-in','#supplier']]},
    {k:['fee','cost','commission','charge','free','how much'], a:'Registering and sending requests is free. Build Smartly charges a percentage of each completed sale to the supplier, on completion only (example 1.5 %, final rate to be published).', l:[['Questions and answers','#faq']]},
    {k:['newsletter','advertise','promotion','banner','brand','sponsor'], a:'Brands, suppliers and contractors can advertise: a banner in the slideshow and an item in the monthly newsletter that goes to every member. Send your news from the Newsletter page; staff check it and finance sends the invoice.', l:[['Newsletter and promotions','#newsletter']]},
    {k:['problem','complain','damage','wrong','late','dispute','report','issue','broken','missing'], a:'On the order page there is Report a problem. Build Smartly staff see it at once, track it until it is resolved, and answer within one working day. For anything else, write to support from your Mailbox or ask me to hand you over.', l:[['My workspace','#workspace']]},
    {k:['telegram','whatsapp','notification','notify'], a:'Notifications are SMS first. In Settings you can switch on Telegram as well. Telegram can also be used to send a request, never to sign in.', l:[['Settings','#workspace']]},
    {k:['category','categories','material','materials','cement','steel','block','finishing','equipment','what can i buy'], a:'Five categories: Foundation, Structure, Electrical and plumbing, Finishing, Equipment rental. Each line of your request goes only to verified suppliers of that material. Something not in the list? Type it; staff classify it.', l:[['Materials','#supply']]},
    {k:['staff','admin','operations'], a:'The staff page is for Build Smartly operations: verification, categorisation, support, newsletter, finance, insights and tariffs. The link is at the bottom right of every page, for staff only.', l:[['Staff sign-in','#staff']]},
    {k:['human','person','agent','talk','support','help me','call','contact','someone'], a:'HANDOFF'}
  ];
  function answer(q){
    var t=q.toLowerCase(); var best=null, bs=0;
    KB.forEach(function(e){ var s=0; e.k.forEach(function(k){ if(t.indexOf(k)>=0) s+=k.length; }); if(s>bs){ bs=s; best=e; } });
    return best;
  }
  function greeting(){
    var m=me(), name=m.person||m.company||m.name; var parts=[];
    if(name) parts.push('Hello '+esc(name)+'.'); else parts.push('Hello. I am the Build Smartly assistant.');
    var w=waiting().length, a=toAgree().length, p=toPay().length;
    if(a) parts.push('You have '+a+' contract'+(a>1?'s':'')+' waiting for your agreement.');
    if(w) parts.push(w+' offer'+(w>1?'s':'')+' are waiting to be compared.');
    if(p) parts.push(p+' order'+(p>1?'s are':' is')+' delivered and waiting for payment.');
    if(!name) parts.push('Ask me how to send a request, compare offers, pay, or register as a supplier.');
    else if(!w && !a && !p) parts.push('What can I help you with?');
    return parts.join(' ');
  }
  function chips(){
    var m=me(); var c = isSup() ? [['My requests to quote','#supplier'],['Price list','#supplier'],['Orders and contracts','#supplier'],['Talk to a person','HANDOFF']]
      : m.phone ? [['Where are my offers?','Q'],['How do I pay?','Q'],['Contract and PO','Q'],['Talk to a person','HANDOFF']]
      : [['How do I send a request?','Q'],['How do offers work?','Q'],['Register as a supplier','#signup-supplier'],['Talk to a person','HANDOFF']];
    return '<div class="hchips">'+c.map(function(x){ return '<button type="button" data-hchip="'+esc(x[1])+'" data-q="'+esc(x[0])+'">'+esc(x[0])+'</button>'; }).join('')+'</div>';
  }
  function push(who, html){ history.push({who:who, html:html}); draw(); }
  function draw(){
    var b=$('helpBody'); b.innerHTML=history.map(function(h){ return '<div class="hmsg '+h.who+'">'+h.html+'</div>'; }).join('')+chips(); b.scrollTop=b.scrollHeight;
  }
  async function handoff(q){
    var m=me(); if(!m.phone){ push('bot','To talk to a person, sign in first with your mobile number, then write here or in your Mailbox under Support. Or use the <a href="#contact">contact page</a>.'); return; }
    await BS.add('messages', {phone:digits(m.phone), who:'customer', name:m.company||m.name||'', text:(q&&q!=='HANDOFF'?q:'Request for help from the assistant')+' (sent from the help box)'});
    push('bot','Sent to Build Smartly staff. A person answers under Support (and by SMS) within one working hour. <a href="#support">Open Support</a>');
  }
  function ask(q){
    push('me', esc(q));
    var e=answer(q);
    setTimeout(function(){
      if(!e){ if((BS.me()||{}).phone){ handoff(q); return; } push('bot','I passed nothing on because you are not signed in. Sign in and ask again, and a person from Build Smartly answers. I can also explain requests, offers, contracts, payment, delivery or registering as a supplier.'); return; }
      if(e.a==='HANDOFF'){ handoff(q); return; }
      lastQ=q; push('bot', esc(e.a)+(e.l&&e.l.length?'<div class="hlinks">'+e.l.map(function(x){ return '<a href="'+x[1]+'">'+esc(x[0])+' →</a>'; }).join('')+'</div>':'')+'<div class="hlinks"><button type="button" class="hsend" data-hsend="1">Not what I need: send my question to a person</button></div>');
    }, 350);
  }
  function toggle(on){ open = on===undefined ? !open : on; $('helpPanel').hidden=!open; $('helpBtn').setAttribute('aria-expanded', open?'true':'false'); if(open){ if(!history.length) push('bot', greeting()); draw(); setTimeout(function(){ $('helpIn').focus(); },50); } }
  $('helpBtn').onclick=function(){ toggle(); };
  $('helpClose').onclick=function(){ toggle(false); };
  $('helpSend').onclick=function(){ var q=$('helpIn').value.trim(); if(!q) return; $('helpIn').value=''; ask(q); };
  $('helpIn').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); $('helpSend').click(); } });
  $('helpBody').addEventListener('click', function(e){ if(e.target.closest('[data-hsend]')){ push('me','Send it to a person'); handoff(lastQ); return; } var c=e.target.closest('[data-hchip]'); if(!c) return; var v=c.dataset.hchip; if(v==='Q') ask(c.dataset.q||c.textContent); /* the English question, even when the button shows a translation */ else if(v==='HANDOFF') { push('me','Talk to a person'); handoff(''); } else { toggle(false); BSRoute.go(v.replace('#','')); } });
  document.addEventListener('click', function(e){ var path=e.composedPath ? e.composedPath() : []; var inside=path.some(function(el){ return el && (el.id==='helpPanel' || el.id==='helpBtn'); }); if(open && !inside) toggle(false); });
  BS.ready().then(function(){ BS.subscribe('boqs', function(d){ boqs=d||[]; }); BS.subscribe('offers', function(d){ offers=d||[]; }); });
  window.bsHelpAsk=ask;
})();

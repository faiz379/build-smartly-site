/* Build Smartly · delivery tracking.
   When the supplier marks an order dispatched, a one-time link is made for the driver (collection `tracks`, the document id
   is the secret part of the link). The driver opens it in the phone's browser, no account or app, and shares the phone's
   position while the page is open. The buyer, the supplier and staff see the truck on a map on the order page.
   Handover: once the goods are checked, the buyer gives the driver the 4-digit handover code; the driver types it on the
   tracking page and the order is marked delivered (the buyer can also type it on the order page if the driver's phone fails).
   Only the latest position is kept, and it is wiped when the delivery ends, so no route history is stored.
   The link ends at delivery or after 24 hours. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var HOURS=24, SPEED_KMH=25, STALE_MIN=5;
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function digits(p){ return String(p||'').replace(/\D/g,'').replace(/^251/,'').replace(/^0/,''); }
  function hm(ms){ return new Date(ms).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
  function ago(iso){ var s=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/1000)); return s<60 ? 'just now' : s<3600 ? Math.round(s/60)+' min ago' : Math.round(s/3600)+' h ago'; }
  function straight(a,b){ var R=6371, dLat=(b[0]-a[0])*Math.PI/180, dLon=(b[1]-a[1])*Math.PI/180, x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2); return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
  function roadKm(a,b){ return Math.round(straight(a,b)*1.3*10)/10; }
  function token(){ var a=new Uint8Array(15); (window.crypto||{}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function(v,i){ a[i]=Math.floor(Math.random()*256); }); return Array.prototype.map.call(a,function(v){ return 'abcdefghijkmnpqrstuvwxyz23456789'[v%32]; }).join(''); }
  async function sha(t){ var b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.prototype.map.call(new Uint8Array(b),function(x){ return x.toString(16).padStart(2,'0'); }).join(''); }
  function codeHash(tok, code){ return sha('bs-handover|'+tok+'|'+String(code).trim()); }
  function linkFor(tok){ if(window.BS_CLEAN) return location.origin+'/drive/'+tok; return location.href.split('#')[0].split('?')[0]+'#drive-'+tok; }
  function live(t){ return t && t.active!==false && !t.deliveredAt && Date.now()<(+t.expMs||0); }

  /* ---- map (Leaflet from cdnjs, loaded on first use) ---- */
  function loadLeaflet(){
    if(window.L) return Promise.resolve();
    return new Promise(function(res, rej){
      if(!document.querySelector('link[href*="leaflet"]')){ var css=document.createElement('link'); css.rel='stylesheet'; css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css); }
      var sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; sc.onload=function(){ res(); }; sc.onerror=function(){ rej(new Error('no map')); }; document.head.appendChild(sc);
      setTimeout(function(){ if(!window.L) rej(new Error('timeout')); }, 9000);
    });
  }
  function icon(kind){ var c=kind==='truck'?'var(--ochre)':kind==='site'?'var(--green)':'#6b7280', s=kind==='truck'?'🚚':kind==='site'?'⌂':'●';
    return L.divIcon({className:'trk-ico', html:'<span style="background:'+c+'">'+s+'</span>', iconSize:[30,30], iconAnchor:[15,15]}); }
  /* one map element per place, kept between redraws of the page around it, so the map does not flicker */
  var maps={};
  function mapIn(slot, key){
    var m=maps[key];
    if(!m){ var el=document.createElement('div'); el.className='trkmap'; m=maps[key]={el:el, map:null, marks:{}, fitted:'', ready:null}; }
    if(m.el.parentNode!==slot){ slot.innerHTML=''; slot.appendChild(m.el); if(m.map) setTimeout(function(){ m.map.invalidateSize(); }, 30); }
    if(!m.ready) m.ready=loadLeaflet().then(function(){ m.map=L.map(m.el,{zoomControl:true, attributionControl:true}).setView([9.01,38.76],12); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'&copy; OpenStreetMap'}).addTo(m.map); return m; }).catch(function(){ m.el.innerHTML='<div class="empty">The map could not load. The details below still update.</div>'; m.ready=null; return null; });
    return m.ready;
  }
  function place(m, k, pt, kind, tip){
    if(!pt){ if(m.marks[k]){ m.map.removeLayer(m.marks[k]); delete m.marks[k]; } return; }
    if(!m.marks[k]){ m.marks[k]=L.marker(pt,{icon:icon(kind)}).addTo(m.map); if(tip) m.marks[k].bindTooltip(tip); } else m.marks[k].setLatLng(pt);
  }
  /* frame the points once (again when the set changes), and follow the truck if it drives out of view */
  function fit(m, pts, key, follow){ pts=pts.filter(Boolean); if(!pts.length) return; m.map.invalidateSize();
    if(m.fitted===key){ if(follow && !m.map.getBounds().pad(-0.1).contains(follow)) m.map.panTo(follow); return; }
    m.fitted=key; if(pts.length===1) m.map.setView(pts[0], 15); else m.map.fitBounds(L.latLngBounds(pts), {padding:[30,30], maxZoom:16}); }

  /* status of a tracker in plain words, for every viewer */
  function status(t){
    if(!t) return {c:'', t:'Tracking details are loading…'};
    if(t.deliveredAt) return {c:'tag-green', t:'Delivered '+hm(new Date(t.deliveredAt).getTime())+(t.how==='code'?' · the driver entered the buyer\'s handover code':'')+'. Tracking has ended.'};
    if(t.active===false || Date.now()>=(+t.expMs||0)) return {c:'', t:'Tracking has ended.'};
    if(t.arrivedAt) return {c:'tag-green', t:'The driver arrived at the site at '+hm(new Date(t.arrivedAt).getTime())+'.'};
    if(t.lat==null || !t.at) return {c:'tag-ochre', t:'Waiting for the driver to start sharing their location.'};
    var mins=(Date.now()-new Date(t.at).getTime())/60000;
    if(mins>STALE_MIN) return {c:'tag-ochre', t:'Last position '+ago(t.at)+'. The driver\'s phone may be out of signal or the page is closed.'};
    var km=roadKm([t.lat,t.lng], t.site||[9.01,38.76]), eta=Date.now()+km/SPEED_KMH*3600000;
    return {c:'tag-green', t:'On the way · about '+km+' km to the site · arrives around '+hm(eta)+' · updated '+ago(t.at)+'.'};
  }

  /* ---- create a tracker when the order is dispatched ---- */
  async function create(group, b, drv, sim){
    var o=group[0], tok=token(), sp=BS.supplierById(o.supplierId)||{};
    var site=BS.pointOf(b.pin||b.subcity), from=BS.pointOf(o.supplierSub||sp.sub||'Akaki Kaliti');
    var items=group.map(function(x){ var l=(b.lines||[]).filter(function(y){ return y.n===x.lineN; })[0]||{}; return (l.item||'')+' · '+x.qtyOffered+' '+(l.unit||''); });
    var doc={offerIds:group.map(function(x){ return x.id; }), offerId:o.id, poRef:o.poRef||'', boqId:o.boqId, supplierId:o.supplierId, supplierName:o.supplierName||'',
      driverName:drv.name||'', driverPhone:drv.phone||'', plate:drv.plate||'', items:items, buyerName:o.customerRevealed||b.company||'', buyerPhone:b.ownerPhone||'',
      siteLabel:(b.subcity||'')+', '+(b.city||'Addis Ababa'), site:site, sitePinned:!!b.pin, from:from, fromLabel:o.supplierSub||sp.sub||'',
      codeHash:await codeHash(tok, o.handoverCode), expMs:Date.now()+HOURS*3600000, active:true, sim:!!sim, lat:null, lng:null, acc:null, at:null, startedAt:null, arrivedAt:null, deliveredAt:null};
    var ok=await BS.set('tracks', tok, doc);
    return ok ? tok : null; /* refused or failed: the order goes on without tracking */
  }
  /* end a tracker: keep the outcome, wipe the position */
  function end(tok, extra){ if(!tok) return Promise.resolve(); return BS.update('tracks', tok, Object.assign({active:false, lat:null, lng:null, acc:null, endedAt:new Date().toISOString()}, extra||{})); }
  /* the background suppliers' trucks drive by themselves along a gentle curve from the store to the site */
  var simLast={};
  async function simStep(o, b){
    var tok=o.trackId; if(!tok || o.deliveredAt) return; var now=Date.now(); if(simLast[tok] && now-simLast[tok]<(window.bsTrack&&bsTrack.simEvery||10000)) return; simLast[tok]=now;
    var dur=(BS.AUTO.driveSecs||600)*1000, p=Math.min(1,(now-new Date(o.dispatchedAt).getTime())/dur);
    var sp=BS.supplierById(o.supplierId)||{}, a=BS.pointOf(o.supplierSub||sp.sub||'Akaki Kaliti'), z=BS.pointOf(b.pin||b.subcity);
    var bend=Math.sin(p*Math.PI)*0.12, lat=a[0]+(z[0]-a[0])*p-(z[1]-a[1])*bend*0.5, lng=a[1]+(z[1]-a[1])*p+(z[0]-a[0])*bend*0.5;
    var patch={lat:+lat.toFixed(5), lng:+lng.toFixed(5), acc:15, at:new Date().toISOString()}; if(p>=1){ patch.lat=z[0]; patch.lng=z[1]; patch.arrivedAt=patch.at; }
    var t=await getOnce(tok); if(!live(t) || t.arrivedAt) return; if(!t.startedAt) patch.startedAt=patch.at;
    await BS.update('tracks', tok, patch);
  }
  function getOnce(tok){ return new Promise(function(res){ var stop=null, done=false; stop=BS.watch('tracks', tok, function(t){ if(done) return; done=true; res(t); setTimeout(function(){ if(stop) stop(); },0); }); }); }

  /* ---- the tracking card on the order page ---- */
  var watched={}, current=null;
  function follow(tok){ if(watched[tok]) return; watched[tok]={t:undefined, stop:BS.watch('tracks', tok, function(t){ watched[tok].t=t; if(current && current.tok===tok) paint(); })}; }
  function mount(o, role, b){
    var slot=$('trackCard'); if(!slot || !o.trackId){ current=null; return; }
    current={tok:o.trackId, o:o, role:role, b:b}; follow(o.trackId); paint();
  }
  function paint(){
    var c=current, slot=$('trackCard'); if(!c || !slot) return; var t=watched[c.tok].t, st=status(t);
    if(t===undefined){ slot.innerHTML='<p class="small muted">Loading the tracking…</p>'; return; }
    if(t===null){ slot.innerHTML='<p class="small muted">Tracking is not available for this delivery. The buyer confirms the delivery with the handover code.</p>'; return; }
    if(!slot.querySelector('#trkMapSlot')){
      var share='';
      if(c.role==='supplier' && !c.o.deliveredAt){ var url=linkFor(c.tok), msg='Build Smartly delivery '+(c.o.poRef||'')+' to '+((c.b||{}).subcity||'the site')+'. Open this link and press "Start sharing my location": '+url;
        var ph=digits(t&&t.driverPhone);
        share='<div class="trkshare"><p class="small"><strong>Send this link to the driver.</strong> It works only for this delivery and ends at handover or after '+HOURS+' hours.</p><div class="field"><input id="trkLink" readonly value="'+esc(url)+'" data-notr></div><div class="btns">'+
          '<button class="btn btn-primary btn-sm" type="button" id="trkCopy">Copy link</button>'+
          '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/'+(ph?'251'+ph:'')+'?text='+encodeURIComponent(msg)+'">WhatsApp</a>'+
          '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent('Build Smartly delivery '+(c.o.poRef||''))+'">Telegram</a>'+
          (ph?'<a class="btn btn-ghost btn-sm" href="sms:+251'+ph+'?&body='+encodeURIComponent(msg)+'">SMS</a>':'')+
          '<a class="btn btn-ghost btn-sm" href="#drive-'+esc(c.tok)+'">Open the driver page</a></div></div>'; }
      slot.innerHTML='<div class="trkhead"><span class="tag" id="trkTag"></span></div><div id="trkMapSlot"></div><div class="kv" id="trkKv"></div>'+share;
    }
    var tag=$('trkTag'); tag.className='tag '+st.c; tag.textContent=st.t;
    var kv='';
    if(t){ kv+='<span>Driver</span><strong>'+esc(t.driverName||'—')+(t.driverPhone && c.role!=='supplier'?' · <a href="tel:+251'+digits(t.driverPhone)+'">'+esc(t.driverPhone)+'</a>':'')+'</strong>';
      if(t.plate) kv+='<span>Truck</span><strong>'+esc(t.plate)+'</strong>';
      kv+='<span>From</span><strong>'+esc(t.fromLabel||c.o.supplierSub||'')+'</strong><span>To</span><strong>'+esc(t.siteLabel||'')+(t.sitePinned?' · pinned':'')+'</strong>';
      if(t.startedAt) kv+='<span>Left</span><strong>'+hm(new Date(t.startedAt).getTime())+'</strong>'; }
    $('trkKv').innerHTML=kv;
    var ended=!live(t);
    $('trkMapSlot').hidden=ended && !(t && t.arrivedAt && !t.deliveredAt);
    if(!t || ended) return;
    mapIn($('trkMapSlot'), 'order').then(function(m){ if(!m || !current || current.tok!==c.tok) return;
      var truck=t.lat!=null?[t.lat,t.lng]:null; place(m,'site',t.site,'site','Delivery site'); place(m,'from',t.from,'from','Supplier'); place(m,'truck',truck,'truck',t.driverName||'Truck');
      fit(m,[t.site,t.from,truck], c.tok+(truck?'+t':''), truck); });
  }
  document.addEventListener('click', function(e){
    if(e.target.id==='trkCopy'){ var i=$('trkLink'); i.select(); var v=i.value; (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(v):Promise.reject()).then(function(){ bsToast('Link copied. Send it to the driver.'); }).catch(function(){ try{ document.execCommand('copy'); bsToast('Link copied. Send it to the driver.'); }catch(err){ bsToast('Press and hold the link to copy it.'); } }); }
  });

  /* ---- staff: every delivery on the way, on one map ---- */
  function mountFleet(tracks, offers){
    var slot=$('fleetSlot'); if(!slot) return;
    var on=(tracks||[]).filter(live);
    var box=$('fleetList'); if(box) box.innerHTML=on.length ? on.map(function(t){ var st=status(t); return '<div class="doc"><span class="ico">🚚</span><span><strong><a href="#order-'+esc(t.offerId)+'">'+esc(t.poRef)+'</a></strong> · '+esc(t.supplierName)+' → '+esc(t.buyerName)+'<br><span class="small muted">'+esc(t.driverName||'')+(t.plate?' · '+esc(t.plate):'')+' · '+esc(st.t)+'</span></span><span></span></div>'; }).join('') : '<div class="empty">No deliveries on the way right now.</div>';
    slot.hidden=!on.length; if(!on.length) return;
    mapIn(slot,'fleet').then(function(m){ if(!m) return; Object.keys(m.marks).forEach(function(k){ if(!on.some(function(t){ return 'tr'+t.id===k||'si'+t.id===k; })) place(m,k,null); });
      var pts=[]; on.forEach(function(t){ var p=t.lat!=null?[t.lat,t.lng]:null; place(m,'tr'+t.id,p||t.from,'truck',(t.poRef||'')+' · '+(t.driverName||'')); place(m,'si'+t.id,t.site,'site',(t.poRef||'')+' · site'); pts.push(p||t.from, t.site); });
      fit(m, pts, on.map(function(t){ return t.id; }).join(',')); });
  }

  /* ---- the driver's page: /drive/<link> ---- */
  var drv={tok:null, t:null, stop:null, watchId:null, lastSent:0, lastPt:null, lock:null, sharing:false};
  function lockKey(){ return 'bs_drv_tries_'+drv.tok; }
  BSRoute.on('drive', function(tok){
    if(drv.stop) drv.stop(); stopSharing(true); drv={tok:tok, t:undefined, stop:null, watchId:null, lastSent:0, lastPt:null, lock:null, sharing:false};
    $('driveBody').innerHTML='<div class="empty">Opening the delivery…</div>'; window.scrollTo(0,0);
    drv.stop=BS.watch('tracks', tok, function(t){ var first=drv.t===undefined; drv.t=t; driveRender(first); });
  });
  function driveRender(first){
    var t=drv.t, box=$('driveBody'); if(!box) return;
    if(!t){ box.innerHTML='<div class="card"><h1 style="font-size:1.4rem">This link is not valid</h1><p class="muted">Ask the supplier to send the delivery link again.</p></div>'; return; }
    if(!live(t)){ stopSharing(true); box.innerHTML='<div class="card" style="display:grid;gap:.5rem"><span class="eyebrow"><span>Delivery</span> <span data-notr>'+esc(t.poRef)+'</span></span><h1 style="font-size:1.4rem">'+(t.deliveredAt?'Delivered. Thank you.':'This delivery link has ended')+'</h1><p class="muted">'+(t.deliveredAt?'The handover code was correct and the order is marked delivered. Your location is no longer shared.':'Your location is no longer shared. Ask the supplier for a new link if the delivery is not finished.')+'</p></div>'; return; }
    if(first || !$('drvGo')){
      var maps='https://www.google.com/maps/dir/?api=1&destination='+(+t.site[0])+','+(+t.site[1]);
      box.innerHTML='<section class="card" style="display:grid;gap:.6rem"><span class="eyebrow"><span>Delivery</span> <span data-notr>'+esc(t.poRef)+'</span></span><h1 style="font-size:1.4rem"><span>Hello</span>'+(t.driverName?' <span data-notr>'+esc(t.driverName)+'</span>':'')+'</h1>'+
        '<div class="kv"><span>From</span><strong>'+esc(t.supplierName)+' · '+esc(t.fromLabel)+'</strong><span>To</span><strong>'+esc(t.siteLabel)+(t.sitePinned?' · exact site pinned':'')+'</strong><span>Buyer</span><strong>'+esc(t.buyerName)+(t.buyerPhone?' · <a href="tel:+251'+digits(t.buyerPhone)+'">Call</a>':'')+'</strong><span>Load</span><strong>'+(t.items||[]).map(esc).join('<br>')+'</strong></div>'+
        '<div class="btns"><a class="btn btn-ghost btn-sm" id="drvNav" target="_blank" rel="noopener" href="'+maps+'">Directions in Google Maps</a></div></section>'+
        '<section class="card" style="display:grid;gap:.6rem"><strong style="font-family:var(--display);font-size:1.05rem">1 · Share your location</strong><p class="small muted">The buyer sees the truck on a map. Keep this page open and the screen on while you drive. Only your latest position is shared, and it stops at handover.</p>'+
        '<div class="btns"><button class="btn btn-primary" type="button" id="drvGo">Start sharing my location</button><button class="btn btn-ghost btn-sm" type="button" id="drvStop" hidden>Pause</button></div><p class="small" id="drvState" aria-live="polite"></p><div id="drvMapSlot"></div></section>'+
        '<section class="card" style="display:grid;gap:.6rem"><strong style="font-family:var(--display);font-size:1.05rem">2 · At the site</strong><div class="btns"><button class="btn btn-ghost" type="button" id="drvArrive">I have arrived</button></div>'+
        '<p class="small muted">When the buyer has checked the goods, ask for their 4-digit handover code and type it here. A correct code confirms the delivery.</p>'+
        '<div class="chat-in"><div class="field"><input id="drvCode" inputmode="numeric" maxlength="4" placeholder="4-digit code" autocomplete="off"></div><button class="btn btn-ochre" type="button" id="drvConfirm">Confirm delivery</button></div><p class="small" id="drvCodeMsg" aria-live="polite"></p>'+
        '<details><summary class="small" style="cursor:pointer">Problem at handover?</summary><div class="chat-in" style="margin-top:.5rem"><div class="field"><input id="drvIssue" placeholder="The buyer is not there, refuses the goods, wrong address…"></div><button class="btn btn-ghost btn-sm" type="button" id="drvIssueGo">Tell Build Smartly</button></div></details></section>';
    }
    $('drvArrive').disabled=!!t.arrivedAt; $('drvArrive').textContent=t.arrivedAt?'Arrived '+hm(new Date(t.arrivedAt).getTime()):'I have arrived';
    driveState();
    if(t.lat!=null || drv.lastPt) mapIn($('drvMapSlot'),'drive').then(function(m){ if(!m || !drv.t) return; var me=drv.lastPt||(drv.t.lat!=null?[drv.t.lat,drv.t.lng]:null); place(m,'site',drv.t.site,'site','Delivery site'); place(m,'truck',me,'truck','You'); fit(m,[drv.t.site,me], drv.tok+(me?'+':''), me); });
  }
  function driveState(msg){ var el=$('drvState'); if(!el) return; var t=drv.t||{};
    el.textContent = msg || (drv.sharing ? (drv.lastSent ? 'Sharing · last sent '+hm(drv.lastSent)+(drv.lastPt && t.site ? ' · about '+roadKm(drv.lastPt,t.site)+' km to the site':'') : 'Finding your position…') : t.at ? 'Paused. The buyer sees your last position from '+ago(t.at)+'.' : 'Not sharing yet.');
    if($('drvGo')){ $('drvGo').hidden=drv.sharing; $('drvStop').hidden=!drv.sharing; } }
  async function send(pos){
    var t=drv.t; if(!live(t)) return stopSharing(true);
    var pt=[+pos.coords.latitude.toFixed(5), +pos.coords.longitude.toFixed(5)], now=Date.now(), moved=drv.lastPt?straight(drv.lastPt,pt)*1000:1e9;
    drv.lastPt=pt;
    var every=window.bsTrack&&bsTrack.every||30000, near=window.bsTrack&&bsTrack.near||10000; /* send every 30 s, or after 10 s when the truck moved more than 50 m */
    if(drv.lastSent && !(now-drv.lastSent>=every || (moved>50 && now-drv.lastSent>=near))){ driveState(); return; }
    drv.lastSent=now; var patch={lat:pt[0], lng:pt[1], acc:Math.round(pos.coords.accuracy||0), at:new Date(now).toISOString()}; if(!t.startedAt) patch.startedAt=patch.at;
    await BS.update('tracks', drv.tok, patch); driveState();
  }
  async function keepAwake(){ try{ if(drv.sharing && navigator.wakeLock && document.visibilityState==='visible') drv.lock=await navigator.wakeLock.request('screen'); }catch(e){} }
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible'){ keepAwake(); if(drv.sharing && drv.lastPt) driveState(); } });
  function startSharing(){
    if(!navigator.geolocation){ driveState('This phone\'s browser cannot share a location. Try Chrome.'); return; }
    drv.sharing=true; driveState(); keepAwake();
    drv.watchId=navigator.geolocation.watchPosition(function(p){ send(p).catch(function(){}); }, function(err){
      if(err.code===1){ stopSharing(); driveState('Location is blocked. Allow location for this site in the browser settings, then press Start again.'); }
      else driveState('No GPS signal yet. Keep the page open; it carries on by itself.'); }, {enableHighAccuracy:true, maximumAge:10000, timeout:30000});
  }
  function stopSharing(quiet){ if(drv.watchId!=null && navigator.geolocation) navigator.geolocation.clearWatch(drv.watchId); drv.watchId=null; drv.sharing=false; try{ if(drv.lock) drv.lock.release(); }catch(e){} drv.lock=null; if(!quiet) driveState(); }
  async function confirmCode(){
    var t=drv.t, code=($('drvCode').value||'').trim(), msg=$('drvCodeMsg'); if(!live(t)) return;
    var tries={}; try{ tries=JSON.parse(localStorage.getItem(lockKey())||'{}'); }catch(e){}
    if(tries.until && Date.now()<tries.until){ msg.textContent='Too many wrong codes. Try again after '+hm(tries.until)+', or call the buyer.'; return; }
    if(!/^\d{4}$/.test(code)){ msg.textContent='The code has 4 digits.'; return; }
    $('drvConfirm').disabled=true;
    if(await codeHash(drv.tok, code)!==t.codeHash){ tries.n=(tries.n||0)+1; if(tries.n>=5){ tries={n:0, until:Date.now()+10*60000}; } try{ localStorage.setItem(lockKey(), JSON.stringify(tries)); }catch(e){}
      msg.textContent='That code is not correct. Ask the buyer to read it again from their order page.'; $('drvConfirm').disabled=false; return; }
    var now=new Date().toISOString();
    await BS.updateMany('offers', t.offerIds||[t.offerId], {deliveredAt:now, deliveredHow:'code', handoverCheckedAt:now});
    stopSharing(true); await end(drv.tok, {deliveredAt:now, how:'code'}); bsToast('Delivery confirmed. Thank you.');
  }
  document.addEventListener('click', async function(e){
    if(!e.target.closest('#view-drive')) return; var id=e.target.id;
    if(id==='drvGo') startSharing();
    if(id==='drvStop') stopSharing();
    if(id==='drvArrive'){ e.target.disabled=true; var p={arrivedAt:new Date().toISOString()}; if(drv.lastPt){ p.lat=drv.lastPt[0]; p.lng=drv.lastPt[1]; p.at=p.arrivedAt; } await BS.update('tracks', drv.tok, p); bsToast('The buyer is told you have arrived.'); }
    if(id==='drvConfirm') confirmCode().catch(function(){ $('drvConfirm').disabled=false; });
    if(id==='drvIssueGo'){ var i=$('drvIssue'), txt=(i.value||'').trim(); if(!txt) return; var t=drv.t||{}; i.value='';
      await BS.add('issues', {offerId:t.offerId, boqId:t.boqId, poRef:t.poRef, who:'Driver '+(t.driverName||'')+' ('+(t.supplierName||'')+')', role:'driver', text:txt, status:'open', where:drv.lastPt?{lat:drv.lastPt[0], lng:drv.lastPt[1]}:(t.lat!=null?{lat:t.lat,lng:t.lng}:null)});
      bsToast('Sent to Build Smartly staff with your location.'); }
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target.id==='drvCode'){ e.preventDefault(); confirmCode(); } });

  window.bsTrack={create:create, end:end, simStep:simStep, mount:mount, mountFleet:mountFleet, linkFor:linkFor, codeHash:codeHash, live:live, status:status};
})();

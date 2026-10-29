/* Build Smartly demo store.
   Shared mode: the artifact's db capability, so a BOQ sent on one device appears in the supplier portal on another.
   Local mode: this browser only (localStorage), used when the shared store is unavailable or read-only. */
(function(){
  var BS = window.BS = {};

  BS.CATALOGUE = [
    {name:"Cement OPC 42.5", cat:"Cement", unit:"quintal", stage:"foundation", units:["quintal","bag","ton"], min:10, base:1180},
    {name:"Cement PPC 32.5", cat:"Cement", unit:"quintal", stage:"foundation", units:["quintal","bag","ton"], min:10, base:1050},
    {name:"Sand (fine)", cat:"Aggregates and fill", unit:"m³", stage:"foundation", units:["m³","truckload"], min:8, base:14500},
    {name:"Aggregate 02 (coarse)", cat:"Aggregates and fill", unit:"m³", stage:"foundation", units:["m³","truckload"], min:8, base:2350},
    {name:"Aggregate 01 (fine)", cat:"Aggregates and fill", unit:"m³", stage:"foundation", units:["m³","truckload"], min:8, base:2600},
    {name:"Red ash (scoria) fill", cat:"Aggregates and fill", unit:"truckload", stage:"foundation", units:["truckload","m³"], min:1, base:9000},
    {name:"Masonry stone", cat:"Blocks, bricks and stone", unit:"m³", stage:"foundation", units:["m³","truckload"], min:8, base:2800},
    {name:"Rebar 8 mm grade 60", cat:"Reinforcement steel", unit:"quintal", stage:"foundation", units:["quintal","ton","pcs"], min:5, base:9900},
    {name:"Rebar 10 mm grade 60", cat:"Reinforcement steel", unit:"quintal", stage:"foundation", units:["quintal","ton","pcs"], min:5, base:9850},
    {name:"Rebar 12 mm grade 60", cat:"Reinforcement steel", unit:"quintal", stage:"structure", units:["quintal","ton","pcs"], min:5, base:9800},
    {name:"Rebar 16 mm grade 60", cat:"Reinforcement steel", unit:"quintal", stage:"structure", units:["quintal","ton","pcs"], min:5, base:9750},
    {name:"Binding wire", cat:"Reinforcement steel", unit:"kg", stage:"foundation", units:["kg","roll"], min:25, base:160},
    {name:"Wire mesh", cat:"Reinforcement steel", unit:"sheet", stage:"foundation", units:["sheet","roll"], min:10, base:1900},
    {name:"HCB 20 cm", cat:"Blocks, bricks and stone", unit:"pcs", stage:"structure", units:["pcs"], min:500, base:38},
    {name:"HCB 15 cm", cat:"Blocks, bricks and stone", unit:"pcs", stage:"structure", units:["pcs"], min:500, base:32},
    {name:"Bricks (clay)", cat:"Blocks, bricks and stone", unit:"pcs", stage:"structure", units:["pcs"], min:1000, base:9},
    {name:"Ready-mix concrete C-25", cat:"Cement", unit:"m³", stage:"structure", units:["m³"], min:6, base:8900},
    {name:"Steel column RHS 100x100", cat:"Structural steel and roofing", unit:"m", stage:"structure", units:["m","pcs"], min:12, base:2400},
    {name:"Roofing sheet galvanised 0.4 mm", cat:"Structural steel and roofing", unit:"sheet", stage:"structure", units:["sheet","bundle"], min:20, base:1450},
    {name:"Plywood 18 mm formwork", cat:"Formwork, timber and scaffolding", unit:"sheet", stage:"structure", units:["sheet"], min:10, base:2600},
    {name:"Ceramic floor tiles 40x40", cat:"Finishing: tiles and floors", unit:"m²", stage:"finishing", units:["m²","box"], min:20, base:950},
    {name:"Emulsion paint", cat:"Finishing: paint and plaster", unit:"litre", stage:"finishing", units:["litre","bucket"], min:20, base:390},
    {name:"Gypsum board 12 mm", cat:"Finishing: paint and plaster", unit:"sheet", stage:"finishing", units:["sheet"], min:10, base:1100},
    {name:"PPR pipe 25 mm", cat:"Plumbing and sanitary", unit:"m", stage:"services", units:["m","pcs"], min:50, base:180},
    {name:"PVC drainage pipe 110 mm", cat:"Plumbing and sanitary", unit:"m", stage:"services", units:["m","pcs"], min:30, base:520},
    {name:"Water tank 5,000 L", cat:"Plumbing and sanitary", unit:"pcs", stage:"services", units:["pcs"], min:1, base:38000},
    {name:"Electrical cable 2.5 mm²", cat:"Electrical", unit:"roll", stage:"services", units:["roll","m"], min:1, base:6200},
    {name:"PVC conduit 20 mm", cat:"Electrical", unit:"pcs", stage:"services", units:["pcs","bundle"], min:50, base:95},
    {name:"Distribution board 12 way", cat:"Electrical", unit:"pcs", stage:"services", units:["pcs"], min:1, base:4200},
    {name:"Sino truck (10 wheel) hire", cat:"Equipment rental", unit:"trip", stage:"equipment", units:["trip","day"], min:1, base:6500},
    {name:"Excavator hire with operator", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:22000},
    {name:"Forklift hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:9000},
    {name:"Trailer bed hire", cat:"Equipment rental", unit:"trip", stage:"equipment", units:["trip","day"], min:1, base:12000},
    {name:"Concrete mixer hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:3500},
    {name:"Backhoe loader hire with operator", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:14000},
    {name:"Wheel loader hire with operator", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:18000},
    {name:"Bulldozer hire with operator", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:26000},
    {name:"Motor grader hire with operator", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:24000},
    {name:"Roller compactor hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:12000},
    {name:"Plate compactor hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","week"], min:1, base:1500},
    {name:"Tower crane hire", cat:"Equipment rental", unit:"month", stage:"equipment", units:["month"], min:1, base:450000},
    {name:"Mobile crane hire (25 t)", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","hour"], min:1, base:35000},
    {name:"Concrete pump hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","m³"], min:1, base:30000},
    {name:"Dump truck hire (12 m³)", cat:"Equipment rental", unit:"trip", stage:"equipment", units:["trip","day"], min:1, base:5500},
    {name:"Water tanker hire (10,000 l)", cat:"Equipment rental", unit:"trip", stage:"equipment", units:["trip","day"], min:1, base:4500},
    {name:"Diesel generator hire (100 kVA)", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","week","month"], min:1, base:6000},
    {name:"Concrete vibrator hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","week"], min:1, base:900},
    {name:"Scaffolding set hire (100 m²)", cat:"Equipment rental", unit:"month", stage:"equipment", units:["month","week"], min:1, base:25000},
    {name:"Bar bending and cutting machine hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","week"], min:1, base:2500},
    {name:"Welding machine hire", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","week"], min:1, base:1200},
    {name:"Water pump hire (dewatering)", cat:"Equipment rental", unit:"day", stage:"equipment", units:["day","week"], min:1, base:1800}
  ];
  /* Pictures beside the categories and the equipment in every item list (assets/photos/cat and assets/photos/items; credits in assets/photos/credits.json). */
  BS.CAT_PICS = {"Cement":"sc-cement","Aggregates and fill":"sc-aggregates","Reinforcement steel":"sc-rebar","Blocks, bricks and stone":"sc-blocks","Structural steel and roofing":"sc-structural","Formwork, timber and scaffolding":"sc-formwork","Finishing: tiles and floors":"sc-tiles","Finishing: paint and plaster":"sc-paint","Plumbing and sanitary":"sc-plumbing","Electrical":"sc-electrical","Equipment rental":"sc-equipment"};
  BS.ITEM_PICS = {"Sino truck (10 wheel) hire":"eq-sino-truck","Excavator hire with operator":"eq-excavator","Forklift hire":"eq-forklift","Trailer bed hire":"eq-trailer","Concrete mixer hire":"eq-mixer","Backhoe loader hire with operator":"eq-backhoe","Wheel loader hire with operator":"eq-wheel-loader","Bulldozer hire with operator":"eq-bulldozer","Motor grader hire with operator":"eq-grader","Roller compactor hire":"eq-roller","Plate compactor hire":"eq-plate-compactor","Tower crane hire":"eq-tower-crane","Mobile crane hire (25 t)":"eq-mobile-crane","Concrete pump hire":"eq-concrete-pump","Dump truck hire (12 m³)":"eq-dump-truck","Water tanker hire (10,000 l)":"eq-water-tanker","Diesel generator hire (100 kVA)":"eq-generator","Concrete vibrator hire":"eq-vibrator","Scaffolding set hire (100 m²)":"eq-scaffolding","Bar bending and cutting machine hire":"eq-bar-bender","Welding machine hire":"eq-welder","Water pump hire (dewatering)":"eq-water-pump"};
  BS.catPic = function(cat){ var k=BS.CAT_PICS[cat]; return k ? ((BS.PICS&&BS.PICS[k]) || "assets/photos/cat/"+k+".jpg") : ""; };
  BS.itemPic = function(name){ var k=BS.ITEM_PICS[name]; return k ? ((BS.PICS&&BS.PICS[k]) || "assets/photos/items/"+k+".jpg") : ""; };
  BS.BRAND_LOGOS = {};
  BS.ADS_HIDDEN = [];
  BS.UNITS = ["pcs","bag","quintal","ton","kg","m³","truckload","m²","m","litre","bucket","roll","sheet","box","bundle","package","trip","hour","day"]; /* free-text items only; catalogue items carry their own units and an example minimum order */
  BS.CATEGORIES = ["Cement","Aggregates and fill","Reinforcement steel","Blocks, bricks and stone","Structural steel and roofing","Formwork, timber and scaffolding","Finishing: tiles and floors","Finishing: paint and plaster","Plumbing and sanitary","Electrical","Equipment rental","Other (staff will classify)"];
  BS.DESKS = {"Cement":"Structural materials desk","Aggregates and fill":"Structural materials desk","Blocks, bricks and stone":"Structural materials desk","Reinforcement steel":"Steel desk","Structural steel and roofing":"Steel desk","Formwork, timber and scaffolding":"Timber and equipment desk","Equipment rental":"Timber and equipment desk","Finishing: tiles and floors":"Finishing desk","Finishing: paint and plaster":"Finishing desk","Plumbing and sanitary":"Services desk","Electrical":"Services desk","Other (staff will classify)":"Technical supervisor"};
  /* Suppliers on the test site (decided 27 Oct 2026): two suppliers that cover every category, so every request reaches
     both and the buyer can compare two offers per line. Nobody answers automatically; the testers play both suppliers.
     Staff can add more suppliers from the staff page. */
  BS.ALL_CATS = ["Cement","Aggregates and fill","Reinforcement steel","Blocks, bricks and stone","Structural steel and roofing","Formwork, timber and scaffolding","Finishing: tiles and floors","Finishing: paint and plaster","Plumbing and sanitary","Electrical","Equipment rental"];
  BS.SUPPLIERS = [
    {id:"kality", name:"Kality Building Materials PLC", branch:"Kality main yard", sub:"Akaki Kaliti", cats:BS.ALL_CATS.slice()},
    {id:"megenagna", name:"Megenagna Construction Supplies PLC", branch:"Megenagna store", sub:"Yeka", cats:BS.ALL_CATS.slice()},
    /* background suppliers (no login): they quote by themselves a few minutes after a request, with their own prices and
       brands, so every line has several offers to compare. They answer counter-offers and move their orders along. */
    {id:"derba", name:"Kality Cement Distributors PLC", branch:"Kality warehouse", sub:"Akaki Kaliti", cats:["Cement","Aggregates and fill","Blocks, bricks and stone"], auto:true, factor:0.97},
    {id:"addissteel", name:"Addis Steel & Rebar Trading", branch:"Akaki yard", sub:"Akaki Kaliti", cats:["Reinforcement steel","Structural steel and roofing","Formwork, timber and scaffolding"], auto:true, factor:1.02},
    {id:"habesha", name:"Habesha Finishing Supplies", branch:"Merkato shop", sub:"Addis Ketema", cats:["Finishing: tiles and floors","Finishing: paint and plaster","Plumbing and sanitary","Electrical"], auto:true, factor:0.99},
    {id:"yerer", name:"Yerer Equipment Rental", branch:"Bole Lemi depot", sub:"Bole", cats:["Equipment rental"], auto:true, factor:0.95},
    {id:"ethiobuild", name:"Ethio Build Mart", branch:"Megenagna showroom and yard", sub:"Yeka", cats:BS.ALL_CATS.slice(), auto:true, factor:1.05}
  ];
  /* Brands a supplier can pick per material category (admin-editable in the real app) */
  BS.BRANDS = {
    "Cement": ["Dangote","Derba","Mugher","National","Habesha","Other"],
    "Aggregates and fill": ["Local quarry","Other"],
    "Reinforcement steel": ["Local mill, grade 60","Local mill, grade 40","Imported","Other"],
    "Blocks, bricks and stone": ["Local block plant","Local brick factory","Other"],
    "Structural steel and roofing": ["Local mill","Imported","Other"],
    "Formwork, timber and scaffolding": ["Local","Imported","Other"],
    "Finishing: tiles and floors": ["Local","Imported (China)","Imported (Turkey)","Other"],
    "Finishing: paint and plaster": ["Kadisco","Nifas Silk","Imported","Other"],
    "Plumbing and sanitary": ["Local","Imported","Other"],
    "Electrical": ["Local","Imported","Other"],
    "Equipment rental": ["Sino","Caterpillar","Komatsu","JCB","Other"]
  };
  /* One fixed SMS code and supplier password for the test site (the real site sends a different code each time). */
  BS.DEMO_CODE = "123456";
  BS.DEMO_PASSWORD = "smartly";
  /* Test logins (27 Oct 2026): one buyer, two suppliers, two staff (see BS.STAFF). Any other Ethiopian number becomes a new buyer. */
  BS.TEST_ACCOUNTS = [
    {phone:"911000201", buyer:"Sheba Builders PLC", label:"Buyer"},
    {phone:"911000301", supplierId:"kality", label:"Supplier A"},
    {phone:"911000302", supplierId:"megenagna", label:"Supplier B"}
  ];
  /* Simulated suppliers: how many seconds after a request each one answers, and how the simulated supplier
     handles counter-offers and the order steps. Test site only. */
  BS.AUTO = { replyAfter:[60,120,180,240,300], counterAfter:90, confirmAfter:120, readyAfter:240, dispatchAfter:240, acceptCounterAbove:0.96 };
  /* Introductions for the simulated suppliers' public profiles (test site) */
  BS.SUPPLIER_INTRO = {
    derba:"Distributor of Derba and Dangote cement to contractors in Addis Ababa since 2014. Own fleet, deliveries within 24 hours inside the city.",
    mugher:"Agents for Mugher and National cement. Bulk and bagged, sub-city depots in Kirkos and Nifas Silk.",
    national:"Cement of all major brands and hollow concrete blocks from our Akaki Kaliti yard. Site deliveries with crane trucks.",
    addissteel:"Rebar grade 40 and 60, binding wire and wire mesh. Cutting and bending to drawings.",
    sheger:"Reinforcement and structural steel, local and imported, with mill certificates.",
    megablocks:"Hollow concrete blocks, aggregates and formwork plywood from our Lemi Kura plant.",
    gullele:"Crushed aggregates 01 and 02, sand and scoria fill from our own quarry. Sino truck hire.",
    yerer:"Excavators, loaders, mixers and Sino trucks with operators, by the day or the trip.",
    habesha:"Tiles, paint, gypsum and sanitary ware for finishing works. Showroom in Merkato.",
    electroplumb:"Cables, conduits, distribution boards, PPR and PVC pipes and water tanks.",
    ethiobuild:"One-stop supplier for every stage of the build, from cement to finishing. Showroom and yard at Megenagna.",
    addissupplies:"Construction materials wholesaler since 2009. All categories, credit terms for repeat customers."
  };
  /* Earliest "needed by" date on a request, in days from today. Example value; the owner sets the real minimum. */
  BS.MIN_LEAD_DAYS = 3;
  BS.FEE_RATE = 0.015;        /* platform fee on each completed sale, example until the owner sets it */
  BS.VALIDITY_DAYS = 4;       /* days suppliers have to reply to a request */
  /* Staff accounts for the admin page (test site). */
  BS.STAFF = [ {phone:"911000900", person:"Build Smartly staff", name:"Staff"}, {phone:"911000901", person:"Abdela (owner)", name:"Owner"} ];
  BS.STAFF_PASSWORD = "admin";
  /* Settings the staff page can change (collection `settings`): tariffs and brands. Applied on every device at load and live. */
  BS.PICS = {};
  /* picture slots staff can fill from the staff page; each is one settings doc pic-<key> holding a resized JPEG data URL */
  BS.PIC_SLOTS = [
    {key:"hero1", label:"Home banner · wide photo of a site in Addis Ababa", w:1600, h:520},
    {key:"hero2", label:"Home slide 2 · wide photo behind the contractors message", w:1600, h:520},
    {key:"hero3", label:"Home slide 3 · wide photo behind the suppliers message", w:1600, h:520},
    {key:"cat-foundation", label:"Category circle · Foundation", w:700, h:700},
    {key:"cat-structure", label:"Category circle · Structure", w:700, h:700},
    {key:"cat-services", label:"Category circle · Electrical and plumbing", w:700, h:700},
    {key:"cat-finishing", label:"Category circle · Finishing", w:700, h:700},
    {key:"cat-equipment", label:"Category circle · Equipment rental", w:700, h:700},
    {key:"ad-cement", label:"Promotion banner · cement brand", w:1200, h:400},
    {key:"ad-steel", label:"Promotion banner · steel supplier", w:1200, h:400},
    {key:"ad-contractor", label:"Promotion banner · contractor", w:1200, h:400},
    {key:"ad-paint", label:"Promotion banner · paint brand", w:1200, h:400}
  ];
  BS.applySettings = function(docs){
    BS.PICS = {};
    (docs||[]).forEach(function(d){
      if(d.id && d.id.indexOf("pic-")===0 && d.data) BS.PICS[d.id.slice(4)] = d.data;
      if(d.id==="tariffs"){ var t=d;
        if(t.perTrip>0) BS.TRUCK.perTrip=+t.perTrip; if(t.perKm>=0) BS.TRUCK.perKm=+t.perKm; if(t.capacityT>0) BS.TRUCK.capacityT=+t.capacityT; if(t.mobilisation>=0) BS.TRUCK.mobilisation=+t.mobilisation;
        if(t.insuranceRate>=0) BS.INSURANCE.rate=+t.insuranceRate; if(t.insuranceMin>=0) BS.INSURANCE.min=+t.insuranceMin;
        if(t.minLeadDays>=0) BS.MIN_LEAD_DAYS=+t.minLeadDays; if(t.feeRate>=0) BS.FEE_RATE=+t.feeRate; if(t.validityDays>0) BS.VALIDITY_DAYS=+t.validityDays;
        BS.tariffsSetBy = t.setBy||""; }
      if(d.id==="catalogue" && Array.isArray(d.items) && d.items.length){ BS.CATALOGUE.length=0; d.items.forEach(function(it){ BS.CATALOGUE.push(it); }); BS.catalogueSetBy=d.setBy||""; }
      if(d.id==="categories" && Array.isArray(d.list)){ BS.extraCategories=d.list.slice(); d.list.forEach(function(c){ if(c.name && BS.CATEGORIES.indexOf(c.name)<0){ BS.CATEGORIES.splice(BS.CATEGORIES.length-1,0,c.name); } if(c.name && c.desk) BS.DESKS[c.name]=c.desk; if(c.name && c.brands && !BS.BRANDS[c.name]) BS.BRANDS[c.name]=c.brands; }); }
      if(d.id==="brands" && d.map){ Object.keys(d.map).forEach(function(c){ if(Array.isArray(d.map[c]) && d.map[c].length) BS.BRANDS[c]=d.map[c].slice(); }); }
      if(d.id==="brandLogos" && d.map){ BS.BRAND_LOGOS=d.map; }
      if(d.id==="ads" && Array.isArray(d.hidden)){ BS.ADS_HIDDEN=d.hidden.slice(); }
    });
    (BS._settingsCbs||[]).forEach(function(cb){ try{ cb(); }catch(e){} });
  };
  BS.onSettings = function(cb){ (BS._settingsCbs=BS._settingsCbs||[]).push(cb); };
  BS.pct = function(r){ return (Math.round(r*1000)/10)+" %"; };
  BS.SUBCITIES = ["Addis Ketema","Akaki Kaliti","Arada","Bole","Gullele","Kirkos","Kolfe Keranio","Lemi Kura","Lideta","Nifas Silk-Lafto","Yeka"];

  /* Home-page price pulse. Example figures until launch; on the shared link the median of real quotes replaces them.
     chg = change in percent since last week (example). item = catalogue name the live quotes are matched on. */
  /* Newsletter: what buyers received in the latest issue. Example content for the test site; real items come from the `news` collection. */
  BS.NEWS = [
    {issue:"October 2026", kind:"feature", company:"Featured supplier", title:"Kality Cement Distributors: 48-hour delivery inside Addis Ababa", text:"Dangote and Derba 42.5 from the Kality warehouse, bulk and bagged. Quotes pre-filled from a daily price list.", sponsored:true},
    {issue:"October 2026", kind:"news", company:"Addis Steel & Rebar Trading", title:"New: grade 60 rebar 8 to 32 mm, mill certificates on every lot", text:"Local mill and imported, with test certificates attached to the contract. Binding wire and wire mesh in stock.", sponsored:true},
    {issue:"October 2026", kind:"news", company:"Habesha Finishing Supplies", title:"New brand: Italian-made ceramic tiles 60x60 at Merkato", text:"Three new designs, boxes of 1.44 m². Samples at the shop; quotes through your request.", sponsored:true},
    {issue:"October 2026", kind:"platform", company:"Build Smartly", title:"Price pulse: cement up 1.7 %, rebar down 2 % since last week", text:"Medians of the quotes on the platform this week. Send a request to get live offers for your site.", sponsored:false}
  ];
  /* Promotions slideshow: brands, suppliers and contractors who advertise. Example banners for the test site; published newsletter items with a picture join them. */
  BS.ADS = [
    {key:"ad-cement", who:"Brand", company:"Derba Cement", title:"OPC 42.5 and PPC 32.5 with 9 verified distributors", img:"assets/ad-cement.svg"},
    {key:"ad-steel", who:"Supplier", company:"Addis Steel & Rebar Trading", title:"Grade 60 rebar with mill certificates, delivered in Addis Ababa", img:"assets/ad-steel.svg"},
    {key:"ad-contractor", who:"Contractor", company:"Tana Construction PLC", title:"Grade 1 contractor, hiring subcontractors for Bole and Lemi Kura", img:"assets/ad-contractor.svg"},
    {key:"ad-paint", who:"Brand", company:"Kadisco Paint", title:"New colour range for 2026 through verified finishing suppliers", img:"assets/ad-paint.svg"}
  ];
  BS.PULSE = [
    {item:"Cement OPC 42.5", name:"Cement OPC 42.5", brand:"Dangote", unit:"per quintal (two 50 kg bags)", price:1180, chg:1.7, when:"6 suppliers, this morning", svg:'<svg viewBox="0 0 80 80"><rect x="14" y="18" width="52" height="50" rx="6" fill="#D9D3C7"/><rect x="14" y="18" width="52" height="12" rx="6" fill="#B9AE9C"/><text x="40" y="54" text-anchor="middle" font-family="Sora,Arial" font-size="12" font-weight="700" fill="#1E6B4E">OPC</text></svg>'},
    {item:"Cement PPC 32.5", name:"Cement PPC 32.5", brand:"Derba", unit:"per quintal", price:1050, chg:0, when:"4 suppliers, this morning", svg:'<svg viewBox="0 0 80 80"><rect x="14" y="18" width="52" height="50" rx="6" fill="#E8E2D6"/><rect x="14" y="18" width="52" height="12" rx="6" fill="#C9BFAE"/><text x="40" y="54" text-anchor="middle" font-family="Sora,Arial" font-size="12" font-weight="700" fill="#1E6B4E">PPC</text></svg>'},
    {item:"Rebar 12 mm grade 60", name:"Rebar 12 mm", brand:"Local mill, grade 60", unit:"per quintal", price:9800, chg:-2.0, when:"5 suppliers, yesterday", svg:'<svg viewBox="0 0 80 80"><g stroke="#7A5C3A" stroke-width="6" stroke-linecap="round"><path d="M12 30h56M12 42h56M12 54h56"/></g><g stroke="#B08A5E" stroke-width="2"><path d="M20 27v6M32 27v6M44 27v6M56 27v6M20 39v6M32 39v6M44 39v6M56 39v6"/></g></svg>'},
    {item:"Aggregate 02 (coarse)", name:"Gravel 02", brand:"", unit:"per m³, delivered Bole", price:2350, chg:0.9, when:"4 suppliers, this morning", svg:'<svg viewBox="0 0 80 80"><circle cx="24" cy="50" r="10" fill="#9CA39A"/><circle cx="44" cy="40" r="13" fill="#B4BAB1"/><circle cx="58" cy="56" r="9" fill="#8A9188"/><circle cx="36" cy="60" r="7" fill="#C7CCC4"/></svg>'},
    {item:"HCB 20 cm", name:"HCB 20 cm", brand:"Local block plant", unit:"per piece", price:38, chg:0, when:"7 suppliers, this morning", svg:'<svg viewBox="0 0 80 80"><rect x="12" y="22" width="56" height="36" rx="3" fill="#B9B4A8"/><rect x="20" y="30" width="14" height="20" fill="#8E897E"/><rect x="46" y="30" width="14" height="20" fill="#8E897E"/></svg>'},
    {item:"Ready-mix concrete C-25", name:"Concrete mix C-25", brand:"", unit:"per m³, ready mix", price:8900, chg:3.1, when:"2 suppliers, this morning", svg:'<svg viewBox="0 0 80 80"><path d="M14 56c0-14 12-26 26-26s26 12 26 26z" fill="#A8ADA6"/><path d="M22 56c2-8 9-14 18-14s16 6 18 14z" fill="#8E938C"/><rect x="10" y="56" width="60" height="8" rx="3" fill="#5B6B64"/></svg>'},
    {item:"Sand (fine)", name:"Sand", brand:"", unit:"per truckload (Sino)", price:14500, chg:-1.4, when:"3 suppliers, this morning", svg:'<svg viewBox="0 0 80 80"><path d="M10 60c10-22 26-32 60-30-10 8-16 18-18 30z" fill="#E3C98A"/><path d="M10 60h60" stroke="#C9A95C" stroke-width="4"/></svg>'},
    {item:"Emulsion paint", name:"Emulsion paint", brand:"Kadisco", unit:"per litre", price:390, chg:0, when:"3 suppliers, this week", svg:'<svg viewBox="0 0 80 80"><rect x="22" y="22" width="36" height="42" rx="5" fill="#E8E2D6"/><rect x="22" y="22" width="36" height="10" rx="5" fill="#1E6B4E"/><rect x="30" y="38" width="20" height="18" rx="3" fill="#E3A63A"/></svg>'},
    {item:"Excavator hire with operator", name:"Excavator hire", brand:"Komatsu", unit:"per day, with operator", price:22000, chg:0, when:"2 suppliers, this week", svg:'<svg viewBox="0 0 80 80"><rect x="10" y="40" width="36" height="18" rx="3" fill="#E3A63A"/><rect x="46" y="32" width="22" height="26" rx="3" fill="#C98C22"/><circle cx="22" cy="62" r="7" fill="#14241E"/><circle cx="56" cy="62" r="7" fill="#14241E"/><path d="M18 40l10-16 14 4" fill="none" stroke="#C98C22" stroke-width="5" stroke-linecap="round"/></svg>'}
  ];

  /* ---- Delivery and insurance: example figures until the owner sets real tariffs. ----
     Distance: sub-city centroids (or a map pin) with a 1.3 road factor. Trucks: 10 t loads, fixed cost per trip plus a per-km rate.
     Insurance: inland transit cover at 0.4 % of the goods value, minimum ETB 300. */
  BS.SUBCITY_XY = {"Addis Ketema":[9.035,38.735],"Akaki Kaliti":[8.880,38.790],"Arada":[9.035,38.755],"Bole":[8.990,38.790],"Gullele":[9.070,38.730],"Kirkos":[9.005,38.760],"Kolfe Keranio":[9.020,38.690],"Lemi Kura":[9.030,38.860],"Lideta":[9.010,38.730],"Nifas Silk-Lafto":[8.955,38.730],"Yeka":[9.030,38.810]};
  BS.CITY_CENTRE = [9.010,38.760];
  BS.TRUCK = { capacityT:10, perTrip:2500, perKm:250, minKm:4, mobilisation:3500 };
  BS.INSURANCE = { rate:0.004, min:300 };
  /* tonnes per unit (approximate, for truck trips); equipment hire is a mobilisation fee instead */
  BS.TONNES = { quintal:0.1, bag:0.05, ton:1, kg:0.001, "m³":1.6, truckload:10, "m²":0.02, m:0.01, litre:0.0015, bucket:0.02, roll:0.01, sheet:0.02, box:0.02, bundle:0.05, package:0.02, pcs:0.01, trip:0, hour:0, day:0 };
  BS.TONNES_ITEM = { "HCB 20 cm":0.012, "HCB 15 cm":0.010, "Bricks (clay)":0.003, "Ready-mix concrete C-25":2.4, "Roofing sheet galvanised 0.4 mm":0.005, "Plywood 18 mm formwork":0.025, "Gypsum board 12 mm":0.012, "PPR pipe 25 mm":0.0005, "PVC drainage pipe 110 mm":0.002, "PVC conduit 20 mm":0.0003, "Water tank 5,000 L":0.1, "Electrical cable 2.5 mm²":0.012, "Distribution board 12 way":0.01, "Wire mesh":0.02 };
  BS.tonnesOf = function(line){ var per = BS.TONNES_ITEM[line.item]; if(per===undefined) per = BS.TONNES[line.unit]; if(per===undefined) per=0.01; return (+line.qty||0)*per; };
  BS.isHire = function(line){ return BS.catOf(line.item)==="Equipment rental" || /hire/i.test(line.item||""); };
  BS.km = function(a, b){ if(!a||!b) return 8; var R=6371, dLat=(b[0]-a[0])*Math.PI/180, dLon=(b[1]-a[1])*Math.PI/180, x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2); var d=2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); return Math.max(BS.TRUCK.minKm, Math.round(d*1.3*10)/10); };
  BS.pointOf = function(subOrPin){ if(subOrPin && typeof subOrPin==="object" && subOrPin.lat) return [subOrPin.lat, subOrPin.lng]; return BS.SUBCITY_XY[subOrPin] || BS.CITY_CENTRE; };
  /* delivery estimate for a set of lines from one dispatch point: {km, trips, cost, hire} */
  BS.deliveryEstimate = function(lines, fromSub, to){
    var km=BS.km(BS.pointOf(fromSub), BS.pointOf(to)), tonnes=0, hire=0;
    (lines||[]).forEach(function(l){ if(!l.item || !(+l.qty>0)) return; if(BS.isHire(l)) hire+=BS.TRUCK.mobilisation; else tonnes+=BS.tonnesOf(l); });
    var trips = tonnes>0 ? Math.ceil(tonnes/BS.TRUCK.capacityT) : 0;
    var cost = trips*(BS.TRUCK.perTrip + BS.TRUCK.perKm*km) + hire;
    return { km:km, trips:trips, tonnes:Math.round(tonnes*10)/10, cost:Math.round(cost/10)*10, hire:hire };
  };
  BS.goodsValue = function(lines){ var v=0; (lines||[]).forEach(function(l){ if(!l.item||!(+l.qty>0)) return; var base=BS.baseOf(l.item); if(!base) return; var u=BS.unitsOf(l.item)[0]; var q=+l.qty; if(l.unit!==u){ if(l.unit==="bag" && u==="quintal") q=q/2; else if(l.unit==="ton" && u==="quintal") q=q*10; else if(l.unit==="kg" && u==="quintal") q=q/100; } v+=q*base; }); return Math.round(v); };
  BS.insuranceFor = function(value){ return value>0 ? Math.max(BS.INSURANCE.min, Math.round(value*BS.INSURANCE.rate)) : 0; };
  BS.fmt = function(n){ return "ETB " + Math.round(n).toLocaleString("en-US"); };
  BS.ref = function(prefix){ var d=new Date(); return prefix+"-"+String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,"0")+"-"+String(Math.floor(1000+Math.random()*9000)); };
  BS.catOf = function(name){ var c=BS.CATALOGUE.filter(function(x){return x.name===name;})[0]; return c?c.cat:"Other (staff will classify)"; };
  BS.baseOf = function(name){ var c=BS.CATALOGUE.filter(function(x){return x.name===name;})[0]; return c?c.base:0; };
  BS.unitOf = function(name){ var c=BS.CATALOGUE.filter(function(x){return x.name===name;})[0]; return c?c.unit:"pcs"; };
  BS.itemOf = function(name){ return BS.CATALOGUE.filter(function(x){return x.name===name;})[0]; };
  BS.unitsOf = function(name){ var c=BS.itemOf(name); return c ? (c.units||[c.unit]) : BS.UNITS; };
  BS.minOf = function(name){ var c=BS.itemOf(name); return c ? (c.min||1) : 1; };
  /* loose match for names typed or uploaded from Excel: exact, then starts-with, then contains */
  BS.findItem = function(text){
    var t=String(text||"").trim().toLowerCase(); if(!t) return null;
    var c=BS.CATALOGUE.filter(function(x){return x.name.toLowerCase()===t;})[0]; if(c) return c;
    c=BS.CATALOGUE.filter(function(x){return x.name.toLowerCase().indexOf(t)===0 || t.indexOf(x.name.toLowerCase())===0;})[0]; if(c) return c;
    return BS.CATALOGUE.filter(function(x){ var k=x.name.toLowerCase().split(" ")[0]; return k.length>3 && t.indexOf(k)>=0 && (x.name.toLowerCase().split(" ")[1]||"") && t.indexOf(x.name.toLowerCase().split(" ")[1])>=0; })[0] || null;
  };

  /* ---- Reading an uploaded BOQ: .xlsx (read here, no library) or .csv / tab-separated text. Returns rows as arrays of cell values. ---- */
  function csvRows(text){
    var sep = text.indexOf("\t")>=0 ? "\t" : (text.split(";").length>text.split(",").length ? ";" : ",");
    return text.split(/\r?\n/).map(function(line){
      var out=[], cur="", q=false;
      for(var i=0;i<line.length;i++){ var ch=line[i];
        if(q){ if(ch==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else q=false; } else cur+=ch; }
        else if(ch==='"') q=true; else if(ch===sep){ out.push(cur); cur=""; } else cur+=ch; }
      out.push(cur); return out;
    }).filter(function(r){ return r.some(function(c){ return String(c).trim()!==""; }); });
  }
  function unxml(t){ return String(t).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,function(_,d){return String.fromCharCode(+d);}).replace(/&amp;/g,"&"); }
  function xlsxRows(u8){
    var dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength), dec=new TextDecoder();
    var i=u8.length-22; while(i>=0 && dv.getUint32(i,true)!==0x06054b50) i--; if(i<0) return Promise.reject(new Error("not an Excel file"));
    var count=dv.getUint16(i+10,true), p=dv.getUint32(i+16,true), entries={};
    for(var k=0;k<count;k++){ if(dv.getUint32(p,true)!==0x02014b50) break;
      var fnl=dv.getUint16(p+28,true), exl=dv.getUint16(p+30,true), cml=dv.getUint16(p+32,true);
      entries[dec.decode(u8.subarray(p+46,p+46+fnl))]={method:dv.getUint16(p+10,true), csize:dv.getUint32(p+20,true), off:dv.getUint32(p+42,true)};
      p+=46+fnl+exl+cml; }
    function get(name){ var e=entries[name]; if(!e) return Promise.resolve("");
      var lf=e.off, start=lf+30+dv.getUint16(lf+26,true)+dv.getUint16(lf+28,true), data=u8.subarray(start,start+e.csize);
      if(e.method===0) return Promise.resolve(dec.decode(data));
      var ds=new DecompressionStream("deflate-raw"), w=ds.writable.getWriter(); w.write(data); w.close(); return new Response(ds.readable).text(); }
    return Promise.all([get("xl/workbook.xml"), get("xl/_rels/workbook.xml.rels"), get("xl/sharedStrings.xml")]).then(function(r){
      var sheet="xl/worksheets/sheet1.xml", m=/<sheet\b[^>]*\br:id="([^"]+)"/.exec(r[0]);
      if(m){ var rel=new RegExp('<Relationship\\b[^>]*\\bId="'+m[1]+'"[^>]*>').exec(r[1]); var tg=rel && /Target="([^"]+)"/.exec(rel[0]); if(tg) sheet = tg[1].charAt(0)==="/" ? tg[1].slice(1) : "xl/"+tg[1].replace(/^\.\//,""); }
      var ss=[]; (r[2].match(/<si>[\s\S]*?<\/si>/g)||[]).forEach(function(si){ ss.push(unxml((si.match(/<t[^>]*>[\s\S]*?<\/t>/g)||[]).map(function(t){ return t.replace(/^<t[^>]*>/,"").replace(/<\/t>$/,""); }).join(""))); });
      return get(sheet).then(function(xml){
        var rows=[]; (xml.match(/<row\b[\s\S]*?<\/row>/g)||[]).forEach(function(row){
          var cells=[]; var re=/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, c;
          while((c=re.exec(row))){ var attrs=c[1], body=c[2]||"", ref=/r="([A-Z]+)/.exec(attrs), col=0; if(ref){ for(var j=0;j<ref[1].length;j++) col=col*26+(ref[1].charCodeAt(j)-64); col--; } else col=cells.length;
            var type=(/t="([^"]+)"/.exec(attrs)||[])[1], v=(/<v>([\s\S]*?)<\/v>/.exec(body)||[])[1], val="";
            if(type==="s") val=ss[+v]||""; else if(type==="inlineStr") val=unxml((body.match(/<t[^>]*>[\s\S]*?<\/t>/g)||[]).map(function(t){ return t.replace(/^<t[^>]*>/,"").replace(/<\/t>$/,""); }).join("")); else if(type==="str"||type==="b") val=unxml(v||""); else val = v===undefined ? "" : +v;
            cells[col]=val; }
          for(var z=0;z<cells.length;z++) if(cells[z]===undefined) cells[z]="";
          if(cells.some(function(x){ return String(x).trim()!==""; })) rows.push(cells); });
        return rows; }); });
  }
  BS.readSheet = function(file){
    var name=(file.name||"").toLowerCase();
    if(/\.xlsx$/.test(name)) return file.arrayBuffer().then(function(b){ return xlsxRows(new Uint8Array(b)); });
    return file.text().then(csvRows);
  };
  BS.excelDate = function(n){ return new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000).toISOString().slice(0,10); };
  BS.days = function(ms){ return Math.max(0, Math.ceil(ms/86400000)); };

  /* ---- Store ---- */
  var mode = "local", db = null, fbAuth = null, listeners = {};
  var LS = function(col){ return "bs_demo_" + col; };
  function lsRead(col){ try { return JSON.parse(localStorage.getItem(LS(col))||"[]"); } catch(e){ return []; } }
  function lsWrite(col, arr){ try { localStorage.setItem(LS(col), JSON.stringify(arr)); } catch(e){} notifyLocal(col); }
  function notifyLocal(col){ (listeners[col]||[]).forEach(function(cb){ cb(lsRead(col)); }); }
  window.addEventListener("storage", function(e){ if(e.key && e.key.indexOf("bs_demo_")===0){ notifyLocal(e.key.replace("bs_demo_","")); } });

  /* Shared store, in this order: the mirror host's own database when the page runs there; otherwise Firebase
     Firestore when assets/firebase-config.js defines window.BS_FIREBASE (the test site on its own address);
     otherwise this browser only. Both shared stores expose the same collection/doc/onSnapshot calls. */
  function loadScript(src){ return new Promise(function(res, rej){ var s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  var readyPromise = null;
  BS.ready = function(){
    if(readyPromise) return readyPromise;
    readyPromise = (async function(){
      try {
        var hostApi = window["cl"+"aude"];
        if(hostApi && typeof hostApi.use === "function"){
          var d = await hostApi.use("db");
          if(d){ db = d; mode = "shared"; return mode; }
        }
      } catch(e){ db = null; mode = "local"; }
      try {
        var emu = window.BS_FIREBASE_EMU; /* set only by the automated tests: a local copy of the database and logins */
        if(window.BS_FIREBASE && window.BS_FIREBASE.projectId && (emu || !/^(localhost|127\.)/.test(location.hostname))){ /* the local test server never touches the shared database */
          if(!window.firebase){ await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"); await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"); }
          if(!firebase.apps.length) firebase.initializeApp(window.BS_FIREBASE);
          db = firebase.firestore(); if(emu) db.useEmulator("127.0.0.1", emu.firestore); mode = "shared";
          try {
            if(!firebase.auth) await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js");
            fbAuth = firebase.auth(); if(emu) fbAuth.useEmulator("http://127.0.0.1:"+emu.auth);
            await fbAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION); /* staff stay signed in per browser tab, as before */
            fbAuth.onAuthStateChanged(function(u){ checkStaff(u); });
          } catch(e){ fbAuth = null; }
        }
      } catch(e){ db = null; mode = "local"; }
      return mode;
    })();
    return readyPromise;
  };
  BS.mode = function(){ return mode; };
  BS.onModeChange = null;
  function degrade(reason){
    if(mode==="local") return;
    mode = "local"; db = null;
    if(typeof BS.onModeChange==="function") BS.onModeChange(mode, reason);
    Object.keys(listeners).forEach(function(col){ notifyLocal(col); });
  }
  /* A write the database rules refuse (for example a member trying to publish or approve something) is reported and dropped.
     It must not switch the page to this-device-only mode, which is kept for a database that cannot be reached at all. */
  function denied(e){ if(!e || e.code!=="permission-denied") return false; if(window.bsToast) bsToast("That change needs a staff login."); return true; }
  function id(){ return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  BS.add = async function(col, data){
    await BS.ready();
    var body = Object.assign({}, data, {createdAt: data.createdAt || new Date().toISOString()});
    if(mode==="shared"){
      try { var ref = db.collection(col).doc(); await ref.set(body); return ref.id; }
      catch(e){ if(denied(e)) return null; degrade(e && e.code); }
    }
    var arr = lsRead(col); var nid = id(); arr.push(Object.assign({id:nid}, body)); lsWrite(col, arr); return nid;
  };
  BS.update = async function(col, docId, patch){
    await BS.ready();
    if(mode==="shared"){
      try { await db.collection(col).doc(docId).update(patch); return; }
      catch(e){ if(denied(e)) return; degrade(e && e.code); }
    }
    var arr = lsRead(col); arr = arr.map(function(x){ return x.id===docId ? Object.assign({}, x, patch) : x; }); lsWrite(col, arr);
  };
  BS.remove = async function(col, docId){
    await BS.ready();
    if(mode==="shared"){
      try { await db.collection(col).doc(docId).delete(); return; }
      catch(e){ if(denied(e)) return; degrade(e && e.code); }
    }
    lsWrite(col, lsRead(col).filter(function(x){ return x.id!==docId; }));
  };
  /* write a document with a chosen id (replace if it exists) */
  BS.set = async function(col, docId, data){
    await BS.ready();
    var body = Object.assign({}, data, {updatedAt: new Date().toISOString(), createdAt: data.createdAt || new Date().toISOString()});
    if(mode==="shared"){
      try { await db.collection(col).doc(docId).set(body); return docId; }
      catch(e){ if(denied(e)) return null; degrade(e && e.code); }
    }
    var arr = lsRead(col).filter(function(x){ return x.id!==docId; }); arr.push(Object.assign({id:docId}, body)); lsWrite(col, arr); return docId;
  };
  BS.subscribe = function(col, cb){
    var unsub = null, cancelled = false;
    BS.ready().then(function(){
      if(cancelled) return;
      if(mode==="shared"){
        try {
          unsub = db.collection(col).onSnapshot(function(snap){
            cb(snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); }));
          }, function(err){ if(err && err.code==="permission-denied"){ cb([]); return; } /* staff-only lists stay empty for members */
            degrade(err && err.code); listeners[col]=(listeners[col]||[]).concat([cb]); cb(lsRead(col)); });
          return;
        } catch(e){ degrade(e && e.code); }
      }
      listeners[col]=(listeners[col]||[]).concat([cb]); cb(lsRead(col));
    });
    return function(){ cancelled = true; if(unsub) unsub(); listeners[col]=(listeners[col]||[]).filter(function(x){return x!==cb;}); };
  };
  BS.clearLocal = function(){ ["boqs","offers","messages","profiles","news","verifications","settings","issues"].forEach(function(c){ try{ localStorage.removeItem(LS(c)); }catch(e){} notifyLocal(c); }); };

  /* who am I on this device (demo only). Accounts seen on this device are remembered by mobile number,
     so a number that signs in again after logging out gets its details back (the real app does this server-side). */
  function digitsOf(phone){ return (phone||"").replace(/\D/g,"").replace(/^251/,""); }
  /* "Who am I" lives per browser tab (sessionStorage), so two tabs can be two people, a buyer and a supplier.
     The last sign-in is also kept for the device, so a new tab starts as that person. */
  BS.me = function(){ try { var t=sessionStorage.getItem("bs_demo_me"); if(t!==null) return JSON.parse(t); return JSON.parse(localStorage.getItem("bs_demo_me")||"null"); } catch(e){ return null; } };
  BS.setMe = function(obj){
    try { sessionStorage.setItem("bs_demo_me", JSON.stringify(obj)); localStorage.setItem("bs_demo_me", JSON.stringify(obj)); } catch(e){}
    if(obj && obj.phone){ try { var reg=JSON.parse(localStorage.getItem("bs_demo_accounts")||"{}"); reg[digitsOf(obj.phone)]=obj; localStorage.setItem("bs_demo_accounts", JSON.stringify(reg)); } catch(e){} }
  };
  /* sign this tab out without touching the device default (used when staff sign in) */
  BS.clearMeTab = function(){ try { sessionStorage.setItem("bs_demo_me", "{}"); } catch(e){} };
  BS.isStaff = function(){ try { return sessionStorage.getItem("bs_demo_admin")==="1"; } catch(e){ return false; } };
  BS.staffName = function(){ try { return sessionStorage.getItem("bs_demo_admin_name")||"Staff"; } catch(e){ return "Staff"; } };

  /* ---- Staff logins ----
     On the public site (Firebase) staff sign in with an email and password. A login counts as staff only when the
     `staff` collection holds a doc under its user id with active:true; role is owner or staff, finance says whether
     the Finance page is shown. The first owner is set up once (doc meta/owner); after that only the owner adds staff.
     The database rules check the same docs, so a page that only looks like the staff page cannot change anything.
     Without Firebase (local test server, mirror) the old test logins in BS.STAFF stay. The tab keeps a copy in
     sessionStorage so pages can ask synchronously; the sign-in listener corrects it. */
  function setStaffCache(d){ try {
    sessionStorage.setItem("bs_demo_admin", d?"1":""); sessionStorage.setItem("bs_demo_admin_name", d?(d.name||d.email||"Staff"):"");
    sessionStorage.setItem("bs_staff_role", d?(d.role||"staff"):""); sessionStorage.setItem("bs_staff_fin", d&&(d.role==="owner"||d.finance)?"1":"");
    sessionStorage.setItem("bs_staff_email", d?(d.email||""):"");
  } catch(e){} }
  BS.setStaffCache = setStaffCache;
  BS.staffRole = function(){ try { return sessionStorage.getItem("bs_staff_role") || (/owner/i.test(BS.staffName())?"owner":"staff"); } catch(e){ return "staff"; } };
  BS.staffCan = function(what){ if(BS.staffRole()==="owner") return true; if(what==="finance"){ try { return !fbAuth || sessionStorage.getItem("bs_staff_fin")==="1"; } catch(e){ return false; } } return true; };
  BS.staffAuth = function(){ return !!fbAuth; };
  BS.staffUid = function(){ return fbAuth && fbAuth.currentUser ? fbAuth.currentUser.uid : ""; };
  BS.onStaffChange = null;
  async function checkStaff(u){
    var was = BS.isStaff();
    if(!u){ if(was) setStaffCache(null); }
    else { try { var d = await db.collection("staff").doc(u.uid).get(); setStaffCache(d.exists && d.data().active===true ? Object.assign({uid:u.uid}, d.data()) : null); } catch(e){ setStaffCache(null); } }
    if(typeof BS.onStaffChange==="function") BS.onStaffChange(BS.isStaff());
  }
  function authErr(e){
    var c = (e && e.code) || "";
    if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return "Wrong email or password.";
    if(/invalid-email/.test(c)) return "That email address does not look right.";
    if(/email-already-in-use/.test(c)) return "That email already has a login.";
    if(/weak-password/.test(c)) return "The password needs at least 8 characters.";
    if(/too-many-requests/.test(c)) return "Too many tries. Wait a few minutes and try again.";
    if(/network/.test(c)) return "No connection. Check the internet and try again.";
    if(c==="not-staff") return "This login is not a staff account, or it has been switched off.";
    return "Could not sign in ("+(c||"unknown")+").";
  }
  BS.authErr = authErr;
  BS.staffSignIn = async function(email, pw){
    await BS.ready(); if(!fbAuth) throw {code:"no-auth"};
    var cred = await fbAuth.signInWithEmailAndPassword(String(email).trim(), pw);
    var d = await db.collection("staff").doc(cred.user.uid).get();
    if(!d.exists || d.data().active!==true){ await fbAuth.signOut(); throw {code:"not-staff"}; }
    setStaffCache(Object.assign({uid:cred.user.uid}, d.data())); return d.data();
  };
  BS.staffSignOut = async function(){ setStaffCache(null); if(fbAuth){ try { await fbAuth.signOut(); } catch(e){} } };
  BS.ownerExists = async function(){ await BS.ready(); if(!fbAuth) return true; try { return (await db.collection("meta").doc("owner").get()).exists; } catch(e){ return true; } };
  /* first owner: makes the login (or signs in if the email already has one), then writes meta/owner and the owner's staff doc together */
  BS.setupOwner = async function(name, email, pw){
    await BS.ready(); if(!fbAuth) throw {code:"no-auth"}; email = String(email).trim();
    var cred; try { cred = await fbAuth.createUserWithEmailAndPassword(email, pw); }
    catch(e){ if(e && e.code==="auth/email-already-in-use") cred = await fbAuth.signInWithEmailAndPassword(email, pw); else throw e; }
    var uid = cred.user.uid, now = new Date().toISOString(), doc = {name:name, email:email, role:"owner", finance:true, active:true, createdAt:now};
    var b = db.batch(); b.set(db.collection("meta").doc("owner"), {uid:uid, createdAt:now}); b.set(db.collection("staff").doc(uid), doc); await b.commit();
    setStaffCache(Object.assign({uid:uid}, doc)); return doc;
  };
  /* the owner adds a staff login: made through a second, separate connection so the owner stays signed in */
  BS.createStaff = async function(name, email, pw, finance){
    await BS.ready(); if(!fbAuth) throw {code:"no-auth"}; email = String(email).trim();
    var app2 = firebase.apps.filter(function(a){ return a.name==="staffMaker"; })[0] || firebase.initializeApp(window.BS_FIREBASE, "staffMaker");
    var a2 = app2.auth(); if(window.BS_FIREBASE_EMU && !a2.emulatorConfig) a2.useEmulator("http://127.0.0.1:"+window.BS_FIREBASE_EMU.auth); await a2.setPersistence(firebase.auth.Auth.Persistence.NONE);
    var cred = await a2.createUserWithEmailAndPassword(email, pw); var uid = cred.user.uid; await a2.signOut();
    await db.collection("staff").doc(uid).set({name:name, email:email, role:"staff", finance:!!finance, active:true, createdAt:new Date().toISOString(), addedBy:BS.staffName()});
    return uid;
  };
  BS.staffPasswordEmail = async function(email){ await BS.ready(); if(!fbAuth) throw {code:"no-auth"}; await fbAuth.sendPasswordResetEmail(String(email).trim()); };
  /* supplier passwords are stored only as a hash (with the mobile number as salt), never as text */
  BS.hashPw = async function(phone, pw){
    var txt = "bs1|" + String(phone||"").replace(/\D/g,"").replace(/^251/,"").replace(/^0/,"") + "|" + pw;
    try { var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)); return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ("0"+b.toString(16)).slice(-2); }).join(""); }
    catch(e){ return ""; }
  };
  BS.accounts = function(){ try { var reg=JSON.parse(localStorage.getItem("bs_demo_accounts")||"{}"); return Object.keys(reg).map(function(k){ return reg[k]; }).filter(function(a){ return a && a.phone; }); } catch(e){ return []; } };
  BS.ready().then(function(){ BS.subscribe("settings", BS.applySettings); });
  /* Suppliers as one shared list: the built-in ones (BS.SUPPLIERS) plus the `suppliers` collection, which holds suppliers registered
     on the site or added by staff, and staff edits to the built-in ones (same doc id "seed-<id>", field seedId). Status: active,
     pending (documents not yet approved), suspended, removed. Prices live in the doc too, so the supplier portal and the staff page edit the same list. */
  BS.supplierDocs = []; BS._supCbs = [];
  BS.onSuppliers = function(cb){ BS._supCbs.push(cb); };
  BS.suppliersAll = function(){
    var docs = BS.supplierDocs || [], out = [];
    BS.SUPPLIERS.forEach(function(s){
      var d = docs.filter(function(x){ return x.seedId===s.id; })[0];
      if(d && d.status==="removed") return;
      out.push(Object.assign({}, s, d ? {name:d.name||s.name, cats:(d.cats&&d.cats.length)?d.cats.slice():s.cats, sub:d.sub||s.sub, status:d.status||"active", prices:Array.isArray(d.prices)?d.prices:null, docId:d.id} : {status:"active", docId:"seed-"+s.id}));
    });
    docs.forEach(function(d){
      if(d.seedId || d.status==="removed") return;
      out.push({id:d.id, name:d.name||"", branch:d.branch||"", sub:d.sub||"Akaki Kaliti", cats:(d.cats||[]).slice(), own:true, phone:d.phone||"", tin:d.tin||"", password:d.password||"", pwHash:d.pwHash||"", status:d.status||"pending", prices:Array.isArray(d.prices)?d.prices:[], docId:d.id, auto:false, source:d.source||"registered"});
    });
    return out;
  };
  /* ---- orders: one purchase order per supplier per request. Every offer in it carries the same poRef and the same
     order-step timestamps, so the group moves through the steps together. ---- */
  BS.offerTotal = function(o){ return (+o.qtyOffered||0)*(+o.unitPrice||0)+(+o.deliveryCost||0); };
  BS.orderGroup = function(offers, o){ if(!o) return []; if(!o.poRef) return [o]; return offers.filter(function(x){ return x.poRef===o.poRef && x.boqId===o.boqId && x.status==='accepted'; }).sort(function(a,b){ return a.lineN-b.lineN; }); };
  BS.orderGroups = function(offers, filter){
    var by={}, out=[];
    offers.forEach(function(o){ if(o.status!=='accepted' || (filter && !filter(o))) return; var k=o.boqId+'|'+(o.poRef||o.id); if(!by[k]){ by[k]={key:k, poRef:o.poRef, boqId:o.boqId, supplierId:o.supplierId, supplierName:o.supplierName, offers:[]}; out.push(by[k]); } by[k].offers.push(o); });
    out.forEach(function(g){ g.offers.sort(function(a,b){ return a.lineN-b.lineN; }); g.first=g.offers[0]; g.id=g.first.id; });
    return out.sort(function(a,b){ return (b.first.acceptedAt||'').localeCompare(a.first.acceptedAt||''); });
  };
  /* order steps in plain words; "under delivery" was dropped (meeting 27 Oct 2026) */
  BS.ORDER_STEPS = [['acceptedAt','Order placed'],['confirmedAt','Supplier reconfirmed'],['contractAt','Contract agreed'],['readyAt','Ready for dispatch'],['dispatchedAt','Dispatched'],['deliveredAt','Delivered'],['paidAt','Paid']];
  BS.orderStatus = function(o){
    return o.paidAt ? {t:'Paid · closed', c:'tag-green', who:'none'} : o.deliveredAt ? {t:'Delivered · payment due', c:'tag-ochre', who:'buyer'} : o.dispatchedAt ? {t:'Dispatched', c:'tag-ochre', who:'buyer'}
      : o.readyAt ? {t:'Ready for dispatch', c:'tag-green', who:'supplier'} : o.contractAt ? {t:'Contract agreed · preparing', c:'tag-green', who:'supplier'}
      : o.supplierConfirmed ? {t:'Waiting for the buyer to agree to the contract', c:'tag-ochre', who:'buyer'} : {t:'Waiting for the supplier to reconfirm', c:'tag-ochre', who:'supplier'};
  };
  BS.updateMany = async function(col, ids, patch){ for(var i=0;i<ids.length;i++){ await BS.update(col, ids[i], typeof patch==='function'?patch(ids[i]):patch); } };
  BS.activeSuppliers = function(){ return BS.suppliersAll().filter(function(s){ return s.status==="active"; }); };
  BS.supplierById = function(id){ return BS.suppliersAll().filter(function(s){ return s.id===id; })[0] || BS.SUPPLIERS.filter(function(s){ return s.id===id; })[0] || null; };
  BS.supplierDoc = function(docId){ return (BS.supplierDocs||[]).filter(function(d){ return d.id===docId; })[0] || null; };
  BS.ready().then(function(){ BS.subscribe("suppliers", function(d){ BS.supplierDocs = d||[]; (BS._supCbs||[]).forEach(function(cb){ try{ cb(); }catch(e){} }); }); });
  BS.known = function(digits){ try { return JSON.parse(localStorage.getItem("bs_demo_accounts")||"{}")[digits] || null; } catch(e){ return null; } };
})();

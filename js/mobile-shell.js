// Reuses the existing controls and panels; no parallel simulation or renderer.
export function createMobileShell(api,trek){
 const media=matchMedia('(max-width:768px)'),header=document.createElement('header');header.className='mobile-header';header.setAttribute('aria-label','Mobile mission controls');
 header.innerHTML='<strong><i></i>ARES-NAV</strong><button data-site aria-label="Study site and viewing modes">Gale ⌄</button><button data-audio aria-label="Toggle audio">Audio Off</button><button data-search>Search</button>';
 const dock=document.createElement('nav');dock.className='mobile-dock';dock.setAttribute('aria-label','Mobile mission tools');
 for(const name of ['Search','Layers','Route','Measure','Science','Weather','More']){const b=document.createElement('button');b.textContent=name;b.dataset.mobileTool=name;dock.append(b);}const position=document.createElement('output');position.className='mobile-position';position.textContent='Mars reference sphere';document.body.append(header,dock,position);
 const originalTop=document.querySelector('.top-bar'),workbench=document.querySelector('.workbench'),coordinate=document.querySelector('.trek-coordinate-bar');
 const legacyDock=document.querySelector('.bottom-dock-wrap>.dock'),legacyDockHome=legacyDock.parentNode;
 const telemetry=document.querySelector('.telemetry-hud-right'),timeControls=[...telemetry.querySelectorAll('.sol-mini-pill,.speed-mini-pill')];
 function moveTelemetry(){for(const el of timeControls)(media.matches?originalTop:telemetry).append(el);(media.matches?originalTop:legacyDockHome).append(legacyDock);}moveTelemetry();media.addEventListener('change',moveTelemetry);
 function close(){trek.close();workbench.hidden=true;coordinate.classList.remove('mobile-sheet-open');originalTop.classList.remove('mobile-sheet-open');for(const d of document.querySelectorAll('.drawer.open')){d.classList.remove('open');}api.getState().openDrawer=null;for(const b of document.querySelectorAll('.dock-btn[data-drawer]'))b.classList.remove('active');document.body.classList.remove('drawer-open');for(const b of dock.querySelectorAll('button'))b.setAttribute('aria-expanded','false');}
 legacyDock.addEventListener('click',e=>{if(media.matches&&e.target.closest('button'))close();},true);
 const surfaceLayers=document.createElement('button');surfaceLayers.className='mobile-surface-layers';surfaceLayers.textContent='Surface data overlays · 5 layers';surfaceLayers.onclick=()=>{close();trek.open('layers');};trek.host.querySelector('[data-renderer-layers]').append(surfaceLayers);
 function open(name){close();const trigger=dock.querySelector(`[data-mobile-tool="${name}"]`);trigger?.setAttribute('aria-expanded','true');
  if(name==='Search'||name==='Layers')trek.open(name.toLowerCase());
  else if(name==='Measure'){workbench.hidden=false;for(const d of workbench.querySelectorAll('details'))d.open=d.querySelector('[data-measure-output]')!==null;api.measurements.activate('line',true);coordinate.classList.add('mobile-sheet-open');}
  else if(name==='More')originalTop.classList.add('mobile-sheet-open');
  else {const id=name==='Route'?'route':name.toLowerCase();if(name==='Route'&&api.getState().mode==='orbital')window.setMode('hybrid');window.toggleDrawer(id);}
 }
 dock.onclick=e=>{const b=e.target.closest('[data-mobile-tool]');if(b){const expanded=b.getAttribute('aria-expanded')==='true';expanded?close():open(b.dataset.mobileTool);}};
 header.querySelector('[data-search]').onclick=()=>open('Search');header.querySelector('[data-site]').onclick=()=>open('More');header.querySelector('[data-audio]').onclick=()=>document.getElementById('audio-btn').click();
 document.addEventListener('ares-audio-state',e=>{header.querySelector('[data-audio]').textContent=e.detail.playing?'Audio On':'Audio Off';header.querySelector('[data-audio]').setAttribute('aria-pressed',String(e.detail.playing));});
 // Handles provide both click-to-close and a downward swipe, without hijacking map gestures.
 for(const sheet of [trek.host,workbench,originalTop,...document.querySelectorAll('.bottom-dock-wrap .drawer')]){
  const handle=document.createElement('button');handle.className='sheet-handle';handle.setAttribute('aria-label','Close panel');handle.innerHTML='<span></span>';sheet.prepend(handle);handle.onclick=close;
  let y=null;handle.addEventListener('pointerdown',e=>{y=e.clientY;handle.setPointerCapture(e.pointerId);});handle.addEventListener('pointerup',e=>{if(y!=null&&e.clientY-y>36)close();y=null;});
 }
 // Existing desktop triggers also coordinate sheets when used on a phone.
 for(const selector of ['.workbench-trigger','.trek-trigger'])document.querySelector(selector)?.addEventListener('click',e=>{if(media.matches){e.preventDefault();e.stopImmediatePropagation();open(selector.includes('workbench')?'Measure':'Search');}},true);
 addEventListener('keydown',e=>{if(e.key==='Escape'&&media.matches)close();});media.addEventListener('change',()=>close());
 let lastSite='',lastPosition=0;return {update(){if(media.matches&&performance.now()-lastPosition>250){lastPosition=performance.now();if(api.getState().mode==='orbital'){const p=api.pick({clientX:innerWidth/2,clientY:innerHeight/2});position.textContent=p?`${p.lat.toFixed(3)}°, ${p.lon.toFixed(3)}° E`:'Outside Mars map';}else position.textContent='SYNTHETIC SURFACE DEMO';}const name=api.getSite().shortName||'Mars';if(name!==lastSite){lastSite=name;header.querySelector('[data-site]').textContent=(name.includes('Gale')||name.includes('Bradbury')?'Gale':name.includes('Jezero')?'Jezero':name.split(' ')[0])+' ⌄';}},close,open};
}

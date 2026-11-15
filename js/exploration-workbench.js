import { createMeasurementTools } from './measurement-tools.js?v=flight2';
import { createSurvivalEngine } from './neural-survival.js?v=flight2';
import { tileAt, tileURL, LAYERS } from './mars-quadtree-globe.js?v=flight2';
export function createWorkbench(api){
  const trigger=document.createElement('button');trigger.className='icon-chip workbench-trigger';trigger.textContent='Explore + Measure';document.body.append(trigger);
  const host=document.createElement('aside');host.className='workbench glass';host.hidden=true;host.setAttribute('aria-label','Advanced Mars tools');
  host.innerHTML=`<header><strong>ARES · Exploration tools</strong><button data-close aria-label="Close exploration tools">×</button></header>
  <p class="provenance">NASA imagery · derived spherical measurements · synthetic terrain and physiology</p>
  <details open><summary>Progressive NASA imagery</summary>
    <label>Globe layer <select data-globe-layer><option value="optical">Viking + automatic CTX detail</option><option value="ctx">CTX optical</option><option value="topography">MOLA shaded relief (image)</option><option value="thermal">THEMIS infrared (endpoint unavailable)</option></select></label>
    <label><input type="checkbox" data-auto-ctx checked> Use CTX only at deep zoom (level 7+)</label>
    <output data-tile-status>Loading NASA imagery…</output>
    <p>Imagery is observational. Globe geometry is a reference sphere; no measured DEM is loaded. Shaded relief is not numeric elevation.</p>
    <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer">NASA Mars Trek / source attribution ↗</a>
  </details>
  <details><summary>Study-site source imagery</summary>
    <p data-site-name></p><canvas data-site-map width="512" height="256" aria-label="NASA source imagery centered at study site"></canvas>
    <div class="tool-row"><button data-site-out>− Detail</button><button data-site-in>+ Detail</button><button data-site-refresh>Retry</button></div>
    <output data-site-status>Open this section to load source imagery.</output>
    <p>Crosshair marks the site coordinate. North is up. This source map is separate from the procedural 3D model; no invented alignment or measured terrain is implied.</p>
  </details>
  <details><summary>Coordinates, lines & areas</summary>
    <label><input data-measure-enable type="checkbox"> Capture globe clicks (Esc exits)</label>
    <label>Tool <select data-measure-mode><option value="inspect">Inspect point</option><option value="line">Geodesic polyline</option><option value="polygon">Spherical polygon</option></select></label>
    <label><input data-longitude type="checkbox"> Display longitude 0–360° east</label>
    <div class="coordinate-row"><label>Latitude<input data-lat type="number" value="0" min="-90" max="90" step="any"></label><label>Longitude E<input data-lon type="number" value="0" step="any"></label></div>
    <input type="hidden" data-edit-index><button data-add-coordinate>Add / apply edited vertex</button>
    <div class="tool-row"><button data-undo>Undo vertex</button><button data-redo>Redo vertex</button><button data-clear>Clear</button></div>
    <div data-vertices class="vertex-list"></div><output data-measure-output></output>
    <div class="tool-row"><button data-export>Export Mars GeoJSON</button><button data-share>Copy share link</button></div>
    <p>Mean-sphere geodesics; graphic latitude derived using a=3396190 m, b=3376200 m. Use simple polygons smaller than a hemisphere. Terrain distance needs measured DEM data and is unavailable here.</p>
  </details>
  <details><summary>Synthetic Neural Risk Simulation</summary>
    <p>Hand-authored network weights, not trained or calibrated. No real safety probability. All biomonitoring and habitat locations are synthetic. Ridge shielding against SEP is not established.</p>
    <label><input data-survival-enable type="checkbox"> Enable simulation & automatic demo rerouting</label>
    <label>Hazard<select data-hazard><option value="nominal">Nominal</option><option value="sep">X-class SEP scenario (synthetic)</option><option value="dust">Regional dust storm</option><option value="vortex">Dust devil vortex</option></select></label>
    <label><input data-random-hazards type="checkbox"> Random scenario every 25 seconds</label>
    <output data-survival-output>Off. Existing EVA controls remain active.</output>
    <p>Disable to restore your pre-simulation waypoints and walking speed.</p>
  </details>
  <details><summary>Phone 3D / AR</summary><div data-ar-buttons></div><output data-ar-status>AR requires HTTPS/localhost and compatible hardware. Camera 3D fallback has no surface anchoring.</output></details>`;
  document.body.append(host);
  trigger.onclick=()=>{host.hidden=!host.hidden;trigger.setAttribute('aria-expanded',String(!host.hidden));};
  host.querySelector('[data-close]').onclick=()=>{host.hidden=true;trigger.setAttribute('aria-expanded','false');};
  host.querySelector('[data-globe-layer]').onchange=e=>{if(!api.tiles.setLayer(e.target.value))e.target.value=api.tiles.layer;};
  host.querySelector('[data-auto-ctx]').onchange=e=>{api.tiles.autoCTX=e.target.checked;api.tiles.invalidate();};
  const measurements=createMeasurementTools(api,host),survival=createSurvivalEngine(api.survival,host);
  let siteLevel=7,siteId=-1,requestId=0,siteBusy=false;
  const map=host.querySelector('[data-site-map]'),ctx=map.getContext('2d'),siteStatus=host.querySelector('[data-site-status]');
  const siteSection=map.closest('details');
  async function loadSite(){
    if(!siteSection.open||siteBusy)return;
    const site=api.getSite(),id=++requestId;siteId=site.id;siteBusy=true;
    const layer=siteLevel>=7?'ctx':'optical';const tile=tileAt(site.lat,site.lon,siteLevel);
    host.querySelector('[data-site-name]').textContent=`${site.shortName} · ${site.lat.toFixed(4)}°, ${site.lon.toFixed(4)}° E`;
    siteStatus.textContent=`Loading ${LAYERS[layer].name} L${siteLevel}…`;
    const image=new Image();image.crossOrigin='anonymous';
    api.tiles.externalSlots=1;
    try{
      while(api.tiles.active+api.tiles.externalSlots>api.tiles.maxConcurrent)await new Promise(resolve=>setTimeout(resolve,50));
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{image.onload=image.onerror=null;image.src='';reject(new Error('Timed out'));},12000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('No source tile / coverage'));};image.src=tileURL(layer,tile.z,tile.row,tile.col);});
      if(id!==requestId)return;
      ctx.clearRect(0,0,map.width,map.height);ctx.drawImage(image,0,0,map.width,map.height);
      const cols=2**(siteLevel+1),rows=2**siteLevel;
      const x=((((site.lon+180)%360+360)%360)/360*cols-tile.col)*map.width,y=((90-site.lat)/180*rows-tile.row)*map.height;
      ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.moveTo(x,y-10);ctx.lineTo(x,y+10);ctx.stroke();
      const meters=2*Math.PI*3389500/cols/LAYERS[layer].size*Math.cos(site.lat*Math.PI/180);
      siteStatus.textContent=`${LAYERS[layer].name} · level ${siteLevel} · approx ${meters.toFixed(1)} m/source pixel at site · acquisition date not supplied by tile service`;
    }catch(e){if(id===requestId){ctx.clearRect(0,0,map.width,map.height);siteStatus.textContent=`${e.message}; try lower detail. No synthetic imagery substituted.`;}}
    finally{api.tiles.externalSlots=0;if(id===requestId)siteBusy=false;}
  }
  siteSection.addEventListener('toggle',()=>{if(siteSection.open)loadSite();});
  host.querySelector('[data-site-in]').onclick=()=>{if(siteBusy)return;siteLevel=Math.min(11,siteLevel+1);loadSite();};
  host.querySelector('[data-site-out]').onclick=()=>{if(siteBusy)return;siteLevel=Math.max(1,siteLevel-1);loadSite();};
  host.querySelector('[data-site-refresh]').onclick=loadSite;
  let lastSite=api.getSite().id;
  return {host,measurements,survival,arHost:host.querySelector('[data-ar-buttons]'),arStatus:host.querySelector('[data-ar-status]'),tileStatus:host.querySelector('[data-tile-status]'),update(dt){measurements.update();const id=api.getSite().id;if(id!==lastSite){lastSite=id;survival.resetSite();if(siteSection.open&&!siteBusy)loadSite();}if(siteSection.open&&id!==siteId&&!siteBusy)loadSite();survival.update(dt);}};
}

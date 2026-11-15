import * as THREE from 'three';

const PUBLICATION='https://pubs.usgs.gov/publication/sim3292';
const TYPES=[['units','Geologic units'],['contacts','Geologic contacts'],['structures','Structural features']];
// These are regional cartographic overlays, never inputs to the synthetic EVA model.
export function createGeologyLayers(api,host){
 const panel=document.createElement('section');panel.className='geology-panel';panel.innerHTML=`<h3>USGS · Geologic Map of Mars</h3><p>Tanaka et al. (2014), SIM 3292 · 1:20,000,000. Regional interpretation, not local hazard measurements.</p><div data-geology-controls></div><p data-geology-status role="status">Choose an official geology overlay. Imagery remains underneath.</p><label>Overlay opacity <input data-geology-opacity type="range" min="0" max="1" step="0.05" value="0.7"></label><details><summary>Legend, source & decision limits</summary><p>Use units to compare regional geologic history; contacts to locate mapped boundaries; structures to recognize mapped landforms. Boundaries are generalized. These layers cannot certify a safe route, mineral abundance, water, weather, or radiation.</p><p><a href="${PUBLICATION}" target="_blank" rel="noopener">USGS publication & GIS downloads ↗</a> · <a href="https://usgs.maps.arcgis.com/apps/webappviewer/index.html?id=fc004c3d21b64c398ed5458580ab7c58" target="_blank" rel="noopener">Original USGS viewer ↗</a></p><p>USGS-authored data, hosted by Esri ArcGIS. Local snapshot reprojected from Mars Robinson to Mars geographic coordinates; generalized 0.03° and rasterized for display. Not a NASA telemetry product.</p><div data-geology-legend></div></details>`;
 const badge=document.createElement('output');badge.className='geology-badge';badge.hidden=true;badge.textContent='USGS GEOLOGY · 1:20M · REGIONAL DISPLAY';document.body.append(badge);host.prepend(panel);const status=panel.querySelector('[data-geology-status]'),legend=panel.querySelector('[data-geology-legend]'),entries=new Map();let opacity=.7,projection=!!api.tiles.rectangle;
 const pause=()=>new Promise(r=>setTimeout(r,0));
 async function load(entry){
  entry.loading=true;status.textContent='Loading official USGS '+entry.label.toLowerCase()+'…';
  try{
   const response=await fetch(new URL('../data/usgs-'+entry.key+'.json',import.meta.url));if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
   const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=2048;const ctx=canvas.getContext('2d');const render=data.renderer,styles=new Map(render.uniqueValueInfos.map(v=>[v.value,v]));
   for(let i=0;i<data.features.length;i++){
    const f=data.features[i];if(!f.geometry)continue;const style=styles.get(String(f.attributes[render.field1]))?.symbol||render.defaultSymbol;if(!style)continue;
    const color=style.color||[30,30,30,255];ctx.fillStyle=ctx.strokeStyle=`rgba(${color[0]},${color[1]},${color[2]},${color[3]/255})`;ctx.lineWidth=Math.max(.7,(style.width||.5)*1.5);ctx.setLineDash(style.style==='esriSLSDash'?[4,3]:[]);ctx.beginPath();
    for(const path of f.geometry.rings||f.geometry.paths||[]){path.forEach(([lon,lat],n)=>{const x=(lon+180)/360*4096,y=(90-lat)/180*2048;n?ctx.lineTo(x,y):ctx.moveTo(x,y);});if(f.geometry.rings)ctx.closePath();}
    if(f.geometry.rings)ctx.fill('evenodd');else ctx.stroke();if(i%100===0)await pause();
   }
   // Use the quadtree's coarse patch geometry and parent transform in every projection.
   for(let row=0;row<2;row++)for(let col=0;col<4;col++){
    const tile=document.createElement('canvas');tile.width=tile.height=1024;tile.getContext('2d').drawImage(canvas,col*1024,row*1024,1024,1024,0,0,1024,1024);
    const texture=new THREE.CanvasTexture(tile);texture.colorSpace=THREE.SRGBColorSpace;
    const node=api.tiles.node(1,row,col),material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-20,toneMapped:false});
    const mesh=new THREE.Mesh(api.tiles.buildGeometry(node),material);mesh.renderOrder=200+TYPES.findIndex(t=>t[0]===entry.key);mesh.visible=entry.enabled&&api.getState().mode==='orbital';api.tiles.group.add(mesh);entry.meshes.push({mesh,node});await pause();
   }
   canvas.width=canvas.height=1;entry.loaded=true;
   const title=document.createElement('h4');title.textContent=entry.label;legend.append(title);
   for(const item of render.uniqueValueInfos){const line=document.createElement('p'),swatch=document.createElement('i');const c=item.symbol.color||[0,0,0,255];swatch.style.background=`rgb(${c.slice(0,3).join(',')})`;line.append(swatch,document.createTextNode(item.label||item.value));legend.append(line);}
   status.textContent=`${entry.label}: ${data.features.filter(f=>f.geometry).length.toLocaleString()} drawable features (${data.features.length.toLocaleString()} source records) · snapshot ${data.retrieved}. Display generalized; zoom does not add survey detail.`;
  }catch(error){entry.enabled=false;entry.input.checked=false;for(const {mesh}of entry.meshes){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.map.dispose();mesh.material.dispose();}entry.meshes=[];status.textContent='USGS overlay unavailable: '+error.message+'. Imagery remains available; retry this checkbox.';}
  finally{entry.loading=false;}
 }
 for(const [key,label]of TYPES){const entry={key,label,enabled:false,loaded:false,loading:false,meshes:[]},l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.geology=key;entry.input=input;l.append(input,document.createTextNode(label));panel.querySelector('[data-geology-controls]').append(l);entries.set(key,entry);input.onchange=()=>{entry.enabled=input.checked;if(entry.enabled&&!entry.loaded&&!entry.loading)load(entry);};}
 panel.querySelector('[data-geology-opacity]').oninput=e=>{opacity=Number(e.target.value);for(const entry of entries.values())for(const {mesh}of entry.meshes)mesh.material.opacity=opacity;};
 return {panel,entries,setOpacity(value){opacity=value;panel.querySelector('[data-geology-opacity]').value=value;for(const e of entries.values())for(const {mesh}of e.meshes)mesh.material.opacity=value;},update(){badge.hidden=api.getState().mode!=='orbital'||![...entries.values()].some(e=>e.enabled&&e.loaded);const changed=projection!==!!api.tiles.rectangle;projection=!!api.tiles.rectangle;for(const entry of entries.values())for(const {mesh,node}of entry.meshes){if(changed){mesh.geometry.dispose();mesh.geometry=api.tiles.buildGeometry(node);}mesh.visible=entry.enabled&&api.getState().mode==='orbital';}}};
}

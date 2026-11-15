import * as THREE from 'three';
import { MARS, validatePoint, wrapLongitude, planetographicLatitude, pathMetrics, interpolate, toMarsGeoJSON } from './geodesy.js?v=map4';
export function createMeasurementTools(api, host) {
  const group=new THREE.Group();api.globe.add(group);
  let points=[],redo=[],mode='inspect',enabled=false,east360=false,down=null,savedAutoSpin=false;
  const output=host.querySelector('[data-measure-output]');
  const panel=host.querySelector('[data-vertices]');
  const spherical=p=>api.globePoint(p.lat,p.lon,api.radius+.025);
  function clearGeometry(){while(group.children.length){const o=group.children.pop();o.parent=null;o.geometry?.dispose();o.material?.dispose();}}
  function render(){
    clearGeometry();group.visible=api.getState().mode==='orbital';
    const coords=points.map(spherical);
    for(const p of coords){const dot=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),new THREE.MeshBasicMaterial({color:0xfbbf24,depthTest:false}));dot.userData.marker=true;dot.position.copy(p);group.add(dot);}
    if(points.length>1){const line=[];const count=points.length-1+(mode==='polygon'?1:0);
      try{for(let i=0;i<count;i++)for(let j=0;j<=32;j++)line.push(spherical(interpolate(points[i],points[(i+1)%points.length],j/32)));}catch(error){output.textContent=error.message;return;}
      const plotted=[];if(api.tiles.rectangle)for(let i=1;i<line.length;i++){if(line[i].distanceTo(line[i-1])<api.radius*2)plotted.push(line[i-1],line[i]);}
      const LineType=api.tiles.rectangle?THREE.LineSegments:THREE.Line;
      const mesh=new LineType(new THREE.BufferGeometry().setFromPoints(api.tiles.rectangle?plotted:line),new THREE.LineBasicMaterial({color:0xfbbf24,depthTest:false}));group.add(mesh);
    }
    panel.replaceChildren();
    points.forEach((p,i)=>{const row=document.createElement('div');row.className='vertex-row';
      const text=document.createElement('span');text.textContent=`${i+1}. ${p.lat.toFixed(5)}°, ${(east360?(p.lon+360)%360:p.lon).toFixed(5)}° E`;row.append(text);
      const edit=document.createElement('button');edit.textContent='Edit';edit.onclick=()=>{host.querySelector('[data-lat]').value=p.lat;host.querySelector('[data-lon]').value=p.lon;host.querySelector('[data-edit-index]').value=i;};row.append(edit);
      const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Delete vertex ${i+1}`);remove.onclick=()=>{points.splice(i,1);redo=[];render();};row.append(remove);panel.append(row);
    });
    try{const m=pathMetrics(points,mode==='polygon');const last=points.at(-1);
      output.textContent=`Mars mean sphere R=${MARS.radius.toLocaleString()} m\nSurface: ${(m.surface/1000).toFixed(3)} km · 3D chords: ${(m.chord/1000).toFixed(3)} km\n${mode==='polygon'?`Area: ${(m.area/1e6).toFixed(4)} km²\n`:''}Terrain-following: unavailable (no measured DEM)\n${last?`Last point: centric ${last.lat.toFixed(5)}° · graphic ${planetographicLatitude(last.lat).toFixed(5)}°`:'Click globe or add coordinates.'}`;
    }catch(error){output.textContent=error.message;}
  }
  host.querySelector('[data-measure-mode]').onchange=e=>{mode=e.target.value;render();};
  host.querySelector('[data-measure-enable]').onchange=e=>{enabled=e.target.checked;if(enabled){savedAutoSpin=api.getState().autoSpin;api.getState().autoSpin=false;api.cancelWaypoint();}else api.getState().autoSpin=savedAutoSpin;api.controls.enabled=!enabled;};
  host.querySelector('[data-longitude]').onchange=e=>{east360=e.target.checked;render();};
  host.querySelector('[data-add-coordinate]').onclick=()=>{
    try{const p=validatePoint({lat:Number(host.querySelector('[data-lat]').value),lon:Number(host.querySelector('[data-lon]').value)});const index=host.querySelector('[data-edit-index]');
      if(index.value!==''){const i=Number(index.value);if(!points[i])throw new Error('Vertex no longer exists');points[i]=p;index.value='';}else if(points.length<200)points.push(p);
      redo=[];render();
    }catch(error){output.textContent=error.message;}
  };
  host.querySelector('[data-undo]').onclick=()=>{if(points.length)redo.push(points.pop());render();};
  host.querySelector('[data-redo]').onclick=()=>{if(redo.length)points.push(redo.pop());render();};
  host.querySelector('[data-clear]').onclick=()=>{points=[];redo=[];host.querySelector('[data-edit-index]').value='';render();};
  host.querySelector('[data-export]').onclick=()=>{try{api.download('ares-mars-measurements.geojson',JSON.stringify(toMarsGeoJSON(points,mode==='polygon'),null,2));}catch(e){output.textContent=e.message;}};
  host.querySelector('[data-share]').onclick=async()=>{
    const state={v:1,points,mode,east360,view:api.getView()};
    const hash='ares='+encodeURIComponent(JSON.stringify(state));
    if(hash.length>30000){output.textContent='Share state too large; export GeoJSON instead.';return;}
    history.replaceState(null,'','#'+hash);
    try{await navigator.clipboard.writeText(location.href);output.textContent+='\nShare URL copied.';}catch{output.textContent+='\nCopy this page URL to share.';}
  };
  const restore=()=>{if(!location.hash.startsWith('#ares='))return;try{const raw=location.hash.slice(6);if(raw.length>30000)throw new Error('Share state too large');const data=JSON.parse(decodeURIComponent(raw));if(data.v!==1||!Array.isArray(data.points)||data.points.length>200)throw new Error('Invalid share state');points=data.points.map(validatePoint);mode=['inspect','line','polygon'].includes(data.mode)?data.mode:'inspect';east360=!!data.east360;host.querySelector('[data-measure-mode]').value=mode;host.querySelector('[data-longitude]').checked=east360;api.restoreView(data.view);render();}catch(error){output.textContent=`Could not restore: ${error.message}`;}};
  api.canvas.addEventListener('pointerdown',e=>{if(enabled)down={x:e.clientX,y:e.clientY};},true);
  api.canvas.addEventListener('pointerup',e=>{if(!enabled||!down)return;e.stopImmediatePropagation();const start=down;down=null;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)return;const p=api.pick(e);if(!p)return;if(mode==='inspect')points=[p];else if(points.length<200)points.push(p);redo=[];render();},true);
  addEventListener('keydown',e=>{if(e.key==='Escape'&&enabled){enabled=false;host.querySelector('[data-measure-enable]').checked=false;api.controls.enabled=true;api.getState().autoSpin=savedAutoSpin;}});
  addEventListener('hashchange',restore);restore();render();
  return {refresh:render,update(){if(api.camera?.isOrthographicCamera){const size=(api.camera.top-api.camera.bottom)/api.camera.zoom/(api.canvas.clientHeight||800)*5/.025;for(const dot of group.children)if(dot.userData.marker)dot.scale.setScalar(size);}else for(const dot of group.children)if(dot.userData.marker)dot.scale.setScalar(1);group.visible=api.getState().mode==='orbital';if(enabled)api.controls.enabled=false;},get enabled(){return enabled;},snapshot(){return {points:points.map(p=>({...p})),mode};}};
}

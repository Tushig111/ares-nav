import * as THREE from 'three';

// Keep one camera reference so picking, controls, measurements and the tile manager
// all see the same exact projection matrix. The orthographic matrix is computed by
// Three.js itself; this is not a flattened raster or a second imagery pipeline.
export function createProjectionController({camera, controls, globe, tiles, enterOrbital, pauseMotion, isOrbital = () => true}) {
 const perspectiveUpdate=camera.updateProjectionMatrix.bind(camera);
 const ortho=new THREE.OrthographicCamera(-5.2,5.2,5.2,-5.2,.01,1600);
 let mode='global', saved=null;
 const ui=document.createElement('section');ui.className='projection-ui';
 ui.innerHTML=`<button class="projection-trigger" aria-haspopup="dialog" aria-expanded="false"><span aria-hidden="true">◉</span> <span data-current>Global globe</span><span aria-hidden="true">⌄</span></button>
 <dialog class="projection-dialog"><header><div><small>ARES-NAV · MAP VIEW</small><h2>Choose your perspective</h2></div><button data-close aria-label="Close map views">×</button></header>
 <div class="projection-options">
 <button data-projection="global"><span class="projection-icon">◉</span><span><strong>Global globe</strong><small>Perspective · rotate and explore</small></span><span data-check>✓</span></button>
 <button data-projection="north"><span class="projection-icon">N</span><span><strong>North Pole</strong><small>Orthographic · north-centered hemisphere</small></span><span data-check>✓</span></button>
 <button data-projection="south"><span class="projection-icon">S</span><span><strong>South Pole</strong><small>Orthographic · south-centered hemisphere</small></span><span data-check>✓</span></button>
 </div><p>One globe. One progressive NASA imagery cache. Polar maps preserve the spherical geometry; scale varies away from the center.</p><a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener">NASA Mars Trek · imagery attribution ↗</a></dialog>
 <output class="projection-hint" aria-live="polite"></output>`;
 document.body.append(ui);
 const trigger=ui.querySelector('.projection-trigger'),dialog=ui.querySelector('dialog'),hint=ui.querySelector('output');
 trigger.onclick=()=>{dialog.showModal();trigger.setAttribute('aria-expanded','true');};
 ui.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 function updateProjection() {
  if(mode==='global')return perspectiveUpdate();
  const aspect=camera.aspect||1;
  camera.top=5.2;camera.bottom=-5.2;camera.left=-5.2*aspect;camera.right=5.2*aspect;
  Object.assign(ortho,{left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,near:camera.near,far:camera.far,zoom:camera.zoom});
  ortho.updateProjectionMatrix();camera.projectionMatrix.copy(ortho.projectionMatrix);camera.projectionMatrixInverse.copy(ortho.projectionMatrixInverse);
 }
 camera.updateProjectionMatrix=updateProjection;
 function setMode(next) {
  if(!['global','north','south'].includes(next))return false;
  if(next===mode){if(next==='global')enterOrbital();dialog.close();return true;}
  if(mode==='global')saved=isOrbital()?{position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone(),fov:camera.fov}:null;
  enterOrbital();pauseMotion();
  mode=next;camera.zoom=1;
  camera.isOrthographicCamera=mode!=='global';camera.isPerspectiveCamera=mode==='global';
  controls.enableRotate=mode==='global';controls.enablePan=mode!=='global';controls.screenSpacePanning=true;controls.minZoom=1;controls.maxZoom=512;
  controls.zoomSpeed=mode==='global'?1.25:.8;
  if(mode==='global') {
   camera.position.copy(saved?.position||new THREE.Vector3(0,3.2,13.5));controls.target.copy(saved?.target||new THREE.Vector3());camera.up.copy(saved?.up||new THREE.Vector3(0,1,0));camera.fov=saved?.fov||42;
  } else {
   globe.updateWorldMatrix(true,false);
   const center=globe.getWorldPosition(new THREE.Vector3());
   const pole=new THREE.Vector3(0,next==='north'?1:-1,0).transformDirection(globe.matrixWorld);
   const up=new THREE.Vector3(0,0,next==='north'?-1:1).transformDirection(globe.matrixWorld);
   camera.position.copy(center).addScaledVector(pole,16);camera.up.copy(up);controls.target.copy(center);
  }
  camera.lookAt(controls.target);updateProjection();controls.update();tiles.invalidate();
  ui.querySelector('[data-current]').textContent=mode==='global'?'Global globe':mode==='north'?'North Pole':'South Pole';
  hint.textContent=mode==='global'?'':'ORTHOGRAPHIC · Scroll / pinch to zoom · drag to pan';
  for(const b of ui.querySelectorAll('[data-projection]'))b.setAttribute('aria-pressed',String(b.dataset.projection===mode));
  document.body.dataset.projection=mode;dialog.close();return true;
 }
 for(const b of ui.querySelectorAll('[data-projection]')){b.setAttribute('aria-pressed',String(b.dataset.projection==='global'));b.onclick=()=>setMode(b.dataset.projection);}
 return {setMode,get mode(){return mode;},reset(){if(mode!=='global')setMode('global');},update(){if(mode!=='global'){controls.zoomSpeed=.8;hint.textContent=`ORTHOGRAPHIC · ${camera.zoom.toFixed(1)}× · Scroll to zoom / drag to pan`;}}};
}

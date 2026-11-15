import * as THREE from 'three';

// Keep one camera reference so picking, controls, measurements and the tile manager
// all see the same exact projection matrix. The orthographic matrix is computed by
// Three.js itself; this is not a flattened raster or a second imagery pipeline.
export function createProjectionController({camera, controls, globe, tiles, enterOrbital, pauseMotion, isOrbital = () => true, onProjection = () => {}}) {
 const perspectiveUpdate=camera.updateProjectionMatrix.bind(camera);
 const ortho=new THREE.OrthographicCamera(-5.2,5.2,5.2,-5.2,.01,1600);
 let mode='global', saved=null, flight=null, flyMode=false;
 const keys=new Set();let pendingZoom=0,pendingPan=new THREE.Vector2(),cursor=new THREE.Vector2();
 const element=controls.domElement;controls.zoomToCursor=true;
 element?.addEventListener('wheel',e=>{if(mode==='global')return;e.preventDefault();e.stopImmediatePropagation();const rect=element.getBoundingClientRect();cursor.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const scale=e.deltaMode===1?16:e.deltaMode===2?rect.height:1;if(e.ctrlKey)pendingZoom+=THREE.MathUtils.clamp(e.deltaY*scale,-200,200);else pendingPan.add(new THREE.Vector2(e.deltaX*scale,e.deltaY*scale));flight=null;},{capture:true,passive:false});
 addEventListener('keydown',e=>{if(!flyMode||e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){keys.add(e.code);e.preventDefault();}});
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
 controls.addEventListener?.('start',()=>{flight=null;pendingZoom=0;pendingPan.set(0,0);});
 let hidden=[];const backing=new THREE.Mesh(new THREE.PlaneGeometry(4*(tiles.radius||4.6),2*(tiles.radius||4.6)),new THREE.MeshBasicMaterial({color:0x433c37}));backing.position.z=-.01;backing.visible=false;tiles.group?.add(backing);
 function syncGeometry(){
  for(const [o,v]of hidden)o.visible=v;hidden=[];
  tiles.setProjection?.(mode);backing.visible=mode==='rectangle';
  if(mode==='rectangle'){
   if(globe.material){hidden.push([globe.material,globe.material.visible]);globe.material.visible=false;}
   for(const o of globe.children)if(o!==tiles.group){hidden.push([o,o.visible]);o.visible=false;}
   for(const o of globe.parent?.children||[])if(o!==globe){hidden.push([o,o.visible]);o.visible=false;}
  }
  onProjection(mode);
 }
 const ui=document.createElement('section');ui.className='projection-ui';
 ui.innerHTML=`<button class="projection-trigger" aria-haspopup="dialog" aria-expanded="false"><span aria-hidden="true">◉</span> <span data-current>Global globe</span><span aria-hidden="true">⌄</span></button>
 <dialog class="projection-dialog"><header><div><small>ARES-NAV · MAP VIEW</small><h2>Choose your perspective</h2></div><button data-close aria-label="Close map views">×</button></header>
 <div class="projection-options">
 <button data-projection="global"><span class="projection-icon">◉</span><span><strong>Global globe</strong><small>Perspective · rotate and explore</small></span><span data-check>✓</span></button>
 <button data-projection="rectangle"><span class="projection-icon">▭</span><span><strong>Global Map (Rectangle)</strong><small>2:1 equirectangular · longitude / latitude grid</small></span><span data-check>✓</span></button>
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
  const halfHeight=mode==='rectangle'?Math.max(5.2,10.4/aspect):5.2;
  camera.top=halfHeight;camera.bottom=-halfHeight;camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;
  Object.assign(ortho,{left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,near:camera.near,far:camera.far,zoom:camera.zoom});
  ortho.updateProjectionMatrix();camera.projectionMatrix.copy(ortho.projectionMatrix);camera.projectionMatrixInverse.copy(ortho.projectionMatrixInverse);
 }
 camera.updateProjectionMatrix=updateProjection;
 function setMode(next) {
  if(!['global','rectangle','north','south'].includes(next))return false;
  if(next===mode){if(next==='global')enterOrbital();dialog.close();return true;}
  if(mode==='global')saved=isOrbital()?{position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone(),fov:camera.fov}:null;
  enterOrbital();pauseMotion();
  mode=next;camera.zoom=1;
  camera.isOrthographicCamera=mode!=='global';camera.isPerspectiveCamera=mode==='global';
  controls.enableRotate=mode==='global';controls.enablePan=mode!=='global';
  if(controls.mouseButtons)controls.mouseButtons.LEFT=mode==='global'?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;
  if(controls.touches)controls.touches.ONE=mode==='global'?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN;controls.screenSpacePanning=true;controls.minZoom=1;controls.maxZoom=32768;
  controls.zoomSpeed=mode==='global'?1.25:.8;
  if(mode==='global') {
   camera.position.copy(saved?.position||new THREE.Vector3(0,3.2,13.5));controls.target.copy(saved?.target||new THREE.Vector3());camera.up.copy(saved?.up||new THREE.Vector3(0,1,0));camera.fov=saved?.fov||42;
  } else if(mode==='rectangle'){
   globe.updateWorldMatrix(true,false);const center=globe.getWorldPosition(new THREE.Vector3());camera.position.copy(center).add(new THREE.Vector3(0,0,16));camera.up.set(0,1,0);controls.target.copy(center);
  } else {
   globe.updateWorldMatrix(true,false);
   const center=globe.getWorldPosition(new THREE.Vector3());
   const pole=new THREE.Vector3(0,next==='north'?1:-1,0).transformDirection(globe.matrixWorld);
   const up=new THREE.Vector3(0,0,next==='north'?-1:1).transformDirection(globe.matrixWorld);
   camera.position.copy(center).addScaledVector(pole,16);camera.up.copy(up);controls.target.copy(center);
  }
  syncGeometry();camera.lookAt(controls.target);updateProjection();controls.update();tiles.invalidate();
  ui.querySelector('[data-current]').textContent=mode==='global'?'Global globe':mode==='rectangle'?'Global Map (Rectangle)':mode==='north'?'North Pole':'South Pole';
  hint.textContent=mode==='global'?'':'ORTHOGRAPHIC · Scroll / pinch to zoom · drag to pan';
  for(const b of ui.querySelectorAll('[data-projection]'))b.setAttribute('aria-pressed',String(b.dataset.projection===mode));
  document.body.dataset.projection=mode;dialog.close();return true;
 }
 for(const b of ui.querySelectorAll('[data-projection]')){b.setAttribute('aria-pressed',String(b.dataset.projection==='global'));b.onclick=()=>setMode(b.dataset.projection);}
 function panPixels(x,y){const span=(camera.top-camera.bottom)/camera.zoom/(element?.clientHeight||800);const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);const shift=right.multiplyScalar(-x*span).addScaledVector(up,y*span);camera.position.add(shift);controls.target.add(shift);}
 function zoomAt(delta){const before=new THREE.Vector3(cursor.x,cursor.y,0).unproject(camera);camera.zoom=THREE.MathUtils.clamp(camera.zoom*Math.exp(-delta*.006),1,32768);updateProjection();const after=new THREE.Vector3(cursor.x,cursor.y,0).unproject(camera),shift=before.sub(after);camera.position.add(shift);controls.target.add(shift);}
 function flyTo({lat,lon,extent}){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90)throw Error('Invalid flight coordinates');
  enterOrbital();pauseMotion();
  if(mode==='north'&&lat<0)setMode('south');else if(mode==='south'&&lat>0)setMode('north');
  globe.updateWorldMatrix(true,true);let p=tiles.point?tiles.point(lat,lon).applyMatrix4(tiles.group.matrixWorld):new THREE.Vector3();
  const span=extent?Math.max((((extent[2]-extent[0])%360+360)%360||360),Math.abs(extent[3]-extent[1])):.06;
  let target=p.clone(),position,zoom=camera.zoom;
  if(mode==='global'){target=globe.getWorldPosition(new THREE.Vector3());const altitude=Math.max(.04,(tiles.radius||4.6)*THREE.MathUtils.degToRad(span)*1.8);position=p.clone().sub(target).normalize().multiplyScalar((tiles.radius||4.6)+altitude).add(target);}
  else {position=p.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()),-16);const worldSpan=Math.max(.00001,THREE.MathUtils.degToRad(span)*(tiles.radius||4.6)*(mode==='rectangle'?2/Math.PI:1));zoom=THREE.MathUtils.clamp(Math.min(camera.right-camera.left,camera.top-camera.bottom)/(worldSpan*1.6),1,32768);}
  flight={from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target,fromZoom:camera.zoom,zoom,t:0};tiles.invalidate();
 }
 return {setMode,flyTo,toggleFly(value){flyMode=value??!flyMode;keys.clear();pauseMotion();return flyMode;},get flyMode(){return flyMode;},get mode(){return mode;},reset(){if(mode!=='global')setMode('global');},update(dt=1/60){
  const amount=1-Math.exp(-Math.min(.05,dt)*18);
  if(mode!=='global'){
   controls.zoomSpeed=.8;
   if(Math.abs(pendingZoom)>.01){const delta=pendingZoom*amount;pendingZoom-=delta;zoomAt(delta);tiles.invalidate();}
   if(pendingPan.lengthSq()>.01){const delta=pendingPan.clone().multiplyScalar(amount);pendingPan.sub(delta);panPixels(delta.x,delta.y);tiles.invalidate();}
   hint.textContent=`ORTHOGRAPHIC · ${camera.zoom.toFixed(1)}× · Drag / scroll to pan · pinch or +/− to zoom`;
  }
  if(flight){flight.t+=Math.min(dt,.05);const f=1-Math.pow(1-Math.min(1,flight.t/1.2),3);camera.position.lerpVectors(flight.from,flight.to,f);controls.target.lerpVectors(flight.fromTarget,flight.target,f);camera.zoom=Math.exp(THREE.MathUtils.lerp(Math.log(flight.fromZoom),Math.log(flight.zoom),f));updateProjection();controls.update();tiles.invalidate();if(f===1)flight=null;}
  if(flyMode&&keys.size){const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);flight=null;
   if(mode!=='global')panPixels(-x*240*dt,y*240*dt);
   else if(isOrbital()){const offset=camera.position.clone().sub(controls.target),right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);offset.applyAxisAngle(camera.up,-x*dt*.25).applyAxisAngle(right,y*dt*.25);camera.position.copy(controls.target).add(offset);}
   else{const shift=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(x*dt*3).addScaledVector(camera.getWorldDirection(new THREE.Vector3()),y*dt*3);shift.y+=(keys.has('KeyE')?1:0)*dt*3-(keys.has('KeyQ')?1:0)*dt*3;camera.position.add(shift);controls.target.add(shift);}
   controls.update();tiles.invalidate();
  }
 }};
}

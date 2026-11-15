import * as THREE from 'three';
export const MARS_GRAVITY=3.72;
export const METERS_PER_UNIT=24;
// Closed-form, frame-rate independent demonstration. Thrust is assumed, not MAV telemetry.
export function flightState(t,thrustAcceleration=9,burnSeconds=8){
 t=Math.max(0,t);const net=thrustAcceleration-MARS_GRAVITY,burn=Math.min(t,burnSeconds),coast=Math.max(0,t-burnSeconds);
 const h=.5*net*burn*burn+net*burn*coast-.5*MARS_GRAVITY*coast*coast;
 return {height:Math.max(0,h),velocity:h<0?0:net*burn-MARS_GRAVITY*coast,acceleration:t<burnSeconds?net:-MARS_GRAVITY,burning:t<burnSeconds};
}
export function normalizeRover(model,heightMeters=2.2){
 model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('Rover has no finite vertical bounds');
 const wrapper=new THREE.Group();wrapper.add(model);model.position.sub(new THREE.Vector3((box.min.x+box.max.x)/2,box.min.y,(box.min.z+box.max.z)/2));wrapper.scale.setScalar(heightMeters/size.y);wrapper.updateMatrixWorld(true);
 wrapper.userData.heightMeters=heightMeters;return wrapper;
}
export async function loadRover(name){
 const [{GLTFLoader},{DRACOLoader}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/loaders/DRACOLoader.js')]);
 const draco=new DRACOLoader();draco.setDecoderPath(new URL('../vendor/draco/',import.meta.url).href);draco.setWorkerLimit(1);
 try{const gltf=await new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL(`../models/${name}.glb`,import.meta.url).href);return normalizeRover(gltf.scene);}finally{draco.dispose();}
}
export function createVehicles({parent,getSite,getHeight,getMode,enterSurface,focus,host,camera}){
 const anchor=new THREE.Group();parent.add(anchor);
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.008,32),new THREE.MeshStandardMaterial({color:0x444b52,roughness:.9}));pad.position.y=-.006;anchor.add(pad);const roverGroup=new THREE.Group();anchor.add(roverGroup);roverGroup.scale.setScalar(1/METERS_PER_UNIT);
 const cache=new Map();let lastSite=-1,current=null,request=0,launchTime=null,following=false,requested=false;
 // The archive GLBs contain hundreds of mesh parts. A map-scale rover must not
 // submit every bolt when it occupies only a few screen pixels.
 const proxy = new THREE.Mesh(new THREE.BoxGeometry(.1,.045,.13),new THREE.MeshStandardMaterial({color:0xc6cbd0,roughness:.8}));
 proxy.position.y=.035;anchor.add(proxy);
 const section=document.createElement('details');section.innerHTML=`<summary>Rovers + MAV demonstration</summary><p data-model-status>Select a surface site to load its rover.</p><button data-rover>Inspect rover</button> <button data-dirty>Clean / dusty Curiosity</button><button data-launch>Launch MAV demo</button> <button data-reset>Reset MAV</button><output data-flight></output><p>Rover height normalized to NASA's approximate 2.2 m reference. Placement is illustrative, not current rover telemetry. MAV shape, thrust and plume are procedural demo assumptions.</p><a href="https://science.nasa.gov/3d-resources/" target="_blank" rel="noopener">NASA 3D resource catalog ↗</a>`;host.append(section);
 const status=section.querySelector('[data-model-status]'),flight=section.querySelector('[data-flight]');let dusty=false;
 async function load(){
  const site=getSite(),id=++request;lastSite=site.id;launchTime=null;rocket.position.y=0;plume.visible=false;roverGroup.clear();current=null;
  if(site.id>1){status.textContent='No rover assigned to this regional concept site.';return;}
  const name=site.id===0?(dusty?'curiosity-dirty':'curiosity'):'perseverance';status.textContent=`Loading ${name}…`;
  try{let promise=cache.get(name);if(!promise){promise=loadRover(name);cache.set(name,promise);}const model=await promise;if(id!==request)return;current=model;roverGroup.add(model);status.textContent=`${name} loaded · 2.2 m reference height · local GLB · illustrative site placement`;section.dataset.loaded=name;}
  catch(e){cache.delete(name);if(id===request){status.textContent=`Model unavailable: ${e.message}. Retry Inspect rover. No substitute presented as NASA hardware.`;section.dataset.loaded='error';}}
 }
 const rocket=new THREE.Group();rocket.scale.setScalar(1/METERS_PER_UNIT);rocket.position.set(.22,0,0);anchor.add(rocket);
 const metal=new THREE.MeshStandardMaterial({color:0xd7dce1,metalness:.4,roughness:.5}),dark=new THREE.MeshStandardMaterial({color:0x283541,roughness:.7});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,3.1,16),metal);body.position.y=1.8;rocket.add(body);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.38,.9,16),metal);nose.position.y=3.8;rocket.add(nose);
 const nozzle=new THREE.Mesh(new THREE.ConeGeometry(.2,.4,12,1,true),dark);nozzle.rotation.z=Math.PI;nozzle.position.y=.2;rocket.add(nozzle);
 const positions=new Float32Array(192*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const plume=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffaa55,size:.08,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));plume.frustumCulled=false;plume.visible=false;rocket.add(plume);
 function focusRover(){enterSurface();const p=anchor.position.clone();p.y+=.05;focus(p,new THREE.Vector3(.02,.35,.04));}
 section.querySelector('[data-rover]').onclick=()=>{requested=true;if(!current)load();focusRover();};
 section.querySelector('[data-dirty]').onclick=()=>{if(getSite().id!==0){status.textContent='Dust variant applies to Curiosity at Gale only.';return;}dusty=!dusty;load();};
 section.querySelector('[data-launch]').onclick=()=>{enterSurface();launchTime=0;following=true;focus(anchor.position.clone().add(new THREE.Vector3(.22,.2,0)),new THREE.Vector3(.8,.5,1));};
 section.querySelector('[data-reset]').onclick=()=>{launchTime=null;following=false;rocket.position.y=0;plume.visible=false;flight.textContent='MAV reset · procedural demo';};
 return {update(dt){if(getMode()==='orbital')return;const site=getSite();
  if(site.id!==lastSite){roverGroup.visible=false;current=null;roverGroup.clear();if(section.open||requested)load();}
  const distance=Math.max(.01,anchor.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position));
  const projectedHeight=(2.2/METERS_PER_UNIT)*innerHeight/(2*distance*Math.tan(Math.PI*42/360));
  roverGroup.visible=!!current&&projectedHeight>28;
  proxy.visible=!roverGroup.visible&&site.id<=1;
  rocket.visible=launchTime!==null||projectedHeight>8;
  pad.visible=projectedHeight>4;
  const ground=Math.max(...[-.14,0,.14].flatMap(x=>[-.14,0,.14].map(z=>getHeight(site.id,x,z))));anchor.position.set(0,ground+.03,0);
  if(launchTime!==null){launchTime+=dt;const s=flightState(launchTime);rocket.position.y=s.height/METERS_PER_UNIT;if(following)focus(anchor.position.clone().add(new THREE.Vector3(.22,rocket.position.y+.1,0)),new THREE.Vector3(.4,.25,.5));plume.visible=s.burning;flight.textContent=`SIM MAV · t=${launchTime.toFixed(1)} s · altitude ${s.height.toFixed(1)} m · v=${s.velocity.toFixed(1)} m/s · g=3.72 m/s² downward`;
   if(s.burning){for(let i=0;i<192;i++){const age=((launchTime*1.7+i/192)%1);positions[i*3]=Math.sin(i*13.7)*age*.5;positions[i*3+1]=-age*4;positions[i*3+2]=Math.cos(i*7.3)*age*.5;}geometry.attributes.position.needsUpdate=true;}
   if(launchTime>8&&s.height===0){launchTime=null;flight.textContent+=' · demo complete';}
  }
 },stopFollowing(){following=false;},get loaded(){return current;},section};
}

import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
export function createMobileAR({renderer,makeModel,onActive,onStatus,buttonHost}) {
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.01,30);
  camera.position.set(0,.7,1.2);camera.lookAt(0,-.15,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x554433,2));
  const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(2,4,3);scene.add(sun);
  const root=new THREE.Group();scene.add(root);
  const reticle=new THREE.Mesh(new THREE.RingGeometry(.08,.1,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x38bdf8}));
  reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
  let mode=null,stream=null,hitSource=null,reference=null,placed=false,previousAlpha=1,starting=false,initialOrientation=null,initialCamera=null;
  const video=document.createElement('video');video.className='ar-camera';video.playsInline=true;video.muted=true;video.autoplay=true;video.hidden=true;document.body.prepend(video);
  const overlay=document.createElement('div');overlay.className='ar-overlay';overlay.hidden=true;
  const status=document.createElement('p'),exit=document.createElement('button');exit.textContent='Exit AR';overlay.append(status,exit);document.body.append(overlay);
  const notify=text=>{status.textContent=text;onStatus(text);};
  const clearModel=()=>{root.traverse(o=>{if(o.userData.portalGeometry)o.geometry?.dispose();if(o.userData.portalMaterial)for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose();});while(root.children.length)root.remove(root.children[0]);};
  function prepare(){
    clearModel();const model=makeModel();root.add(model);
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    model.position.sub(center);model.position.y-=size.y/2;
    root.scale.setScalar(.8/Math.max(size.x,size.y,size.z,.01));root.position.set(0,0,0);root.quaternion.identity();
    model.traverse(o=>{if(!o.material)return;const clone=m=>{const c=m.clone();c.stencilWrite=true;c.stencilRef=1;c.stencilFunc=THREE.EqualStencilFunc;c.stencilFail=c.stencilZFail=c.stencilZPass=THREE.KeepStencilOp;return c;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);o.userData.portalMaterial=true;o.renderOrder=1;});
    const radius=.43/root.scale.x;
    const mask=new THREE.Mesh(new THREE.CircleGeometry(radius,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,colorWrite:false,depthWrite:false,depthTest:false,stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilZPass:THREE.ReplaceStencilOp}));mask.renderOrder=-10;mask.userData.portalMaterial=mask.userData.portalGeometry=true;root.add(mask);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(radius,.005/root.scale.x,6,48).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:0x77cce5}));rim.renderOrder=2;rim.userData.portalMaterial=rim.userData.portalGeometry=true;root.add(rim);

  }
  function activate(type){mode=type;prepare();previousAlpha=renderer.getClearAlpha();renderer.setClearAlpha(0);onActive(true);document.body.classList.add('ar-running');overlay.hidden=false;}
  async function end(){
    if(mode==='xr'){await renderer.xr.getSession()?.end();return;}
    cleanup();
  }
  function cleanup(){
    stream?.getTracks().forEach(t=>t.stop());stream=null;video.pause();video.srcObject=null;video.hidden=true;
    removeEventListener('deviceorientation',orientation);initialOrientation=null;initialCamera=null;
    hitSource?.cancel();hitSource=null;reference=null;reticle.visible=false;placed=false;root.visible=true;
    mode=null;renderer.setClearAlpha(previousAlpha);document.body.classList.remove('ar-running');overlay.hidden=true;onActive(false);clearModel();
  }
  exit.onclick=()=>end().catch(e=>notify(e.message));
  function orientation(e){
    if(mode!=='camera'||e.alpha===null)return;
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(e.beta||0),THREE.MathUtils.degToRad(e.alpha||0),-THREE.MathUtils.degToRad(e.gamma||0),'YXZ'));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));
    const angle=screen.orientation?.angle||0;q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-THREE.MathUtils.degToRad(angle)));
    if(!initialOrientation){initialOrientation=q.clone();initialCamera=camera.quaternion.clone();}camera.quaternion.copy(initialCamera).multiply(initialOrientation.clone().invert().multiply(q));
  }
  const pointers=new Map();let pinchDistance=0,baseScale=1;
  renderer.domElement.addEventListener('pointerdown',e=>{if(mode!=='camera')return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);if(pointers.size===2){const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);baseScale=root.scale.x;}});
  renderer.domElement.addEventListener('pointermove',e=>{if(mode!=='camera'||!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinchDistance){const[a,b]=[...pointers.values()];root.scale.setScalar(THREE.MathUtils.clamp(baseScale*Math.hypot(a.x-b.x,a.y-b.y)/pinchDistance,.0005,1));}else{root.rotation.y+=(e.clientX-old.x)*.008;root.rotation.x+=(e.clientY-old.y)*.004;}});
  const pointerEnd=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinchDistance=0;};renderer.domElement.addEventListener('pointerup',pointerEnd);renderer.domElement.addEventListener('pointercancel',pointerEnd);
  const fallback=document.createElement('button');fallback.textContent='Enter AR / Camera 3D';fallback.className='icon-chip';buttonHost.append(fallback);
  fallback.onclick=async()=>{
    if(mode||starting)return;starting=true;
    try{
      if(!isSecureContext)throw new Error('Camera AR needs HTTPS or localhost.');
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access is not available in this browser.');
      // iOS motion permission must start directly inside the button gesture.
      let motion=Promise.resolve('unavailable');
      if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')motion=DeviceOrientationEvent.requestPermission().catch(()=> 'denied');
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      video.srcObject=stream;await video.play();activate('camera');video.hidden=false;
      const permission=await motion;if(permission!=='denied')addEventListener('deviceorientation',orientation);
      notify('Camera 3D overlay · not spatially anchored. Drag to rotate; pinch to scale. Camera stays on this device.');
    }catch(error){if(mode)cleanup();stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;onStatus(`AR unavailable: ${error.message}`);}finally{starting=false;}
  };
  renderer.xr.enabled=true;
  const controller=renderer.xr.getController(0);scene.add(controller);
  controller.addEventListener('select',()=>{if(reticle.visible&&mode==='xr'){root.position.setFromMatrixPosition(reticle.matrix);root.quaternion.setFromRotationMatrix(reticle.matrix);root.visible=true;placed=true;notify('0.86 m stencil portal placed · illustrative terrain; look into the opening. Exit AR to return.');}});
  renderer.xr.addEventListener('sessionstart',async()=>{
    const session=renderer.xr.getSession();
    try{activate('xr');root.visible=false;placed=false;const viewer=await session.requestReferenceSpace('viewer');reference=await session.requestReferenceSpace('local');hitSource=await session.requestHitTestSource({space:viewer});if(renderer.xr.getSession()!==session){hitSource.cancel();hitSource=null;return;}notify('Move device to find a surface, then tap to place the tabletop portal.');}
    catch(error){notify(`Hit testing unavailable: ${error.message}`);await session.end();}
  });
  renderer.xr.addEventListener('sessionend',cleanup);
  navigator.xr?.isSessionSupported('immersive-ar').then(supported=>{
    if(!supported)return;
    const button=ARButton.createButton(renderer,{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:overlay}});
    button.className='icon-chip xr-enter-button';button.removeAttribute('style');buttonHost.prepend(button);fallback.textContent='Camera 3D fallback';
  }).catch(()=>{});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='camera')cleanup();});
  addEventListener('pagehide',()=>{stream?.getTracks().forEach(t=>t.stop());});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  return {get active(){return mode!==null;},update(time,frame){
    if(!mode)return false;
    if(mode==='xr'&&frame&&hitSource&&reference){const hit=frame.getHitTestResults(hitSource)[0];reticle.visible=!!hit&&!placed;if(hit){const pose=hit.getPose(reference);if(pose)reticle.matrix.fromArray(pose.transform.matrix);else reticle.visible=false;}}
    renderer.render(scene,camera);return true;
  },end};
}

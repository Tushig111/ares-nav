import * as THREE from 'three';
import {MarsQuadtreeGlobe,spherePoint,rectanglePoint} from '../js/mars-quadtree-globe.js';
export function runMapLodTests(){
 const results=[];const test=(name,fn)=>{try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}};const assert=(v,m)=>{if(!v)throw Error(m);};
 test('Rectangle corners span an exact 2:1 lon/lat domain',()=>{const sw=rectanglePoint(-90,-180,4.6),ne=rectanglePoint(90,180,4.6);assert(Math.abs((ne.x-sw.x)/(ne.y-sw.y)-2)<1e-9,'ratio');assert(sw.x===-9.2&&ne.y===4.6,'corners');});
 for(const mode of ['rectangle','north','south'])test(mode+' pan/zoom refines to CTX L11 within 220 textures',()=>{
  let time=0,maxTextures=0,maxActive=0;const images=[];const parent=new THREE.Group(),camera=new THREE.OrthographicCamera(-5.2,5.2,5.2,-5.2,.01,100);
  const renderer={domElement:{clientHeight:800,clientWidth:800},capabilities:{getMaxAnisotropy:()=>1},initTexture(){},getContext:()=>({isContextLost:()=>false})};
  const q=new MarsQuadtreeGlobe({parent,camera,renderer,now:()=>time,createImage:()=>{const image={width:512,height:512};images.push(image);return image;}});
  const cache=q.cache;q.setProjection(mode);const p=mode==='rectangle'?rectanglePoint(18.38,77.58,4.6):spherePoint(mode==='north'?70:-70,30,4.6);
  if(mode==='rectangle'){camera.position.set(p.x,p.y,16);camera.lookAt(p);}else{camera.up.set(0,0,mode==='north'?-1:1);camera.position.set(p.x,mode==='north'?16:-16,p.z);camera.lookAt(p.x,0,p.z);}
  camera.zoom=32768;camera.updateProjectionMatrix();
  for(let i=0;i<320;i++){time+=50;q.update(1);for(const image of images)if(image.onload)image.onload();maxTextures=Math.max(maxTextures,q.cache.size+q.active);maxActive=Math.max(maxActive,q.active);if(q.level===11)break;}
  const level=q.level;assert(level===11,`actual level ${level}; ${q.cache.size} textures, ${q.nodes.size} nodes`);assert(maxTextures<=220,'cache admission exceeded');assert(maxActive<=12,'request ceiling exceeded');
  q.setProjection('global');assert(q.cache===cache,'cache replaced');q.dispose();
 });return results;
}

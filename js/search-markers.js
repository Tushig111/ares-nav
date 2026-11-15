import * as THREE from 'three';
import {interpolate} from './geodesy.js?v=trek1';
export function createSearchMarkers(api){
 const group=new THREE.Group(),pins=new THREE.Group(),bounds=new THREE.Group(),paths=new THREE.Group();group.name='search-pois';group.add(pins,bounds,paths);api.globe.add(group);group.visible=false;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=48;const c=canvas.getContext('2d');c.beginPath();c.arc(24,24,13,0,Math.PI*2);c.fillStyle='#ffffff';c.fill();c.lineWidth=5;c.strokeStyle='#20170a';c.stroke();const texture=new THREE.CanvasTexture(canvas);
 let selected=null,hideMarkers=false,hidePath=false;const clear=g=>{for(const child of [...g.children]){child.geometry?.dispose();child.material?.dispose();g.remove(child);}};
 const point=p=>api.globePoint(p.lat,((p.lon+180)%360+360)%360-180,api.radius+.002);
 function line(points,target,color){const positions=[];let previous=null;for(const geo of points){const p=point(geo);if(previous&&(!api.tiles.rectangle||p.distanceTo(previous)<api.radius*2))positions.push(previous,p);previous=p;}target.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(positions),new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.85})));}
 function render(){clear(pins);clear(bounds);clear(paths);if(!selected){group.visible=false;return;}
  const points=selected.points||[selected];for(const geo of points){const pin=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:selected.id==='coordinate'?0xa78bfa:0xffb34f,depthTest:false,depthWrite:false}));pin.position.copy(point(geo));pin.userData.geo=geo;pin.renderOrder=100;pins.add(pin);}
  if(selected.extent){let[w,s,e,n]=selected.extent;const span=((e-w)%360+360)%360;w=((w+180)%360+360)%360-180;e=w+(span||Math.min(359.999,Math.abs(e-w)));const geo=[];for(const[a,b]of[[{lat:s,lon:w},{lat:s,lon:e}],[{lat:s,lon:e},{lat:n,lon:e}],[{lat:n,lon:e},{lat:n,lon:w}],[{lat:n,lon:w},{lat:s,lon:w}]])for(let i=0;i<=32;i++)geo.push({lat:a.lat+(b.lat-a.lat)*i/32,lon:a.lon+(b.lon-a.lon)*i/32});line(geo,bounds,0xffcc66);}
  if(points.length>1){const route=[];for(let i=1;i<points.length;i++)try{for(let j=0;j<=16;j++)route.push(interpolate(points[i-1],points[i],j/16));}catch{}line(route,paths,0xffb34f);}
 }
 return {select(record){selected=record;hideMarkers=false;hidePath=true;render();},remove(){selected=null;render();},setHidden(markers,path){hideMarkers=markers;hidePath=path;},refresh:render,
 update(){group.visible=!!selected&&api.getState().mode==='orbital';pins.visible=bounds.visible=!hideMarkers;paths.visible=!hidePath;
  const camera=api.camera,scale=camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom/(api.canvas.clientHeight||800)*18:null;
  const worldCamera=api.globe.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
  for(const pin of pins.children){const depth=Math.abs(camera.worldToLocal(pin.getWorldPosition(new THREE.Vector3())).z);pin.scale.setScalar(scale||Math.max(.000001,2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(api.canvas.clientHeight||800)*18));pin.visible=api.tiles.rectangle||(camera.isOrthographicCamera?pin.position.clone().normalize().dot(camera.getWorldDirection(new THREE.Vector3()).negate().transformDirection(api.globe.matrixWorld.clone().invert()))>0:pin.position.dot(worldCamera)>api.radius*api.radius);}
 },get markerCount(){return pins.children.length;},get visibleMarkerCount(){return group.visible&&!hideMarkers?pins.children.filter(p=>p.visible).length:0;},get selected(){return selected;}};
}

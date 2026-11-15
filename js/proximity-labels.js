import * as THREE from 'three';
import {loadSearchCatalog,landmarkBadge} from './official-data.js?v=final1';
// Decluttering is screen-space; approximate mission anchors never receive an official badge.
export function createProximityLabels(api,onSelect){
 const host=document.createElement('div');host.className='proximity-labels';host.setAttribute('aria-label','Nearby Martian landmarks');document.body.append(host);
 let records=[],selected=[],last=-Infinity,wasActive=false;
 loadSearchCatalog().then(data=>{records=[...data.bookmarks.flatMap(b=>b.points.map((p,i)=>({...p,id:b.id+'-'+i,kind:'poi',type:'Approximate study anchor',sourceURL:b.sourceURL}))),...data.features.map(p=>({...p,kind:'feature'}))];}).catch(()=>{});
 const localProjection=new THREE.Matrix4(),localCamera=new THREE.Vector3(),localDirection=new THREE.Vector3();
 function screen(record){const local=api.globePoint(record.lat,record.lon,api.radius+.004),p=local.clone().applyMatrix4(localProjection);
  const front=api.tiles.rectangle||(api.camera.isOrthographicCamera?local.dot(localDirection)>0:local.dot(localCamera)>api.radius*api.radius);
  return front&&p.z>=-1&&p.z<=1&&Math.abs(p.x)<.98&&Math.abs(p.y)<.95?{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}:null;
 }
 return {update(now=performance.now()){
  const active=api.getState().mode==='orbital'&&(api.tiles.targetLevel||api.tiles.level)>=5&&!document.body.classList.contains('zen-mode');
  host.classList.toggle('revealed',active);host.inert=!active;
  if(!active){wasActive=false;return;}api.globe.updateWorldMatrix(true,true);api.camera.updateMatrixWorld();const inverse=api.globe.matrixWorld.clone().invert();localCamera.copy(api.camera.position).applyMatrix4(inverse);localDirection.copy(api.camera.getWorldDirection(new THREE.Vector3())).negate().transformDirection(inverse);localProjection.multiplyMatrices(api.camera.projectionMatrix,api.camera.matrixWorldInverse).multiply(api.globe.matrixWorld);
  if(!wasActive||now-last>240){wasActive=true;last=now;const next=[];
   const candidates=records.map(record=>({record,p:screen(record)})).filter(x=>x.p).sort((a,b)=>Math.hypot(a.p.x-innerWidth/2,a.p.y-innerHeight/2)-Math.hypot(b.p.x-innerWidth/2,b.p.y-innerHeight/2));
   const boxes=[...document.querySelectorAll('.trek-panel:not([hidden]),.workbench:not([hidden]),.drawer.open,.top-bar,.mobile-header,.mobile-dock,.pin-badge:not([hidden])')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());
   for(const {record,p}of candidates){if(next.length>=(innerWidth<=768?3:6))break;const w=Math.min(245,Math.max(155,record.name.length*6+30)),box={left:p.x-w/2,right:p.x+w/2,top:p.y-48,bottom:p.y-4};
    if(box.left<8||box.right>innerWidth-8||box.top<(innerWidth<=768?104:125)||box.bottom>innerHeight-100||boxes.some(b=>box.left<b.right+8&&box.right>b.left-8&&box.top<b.bottom+8&&box.bottom>b.top-8))continue;
    const old=selected.find(s=>s.record.id===record.id),button=old?.button||document.createElement('button');if(!old){button.className='landmark-callout';const name=document.createElement('strong');name.textContent=record.name;const badge=document.createElement('small');badge.textContent=landmarkBadge(record);button.append(name,badge);button.onclick=()=>onSelect(record);button.style.width=w+'px';host.append(button);}next.push({record,button,w});boxes.push(box);
   }
   for(const old of selected)if(!next.some(n=>n.record.id===old.record.id))old.button.remove();selected=next;
  }
  for(const {record,button,w}of selected){const p=screen(record);button.hidden=!p;if(p)button.style.transform=`translate(${p.x-w/2}px,${p.y-48}px)`;}
 },get count(){return selected.length;}};
}

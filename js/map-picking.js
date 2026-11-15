import * as THREE from 'three';
// Analytic reference geometry: never derive coordinates from decorative relief.
export function pickReferenceMap(ndc,camera,globe,tiles,radius){
 camera.updateMatrixWorld();globe.updateWorldMatrix(true,true);
 const ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);
 const frame=tiles.rectangle?tiles.group:globe;
 const local=ray.ray.clone().applyMatrix4(frame.matrixWorld.clone().invert());
 if(tiles.rectangle){const p=local.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),new THREE.Vector3());if(!p||Math.abs(p.x)>2*radius||Math.abs(p.y)>radius)return null;return {lat:p.y/radius*90,lon:p.x/(2*radius)*180};}
 const p=local.intersectSphere(new THREE.Sphere(new THREE.Vector3(),radius),new THREE.Vector3());if(!p)return null;p.normalize();
 return {lat:THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(p.y,-1,1))),lon:((THREE.MathUtils.radToDeg(Math.atan2(p.z,-p.x))-180+540)%360)-180};
}

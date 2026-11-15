// Pure functions shared by GIS display and route comparison. All model values are synthetic.
export const SCIENCE_IDS=['topography','slope','temperature','minerals','ice','dust','traverse','obstacles'];
export const MODEL_SCALE={horizontalMeters:24,verticalMeters:18,radiusMeters:3389500};
export function wrapLon(lon){return ((lon+180)%360+360)%360-180;}
export function localToMars(x,z,site){const d=180/Math.PI/MODEL_SCALE.radiusMeters;return {lat:site.lat-z*24*d,lon:wrapLon(site.lon+x*24*d/Math.max(.01,Math.cos(site.lat*Math.PI/180)))};}
export function demoValues(sample,x,z,state,site){
 const p=sample(x,z),n=(Math.sin(x*.19+site.id*3)+Math.cos(z*.17-site.id)+2)/4;
 const thermal=Math.max(0,Math.min(1,p.slope/26*.65+p.featureMask*.35)); // same existing thermal shader proxy
 const dust={clear:.15,haze:.45,storm:.85,vortex:.65}[state.weatherPreset]??.15;
 const rough=Math.min(1,Math.abs(sample(x+.6,z).height-2*p.height+sample(x-.6,z).height)+Math.abs(sample(x,z+.6).height-2*p.height+sample(x,z-.6).height));
 return {topography:p.height,slope:p.slope,temperature:thermal,minerals:p.featureMask,ice:n,dust,obstacles:rough,traverse:0};
}
export const LEGENDS={topography:'Synthetic relative relief: −20 blue → 0 cyan → +20 yellow → +40 red model units; 2-unit contours. No measured altitude.',slope:'Existing model grade: <15° green · 15–20° amber · >20° red. Demo classes, not certified traversability.',temperature:'Existing shader thermal proxy: 0 violet → 1 pink. Unitless; no Kelvin or suit exposure inferred.',minerals:'Confirmed observations: no detections loaded. Derived interpretation: USGS geologic units, separate below. SIM distribution: feature mask 0 cyan → 1 gold; no species or probability.',ice:'SIM ice-likelihood illustration: 0 dark blue → 1 pale cyan. Unitless artificial pattern; no measured ice or depth.',dust:'SIM atmospheric scenario: clear .15 · haze .45 · vortex .65 · storm .85, beige → brown. Unitless; not measured tau or forecast.',traverse:'Cyan: active synthetic EVA route/waypoints · yellow: saved comparison route · magenta: synthetic science targets. NASA mission tracks remain external source references.',obstacles:'SIM terrain-curvature proxy: 0 dark → 1 red. Grid roughness illustration; no detected boulders, obstacle dimensions or safety guarantee.'};
export function compareRoute(points,sample,{speed=1,o2Rate=14,energyRate=300}={}){
 if(!Array.isArray(points)||points.length<2)return null;
 let distance=0,maxGrade=0,weightedGrade=0,roughDistance=0,ascent=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z)*24;if(!d)continue;
  const ah=sample(a.x,a.z).height*18,bh=sample(b.x,b.z).height*18,dh=bh-ah,grade=Math.atan2(Math.abs(dh),d)*180/Math.PI;
  const length=Math.hypot(d,dh),s=sample((a.x+b.x)/2,(a.z+b.z)/2);
  const rough=Math.abs(sample((a.x+b.x)/2+.6,(a.z+b.z)/2).height-2*s.height+sample((a.x+b.x)/2-.6,(a.z+b.z)/2).height)+Math.abs(sample((a.x+b.x)/2,(a.z+b.z)/2+.6).height-2*s.height+sample((a.x+b.x)/2,(a.z+b.z)/2-.6).height);
  distance+=length;weightedGrade+=grade*length;maxGrade=Math.max(maxGrade,grade);if(rough>.5)roughDistance+=length;ascent+=Math.max(0,dh);
 }
 if(!distance)return null;
 const hours=distance/Math.max(.1,speed)/3600*(1+weightedGrade/distance/30+roughDistance/distance*.5);
 return {distance,ascent,maxGrade,meanGrade:weightedGrade/distance,roughPercent:100*roughDistance/distance,hours,o2Percent:hours*o2Rate,energyKcal:hours*energyRate,source:'SIMULATED · local 24m horizontal / 18m vertical scale · not operational'};
}

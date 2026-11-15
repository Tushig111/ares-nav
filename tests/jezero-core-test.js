import { createTerrain, routeMetrics, planTerrainRoute } from '../js/jezero-terrain.js';

export async function runTests() {
  const checks = [], check = (name, value) => { checks.push({ name, pass: !!value }); if (!value) throw Error(name); };
  const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
  const meta = { n: 101, min: 0, max: 1000, lat0: 18, lon0: 77, kmPerDegLat: 60, kmPerDegLon: 57,
    bounds: { north: 18 + 1 / 60, south: 18 - 1 / 60, west: 77 - 1 / 57, east: 77 + 1 / 57 } };
  const raw = new Uint16Array(101 * 101), mask = new Uint8Array(raw.length).fill(1);
  const t = createTerrain(meta, raw.buffer, mask);
  check('Geographic origin is preserved', close(t.toGeo(0, 0).lat, 18) && close(t.toGeo(0, 0).lon, 77));
  const geo = t.toGeo(.25, -.6), back = t.fromGeo(geo.lat, geo.lon);
  check('Coordinate roundtrip with east/north signs', close(back.x, .25) && close(back.z, -.6) && geo.lat > 18 && geo.lon > 77);
  check('Physical grid spacing', close(t.width, 2) && close(t.depth, 2) && close(t.sampleSpacingX, .02));
  check('Flat terrain slope is zero', t.sample(0, 0).valid && t.sample(0, 0).slope === 0);
  check('Outside extent has no invented elevation', !t.sample(5, 0).valid && t.sample(5, 0).elevation === null);
  const m = routeMetrics([{ x: -.5, z: 0 }, { x: .5, z: 0 }], t, { speedKmh: 2, o2PerHour: 10 });
  check('Known 1km route and explicit consumption assumptions', close(m.distanceKm, 1) && close(m.hours, .5) && close(m.o2Percent, 5) && m.ascentM === 0);
  check('Zero length route has no useful metric', routeMetrics([{x:0,z:0},{x:0,z:0}], t) === null);
  check('Invalid speed is rejected', routeMetrics([{x:0,z:0},{x:.5,z:0}], t, {speedKmh:0}) === null);
  mask[50 * 101 + 50] = 0;
  check('Strict validity mask prevents interpolation across missing corner', !t.sample(.001, -.001).valid || !t.sample(.001, .001).valid);
  check('Route metrics reject nodata', routeMetrics([{x:0,z:0},{x:.5,z:0}],t) === null);
  check('Sparse route cannot cross missing terrain unnoticed', routeMetrics([{x:-.5,z:0},{x:.5,z:0}],t) === null);
  mask.fill(1);
  for (let r=0;r<101;r++)for(let c=0;c<101;c++)raw[r*101+c]=Math.round(c/100*65535);
  const incline=createTerrain(meta,raw.buffer,mask);
  check('True slope uses metres over kilometres', close(incline.sample(0,0).slope,Math.atan(.5)*180/Math.PI,.02));
  const ri=routeMetrics([{x:-.5,z:0},{x:.5,z:0}],incline);
  check('3D route distance and ascent use physical heights', close(ri.distanceKm,Math.sqrt(1.25),.001)&&close(ri.ascentM,500,.03));
  let rejected=false;try{await planTerrainRoute({x:0,z:0},{x:.5,z:0},incline);}catch{rejected=true;}
  check('Steeper-than-20-degree endpoint rejected',rejected);
  const flat={width:2,depth:2,xMin:-1,xMax:1,zMin:-1,zMax:1,sampleSpacingX:.02,sampleSpacingZ:.02,
    sample:(x,z)=>({valid:Math.abs(x)<=1&&Math.abs(z)<=1,elevation:0,slope:0})};
  const simple=await planTerrainRoute({x:-.5,z:0},{x:.5,z:0},flat);
  check('A* straight route on level terrain',close(simple.metrics.distanceKm,1,.0001));
  const barrier={...flat,sample:(x,z)=>({valid:Math.abs(x)<=1&&Math.abs(z)<=1&&!(Math.abs(x)<.1&&z<.4),elevation:0,slope:0})};
  const detour=await planTerrainRoute({x:-.5,z:0},{x:.5,z:0},barrier);
  check('A* detours around nodata obstacle',detour.points.some(p=>p.z>=.4)&&detour.metrics.distanceKm>1.2);
  check('All returned points remain on valid terrain',detour.points.every(p=>barrier.sample(p.x,p.z).valid));
  const wall={...flat,sample:(x,z)=>({valid:Math.abs(x)<=1&&Math.abs(z)<=1&&Math.abs(x)>.1,elevation:0,slope:0})};
  rejected=false;try{await planTerrainRoute({x:-.5,z:0},{x:.5,z:0},wall);}catch{rejected=true;}
  check('Disconnected coverage reports no route',rejected);
  return {passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
}

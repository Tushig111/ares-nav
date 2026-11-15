// East-positive planetocentric coordinates; radians are kept inside the math layer.
export const MARS = Object.freeze({ radius: 3389500, a: 3396190, b: 3376200, crs: 'urn:ogc:def:crs:IAU:2015:49900' });
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
export const wrapLongitude = lon => ((lon + 180) % 360 + 360) % 360 - 180;
export function validatePoint(p) {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90) throw new Error('Expected finite latitude [-90,90] and longitude');
  return { lat: p.lat, lon: wrapLongitude(p.lon) };
}
export function planetographicLatitude(lat) {
  if (Math.abs(lat) === 90) return lat;
  return deg(Math.atan((MARS.a / MARS.b) ** 2 * Math.tan(rad(lat))));
}
export function centralAngle(a, b) {
  a = validatePoint(a); b = validatePoint(b);
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
export const geodesicDistance = (a, b) => MARS.radius * centralAngle(a, b);
export const chordDistance = (a, b) => 2 * MARS.radius * Math.sin(centralAngle(a, b) / 2);
export function destination(p, bearing, meters) {
  p = validatePoint(p);
  const lat = rad(p.lat), lon = rad(p.lon), az = rad(bearing), d = meters / MARS.radius;
  const lat2 = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(az));
  const lon2 = lon + Math.atan2(Math.sin(az) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat2));
  return { lat: deg(lat2), lon: wrapLongitude(deg(lon2)) };
}
export function interpolate(a, b, t) {
  const av = unit(a), bv = unit(b), angle = centralAngle(a, b);
  if (Math.PI - angle < 1e-8) throw new Error('Antipodal segment has no unique shortest arc');
  if (angle < 1e-12) return validatePoint(a);
  const s = Math.sin(angle), x = av.map((v, i) => (Math.sin((1-t)*angle)*v + Math.sin(t*angle)*bv[i])/s);
  return { lat: deg(Math.atan2(x[2], Math.hypot(x[0],x[1]))), lon: wrapLongitude(deg(Math.atan2(x[1],x[0]))) };
}
function unit(p) { return [Math.cos(rad(p.lat))*Math.cos(rad(p.lon)), Math.cos(rad(p.lat))*Math.sin(rad(p.lon)), Math.sin(rad(p.lat))]; }
export function polygonArea(points) {
  if (points.length < 3) return 0;
  points.forEach(validatePoint);
  let excess = 0;
  for (let i=1;i<points.length-1;i++) {
    const a=centralAngle(points[i],points[i+1]), b=centralAngle(points[0],points[i+1]), c=centralAngle(points[0],points[i]);
    if (Math.max(a,b,c) > Math.PI-1e-8) throw new Error('Split antipodal polygon edges');
    const s=(a+b+c)/2;
    const e=4*Math.atan(Math.sqrt(Math.max(0,Math.tan(s/2)*Math.tan((s-a)/2)*Math.tan((s-b)/2)*Math.tan((s-c)/2))));
    const [u,v,w]=[unit(points[0]),unit(points[i]),unit(points[i+1])];
    const det=u[0]*(v[1]*w[2]-v[2]*w[1])-u[1]*(v[0]*w[2]-v[2]*w[0])+u[2]*(v[0]*w[1]-v[1]*w[0]);
    excess+=Math.sign(det)*e;
  }
  const full=4*Math.PI*MARS.radius**2;
  const area=Math.abs(excess)*MARS.radius**2%full;
  return Math.min(area,full-area);
}
export function pathMetrics(points, closed=false) {
  let surface=0,chord=0;
  const segments=[];
  const n=points.length>1 ? points.length-1+(closed?1:0) : 0;
  for(let i=0;i<n;i++) {
    const a=points[i],b=points[(i+1)%points.length],meters=geodesicDistance(a,b);
    surface+=meters;chord+=chordDistance(a,b);segments.push(meters);
  }
  return { surface, chord, segments, area:closed?polygonArea(points):0, terrainFollowing:null };
}
export async function terrainDistance(points, sampleElevation, samplesPerSegment=32) {
  if (!sampleElevation || points.length<2) return null;
  let distance=0;
  for(let i=1;i<points.length;i++) {
    let prev=points[i-1], h=await sampleElevation(prev);
    if(!Number.isFinite(h)) return null;
    for(let j=1;j<=samplesPerSegment;j++) {
      const next=interpolate(points[i-1],points[i],j/samplesPerSegment),nh=await sampleElevation(next);
      if(!Number.isFinite(nh))return null;
      distance+=Math.hypot(geodesicDistance(prev,next),nh-h);prev=next;h=nh;
    }
  }
  return distance;
}
export function toMarsGeoJSON(points, polygon=false) {
  const coordinates=points.map(p=>{const v=validatePoint(p);return [v.lon,v.lat];});
  if(polygon && coordinates.length<3)throw new Error('Polygon needs three vertices');
  if(!polygon && coordinates.length<2)throw new Error('Line needs two vertices');
  if(polygon)coordinates.push([...coordinates[0]]);
  return {type:'FeatureCollection',crs:{type:'name',properties:{name:MARS.crs}},marsReference:{...MARS,latitude:'planetocentric',longitude:'east-positive',note:'Planetary GeoJSON extension; not RFC 7946 Earth/WGS84'},features:[{type:'Feature',properties:{...pathMetrics(points,polygon),source:'derived on Mars mean sphere'},geometry:{type:polygon?'Polygon':'LineString',coordinates:polygon?[coordinates]:coordinates}}]};
}

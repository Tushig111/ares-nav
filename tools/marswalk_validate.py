#!/usr/bin/env python3
"""Validate Marswalk DEM derivation and build a conservative no-data mask.
Run from project root: python3 tools/marswalk_validate.py /path/to/Marswalk
Uses Python standard library only; leaves original rasters and terrain heights unchanged.
"""
import struct, math, json, array, pathlib, hashlib, sys
source=pathlib.Path(sys.argv[1])/'data/M20_JezeroCrater_CTXDEM_20m.tif'
b=source.read_bytes()
assert b[:4]==b'II*\x00','Expected little-endian classic TIFF'
off=struct.unpack_from('<I',b,4)[0];num=struct.unpack_from('<H',b,off)[0];tags={}
for i in range(num):
 p=off+2+i*12;t,typ,n,v=struct.unpack_from('<HHII',b,p)
 if typ not in [1,2,3,4,5,12]:continue
 size={1:1,2:1,3:2,4:4,5:8,12:8}[typ]*n;data=b[v:v+size] if size>4 else b[p+8:p+8+size]
 tags[t]=data if typ==2 else struct.unpack('<'+{1:'B',3:'H',4:'I',5:'Q',12:'d'}[typ]*n,data)
assert tags[259]==(1,) and tags[278]==(1,) and tags[339]==(3,) and tags[258]==(32,),'Unsupported TIFF layout'
w,h=tags[256][0],tags[257][0]
rows=[]
for off in tags[273]:
 a=array.array('f');a.frombytes(b[off:off+w*4])
 if sys.byteorder!='little':a.byteswap()
 rows.append(a)
keys=tags[34735];kv={}
for p in range(4,len(keys),4):
 key,loc,count,off=keys[p:p+4];kv[key]=off if loc==0 else tags[loc][off:off+count]
assert kv[3075]==17 and kv[3088]==(0.,) and kv[3089]==(0.,),'Expected zero-centered equirectangular'
radius,parallel=kv[2057][0],kv[3078][0]
root=pathlib.Path('data/marswalk');meta=json.loads((root/'terrain.json').read_text());raw=array.array('H');raw.frombytes((root/'terrain.bin').read_bytes())
if sys.byteorder!='little':raw.byteswap()
n=meta['n'];assert len(raw)==n*n
k=radius*math.pi/180;xs=math.cos(math.radians(parallel))*k
sx,sy=tags[33550][:2];ox,oy=tags[33922][3:5]
dl=(meta['bounds']['east']-meta['bounds']['west'])/(n-1);dp=(meta['bounds']['north']-meta['bounds']['south'])/(n-1)
dx=dl*xs/sx;dy=dp*k/sy;cols=[]
for c in range(n):
 x=((meta['bounds']['west']+dl*c)*xs-ox)/sx-.5
 cols.append([(j,max(0,1-abs(j-x)/dx)) for j in range(math.ceil(x-dx),math.floor(x+dx)+1)])
# GDAL bilinear downsampling widens the triangular filter by the source/destination pixel ratio.
mask=bytearray(n*n);errors=[];q=(meta['max']-meta['min'])/65535
for r in range(n):
 y=(oy-(meta['bounds']['north']-dp*r)*k)/sy-.5
 yw=[(i,max(0,1-abs(i-y)/dy)) for i in range(math.ceil(y-dy),math.floor(y+dy)+1)]
 for c in range(n):
  total=value=0.;valid=True
  for i,wy in yw:
   for j,wx in cols[c]:
    weight=wy*wx
    if weight<=1e-12:continue
    if i<0 or i>=h or j<0 or j>=w or not math.isfinite(rows[i][j]) or rows[i][j]<-1e10:
     valid=False;continue
    total+=weight;value+=rows[i][j]*weight
  if valid and total>0:
   mask[r*n+c]=1;errors.append(abs(meta['min']+raw[r*n+c]*q-value/total))
(root/'validity.bin').write_bytes(mask)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
tol=.03;over=sum(e>tol for e in errors)
report={'validationDate':'2026-11-15','sourceFile':source.name,'sourceSHA256':sha(source),'heightmapSHA256':sha(root/'terrain.bin'),'validitySHA256':sha(root/'validity.bin'),'dimensions':[n,n],'samples':n*n,'validSamples':len(errors),'excludedSamples':n*n-len(errors),'maskConvention':'Unsigned uint8, 1 valid, 0 unavailable; row-major north-to-south, west-to-east; every contributing source pixel must be valid','projection':{'type':'equirectangular','sphereRadiusM':radius,'standardParallelDeg':parallel,'centralLongitudeDeg':0,'latitudeOriginDeg':0,'positiveLongitude':'east','latitude':'planetocentric'},'nativePixelSizeM':20,'sourceGridSpacingM':{'x':dx*sx,'y':dy*sy},'marswalkApproximateLocalSpacingM':40400/(n-1),'reconstruction':'Separable scale-aware bilinear downsampling from original source pixel centers; no synthetic fill in validity mask','heightQuantizationStepM':q,'validationToleranceM':tol,'meanAbsoluteDifferenceM':sum(errors)/len(errors),'rootMeanSquaredDifferenceM':math.sqrt(sum(e*e for e in errors)/len(errors)),'maxAbsoluteDifferenceM':max(errors),'samplesAboveTolerance':over,'passed':over==0,'caveat':'Numerical agreement checks derivation, not absolute accuracy of the source DEM. Instrument and registration uncertainties remain.'}
(root/'terrain-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if over:raise SystemExit('Height reconstruction exceeded tolerance')

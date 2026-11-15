import json,urllib.request,urllib.parse,pathlib,time
root=pathlib.Path(__file__).resolve().parents[1]/'data';base='https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Tanaka_et_al_2014_Mars_Global_Map_Features/FeatureServer'
wkt='GEOGCS["GCS_Mars_2000_Sphere",DATUM["D_Mars_2000_Sphere",SPHEROID["Mars_2000_Sphere",3396190.0,0.0]],PRIMEM["Reference_Meridian",0.0],UNIT["Degree",0.0174532925199433]]'
def get(url):
 for attempt in range(3):
  try:
   j=json.load(urllib.request.urlopen(url,timeout=60))
   if 'error' in j:raise RuntimeError(j['error'])
   return j
  except Exception:
   if attempt==2:raise
   time.sleep(2)
for i,name in [(1,'contacts'),(2,'structures'),(3,'units')]:
 meta=get(f'{base}/{i}?f=json');features=[];offset=0
 while True:
  q=urllib.parse.urlencode(dict(where='1=1',outFields='*',returnGeometry='true',outSR=json.dumps({'wkt':wkt}),maxAllowableOffset=.03,geometryPrecision=4,resultOffset=offset,resultRecordCount=1000,orderByFields='OBJECTID',f='json'))
  j=get(f'{base}/{i}/query?{q}');features+=j['features'];print(name,offset,len(j['features']),flush=True)
  if not j.get('exceededTransferLimit'):break
  offset+=len(j['features'])
  if not j['features']:raise RuntimeError('Empty incomplete page')
 data=dict(name=name,source=f'{base}/{i}',publication='https://doi.org/10.3133/sim3292',retrieved='2026-11-15',scale=20000000,processing='Server-reprojected to Mars 2000 sphere geographic degrees; generalized 0.03 degree for regional visualization; not survey precision.',spatialReference=j['spatialReference'],renderer=meta['drawingInfo']['renderer'],features=features)
 (root/f'usgs-{name}.json').write_text(json.dumps(data,separators=(',',':')))

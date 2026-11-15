// Scientific availability is explicit. Source links do not masquerade as raster toggles.
export async function createScienceLayerLibrary(api,host){
 const section=document.createElement('section');section.className='science-layer-library';section.innerHTML='<h3>8 Mars science categories</h3><p>Official sources, display availability and decision limits. Resolution and coverage vary by product. NASA/ESA mission data do not imply agency approval of this app.</p><output role="status">Loading source manifest…</output>';host.prepend(section);
 const status=section.querySelector('output');
 const link=(parent,label,url)=>{const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener';parent.append(a);};
 try{
  const response=await fetch(new URL('../data/mars-eight-layers.json',import.meta.url));if(!response.ok)throw Error('HTTP '+response.status);const manifest=await response.json();
  for(const [i,item]of manifest.layers.entries()){
   const card=document.createElement('details');card.dataset.scienceCategory=item.id;const summary=document.createElement('summary');summary.textContent=`${i+1}. ${item.name}`;card.append(summary);
   for(const [label,value]of [['Source',item.origin],['Resolution / coverage',item.resolution],['In this build',item.availability],['Decision limits',item.decisionLimit]]){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+': ';p.append(b,document.createTextNode(value));card.append(p);}
   link(card,'Open official source ↗',item.sourceURL);
   if(item.id==='traverse')link(card,'Perseverance location map ↗','https://science.nasa.gov/mission/mars-2020-perseverance/location-map/');
   if(item.id==='topography'){const b=document.createElement('button');b.textContent='Display MOLA hillshade · image only';b.onclick=()=>{api.ensureOrbital();api.tiles.setLayer('topography');api.syncLayer?.('topography');status.textContent='MOLA hillshade active. No numerical altitude, contours or DEM slope is inferred from image colors.';};card.append(b);}
   if(['slope','obstacles','traverse'].includes(item.id)){const b=document.createElement('button');b.textContent='Open synthetic route / A* demo';b.onclick=()=>{window.setMode('hybrid');window.toggleDrawer('route');status.textContent='Synthetic terrain / A* demonstration opened. Official observations are not inputs to this route.';};card.append(b);}
   section.append(card);
  }
  const sources=document.createElement('details'),summary=document.createElement('summary');summary.textContent='NASA Trek regional slope product metadata';sources.append(summary);section.append(sources);
  const catalogResponse=await fetch(new URL('../data/mars-layer-catalog.json',import.meta.url));if(catalogResponse.ok){const products=await catalogResponse.json();for(const p of products.filter(p=>p.productLabel.startsWith('CTX_ClrSlope_'))){link(sources,p.title+' ↗','https://trek.nasa.gov/mars/TrekWS/rest/cat/metadata/fgdc/html?label='+encodeURIComponent(p.productLabel));}}
  status.textContent='8 categories · 1 available hillshade display · 7 source-access categories. Numerical DEM, temperature, spectral, ice, opacity and obstacle rasters require integration and validation.';
 }catch(error){status.textContent='Source library could not load: '+error.message+'. Existing imagery and USGS geology controls remain available.';}
}

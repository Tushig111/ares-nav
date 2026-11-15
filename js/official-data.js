// DONKI is a space-weather event catalog, not a Mars surface weather service.
export async function fetchDonkiCatalog(fetcher = fetch, now = new Date()) {
 const endDate=now.toISOString().slice(0,10),startDate=new Date(now.getTime()-30*86400000).toISOString().slice(0,10);
 const source=`https://api.nasa.gov/DONKI/SEP?api_key=DEMO_KEY&startDate=${startDate}&endDate=${endDate}`;
 const base={source,startDate,endDate,retrievedAt:new Date().toISOString(),scope:'DONKI SEP event catalog; not a Mars-local alert, dose or weather measurement'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try {
  const response=await fetcher(source,{signal:controller.signal});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const events=await response.json();
  if(!Array.isArray(events)||events.some(e=>typeof e.sepID!=='string'||!Number.isFinite(Date.parse(e.eventTime))))throw new Error('Invalid DONKI SEP schema');
  events.sort((a,b)=>Date.parse(a.eventTime)-Date.parse(b.eventTime));
  return {...base,status:'RETRIEVED',eventCount:events.length,latestTime:events.at(-1)?.eventTime??null,events};
 } catch(error) { return {...base,status:'UNAVAILABLE',reason:error.message,eventCount:null,latestTime:null,events:[]}; }
 finally {clearTimeout(timer);}
}
export function installProvenance(getSite,getDonki) {
 const banner=document.createElement('button');banner.id='scientific-provenance';banner.textContent='DATA: official archive imagery · terrain / weather / spectra / EVA = SIMULATION ⓘ';
 banner.style.cssText='position:fixed;bottom:5px;left:50%;transform:translateX(-50%);z-index:10010;max-width:95vw;background:#07131eed;color:#f9d49a;border:1px solid #b68240;border-radius:8px;padding:7px 12px;font:11px system-ui;cursor:pointer';document.body.append(banner);
 const panel=document.createElement('dialog');panel.style.cssText='background:#101820;color:#eee;border:1px solid #687c8a;border-radius:12px;max-width:700px;max-height:80vh;overflow:auto;padding:24px;font:14px/1.6 system-ui';document.body.append(panel);
 function render() {
  const site=getSite(),donki=getDonki();panel.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Scientific provenance — ARES-NAV';panel.append(heading);
  const close=document.createElement('button');close.textContent='Close';close.onclick=()=>panel.close();panel.append(close);
  function paragraph(text){const p=document.createElement('p');p.textContent=text;panel.append(p);}
  function link(label,url){const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener';a.style.cssText='display:block;color:#83d8ff';panel.append(a);}
  paragraph('Observed imagery: Viking color, CTX and MOLA shaded-relief images use NASA Mars Trek WMTS sources. CTX is an external ArcGIS hostname explicitly advertised by NASA WMTS metadata. MOLA hillshade supplies pixels only; no numeric DEM is ingested. Historical images are not live maps. An unavailable tile retains its last available parent image.');
  link('WMTS source validation (metadata, matrices and archive image checks)','./data/source-validation.json');
  paragraph('SIMULATION: local terrain/elevation/slope, waypoints, mineral curves/overlays, thermal inertia, weather including pressure/tau, radiation/dose, shelter/shielding, astronaut physiology, neural survival scores and moving orbiters. None are calibrated measurements or operational advice. Geodesic tools measure the selected geometry, not terrain-following distances. Procedural previews remain labeled when image loading fails.');
  paragraph(site.name+': '+site.provenance.anchorNote);link('Regional mapping / anchor reference',site.provenance.mappingReference);
  paragraph(site.provenance.bandsNote);link('CRISM product and coordinate-system documentation',site.provenance.spectralReference);
  link('USGS planetary geologic mapping protocol (2022)','https://pubs.usgs.gov/tm/11/b13/tm11b13.pdf');
  paragraph('REMS / MEDA: reference archives only. No observation table is loaded and no model calibration is claimed. Historical MEDA example: JPL reports 718 Pa during the first weather collection on February 19, 2021. This is a dated observation, not the displayed scenario pressure.');
  link('NASA/JPL historical MEDA report','https://www.jpl.nasa.gov/news/nasas-first-weather-report-from-jezero-crater-on-mars/');
  link('Curiosity REMS PDS archive','https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MSL-M-REMS-5-MODRDR-V1.0');
  link('Perseverance MEDA PDS bundle','https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Amars2020_meda&version=1.0');
  paragraph(`DONKI: ${donki.status}. ${donki.eventCount===null?'Event count unknown; unavailable does not mean zero events.':donki.eventCount+' catalog events returned.'} Retrieval: ${donki.retrievedAt||'not yet checked'}. Window: ${donki.startDate||'—'} to ${donki.endDate||'—'}. The manual SEP toggle is a synthetic scenario and never changes in response to this catalog.`);
  if(donki.source)link('Requested official DONKI SEP catalog',donki.source);
  for(const event of (donki.events||[]).slice(-5).reverse())paragraph(`${event.sepID} · ${event.eventTime}`);
  link('DONKI documentation','https://ccmc.gsfc.nasa.gov/tools/DONKI/');
  paragraph('Photojournal products are processed archive images, not raw PDS records. No raw-product cross-identification is asserted. Each photograph links its actual NASA catalog; raw galleries are separate collections. PIA26231 is the HiRISE overhead traverse map “1,000 Days of Perseverance”, not a Mastcam-Z surface panorama.');
  for(const photo of site.nasaPhotos)link(photo.pia+' — '+photo.caption.split('. ')[0],photo.sourceURL);
 }
 banner.onclick=()=>{render();panel.showModal();};document.addEventListener('donki-catalog',()=>{if(panel.open)render();});
 // Persistent labels survive scenario updates without altering numeric/model behavior.
 for(const id of ['wx-temp','wx-pressure','wx-tau','m-rad','m-o2','spectral-panel','visor-hud']) {const el=document.getElementById(id);if(el){el.title='SIMULATED — not a live NASA measurement';el.dataset.provenance='simulation';}}
}

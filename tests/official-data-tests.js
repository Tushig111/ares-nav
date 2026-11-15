import { fetchDonkiCatalog } from '../js/official-data.js';
export async function runOfficialDataTests() {
 const results=[],now=new Date('2026-11-15T00:00:00Z');
 async function test(name,fn){try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}}
 const assert=x=>{if(!x)throw new Error('Assertion failed');};
 await test('Empty valid catalog means zero returned events',async()=>{const r=await fetchDonkiCatalog(async()=>({ok:true,json:async()=>[]}),now);assert(r.status==='RETRIEVED'&&r.eventCount===0&&r.startDate==='2026-10-16');});
 await test('Rate limiting means unknown count, never zero',async()=>{const r=await fetchDonkiCatalog(async()=>({ok:false,status:429}),now);assert(r.status==='UNAVAILABLE'&&r.eventCount===null);});
 await test('Malformed API payload is handled',async()=>{const r=await fetchDonkiCatalog(async()=>({ok:true,json:async()=>({error:'limit'})}),now);assert(r.status==='UNAVAILABLE');});
 await test('Latest event is determined chronologically',async()=>{const events=[{sepID:'new',eventTime:'2026-11-14T00:00Z'},{sepID:'old',eventTime:'2026-11-01T00:00Z'}];const r=await fetchDonkiCatalog(async()=>({ok:true,json:async()=>events}),now);assert(r.latestTime==='2026-11-14T00:00Z'&&r.eventCount===2);});
 await test('Network failure is caught',async()=>{const r=await fetchDonkiCatalog(async()=>{throw new Error('offline');},now);assert(r.status==='UNAVAILABLE'&&r.eventCount===null);});
 return results;
}

// Hand-authored weights: an illustrative forward pass, not a trained/validated model.
export const ACTIONS=['CONTINUE_EVA','SHELTER_BEHIND_RIDGE','SPRINT_NEAREST_HABITAT','LOW_SLOPE_HOLD'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function neuralRisk(input) {
  const x=[1-input.o2/100,(input.heartRate-60)/120,(input.coreTemp-36)/4,input.slope/45,input.radiation/5,input.hazard=== 'nominal'?0:1,Math.abs(input.pressure-4.3)/4.3,input.gravity/.38];
  const weights=[[1.5,.5,.7,.6,.9,1.2,.8,.1],[.5,.7,.5,1.2,.5,.8,1,.1],[1.2,.2,.9,.3,1.4,1,.6,.1],[.4,1,.6,.9,.5,.6,1,.1]];
  const hidden=weights.map(w=>Math.tanh(w.reduce((sum,v,i)=>sum+v*clamp(x[i],-2,3),-.8)));
  const logit=hidden.reduce((sum,v,i)=>sum+v*[1,.8,1.1,.6][i],-1.4);
  return clamp(100/(1+Math.exp(-logit)),0,100);
}
export function traversalEnergy(points,{massKg=150,gravity=.38*9.80665}={}) {
  let kJ=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],horizontal=Math.hypot(b.x-a.x,b.z-a.z),rise=b.y-a.y;
    // 0.35 kJ/m demonstration metabolic coefficient plus uphill work/25% efficiency.
    kJ+=Math.hypot(horizontal,rise)*.35+Math.max(0,rise)*massKg*gravity/.25/1000;
  }
  return kJ;
}
export function decideSurvival(input) {
  const risk=neuralRisk(input),danger=input.hazard!=='nominal';
  let action='CONTINUE_EVA';
  if(input.slope>20)action='LOW_SLOPE_HOLD';
  else if(danger){action=input.energyKJ<50&&input.o2>25&&input.predictedDose<1?'SPRINT_NEAREST_HABITAT':'SHELTER_BEHIND_RIDGE';}
  return {risk,action,energyKJ:input.energyKJ,label:'Synthetic Neural Risk Simulation'};
}
export function createSurvivalEngine(api,host){
  let enabled=false,hazard='nominal',random=false,timer=0,hazardTimer=0,lastAction='',saved=null,energySpent=0,lastPosition=null;
  const output=host.querySelector('[data-survival-output]');
  host.querySelector('[data-survival-enable]').onchange=e=>{enabled=e.target.checked;if(enabled){saved=api.saveRoute();lastPosition=null;lastAction='';energySpent=0;}else{api.restoreRoute(saved);saved=null;lastPosition=null;lastAction='';output.textContent='Off. Original route, weather and speed restored.';}};
  host.querySelector('[data-hazard]').onchange=e=>{hazard=e.target.value;lastAction='';};
  host.querySelector('[data-random-hazards]').onchange=e=>{random=e.target.checked;};
  function update(dt){
    if(!enabled||api.isOrbital())return;
    timer+=dt;hazardTimer+=dt;
    if(random&&hazardTimer>25){hazardTimer=0;hazard=['nominal','sep','dust','vortex'][Math.floor(Math.random()*4)];host.querySelector('[data-hazard]').value=hazard;lastAction='';}
    if(timer<1)return;timer=0;
    const sample=api.sample();
    if(lastPosition)energySpent+=traversalEnergy([lastPosition,sample.position]);lastPosition={...sample.position};
    const path=api.pathToHabitat();const energyKJ=traversalEnergy(path);
    const input={...sample,pressure:4.3,gravity:.38,hazard,energyKJ,radiation:hazard==='sep'?4.5:sample.radiation,predictedDose:hazard==='sep'?energyKJ/50:0};
    const result=decideSurvival(input);
    if(result.action!==lastAction){lastAction=result.action;api.act(result.action,{hazard,path});}
    output.textContent=`${result.label}\nUncalibrated risk score: ${result.risk.toFixed(1)}%\n${result.action}\nTransit energy to demo HAB-01: ${energyKJ.toFixed(1)} kJ\nAccumulated movement energy: ${energySpent.toFixed(1)} kJ\nO₂ ${sample.o2.toFixed(0)}% · HR ${sample.heartRate.toFixed(0)} bpm · core ${sample.coreTemp.toFixed(1)} °C\nSlope ${sample.slope.toFixed(1)}° (procedural, not MOLA)\nPressure 4.3 psi · gravity 0.38g\n${hazard==='sep'?'Ridge shielding against SEP is NOT established. Demo decisions only.':'All physiology, shelter, energy and dose limits are synthetic.'}`;
  }
  return {update,get enabled(){return enabled;},resetSite(){if(enabled){saved=api.saveRoute();lastPosition=null;lastAction='';energySpent=0;}}};
}

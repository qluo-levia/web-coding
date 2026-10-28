// Authored semantic simulation. Positions and frequencies are stable, not embeddings.
const definitions={
 cold:{density:43,importance:1.0,clusters:[
 ['TEMPERATURE',[-.25,1.05,0],.96,['icy','freezing','cool','winter']],
 ['COLOR',[.6,.38,.12],.73,['blue','gray','desaturated','pale']],
 ['EMOTION',[-.5,.04,.45],.49,['emotionally distant','lonely','detached','unfriendly']],
 ['MATERIAL',[.3,-.63,-.4],.38,['metallic','glass','steel','concrete']],
 ['LIGHT',[.4,1.1,-.5],.59,['fluorescent','blue light','low warmth']],
 ['ATMOSPHERE',[-.65,-.92,0],.28,['sterile','empty','quiet','clinical']],
 ['SMELL',[.15,-1.4,.1],.1,['metallic scent','clean scent','sharp scent','odorless']],
 ['TOUCH',[.72,-.85,.42],.24,['smooth','hard','cool surface']]],defaults:[['cool',50],['blue',30],['metallic',20]]},
 futuristic:{density:35,importance:.95,clusters:[
 ['ARCHITECTURE',[-.25,.9,.2],.82,['minimal architecture','clean geometry','modular space','open plan']],
 ['TECHNOLOGY',[.45,.3,-.25],.94,['high-tech','automated','intelligent systems','digital interfaces']],
 ['MATERIAL',[-.45,-.18,.5],.64,['advanced materials','chrome','translucent surfaces','composite structures']],
 ['TIME',[.35,-.95,.1],.27,['distant future','near future','timeless']],
 ['ATMOSPHERE',[-.5,-.72,-.4],.4,['utopian','unfamiliar','post-human','quiet precision']],
 ['FORM',[.6,.8,-.3],.51,['organic form','streamlined','weightless','sculptural']]],defaults:[['high-tech',55],['chrome',30],['digital interfaces',15]]},
 soft:{density:28,importance:.8,clusters:[
 ['TEXTURE',[-.32,.65,0],.93,['tactile fabric','plush upholstery','velvet','cushioned']],
 ['FORM',[.5,.2,.3],.65,['rounded shape','gentle curves','pillowy volume','fluid edges']],
 ['LIGHT',[-.35,-.5,.2],.43,['diffused light','warm glow','subtle shadows']],
 ['EMOTION',[.3,-.7,-.2],.24,['comforting','gentle','intimate','vulnerable']],
 ['SOUND',[-.55,.15,-.4],.12,['muted sound','quiet acoustics','a whisper']]],defaults:[['plush upholstery',65],['cushioned',25],['rounded shape',10]]}
};
export const palette=['#6575ba','#69a2c2','#83b7af','#a9bf88','#dbcf79','#dfa066','#dc745a'];
export const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export function assignVisualFrequency(items){const ranked=[...items].sort((a,b)=>b.pop-a.pop);ranked.forEach((n,i)=>{n.frequency=n.pop;n.pop=ranked.length<2?1:1-i/(ranked.length-1)});return items}
// AI supplies meanings; deterministic coordinates are a visual model, not embeddings.
export function registerAnalysis(result){
 return result.words.map(entry=>{
  const word=entry.word;
  const clusters=entry.clusters.map((c,k)=>{
   const angle=k*2.399, pos=[Math.cos(angle)*(.4+(k%3)*.15),1.3-k*2.6/Math.max(1,entry.clusters.length-1),Math.sin(angle)*.5];
   return {name:c.name.toUpperCase(),pos,pop:.5,meanings:c.meanings.map((m,i)=>{const a=i*2.399+k, radius=.13+Math.sqrt(i+1)*.095;return {id:`${word}-${k}-${i}`,label:m.label,cluster:k,pop:m.pop,importance:1,pos:[pos[0]+Math.cos(a)*radius,pos[1]+Math.sin(a*.7)*radius,pos[2]+Math.sin(a)*radius]}})};
  });
  const meanings=clusters.flatMap(c=>c.meanings);
  const rawPops=meanings.map(n=>Math.max(.02,Math.min(.98,n.pop)));
  const rawTotal=rawPops.reduce((s,p)=>s+p,0)||1;
  const normalized=rawPops.map(p=>p/rawTotal);
  const entropy=-normalized.reduce((s,p)=>s+p*Math.log(p),0)/Math.log(Math.max(2,normalized.length));
  const peak=Math.max(...rawPops), tail=rawPops.filter(p=>p<peak*.55).length/Math.max(1,rawPops.length);
  const maxDistance=Math.max(.01,...meanings.flatMap(a=>meanings.map(b=>distance(a.pos,b.pos))));
  // Keep raw AI estimates in frequency; use relative rank only for the seven-color display.
  assignVisualFrequency(meanings);
  const primary=meanings.find(n=>n.label===entry.defaultMeaning)||[...meanings].sort((a,b)=>b.pop-a.pop)[0];
  const defaults=[primary,...meanings.filter(n=>n.cluster===primary.cluster&&n.id!==primary.id).sort((a,b)=>b.pop-a.pop).slice(0,2)].map((n,i)=>({...n,weight:[55,30,15][i]}));
  const spread=Math.min(1,Math.max(.05,(entropy*.58+tail*.22+clusters.length/6*.2)));
  const ambiguity=Math.round(Math.max(28,Math.min(96,100*(.22+entropy*.48+tail*.2+Math.min(1,clusters.length/6)*.1))));
  dataset[word]={word,clusters,meanings,defaults,defaultCenter:centroid(defaults),maxDistance,spread,ambiguity,importance:1,reason:entry.reason,source:'ai'};
  return word;
 });
}
export function centroid(items){let total=items.reduce((s,n)=>s+n.weight,0);return [0,1,2].map(i=>items.reduce((s,n)=>s+n.pos[i]*n.weight,0)/(total||1))}
export const dataset=Object.fromEntries(Object.entries(definitions).map(([word,d])=>{
 let clusters=d.clusters.map(([name,pos,pop,labels],k)=>({name,pos,pop,meanings:labels.map((label,i)=>({id:`${word}-${k}-${i}`,label,cluster:k,pop:Math.max(.02,Math.min(.99,pop-(i*.047))),pos:[pos[0]+Math.cos(i*2.1+k)*.12,pos[1]+Math.sin(i*2.4+k)*.12,pos[2]+Math.sin(i*1.8)*.1],importance:1-i*.08}))}));
 let meanings=clusters.flatMap(c=>c.meanings);assignVisualFrequency(meanings);let maxDistance=Math.max(...meanings.flatMap(a=>meanings.map(b=>distance(a.pos,b.pos))));let spread=Math.min(1,maxDistance/3.5);let ambiguity=Math.round(100*Math.min(.95,.45*(clusters.length/8)+.4*spread+.15*(meanings.length/32)));
 let defaults=d.defaults.map(([label,weight])=>({...meanings.find(n=>n.label===label),weight}));
 return [word,{word,...d,clusters,meanings,defaults,defaultCenter:centroid(defaults),maxDistance,spread,ambiguity}];
}));
export function measure(word,selection){let d=dataset[word],items=selection.map(s=>({...d.meanings.find(n=>n.id===s.id),weight:s.weight}));let center=centroid(items);let rawDistance=distance(center,d.defaultCenter);return {word,center,defaultCenter:d.defaultCenter,rawDistance,divergence:Math.round(rawDistance/d.maxDistance*100),influence:d.ambiguity*d.importance,items};}
export function reportData(words,selections){let measures=words.map(w=>measure(w,selections[w]));return{measures,total:Math.round(measures.reduce((s,m)=>s+m.divergence*m.influence,0)/measures.reduce((s,m)=>s+m.influence,0))}}

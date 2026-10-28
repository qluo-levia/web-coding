import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dataset,registerAnalysis,palette} from './dist/data.js';
const source=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
const classSource=source.slice(source.indexOf('class SemanticScene{'),source.indexOf("// Moka flow:"));
const colorIndex=p=>Math.min(6,Math.floor(Math.max(0,p)*7));
const Scene=new Function('colors','colorIndex','dataset',classSource+';return SemanticScene;')(palette,colorIndex,dataset);
registerAnalysis({words:[{word:'test',reason:'test',defaultMeaning:'meaning 0-0',clusters:Array.from({length:5},(_,k)=>({name:'region '+k,meanings:Array.from({length:10},(_,i)=>({label:`meaning ${k}-${i}`,pop:k===0&&i===0?.9:.02+(k*10+i)*.001}))}))}]});
for(const personal of [false,true]){
 const s=Object.create(Scene.prototype);Object.assign(s,{data:dataset.test,options:{personal,selectionStage:!personal,selected:['test-0-0','test-4-9']},nodes:[],lines:[],center:[0,0,0],pan:[0,0],angle:-.3,tilt:.12,zoom:1,w:900,h:650});
 s.build();s.fitView();
 assert.equal(new Set(s.nodes.map(n=>colorIndex(n.pop))).size,7,'all seven frequency colors');
 const span=axis=>Math.max(...s.nodes.map(n=>n[axis]))-Math.min(...s.nodes.map(n=>n[axis]));
 assert.ok(span('y')>span('x')*1.8&&span('y')>span('z')*1.8,'tall volume');
 const points=s.nodes.map(n=>s.project(n));
 const bounds=axis=>[Math.min(...points.map(p=>p[axis])),Math.max(...points.map(p=>p[axis]))];
 const [left,right]=bounds('x'),[top,bottom]=bounds('y');
 assert.ok(Math.abs((left+right)/2-s.w*.5)<1,'horizontally centered');
 assert.ok(top>30&&bottom<s.h-30,'fully within frame');
 const warm=s.nodes.filter(n=>colorIndex(n.pop)===6),cold=s.nodes.filter(n=>colorIndex(n.pop)===0);
 assert.ok(Math.min(...warm.map(n=>n.y))>Math.max(...cold.map(n=>n.y)),'warm top and cool bottom');
 assert.ok(s.options.selected.every(id=>s.nodes.some(n=>n.id===id)),'selected nodes preserved');
 console.log(personal?'Personal model':'Selection model',s.nodes.length+' nodes',s.lines.length+' lines','7 colors, tall, centered, fully visible');
}

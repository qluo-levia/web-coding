import assert from 'node:assert/strict';
import {dataset,measure,reportData} from './dist/data.js';
for(const [w,d] of Object.entries(dataset)){
 const exact=d.defaults.map(n=>({id:n.id,weight:n.weight}));assert.equal(measure(w,exact).divergence,0);
 const alternate=d.meanings.slice(-3).map((n,i)=>({id:n.id,weight:i===2?34:33}));let m=measure(w,alternate);assert.ok(m.divergence>0&&m.divergence<=100);assert.ok(m.center.every(Number.isFinite));assert.deepEqual(measure(w,alternate),m);
}
const choices=Object.fromEntries(Object.entries(dataset).map(([w,d])=>[w,d.meanings.slice(-3).map((n,i)=>({id:n.id,weight:i===2?34:33}))]));let r=reportData(Object.keys(dataset),choices);assert.ok(r.total>=Math.min(...r.measures.map(m=>m.divergence))&&r.total<=Math.max(...r.measures.map(m=>m.divergence)));console.log('Verified: default centers give zero divergence, alternate choices change the distances, results are deterministic, and the weighted total is bounded.');

import {analysisView,analysisDetail,mountAnalysisMotion} from './analysis.js?v=moka-1';
import {dataset,centroid,reportData,registerAnalysis,palette} from './data.js?v=20261010-25';
const app=document.querySelector('#app');
const colors=palette;
const colorIndex=p=>Math.min(6,Math.floor(Math.max(0,p)*7));
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let scene=null;
let state={prompt:'',words:[],selections:{},saved:{},word:null,focus:null};
function spotLabel(label){const words=label.replace(/[_:]/g,' ').split(/\s+(?:or|and|through|with)\s+/i)[0].match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[];const stop=new Set(['a','an','the','of','to','in','for','is','as','being','relating','pertaining','having','sense','feeling']);return words.filter(w=>!stop.has(w.toLowerCase())).slice(0,2).join(' ')||words.slice(0,2).join(' ');}
class SemanticScene{
 constructor(canvas, data=null, options={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.data=data;this.options={reduceMotion:reducedMotion,...options};this.angle=-.3;this.tilt=.12;this.zoom=this.options.overview?.7:1;this.center=[0,0,0];this.cameraMove=null;this.labelHits=[];this.pan=[0,0];this.nodes=[];this.lines=[];this.start=performance.now();this.build();this.resize=new ResizeObserver(()=>{let r=canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;canvas.width=r.width*devicePixelRatio;canvas.height=r.height*devicePixelRatio;this.ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);if(!this.options.overview&&!this.viewInteracted)this.fitView();});this.resize.observe(canvas);this.down=null;canvas.onpointerdown=e=>{this.viewInteracted=true;this.cameraMove=null;canvas.setPointerCapture(e.pointerId);this.down={x:e.clientX,y:e.clientY,total:0,pan:e.shiftKey||e.button===2}};canvas.onpointermove=e=>{if(this.down){let dx=e.clientX-this.down.x,dy=e.clientY-this.down.y;this.down.total+=Math.abs(dx)+Math.abs(dy);if(this.down.pan){this.pan[0]+=dx;this.pan[1]+=dy}else{this.angle+=dx*.007;this.tilt+=dy*.006}this.down.x=e.clientX;this.down.y=e.clientY}else{let n=this.pick(e);canvas.style.cursor=n||this.pickLabel(e)?'pointer':'grab';this.hover=n}};canvas.onpointerup=e=>{if(this.down?.total<6){let label=this.pickLabel(e);if(label)this.options.onRegion?.(label.cluster);else{let n=this.pick(e);if(n)this.options.onPick?.(n)}}this.down=null};canvas.oncontextmenu=e=>e.preventDefault();canvas.ondblclick=()=>this.adjustZoom(this.zoom<2?2.4:1);canvas.onpointercancel=()=>{this.down=null};canvas.onwheel=e=>{if(this.options.canZoom&&!this.options.canZoom())return;if(this.options.scrollPage&&!e.ctrlKey&&!e.metaKey)return;e.preventDefault();this.adjustZoom(this.zoom*Math.exp(-e.deltaY*.001))};canvas.addEventListener('wheel',canvas.onwheel,{passive:false});canvas.tabIndex=0;canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')this.angle-=.12;if(e.key==='ArrowRight')this.angle+=.12;if(e.key==='ArrowUp')this.tilt-=.12;if(e.key==='ArrowDown')this.tilt+=.12;if(e.key==='+')this.adjustZoom(this.zoom+.2);if(e.key==='-')this.adjustZoom(this.zoom-.2)};this.frame=requestAnimationFrame(t=>this.draw(t))}
 build(){
 const clusters=this.data?.clusters||dataset.cold.clusters;
 clusters.forEach((c,k)=>c.meanings.forEach((meaning,i)=>this.nodes.push({x:meaning.pos[0],y:meaning.pos[1],z:meaning.pos[2],cluster:k,pop:meaning.pop,r:3.5+meaning.pop*4,meaning,label:meaning.label,id:meaning.id,seed:k*99+i})));
 if(this.options.selectionStage){const protectedIds=new Set(this.options.selected||[]);colors.forEach((_,band)=>{const n=this.nodes.find(n=>colorIndex(n.pop)===band);if(n)protectedIds.add(n.id);});clusters.forEach((_,k)=>{const n=this.nodes.find(n=>n.cluster===k);if(n)protectedIds.add(n.id);});const candidates=this.nodes.filter(n=>!protectedIds.has(n.id)),count=Math.min(candidates.length,Math.round(this.nodes.length*.424)),removed=new Set(Array.from({length:count},(_,i)=>candidates[Math.floor((i+.5)*candidates.length/count)].id));this.nodes=this.nodes.filter(n=>!removed.has(n.id));}
 // The personal portrait keeps a small frequency scaffold around the chosen meanings.
 if(this.options.personal){const selected=new Set(this.options.selected);const keep=new Set(this.nodes.filter(n=>selected.has(n.id)));colors.forEach((_,band)=>{const candidates=this.nodes.filter(n=>colorIndex(n.pop)===band&&!selected.has(n.id));for(let i=0;i<Math.min(6,candidates.length);i++)keep.add(candidates[Math.floor(i*candidates.length/Math.min(6,candidates.length))]);});const target=Math.min(this.nodes.length,Math.round(keep.size*1.15));const remaining=colors.map((_,band)=>this.nodes.filter(n=>colorIndex(n.pop)===band&&!keep.has(n)));for(let i=0;keep.size<target;i++){const bucket=remaining[i%colors.length];if(bucket.length)keep.add(bucket.shift());}this.nodes=this.nodes.filter(n=>keep.has(n));}
 // Keep frequency bands spatially distinct without changing semantic measurement coordinates.
 const bands=colors.map((_,band)=>this.nodes.filter(n=>colorIndex(n.pop)===band));
 if(this.options.overview){
  bands.forEach((nodes,band)=>nodes.forEach((n,i)=>{const angle=i*2.399963+band*.7,vertical=nodes.length===1?0:1-2*(i+.5)/nodes.length,ring=Math.sqrt(1-vertical*vertical),radius=.65+.3*((i*7%11)/10);const ox=n.x,oz=n.z;n.x=Math.sin(band*.82)*.28+Math.cos(angle)*ring*radius*.85+ox*.22;n.y=(band-3)*.49+vertical*.205;n.z=Math.cos(band*.82)*.22+Math.sin(angle)*ring*radius*.95+oz*.22;}));
 }else{
  bands.forEach((nodes,band)=>nodes.forEach((n,i)=>{const phase=i*2.399963+n.cluster*.57,level=(band-3)*.48;const seed=[...n.id].reduce((s,ch)=>((s*31+ch.charCodeAt(0))>>>0),7),u=(seed%997)/997,v=((seed*17)%991)/991;const ox=n.x,oz=n.z;const width=.62+.10*Math.sin(band*1.37),depth=.48+.09*Math.cos(band*.91);const corner=i%4;const sx=corner<2?-1:1,sz=corner%2?-1:1;const interior=i%5===4?.42:1;n.x=sx*width*(.65+u*.35)*interior+Math.sin(band*.9)*.15+Math.sin(phase)*.09+ox*.10;n.y=level+(nodes.length>1?(i/(nodes.length-1)-.5)*.30:0)+Math.sin(phase)*.045;n.z=sz*depth*(.65+v*.35)*interior+Math.cos(band*.85)*.10+oz*.10;}));
 }
 if(this.options.personal){const joined=new Set([0]);while(joined.size<this.nodes.length){let best=null;for(const a of joined)for(let b=0;b<this.nodes.length;b++){if(joined.has(b))continue;const n=this.nodes[a],m=this.nodes[b],d=Math.hypot(n.x-m.x,n.y-m.y,n.z-m.z);if(!best||d<best.d)best={a,b,d};}this.lines.push([best.a,best.b,.3]);joined.add(best.b);}const edges=new Set(this.lines.map(([a,b])=>[Math.min(a,b),Math.max(a,b)].join(':')));const connect=(a,b)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(!edges.has(key)){edges.add(key);this.lines.push([a,b,.22]);}};this.nodes.forEach((n,i)=>{const neighbors=this.nodes.map((m,j)=>({j,d:Math.hypot(n.x-m.x,n.y-m.y,n.z-m.z)})).filter(m=>m.j!==i).sort((a,b)=>a.d-b.d);neighbors.slice(0,9).forEach(m=>connect(i,m.j));const distant=neighbors.filter(m=>Math.abs(colorIndex(this.nodes[m.j].pop)-colorIndex(n.pop))>=2);if(distant.length)connect(i,distant[(i*7)%distant.length].j);});
 const lineTarget=Math.round(this.lines.length*1.1),protectedIds=new Set(this.options.selected);colors.forEach((_,band)=>{const n=this.nodes.find(n=>colorIndex(n.pop)===band);if(n)protectedIds.add(n.id);});const candidates=this.nodes.filter(n=>!protectedIds.has(n.id)),removeCount=Math.min(candidates.length,Math.round(this.nodes.length*.15)),removed=new Set(Array.from({length:removeCount},(_,i)=>candidates[Math.floor((i+.5)*candidates.length/removeCount)].id)),indices=new Map();const retained=this.nodes.filter((n,i)=>{if(removed.has(n.id))return false;indices.set(i,indices.size);return true;});this.lines=this.lines.filter(([a,b])=>indices.has(a)&&indices.has(b)).map(([a,b,s])=>[indices.get(a),indices.get(b),s]);this.nodes=retained;
 const existing=new Set(this.lines.map(([a,b])=>[Math.min(a,b),Math.max(a,b)].join(':'))),extra=[];this.nodes.forEach((n,a)=>this.nodes.forEach((m,b)=>{if(b>a&&!existing.has(a+':'+b))extra.push({a,b,d:Math.hypot(n.x-m.x,n.y-m.y,n.z-m.z)});}));extra.sort((a,b)=>a.d-b.d).slice(0,Math.max(0,lineTarget-this.lines.length)).forEach(({a,b})=>this.lines.push([a,b,.22]));
 }
 else this.nodes.forEach((n,i)=>{const near=this.nodes.map((b,j)=>({j,d:Math.hypot(n.x-b.x,n.y-b.y,n.z-b.z)})).filter(b=>b.j>i).sort((a,b)=>a.d-b.d);near.slice(0,18).forEach(b=>this.lines.push([i,b.j,Math.max(.15,1-b.d/3)]));near.slice(18).filter((b,k)=>k%3===0).forEach(b=>this.lines.push([i,b.j,.22]));});this.clusters=clusters.map((cl,k)=>{const nodes=this.nodes.filter(n=>n.cluster===k);return {...cl,pos:['x','y','z'].map(axis=>nodes.length?nodes.reduce((sum,n)=>sum+n[axis],0)/nodes.length:cl.pos[['x','y','z'].indexOf(axis)])}});
 }

 fitView(){if(!this.w||!this.nodes.length)return;this.cameraMove=null;this.zoom=1;this.pan=[0,0];this.center=['x','y','z'].map(axis=>(Math.min(...this.nodes.map(n=>n[axis]))+Math.max(...this.nodes.map(n=>n[axis])))/2);const projected=this.nodes.map(n=>this.project(n)),xs=projected.map(p=>p.x),ys=projected.map(p=>p.y),width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys);this.zoom=Math.min((this.w-90)/Math.max(1,width),(this.h-145)/Math.max(1,height),1.35);const fitted=this.nodes.map(n=>this.project(n));this.pan=[this.w*.5-(Math.min(...fitted.map(p=>p.x))+Math.max(...fitted.map(p=>p.x)))/2,this.h*.49-(Math.min(...fitted.map(p=>p.y))+Math.max(...fitted.map(p=>p.y)))/2];}
 pick(e){let r=this.canvas.getBoundingClientRect();return this.nodes.filter(n=>n.meaning&&n.screen).map(n=>({n,d:Math.hypot(n.screen.x-(e.clientX-r.left),n.screen.y-(e.clientY-r.top))})).sort((a,b)=>a.d-b.d).find(x=>x.d<15)?.n}
 pickLabel(e){let r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;return this.labelHits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)}
 focusAt(position,zoom=2.2){this.viewInteracted=true;const node=this.nodes.find(n=>n.meaning.pos===position);if(node)position=[node.x,node.y,node.z];else{const k=this.data?.clusters.findIndex(cl=>cl.pos===position);if(k>=0)position=this.clusters[k].pos;}this.cameraMove={start:performance.now(),from:[...this.center],to:[...position],fromZoom:this.zoom,toZoom:zoom,pan:[...this.pan]};if(this.options.reduceMotion){this.center=[...position];this.zoom=zoom;this.pan=[0,0];this.cameraMove=null}}
 adjustZoom(value){if(this.options.canZoom&&!this.options.canZoom())return;this.viewInteracted=true;this.cameraMove=null;this.zoom=Math.max(.5,Math.min(3.6,value))}
 project(p){p={x:p.x-this.center[0],y:p.y-this.center[1],z:p.z-this.center[2]};let x=p.x*Math.cos(this.angle)+p.z*Math.sin(this.angle),z=-p.x*Math.sin(this.angle)+p.z*Math.cos(this.angle),y=p.y*Math.cos(this.tilt)-z*Math.sin(this.tilt);z=p.y*Math.sin(this.tilt)+z*Math.cos(this.tilt);let scale=Math.min(this.w*.40,this.h*.29)*this.zoom;let d=3.8/(3.8+z);return{x:this.w*(this.options.overview?.51:.5)+x*scale*d+this.pan[0],y:this.h*(this.options.overview?.44:.5)-y*scale*d+this.pan[1],d,z}}
 draw(t){if(!this.w){this.frame=requestAnimationFrame(t=>this.draw(t));return}if(this.cameraMove){const m=this.cameraMove,u=Math.min(1,(t-m.start)/550),ease=1-Math.pow(1-u,3);this.center=m.from.map((v,i)=>v+(m.to[i]-v)*ease);this.zoom=m.fromZoom+(m.toZoom-m.fromZoom)*ease;this.pan=m.pan.map(v=>v*(1-ease));if(u===1)this.cameraMove=null}const c=this.ctx;c.clearRect(0,0,this.w,this.h);let progress=this.options.formation?Math.min(1,(t-this.start)/1400):1;this.progress=progress;if(!this.down&&!this.cameraMove&&!this.options.reduceMotion){const dt=Math.min(50,t-(this.lastDraw??t));this.angle+=dt*(this.center.some(v=>Math.abs(v)>.001)||this.zoom>1.2?.000018:.000066)}this.lastDraw=t;this.nodes.forEach((n,i)=>{let form=Math.min(1,progress*1.3);n.screen=this.project({x:n.x*form+Math.sin(t*.003+n.seed)*.04*(1-progress),y:n.y*form,z:n.z*form})});let limit=Math.floor(this.nodes.length*progress);this.lines.forEach(([a,b,strength])=>{if(a>=limit||b>=limit)return;let n=this.nodes[a],m=this.nodes[b];let dim=this.options.focus!=null&&n.cluster!==this.options.focus?.valueOf();c.strokeStyle=colors[colorIndex((n.pop+m.pop)/2)];c.globalAlpha=(this.options.personal?.23:dim?.055:.15)+strength*.22;c.lineWidth=.55+strength*.4;c.beginPath();c.moveTo(n.screen.x,n.screen.y);c.lineTo(m.screen.x,m.screen.y);c.stroke();c.globalAlpha=1});this.nodes.slice(0,limit).sort((a,b)=>b.screen.z-a.screen.z).forEach(n=>{let p=n.screen;let selected=this.options.selected?.includes(n.id);let dim=this.options.focus!=null&&n.cluster!==this.options.focus;c.globalAlpha=this.options.personal?1:dim?.22:Math.min(1,.58+p.d*.3);const radius=n.r*p.d*(selected&&!this.options.personal?1.3:1);c.fillStyle=colors[colorIndex(n.pop)];c.beginPath();c.arc(p.x,p.y,radius,0,Math.PI*2);c.fill();if(selected){c.strokeStyle='#eeeeee';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,radius+(this.options.personal?2.5:5),0,Math.PI*2);c.stroke()}c.globalAlpha=1});this.labelHits=[];if(progress>.85){c.font='11px ui-monospace,monospace';if(!this.options.personal)this.clusters.forEach((cl,k)=>{if(this.options.focus!=null&&this.options.focus!==k)return;let p=this.project({x:cl.pos[0],y:cl.pos[1]+.24,z:cl.pos[2]});c.fillStyle='#c8d0bf';c.fillText(cl.name,p.x+12,p.y-10);this.labelHits.push({cluster:k,x:p.x+8,y:p.y-24,w:c.measureText(cl.name).width+10,h:22})});if(this.options.personal){const occupied=[];this.nodes.filter(n=>this.options.selected?.includes(n.id)).sort((a,b)=>a.screen.y-b.screen.y).forEach(n=>{const p=n.screen,label=spotLabel(n.label),width=c.measureText(label).width;const candidates=[-10,16,-26,32,-42,48].flatMap(dy=>[16,-width-16].map(dx=>({x:Math.max(10,Math.min(this.w-width-10,p.x+dx)),y:Math.max(42,Math.min(this.h-35,p.y+dy))})));const overlap=q=>occupied.filter(r=>q.x<r.x+r.w+6&&q.x+width+6>r.x&&Math.abs(q.y-r.y)<15).length;const q=candidates.reduce((best,p)=>overlap(p)<overlap(best)?p:best);occupied.push({...q,w:width});c.fillStyle='#eeeee7';c.fillText(label,q.x,q.y);});}if(this.hover&&!this.options.personal){let n=this.hover,p=n.screen;c.fillStyle='#101610';let text=n.label+' / '+Math.round((n.meaning.frequency??n.pop)*100)+'%';c.fillRect(p.x+12,p.y-24,c.measureText(text).width+16,24);c.fillStyle='#edf1df';c.fillText(text,p.x+20,p.y-8)}}this.drawExtra?.(c,t,progress);this.frame=requestAnimationFrame(t=>this.draw(t))}
 snapshot(width,height){
 const copy=Object.create(SemanticScene.prototype);Object.assign(copy,this);
 copy.canvas=document.createElement('canvas');copy.canvas.width=width*2;copy.canvas.height=height*2;copy.ctx=copy.canvas.getContext('2d');copy.ctx.scale(2,2);
 copy.w=width;copy.h=height;copy.options={...this.options,formation:false,reduceMotion:true};copy.cameraMove=null;copy.down=null;copy.hover=null;copy.labelHits=[];
 copy.nodes=this.nodes.map(n=>({...n}));copy.pan=[this.pan[0]*width/this.w,this.pan[1]*height/this.h];
 copy.draw(performance.now());cancelAnimationFrame(copy.frame);return copy.canvas;
 }
 destroy(){cancelAnimationFrame(this.frame);this.resize.disconnect()}
}

// Moka flow: sentence → pinned word analyses → semantic selection → portrait → data.
const footer = '<span class="moka-signature">Make your meaning visible.</span>';
let disposeView=()=>{}, scanPending=false;
const analysisCache=new Map();
const spectrum=()=>`<div class="legend"><span>RARE</span><span class="spectrum">${colors.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span>DOMINANT</span></div>`;
function clearView(){disposeView();disposeView=()=>{};scene?.destroy();scene=null;}
function shell(left,right,kind){return `<section class="moka-layout ${kind}"><aside class="moka-sidebar"><div id="sidebar-content">${left}</div>${footer}</aside><div class="moka-main">${right}</div></section>`;}
function displaySentence(prompt){return /^A cold futuristic room with a soft chair[.!]?$/i.test(prompt)?prompt.replace(' room with a ', '\nroom with\na '):prompt;}
function highlightedSentence(prompt){const words=new Set(state.words);return displaySentence(prompt).split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g).map(s=>words.has(s.toLowerCase())?`<span class="atlas-keyword">${escapeHtml(s)}</span>`:escapeHtml(s)).join('');}
function intro(){
 clearView();window.scrollTo({top:0,behavior:'instant'});
 app.innerHTML=shell('<h1 class="intro-title">Describe<br>what you<br><em>imagine.</em></h1>',`<form class="prompt-form"><label class="sr-only" for="prompt">Describe what you imagine, in 7–10 English words</label><div class="prompt-input"><textarea id="prompt" spellcheck="false" maxlength="300" rows="1" placeholder="A cold futuristic&#10;room with&#10;a soft chair.">${escapeHtml(displaySentence(state.prompt))}</textarea></div><div class="form-bottom"><button class="primary submit-prompt" type="submit">Analysis</button></div><p class="error" id="error" role="status"></p><span class="input-caption">BEGIN WITH A SENTENCE / 7–10 WORDS</span></form>`,'input-page');
 const input=app.querySelector('#prompt');const resize=()=>{input.style.height='0px';input.style.height=input.scrollHeight+'px';};input.addEventListener('input',resize);window.addEventListener('resize',resize);disposeView=()=>window.removeEventListener('resize',resize);resize();input.focus({preventScroll:true});document.fonts.ready.then(()=>{if(input.isConnected)resize()});
 app.querySelector('form').onsubmit=e=>{e.preventDefault();if(!input.value.trim()){input.value=input.placeholder;resize();}startScan(input.value)};
}
async function startScan(prompt){
 if(scanPending)return;
 prompt=prompt.trim().replace(/\s+/g,' ');const count=(prompt.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[]).length;
 const error=app.querySelector('#error'),button=app.querySelector('.submit-prompt');
 if(count<7||count>10){error.textContent='Please enter a sentence of 7–10 English words.';return;}
 scanPending=true;button.disabled=true;button.textContent='Analyzing…';error.textContent='';
 const form=app.querySelector('form'),input=app.querySelector('#prompt');form.classList.add('is-analyzing');form.setAttribute('aria-busy','true');input.readOnly=true;
 const side=app.querySelector('#sidebar-content'),oldTitle=side.innerHTML;side.innerHTML=scanTitle;if(!reducedMotion)side.animate([{opacity:0},{opacity:1}],{duration:400});
 try{
  let result=analysisCache.get(prompt);if(!result){
  const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt}),signal:AbortSignal.timeout(90000)});
  result=await response.json();if(!response.ok)throw new Error(result.error||'Analysis unavailable. Please try again.');
  }
  const words=registerAnalysis(result);if(!words.length)throw new Error('No clearly ambiguous words found. Try a more descriptive sentence.');
  analysisCache.set(prompt,result);if(analysisCache.size>20)analysisCache.delete(analysisCache.keys().next().value);
  state={prompt,words,selections:{},saved:{},word:words[0],focus:null};transitionToScan();
 }catch(e){error.textContent=e.name==='TimeoutError'?'Analysis timed out. Please try again.':e.message;button.disabled=false;button.textContent='Analysis';form.classList.remove('is-analyzing');form.removeAttribute('aria-busy');input.readOnly=false;side.innerHTML=oldTitle;}finally{scanPending=false;}
}
function transitionToScan(){
 if(reducedMotion){showScan();return;}
 // Keep the input screen visible over the fully rendered next screen while it fades away.
 const previous=app.firstElementChild, bounds=previous.getBoundingClientRect();
 const overlay=document.createElement('div');overlay.className='scan-transition-overlay';overlay.inert=true;overlay.setAttribute('aria-hidden','true');
 const snapshot=previous.cloneNode(true);
 snapshot.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
 snapshot.querySelector('textarea').value=previous.querySelector('textarea').value;
 Object.assign(snapshot.style,{position:'absolute',top:bounds.top+'px',left:bounds.left+'px',width:bounds.width+'px'});
 overlay.append(snapshot);document.body.append(overlay);
 try{showScan();}catch(error){overlay.remove();throw error;}
 const fade=overlay.animate([{opacity:1},{opacity:0}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
 fade.finished.then(()=>overlay.remove(),()=>overlay.remove());
}
const scanTitle='<h1 class="scan-title">A sentence.<br>Multiple<br>possibilities.</h1>';
function histogram(word){
 const d=dataset[word],bins=64;const values=Array.from({length:bins},(_,i)=>d.meanings.reduce((sum,n)=>sum+Math.exp(-.5*((i/(bins-1)-(n.frequency??n.pop))/.027)**2),0));
 const max=Math.max(...values,.01);return values.map(v=>6+v/max*218);
}
function scanMarkup(word){const d=dataset[word];return `<article class="scan-card"><p class="eyebrow">INTERPRETIVELY OPEN</p><h2 id="scan-word">${escapeHtml(word.toUpperCase())}</h2><div id="scan-score">${d.ambiguity}%</div><p class="score-caption">AMBIGUITY SCORE</p><svg class="scan-histogram" viewBox="0 0 800 260" preserveAspectRatio="none" role="img" aria-label="Distribution of estimated interpretation frequencies for ${escapeHtml(word)}">${histogram(word).map((h,i)=>`<rect x="${i*12.5}" y="${248-h}" width="7" height="${h}" fill="${colors[Math.min(6,Math.floor(i/64*7))]}"/>`).join('')}<path d="M0 249H800" stroke="#626b5f" stroke-width="1"/></svg><div class="scan-stats"><div><span>MATCHES</span><strong id="scan-matches">${String(d.meanings.length).padStart(3,'0')}</strong></div><div><span>CLUSTERS</span><strong id="scan-clusters">${d.clusters.length}</strong></div><div><span>SPREAD</span><strong id="scan-spread">${d.spread.toFixed(2)}</strong></div></div></article>`;}
function showScan(){
 clearView();const first=state.words[0];state.word=first;let current=-1,inSelection=false,morphFrame=0,scrollFrame=0,numberFrame=0,barObserver=null,zoomTimer=0;const titleAnimations=[];
 app.innerHTML=shell(scanTitle,`<div class="scan-intro"><h2 class="sentence-heading">${highlightedSentence(state.prompt)}</h2></div><div class="scan-journey" style="--word-count:${state.words.length}"><div class="scan-stage">${scanMarkup(first)}</div></div><section class="selection-host" aria-label="Choose your meanings"></section>`,'scan-page');
 const journey=app.querySelector('.scan-journey'),host=app.querySelector('.selection-host');
 // A single chart stays in place as its bars interpolate to the next word.
 function changeWord(index){
  if(index===current)return;const initial=current===-1;current=index;const word=state.words[index],d=dataset[word];
  cancelAnimationFrame(numberFrame);cancelAnimationFrame(morphFrame);barObserver?.disconnect();
  titleAnimations.splice(0).forEach(animation=>animation.cancel());
  const title=app.querySelector('#scan-word');title.textContent=word.toUpperCase();title.style.color=['#6c98dc','#8fbfb0','#dacf7c'][index%3];
  if(!reducedMotion){
   const targets=initial?[app.querySelector('.sentence-heading'),app.querySelector('.scan-card .eyebrow'),title]:[title];
   targets.forEach((el,i)=>titleAnimations.push(el.animate([{clipPath:'inset(0 100% 0 0)',opacity:.25,transform:'translateY(6px)'},{clipPath:'inset(0 0% 0 0)',opacity:1,transform:'translateY(0)'}],{duration:850,delay:initial?180+i*100:0,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'})));
  }
  const metrics=[['#scan-score',d.ambiguity,v=>Math.round(v)+'%'],['#scan-matches',d.meanings.length,v=>String(Math.round(v)).padStart(3,'0')],['#scan-clusters',d.clusters.length,v=>String(Math.round(v))],['#scan-spread',d.spread,v=>v.toFixed(2)]].map(([selector,value,format])=>({el:app.querySelector(selector),value,format}));
  const countStart=performance.now()+(initial?280:0);
  const count=t=>{const p=reducedMotion?1:Math.max(0,Math.min(1,(t-countStart)/1100)),ease=1-(1-p)**3;metrics.forEach(({el,value,format})=>el.textContent=format(value*ease));if(p<1)numberFrame=requestAnimationFrame(count)};count(performance.now());
  const svg=app.querySelector('.scan-histogram');svg.setAttribute('aria-label','Distribution of estimated interpretation frequencies for '+word);
  const bars=[...svg.querySelectorAll('rect')],from=bars.map(b=>initial?0:Number(b.getAttribute('height'))),to=histogram(word);
  if(initial&&!reducedMotion)bars.forEach(b=>{b.setAttribute('height',0);b.setAttribute('y',248)});
  const grow=()=>{
   const start=performance.now();
   const tick=t=>{let complete=true;bars.forEach((b,i)=>{const p=reducedMotion?1:Math.max(0,Math.min(1,(t-start-(initial?i*7:0))/(initial?1100:750))),q=1-(1-p)**3,h=from[i]+(to[i]-from[i])*q;b.setAttribute('height',h);b.setAttribute('y',248-h);if(p<1)complete=false});if(!complete)morphFrame=requestAnimationFrame(tick)};tick(start);
  };
  if(initial&&!reducedMotion){barObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){barObserver.disconnect();grow()}},{threshold:.05});barObserver.observe(svg)}else grow();
 }
 function update(){scrollFrame=0;const h=window.innerHeight,rect=journey.getBoundingClientRect();changeWord(Math.max(0,Math.min(state.words.length-1,Math.floor((-rect.top+h*.15)/h))));
  const selecting=host.getBoundingClientRect().top<h*.48;
  if(selecting!==inSelection){inSelection=selecting;if(selecting){if(!scene)enterWord(state.word);else renderSelection();}else{app.querySelector('#sidebar-content').innerHTML=scanTitle;}}
 }
 // Stop the arriving gesture on the final chart; a fresh downward gesture releases it.
 let finalGate='approaching',gateStarted=0,lastGateWheel=0,touchY=null;
 const gatePosition=()=>window.scrollY+journey.getBoundingClientRect().top+(state.words.length-1)*window.innerHeight;
 const holdFinalChart=()=>{if(finalGate==='approaching'){finalGate='holding';gateStarted=performance.now()}window.scrollTo({top:gatePosition(),behavior:'instant'})};
 const onFinalWheel=e=>{
  if(e.ctrlKey||e.metaKey||finalGate==='released')return;
  const now=performance.now(),fresh=now-lastGateWheel>300;lastGateWheel=now;
  if(e.deltaY<=0)return;
  if(finalGate==='holding'&&fresh&&now-gateStarted>=1100){finalGate='released';return;}
  const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?window.innerHeight:1);
  if(window.scrollY+delta>=gatePosition()){e.preventDefault();holdFinalChart();}
 };
 const onFinalTouchStart=e=>{touchY=e.touches[0]?.clientY??null;if(finalGate==='holding'&&performance.now()-gateStarted>=1100)finalGate='released'};
 const onFinalTouchMove=e=>{if(touchY===null||!e.touches.length)return;const next=e.touches[0].clientY,delta=touchY-next;touchY=next;if(finalGate!=='released'&&delta>0&&window.scrollY+delta>=gatePosition()){e.preventDefault();holdFinalChart()}};
 const onFinalKey=e=>{if(!['ArrowDown','PageDown',' ','End'].includes(e.key)||e.target.closest('input,textarea,button,canvas,[contenteditable]'))return;if(finalGate==='holding'){if(!e.repeat&&performance.now()-gateStarted>=1100)finalGate='released';else e.preventDefault()}};
 window.addEventListener('keydown',onFinalKey);
 window.addEventListener('wheel',onFinalWheel,{passive:false,capture:true});
 window.addEventListener('touchstart',onFinalTouchStart,{passive:true});
 window.addEventListener('touchmove',onFinalTouchMove,{passive:false});
 // Enable zoom only after the model fills the viewport and the arriving gesture has ended.
 const fullyVisible=()=>{const rect=host.getBoundingClientRect();return rect.top>=-2&&rect.top<=2&&rect.bottom<=window.innerHeight+2};
 const waitForZoom=()=>{host.classList.remove('zoom-ready');clearTimeout(zoomTimer);zoomTimer=setTimeout(()=>{if(fullyVisible())host.classList.add('zoom-ready')},260)};
 const onScroll=()=>{if(finalGate!=='released'&&window.scrollY>gatePosition()+1)holdFinalChart();waitForZoom();if(!scrollFrame)scrollFrame=requestAnimationFrame(update)};
 const onArrivalWheel=()=>{if(!host.classList.contains('zoom-ready')||!fullyVisible())waitForZoom()};
 window.addEventListener('wheel',onArrivalWheel,{passive:true,capture:true});
 window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);
 disposeView=()=>{window.removeEventListener('keydown',onFinalKey);window.removeEventListener('wheel',onFinalWheel,true);window.removeEventListener('touchstart',onFinalTouchStart);window.removeEventListener('touchmove',onFinalTouchMove);clearTimeout(zoomTimer);window.removeEventListener('wheel',onArrivalWheel,true);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);cancelAnimationFrame(scrollFrame);cancelAnimationFrame(morphFrame);cancelAnimationFrame(numberFrame);barObserver?.disconnect();titleAnimations.forEach(animation=>animation.cancel())};
 window.scrollTo({top:0,behavior:'instant'});update();
}
function enterWord(word){
 scene?.destroy();scene=null;state.word=word;state.focus=null;state.selections[word]??=[];const d=dataset[word],host=app.querySelector('.selection-host');
 host.innerHTML=`<div class="space"><canvas aria-label="${escapeHtml(word)} semantic model. Drag to rotate. Scroll to zoom. Tab to select meanings using the keyboard."></canvas><div class="space-top"><h2>${escapeHtml(word.toUpperCase())}</h2><p id="space-count" class="small">NODES 000 / RELATIONS 000</p></div><div class="space-bottom"><div>${spectrum()}<p class="small">DRAG TO ROTATE / SHIFT + DRAG TO PAN / SCROLL TO ZOOM</p></div></div><div id="meanings" class="keyboard-meanings" aria-label="Select meanings"></div></div>`;
 scene=new SemanticScene(host.querySelector('canvas'),d,{formation:!reducedMotion,selectionStage:true,canZoom:()=>{const rect=host.getBoundingClientRect();return host.classList.contains('zoom-ready')&&Math.abs(rect.top)<=2&&rect.bottom<=window.innerHeight+2},selected:state.selections[word].map(s=>s.id),onPick:n=>{scene.focusAt(n.meaning.pos,2.4);toggleMeaning(n.id)},onRegion:k=>{scene.options.focus=k;scene.focusAt(d.clusters[k].pos,2.2)}});
 const currentScene=scene;scene.drawExtra=(c,t,p)=>{const count=host.querySelector('#space-count');if(count)count.textContent=`NODES ${String(Math.floor(currentScene.nodes.length*p)).padStart(3,'0')} / RELATIONS ${String(Math.floor(currentScene.lines.length*p)).padStart(3,'0')}`;drawCentroid(c,currentScene,word)};
 renderMeanings();renderSelection();
}
function renderMeanings(){const root=app.querySelector('#meanings');if(!root)return;root.innerHTML=scene.nodes.map(n=>`<button type="button" data-meaning="${escapeHtml(n.id)}" aria-pressed="${state.selections[state.word].some(s=>s.id===n.id)}">${escapeHtml(n.label)}</button>`).join('');root.querySelectorAll('button').forEach(b=>b.onclick=()=>{const n=scene.nodes.find(n=>n.id===b.dataset.meaning);scene.focusAt(n.meaning.pos,2.4);toggleMeaning(n.id)});}
function normalize(items){const total=items.reduce((s,n)=>s+n.weight,0);let used=0;items.forEach((n,i)=>{n.weight=i===items.length-1?100-used:Math.round(n.weight/total*100);used+=n.weight});return items;}
function toggleMeaning(id){
 if(scene.progress<1)return;let items=state.selections[state.word];
 if(items.some(s=>s.id===id))items=items.filter(s=>s.id!==id);else{if(items.length===3){app.querySelector('#select-status').textContent='Remove a meaning to choose another.';return;}items.push({id,weight:items.length?Math.round(100/items.length):100});}
 state.selections[state.word]=items.length?normalize(items):items;state.saved[state.word]=false;state.report=null;scene.options.selected=items.map(s=>s.id);renderSelection();
 app.querySelectorAll('[data-meaning]').forEach(b=>b.setAttribute('aria-pressed',String(items.some(n=>n.id===b.dataset.meaning))));
}
function setWeight(index,value){
 const items=state.selections[state.word];value=Math.max(1,Math.min(98,Number(value)));const others=items.filter((_,i)=>i!==index),sum=others.reduce((s,n)=>s+n.weight,0),remaining=100-value;items[index].weight=value;let used=0;
 others.forEach((n,i)=>{n.weight=i===others.length-1?remaining-used:Math.min(remaining-(others.length-i-1),Math.max(1,Math.round(remaining*n.weight/(sum||1))));used+=n.weight});state.saved[state.word]=false;state.report=null;
 app.querySelectorAll('.weight-value').forEach((e,i)=>e.textContent=items[i].weight+'%');app.querySelectorAll('.weight-slider').forEach((e,i)=>e.value=items[i].weight);app.querySelector('#save-word').disabled=false;renderNext();
}
function renderSelection(){
 const word=state.word,items=state.selections[word]||[],d=dataset[word],side=app.querySelector('#sidebar-content');
 side.innerHTML=`<div class="selection-panel"><h1>Your “${escapeHtml(word)}”</h1><p class="selection-question">What does this word hold for you?</p><div id="selection">${items.map((s,i)=>{const n=d.meanings.find(n=>n.id===s.id);return `<div class="selected-row"><div class="selected-label"><label for="weight-${i}">${escapeHtml(n.label)}</label><span class="weight-value">${s.weight}%</span><button class="remove" data-remove="${escapeHtml(s.id)}" aria-label="Remove ${escapeHtml(n.label)}">×</button></div><input class="weight-slider" style="--range-color:${colors[colorIndex(n.pop)]}" id="weight-${i}" type="range" min="1" max="98" value="${s.weight}" ${items.length<2?'disabled':''} aria-label="Weight of ${escapeHtml(n.label)}"></div>`}).join('')}</div><p id="select-status" role="status" class="selection-status"></p>${items.length?`<button class="primary" id="save-word" ${items.length<2||state.saved[word]?'disabled':''}>Save your ${escapeHtml(word.toUpperCase())}</button>`:''}<div id="next-step"></div></div>`;
 side.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>toggleMeaning(b.dataset.remove));side.querySelectorAll('.weight-slider').forEach((el,i)=>el.oninput=()=>setWeight(i,el.value));const save=side.querySelector('#save-word');if(save)save.onclick=saveWord;renderNext();
}
function renderNext(){const root=app.querySelector('#next-step');if(!root)return;root.innerHTML=state.words.every(w=>state.saved[w])?'<button class="secondary" id="calculate">Calculate the language gap</button>':'';const button=root.querySelector('button');if(button)button.onclick=calculateGap;}
function saveWord(){const word=state.word;if(state.selections[word].length<2)return;state.saved[word]=true;const next=state.words.find(w=>!state.saved[w]);if(next)enterWord(next);else renderSelection();}
function drawCentroid(c,s,word){const items=state.selections[word];if(!items?.length)return;const selected=items.map(n=>{const node=s.nodes.find(v=>v.id===n.id);return {...n,pos:[node.x,node.y,node.z]}});const center=centroid(selected),p=s.project({x:center[0],y:center[1],z:center[2]});selected.forEach(n=>{const q=s.project({x:n.pos[0],y:n.pos[1],z:n.pos[2]});c.strokeStyle='#eeeeee66';c.lineWidth=1;c.setLineDash([3,5]);c.beginPath();c.moveTo(q.x,q.y);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([])});c.fillStyle='#eeeeee';c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();c.strokeStyle='#eeeeee';c.beginPath();c.arc(p.x,p.y,12,0,Math.PI*2);c.stroke();c.font='11px ui-monospace,monospace';c.fillText('YOUR '+word.toUpperCase(),p.x+18,p.y+4);}
function interpretation(){const phrases={};state.report.measures.forEach(m=>{const labels=[...m.items].sort((a,b)=>b.weight-a.weight).map(n=>n.label);phrases[m.word]=labels.length>1?labels.slice(0,-1).join(', ')+' and '+labels.at(-1):labels[0]});if(['cold','futuristic','soft'].every(w=>phrases[w])&&/^A cold futuristic room with a soft chair[.!]?$/i.test(state.prompt))return `A room with ${phrases.cold} qualities, where the sense of the future comes from ${phrases.futuristic}. A chair expresses softness through ${phrases.soft}.`;return state.prompt.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g).map(s=>phrases[s.toLowerCase()]?`[${phrases[s.toLowerCase()]}]`:s).join('');}
function calculateGap(){state.report=reportData(state.words,state.selections);showReport();}
function showReport(){
 clearView();const r=state.report;let hash=2166136261;for(const ch of r.measures.flatMap(m=>m.items.map(n=>n.id+':'+n.weight)).join('|'))hash=Math.imul(hash^ch.charCodeAt(0),16777619);state.fingerprint=(hash>>>0).toString(16).toUpperCase().padStart(8,'0');
 app.innerHTML=shell(`<div class="personal-interpretation"><p class="eyebrow">YOUR PERSONAL INTERPRETATION</p><p class="personal-copy">${escapeHtml(interpretation())}</p></div>`,`<section class="model-space"><canvas aria-label="Your personal semantic model. Drag to rotate, double-click or pinch to zoom; scroll down for your results."></canvas><div class="model-caption"><span>PERSONAL 3D SEMANTIC MODEL</span><span>${state.fingerprint}</span></div><div class="space-bottom">${spectrum()}<span class="small" id="report-formation">GATHERING YOUR MEANINGS</span></div></section>${analysisView(r,dataset,state.prompt)}`,'report-page');
 window.scrollTo({top:0,behavior:'instant'});buildPersonalModel();const disposeMotion=mountAnalysisMotion(app,reducedMotion);
 app.querySelectorAll('[data-analysis-word]').forEach(b=>b.onclick=()=>{app.querySelectorAll('[data-analysis-word]').forEach(x=>x.classList.toggle('active',x===b));app.querySelector('#analysis-detail').innerHTML=analysisDetail(r.measures.find(m=>m.word===b.dataset.analysisWord),dataset);disposeMotion.observe(app.querySelector('#analysis-detail'))});
 app.querySelector('#new-analysis').onclick=()=>{state={prompt:'',words:[],selections:{},saved:{},word:null,focus:null};intro();app.querySelector('#prompt').focus({preventScroll:true})};
 disposeView=disposeMotion;
}
function buildPersonalModel(){
 const r=state.report,clusters=r.measures.flatMap((m,i)=>dataset[m.word].clusters.map((cl,k)=>{const influence=m.items.filter(n=>n.cluster===k).reduce((s,n)=>s+n.weight/100,0);const transform=pos=>pos.map((v,j)=>v*(.46+influence*.35)+m.center[j]*.3+(j===0?(i-(r.measures.length-1)/2)*1.05:0));return {name:cl.name,pos:transform(cl.pos),pop:cl.pop,meanings:cl.meanings.map(v=>({...v,pos:transform(v.pos)}))};}));
 scene=new SemanticScene(app.querySelector('.model-space canvas'),{clusters},{formation:!reducedMotion,personal:true,scrollPage:true,selected:r.measures.flatMap(m=>m.items.map(n=>n.id)),onPick:n=>{scene.focusAt(n.meaning.pos,2.2);scene.hover=n}});
 scene.angle=-.2;scene.fitView();scene.drawExtra=(c,t,p)=>{const el=app.querySelector('#report-formation');if(el)el.textContent=p<.3?'GATHERING YOUR MEANINGS':p<.65?'CONNECTING YOUR ANCHORS':p<1?'BUILDING YOUR SEMANTIC MODEL':'RESOLVED / DRAG TO ROTATE'};
}
// Existing developer preview uses the same UI and renderer as the real journey.
export function previewReport(){state.words=['cold','futuristic','soft'];state.selections=Object.fromEntries(state.words.map(w=>[w,dataset[w].meanings.slice(0,3).map((n,i)=>({id:n.id,weight:[34,33,33][i]}))]));state.saved=Object.fromEntries(state.words.map(w=>[w,true]));calculateGap();}
intro();

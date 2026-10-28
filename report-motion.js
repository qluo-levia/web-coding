// Reveal the final interpretation only as each section enters view.
export function mountReportMotion(root, reduced, startModel) {
 if(reduced){startModel();return ()=>{}}
 const frames=new Set(), effects=new Set();let stopped=false;
 const tween=(duration,update)=>{const start=performance.now();const tick=now=>{if(stopped)return;const p=Math.min(1,(now-start)/duration);update(p);if(p<1){const id=requestAnimationFrame(t=>{frames.delete(id);tick(t)});frames.add(id)}};tick(start)};
 const observer=new IntersectionObserver(entries=>entries.forEach(({target:el,isIntersecting})=>{
  if(!isIntersecting)return;observer.unobserve(el);el.style.visibility='visible';
  if(el.matches('.model-space')){startModel();return}
  if(el.matches('svg')){el.querySelectorAll('circle,path').forEach((node,i)=>{node.style.transformBox='fill-box';node.style.transformOrigin='center';const effect=node.animate([{opacity:0,transform:'scale(.15)'},{opacity:.8,transform:'scale(1.06)',offset:.75},{opacity:1,transform:'scale(1)'}],{duration:1100,delay:i*15,easing:'ease-out',fill:'backwards'});effects.add(effect);effect.onfinish=()=>effects.delete(effect)});return}
  if(el.matches('.total,.gap-row strong')){const node=el.firstChild,value=Number(el.dataset.motionValue);tween(1100,p=>node.nodeValue=String(Math.round(value*(1-(1-p)**3))));return}
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];let node;while(node=walker.nextNode())nodes.push({node,text:node.nodeValue});const length=nodes.reduce((sum,n)=>sum+n.text.length,0);el.classList.add('typing');tween(Math.min(2200,Math.max(450,length*14)),p=>{let remaining=Math.ceil(length*p);nodes.forEach(({node,text})=>{node.nodeValue=text.slice(0,Math.max(0,remaining));remaining-=text.length});if(p===1)el.classList.remove('typing')});
 }),{threshold:.12});
 root.querySelectorAll('.model-space,.gap-row svg,.gap-row strong,.total,.eyebrow,.interpretations h1,.interpretations article>p:not(.eyebrow),.personal-copy,.report-top h1,.subtitle,.summary article>p:not(.eyebrow),.method,.report-grid>div>p.small').forEach(el=>{
  if(el.matches('.total,.gap-row strong')){el.dataset.motionValue=el.firstChild.nodeValue;el.setAttribute('aria-label',el.textContent);el.firstChild.nodeValue='0'}
  else {el.style.minHeight=el.getBoundingClientRect().height+'px';el.style.visibility='hidden';if(!el.matches('svg,.model-space'))el.setAttribute('aria-label',el.textContent)}observer.observe(el);
 });
 return ()=>{stopped=true;observer.disconnect();frames.forEach(cancelAnimationFrame);effects.forEach(effect=>effect.cancel())};
}

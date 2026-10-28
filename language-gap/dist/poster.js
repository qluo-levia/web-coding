// A deterministic A4 portrait built from the user's actual semantic selections.
// Canvas is used for both the data plot and typography; no generative image service.
export async function renderPoster({prompt,personal,fingerprint,report,colors,model}){
 await document.fonts.load('40px "Abril Fatface"');
 const canvas=document.createElement('canvas');canvas.width=2480;canvas.height=3508;
 const c=canvas.getContext('2d');c.scale(2,2);
 const ink='#eeeeea',paper='#000000',muted='#a6ada7';
 c.fillStyle=paper;c.fillRect(0,0,1240,1754);
 const line=(x1,y1,x2,y2,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
 const text=(str,x,y,font='12px monospace',color=ink)=>{c.font=font;c.fillStyle=color;c.fillText(str,x,y)};
 const wrap=(str,x,y,width,font,lineHeight,maxLines=30,color=ink)=>{c.font=font;const words=str.split(/\s+/);let lines=[],row='';for(const word of words){if(c.measureText(row+' '+word).width>width&&row){lines.push(row);row=word}else row+=(row?' ':'')+word}if(row)lines.push(row);if(lines.length>maxLines){lines=lines.slice(0,maxLines);let last=lines.at(-1);while(c.measureText(last+'…').width>width)last=last.slice(0,-1);lines[lines.length-1]=last+'…'}lines.forEach((s,i)=>text(s,x,y+i*lineHeight,font,color));return y+lines.length*lineHeight};
 const colorAt=p=>colors[Math.min(6,Math.floor(Math.max(0,p)*7))];
 text('THE LANGUAGE GAP',65,53,'bold 14px Arial');text('PERSONAL SEMANTIC ATLAS / '+fingerprint,690,53,'12px monospace');line(65,72,1175,72,'#3b403b');
 let titleSize=prompt.length>160?29:prompt.length>90?35:43;
 wrap('“'+prompt+'”',65,120,880,titleSize+'px "Abril Fatface"',titleSize*1.16,3);
 text(report.total+'%',1000,139,'54px "Abril Fatface"');text('TOTAL DIVERGENCE',1000,163,'10px monospace');
 text('01 / YOUR PERSONAL 3D SEMANTIC MODEL',65,235,'11px monospace');
 const X=65,Y=260,W=1110,H=810;
 const points=report.measures.flatMap(m=>m.items);
 if(!model)throw new Error('The personal 3D model must be ready before exporting.');
 c.drawImage(model,X,Y,W,H);
 text('SELECTED MEANINGS / WEIGHTED CONNECTIONS',X+20,Y+H-15,'10px monospace',muted);
 text('YOUR MODEL · YOUR VIEW',X+850,Y+H-15,'10px monospace',muted);
 text('RARE',65,1100,'10px monospace');colors.forEach((col,i)=>{c.fillStyle=col;c.beginPath();c.arc(113+i*17,1096,4,0,Math.PI*2);c.fill()});text('DOMINANT',238,1100,'10px monospace');text('COLOR = ESTIMATED INTERPRETATION FREQUENCY',650,1100,'10px monospace',muted);
 // Three measured summaries retain exact weights and spatial distances.
 const cols=report.measures.length,colW=1110/cols;
 report.measures.forEach((m,i)=>{
  const left=65+i*colW;line(left,1130,left+colW-25,1130,'#3b403b');
  text(m.word.toUpperCase(),left,1158,'13px monospace');text(m.divergence+'%',left,1212,'38px "Abril Fatface"');
  const cx=left+colW-88,cy=1190,offset=m.divergence*.47;
  for(let r=0;r<8;r++){c.strokeStyle='#788b7766';c.lineWidth=.55;c.beginPath();c.arc(cx,cy,5+r*4,0,Math.PI*2);c.stroke();c.strokeStyle='#b77f5566';c.beginPath();c.arc(cx+offset,cy-8,4+r*3.4,0,Math.PI*2);c.stroke()}
  text('SEMANTIC DIVERGENCE',left,1235,'9px monospace',muted);
  let y=1265;
  m.items.forEach(n=>{const id=points.findIndex(p=>p.id===n.id)+1;c.fillStyle=colorAt(n.pop);c.beginPath();c.arc(left+4,y-4,4,0,Math.PI*2);c.fill();wrap(String(id).padStart(2,'0')+' / '+n.weight+'% '+n.label,left+17,y,colW-42,'10px monospace',12,2);y+=28});
  text('DISTANCE '+m.rawDistance.toFixed(3),left,1355,'10px monospace',muted);
 });
 line(65,1380,1175,1380,'#3b403b');
 text('02 / YOUR PERSONAL INTERPRETATION',65,1408,'11px monospace');
 wrap(personal,65,1445,1105,'21px Arial',29,6);
 line(65,1638,1175,1638,'#3b403b');
 wrap('A portrait of how you use language. Generated from your selected meanings and weights. AI supplies interpretations and estimated frequencies. Spatial positions are illustrative; divergence describes this visual model, not AI accuracy.',65,1661,830,'10px monospace',15,4,muted);
 text('A4 / 210 × 297 MM',970,1670,'10px monospace',muted);text('2480 × 3508 PX',970,1688,'10px monospace',muted);
 text('HUMAN INTENTION / MACHINE INTERPRETATION',65,1730,'10px monospace',muted);text(fingerprint,1080,1730,'10px monospace',muted);
 return canvas;
}
export async function savePoster(data){
 const canvas=await renderPoster(data);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to export PNG')),'image/png'));
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`language-gap-${data.fingerprint}-A4.png`;a.textContent='Download PNG';a.className='primary';
 const dialog=document.createElement('dialog');dialog.className='poster-preview';
 const heading=document.createElement('p');heading.textContent='YOUR A4 SEMANTIC MODEL · 2480 × 3508';heading.className='eyebrow';
 const image=document.createElement('img');image.src=url;image.alt='Your black A4 poster with the personal 3D semantic model';
 const close=document.createElement('button');close.textContent='Close';close.className='secondary';close.onclick=()=>dialog.close();
 const actions=document.createElement('div');actions.className='report-actions';actions.append(a,close);
 dialog.append(heading,image,actions);document.body.append(dialog);dialog.onclose=()=>{URL.revokeObjectURL(url);dialog.remove()};dialog.showModal();a.click();
}

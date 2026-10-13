import Module from 'manifold-3d';
import {FONT_DIGITS} from './digit-fonts.js';
export async function init(locateFile){const m=await Module(locateFile?{locateFile}:{});m.setup();return m;}
const T=Math.sqrt(3),R=2.25;
const arc=(x,y,rx,ry,a,b,n=80)=>Array.from({length:n+1},(_,i)=>{let t=(a+(b-a)*i/n)*Math.PI/180;return[x+rx*Math.cos(t),y+ry*Math.sin(t)]});
export const FONTS=['stencil',...Object.keys(FONT_DIGITS)];
export function paths(d,font='stencil'){
 if(FONT_DIGITS[font])return FONT_DIGITS[font][d].map(poly=>poly.map(p=>[...p]));
 switch(d){
case '0':return[arc(15,28.5,12.75,26.25,341,469,150),arc(15,28.5,12.75,26.25,161,289,140)];
case '1':return[[[0,41.75],[13/T,54.75],[13/T,2.25]]];
case '2':{const angle=-Math.atan(12.75/(12*T)),end=[14+12*Math.cos(angle),42+12.75*Math.sin(angle)];return[arc(14,42,12,12.75,170,angle*180/Math.PI,120),[end,[end[0]-(end[1]-2.25)/T,2.25],[28,2.25]]];}
case '3':return[[[0,54.75],[12+24.5/T,54.75],[12,30.25]],arc(12,16.25,14,14,90,-170,160)];
case '4':return[[[26,54.75],[26-33/T,21.75],[26,21.75]],[[26,30],[26,2.25]]];
case '5':return[[[27,54.75],[2.25,54.75],[2.25,31],[14,31]],arc(14,16.25,14,14.75,90,-170,160)];
case '6':return[arc(14,16.25,14,14,0,270,160),[[14+14*Math.cos(150*Math.PI/180),23.25],[14+14*Math.cos(150*Math.PI/180)+(54.75-23.25)/T,54.75]]];
case '7':return[[[0,54.75],[52.5/T,54.75],[0,2.25]]];
case '8':{const lower=arc(14,15.375,13.125,13.125,0,270,160);return[lower,lower.map(([x,y])=>[28-x,57-y])];}
case '9':return paths('6').map(p=>p.map(([x,y])=>[28-x,57-y]));
}}
export function previewRadius(font='stencil'){return font==='stencil'?R:0;}
let segmentCell;
function segmentAdvance(){
 if(segmentCell==null){segmentCell=0;for(const d of '0123456789'){const xs=paths(d,'7segment').flat().map(p=>p[0]);segmentCell=Math.max(segmentCell,Math.max(...xs)-Math.min(...xs));}}
 return segmentCell;
}
// 7-segment digits share one cell width. Narrow digits, including 1, sit on the right of that cell.
export function cellOf(font,xs){
 const min=Math.min(...xs),max=Math.max(...xs);
 return font==='7segment'?[max-segmentAdvance(),max]:[min,max];
}
export function generate(m,number,font='stencil'){
if(!/^[1-9]\d{0,5}$/.test(number))throw Error('Enter a team number from 1 to 999999, without leading zeros.');
if(!FONTS.includes(font))throw Error('Choose a digit style from the list.');
const owned=[],keep=x=>(owned.push(x),x),C=m.CrossSection,M=m.Manifold;
const rect=(x,y,w,h)=>keep(keep(C.square([w,h])).translate([x,y]));
const union=a=>keep(C.union(a));const move=(a,v)=>keep(a.translate(v));const extr=(a,z,h)=>keep(keep(a.extrude(h)).translate([0,0,z]));
try{
 const stroke=p=>{const poly=[];for(let i=0;i<p.length;i++){poly.push(keep(keep(C.circle(R,20)).translate(p[i])));if(i){let a=p[i-1],b=p[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len*R,ny=dx/len*R;poly.push(keep(new C([[[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]]])));}}return union(poly);};
 const filled=font!=='stencil';
 const glyphs=[...number].map(d=>filled?union(paths(d,font).map(poly=>keep(new C([poly])))):union(paths(d).map(stroke)));
 const bounds=glyphs.map(g=>{let xs=g.toPolygons().flat().map(v=>v[0]);return cellOf(font,xs);});
 const rawWidth=bounds.reduce((s,b)=>s+b[1]-b[0],0)+6*(glyphs.length-1);const sx=Math.min(1,150/rawWidth);
 let x=-rawWidth*sx/2;const arranged=glyphs.map((g,i)=>{let b=bounds[i],q=move(keep(g.scale([sx,1])),[x-b[0]*sx,7.5]);x+=(b[1]-b[0]+6)*sx;return q;});
 const front=union(arranged),back=keep(front.scale([-1,1]));const board=rect(-88,0,176,72);
 const stripBars=union([12,34,55].map(y=>rect(-79,y-2.5,158,5)));
 const strips=filled?union([stripBars,rect(76,9.5,3,48),rect(-79,9.5,3,48)]):stripBars;const pocket=keep(strips.offset(.15));
 const plate2=keep(board.subtract(keep(back.offset(.15))));const plate=keep(extr(plate2,0,1.9).subtract(extr(pocket,1.49,.42)));
 const white=keep(M.union([extr(strips,1.5,.8),extr(back,.1,1.41),extr(front,2.29,1.41)]));
 const parts1=plate.decompose(),parts2=white.decompose();parts1.forEach(keep);parts2.forEach(keep);
 if(parts1.length!==1||parts2.length!==1)throw Error(`This ${font} number creates disconnected geometry. Please report this number before printing.`);
 const red=keep(keep(plate.rotate([0,180,0])).translate([0,0,3.8]));
 const overlap=keep(white.intersect(plate)).volume()+keep(white.intersect(red)).volume();
 if(overlap>0.00001)throw Error('Assembly clearance check failed.');
 const status=[plate.status(),white.status()];if(status.some(s=>s!=='NoError'))throw Error('Geometry validation failed: '+status.join(', '));
 const mesh=a=>{a=keep(a.simplify(.001));let g=a.getMesh(),vertices=new Float32Array(g.vertProperties),indices=[];for(let k=0;k<vertices.length;k++)vertices[k]=Math.round(vertices[k]*10000)/10000;for(let i=0;i<g.triVerts.length;i+=3){let p=[];for(let j=0;j<3;j++){let k=g.triVerts[i+j]*g.numProp;p.push([vertices[k],vertices[k+1],vertices[k+2]]);}let u=p[1].map((x,k)=>x-p[0][k]),v=p[2].map((x,k)=>x-p[0][k]);if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10)indices.push(g.triVerts[i],g.triVerts[i+1],g.triVerts[i+2]);}return{vertices,indices:new Uint32Array(indices),stride:g.numProp};};
 const plateMesh=mesh(plate),whiteMesh=mesh(keep(white.translate([0,0,-.1])));
 return{plate:plateMesh,white:whiteMesh,polygons:front.toPolygons(),number,font,width:176,height:72,thickness:3.8,scale:sx,triangles:[plateMesh.indices.length/3,whiteMesh.indices.length/3],components:[parts1.length,parts2.length],overlap};
}finally{for(let i=owned.length-1;i>=0;i--)owned[i].delete();}
}
export function stl(mesh){const n=mesh.indices.length/3,b=new ArrayBuffer(84+n*50),v=new DataView(b);v.setUint32(80,n,true);for(let i=0;i<n;i++){let p=[];for(let j=0;j<3;j++){let k=mesh.indices[i*3+j]*mesh.stride;p.push([mesh.vertices[k],mesh.vertices[k+1],mesh.vertices[k+2]]);}let u=p[1].map((x,k)=>x-p[0][k]),w=p[2].map((x,k)=>x-p[0][k]),normal=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],len=Math.hypot(...normal)||1,values=[...normal.map(x=>x/len),...p.flat()];values.forEach((x,j)=>v.setFloat32(84+i*50+j*4,x,true));}return b;}

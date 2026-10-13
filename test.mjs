import{init,generate,stl,paths,cellOf}from'./geometry.js';import{writeFile}from'node:fs/promises';
function closed(mesh){let edges=new Map;for(let i=0;i<mesh.indices.length;i+=3){let p=[];for(let j=0;j<3;j++){let k=mesh.indices[i+j]*mesh.stride;p.push(Array.from(mesh.vertices.slice(k,k+3)).join(','));}for(let j=0;j<3;j++){let key=[p[j],p[(j+1)%3]].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}if([...edges.values()].some(x=>x!==2))throw Error('Exported mesh is not closed');}
const m=await init();for(const n of ['36117','1','8','9','10000','88888','999999','123456','20480','77777']){let r=generate(m,n);closed(r.plate);closed(r.white);if(r.overlap>0.00001)throw Error('Overlapping assembly');if(r.components.some(x=>x!==1))throw Error(n);let b=stl(r.plate);if(new DataView(b).getUint32(80,true)!==r.triangles[0])throw Error('STL count');if(n==='36117'){try{await writeFile('/workspace/scratch/53383da2d2c0/site-test-plate.stl',Buffer.from(b));await writeFile('/workspace/scratch/53383da2d2c0/site-test-white.stl',Buffer.from(stl(r.white)));}catch(e){if(e.code!=='ENOENT')throw e;}}console.log(n,r.triangles,r.components);}for(const s of ['0','01','1.2','<script>','1234567','']){try{generate(m,s);throw Error('Accepted invalid number '+s);}catch(e){if(e.message.startsWith('Accepted'))throw e;}}console.log('Input validation passed');

for(let i=1;i<=9;i++){let r=generate(m,String(i));closed(r.plate);closed(r.white);}for(let i=0;i<25;i++){let r=generate(m,String(1+((i*7919+31415)%999999)));closed(r.plate);closed(r.white);}console.log('All digits and 25 mixed numbers passed');

const six=paths('6'),nine=paths('9');if(JSON.stringify(nine)!==JSON.stringify(six.map(p=>p.map(([x,y])=>[28-x,57-y]))))throw Error('9 must rotate6 exactly');if(paths('8').length!==2)throw Error('8 loops');if(paths('0').length!==2)throw Error('0 strokes');const zx=paths('0').flat().map(p=>p[0]);if(Math.max(...zx)<27||Math.min(...zx)>3)throw Error('0 must keep both sides');if(JSON.stringify(paths('4')[1])!==JSON.stringify([[26,30],[26,2.25]]))throw Error('4 quarter-height upper stem');if(paths('8','stencil').length!==paths('8').length)throw Error('stencil remains the default font');console.log('Digit shape contracts passed');

import{FONT_DIGITS}from'./digit-fonts.js';
function area(p){let a=0;for(let i=0;i<p.length;i++){let q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return a/2;}
const faces=Object.keys(FONT_DIGITS);
for(const font of faces){for(const d of '0123456789'){let bars=paths(d,font);if(!bars.length)throw Error('missing '+font+' '+d);for(const bar of bars)if(area(bar)<=0)throw Error('winding '+font+' '+d);}}
if(['closer','pesta','floorlight','sharpe'].some(name=>faces.includes(name)))throw Error('removed digit styles are still present');
const segmentCells='0123456789'.split('').map(d=>cellOf('7segment',paths(d,'7segment').flat().map(p=>p[0])));
const segmentWidth=segmentCells[0][1]-segmentCells[0][0];
if(segmentCells.some(b=>Math.abs(b[1]-b[0]-segmentWidth)>0.01))throw Error('7-segment digits must share one width');
for(const d of '0123456789')for(const bar of paths(d,'7segment'))if(bar.length!==6)throw Error('7-segment bar must be an elongated hexagon '+d);
const oneXs=paths('1','7segment').flat().map(p=>p[0]),oneCell=cellOf('7segment',oneXs);
if(Math.min(...oneXs)<oneCell[0]+segmentWidth*0.6)throw Error('7-segment 1 must sit on the right');
for(const font of faces){const sample=generate(m,'36117',font);if(JSON.stringify(sample.polygons)===JSON.stringify(generate(m,'36117','stencil').polygons))throw Error(font+' matched stencil');for(const n of ['36117','8','10','888888','234567']){let r=generate(m,n,font);closed(r.plate);closed(r.white);if(r.font!==font||r.overlap>0.00001||r.components.some(x=>x!==1))throw Error(font+' '+n);console.log(font,n,r.triangles,r.scale.toFixed(3));}}
try{generate(m,'36117','comic');throw Error('Accepted invalid font');}catch(e){if(e.message.startsWith('Accepted'))throw e;}
console.log('Alternate digit styles passed');

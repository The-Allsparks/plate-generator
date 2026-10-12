import{init,generate}from'./geometry.js';
let engine=init(name=>new URL(name,import.meta.url).href);
self.onmessage=async e=>{try{let result=generate(await engine,e.data.number);self.postMessage({id:e.data.id,result},[result.plate.vertices.buffer,result.plate.indices.buffer,result.white.vertices.buffer,result.white.indices.buffer]);}catch(error){self.postMessage({id:e.data.id,error:error.message});}};

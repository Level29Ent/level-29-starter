const backend='https://sea-turtle-app-zfvyk.ondigitalocean.app';
const allowed=new Map([['health','GET'],['rooms','GET'],['enter','POST'],['start','POST'],['sync','POST'],['leave','POST'],['rematch','POST']]);
const json=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export default {
 async fetch(request) {
  const url=new URL(request.url), route=url.searchParams.get('route');
  if(!allowed.has(route)) return json(404,'Unknown race endpoint');
  if(request.method!==allowed.get(route)) return json(405,'Method not allowed');
  const origin=request.headers.get('origin');
  if(origin && origin!==url.origin) return json(403,'Cross-origin requests are not allowed');
  const headers={'Content-Type':'application/json'};
  const authorization=request.headers.get('authorization');
  if(authorization) headers.Authorization=authorization;
  let body;
  if(request.method==='POST') {
   if(!(request.headers.get('content-type')||'').startsWith('application/json')) return json(415,'Send JSON');
   if(Number(request.headers.get('content-length'))>8192) return json(413,'Request too large');
   body=await request.text();
   if(new TextEncoder().encode(body).length>8192) return json(413,'Request too large');
   try{JSON.parse(body);}catch{return json(400,'Invalid JSON');}
  }
  try {
   const response=await fetch(backend+'/api/'+route,{method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(11000)});
   if(!(response.headers.get('content-type')||'').includes('application/json')) return json(502,'Backend returned a non-JSON response');
   return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  } catch {return json(502,'Race backend unavailable. Try again shortly.');}
 }
};

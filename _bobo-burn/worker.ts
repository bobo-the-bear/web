import { getBurnData } from "./burn-service";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/burn") return new Response("Not found",{status:404,headers});
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers});
    if (request.method !== "GET") return new Response("Method not allowed",{status:405,headers:{...headers,Allow:"GET, OPTIONS"}});
    try { return Response.json(await getBurnData(),{headers}); }
    catch { return Response.json({error:"Verification is temporarily unavailable"},{status:503,headers}); }
  }
};

import {NextResponse} from "next/server";import {sb} from "@/lib/db";
const hits=new Map(),ID=/^[0-9a-f-]{36}$/i,SLOT=/^[a-z_]{3,30}$/;
function limited(req){const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"x",n=Date.now(),a=(hits.get(ip)||[]).filter(t=>n-t<6e4);a.push(n);hits.set(ip,a);if(hits.size>5000)hits.clear();return a.length>30}
export async function GET(req){const u=new URL(req.url),c=u.searchParams.get("c"),s=u.searchParams.get("s");
  if(!ID.test(c||"")||!SLOT.test(s||""))return new NextResponse("bad request",{status:400});
  const {data}=await sb().from("ad_campaigns").select("click_url").eq("id",c).maybeSingle();   // destination always comes from the DB, never from the URL
  if(!data)return NextResponse.redirect(new URL("/",req.url));
  if(!limited(req))await sb().rpc("ad_track",{p_campaign:c,p_slot:s,p_kind:"click"});
  return NextResponse.redirect(data.click_url,302)}
export async function POST(req){let b;try{b=await req.json()}catch{return new NextResponse(null,{status:400})}
  if(!ID.test(b?.c||"")||!SLOT.test(b?.s||""))return new NextResponse(null,{status:400});
  if(!limited(req))await sb().rpc("ad_track",{p_campaign:b.c,p_slot:b.s,p_kind:"impression"});return new NextResponse(null,{status:204})}

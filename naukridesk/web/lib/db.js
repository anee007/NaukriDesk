import {createClient} from "@supabase/supabase-js";
export const SITE=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";
export const sb=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||"http://localhost:54321",process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"anon",{auth:{persistSession:false}});
const COLS="id,slug,type,title,org,state,qualification,total_posts,last_date,source_url,published_at,updated_at";
export async function listPosts({type,q,state,qual,limit=24,page=0}={}){
  try{let r=sb().from("posts").select(COLS,{count:"exact"}).eq("status","published");
    if(type)r=r.eq("type",type);if(state)r=r.in("state",[state,"All India"]);if(qual)r=r.eq("qualification",qual);
    const t=(q||"").replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(Boolean).slice(0,6).join(" & ");
    if(t)r=r.textSearch("fts",t,{config:"simple"});
    const {data,count,error}=await r.order("published_at",{ascending:false}).range(page*limit,page*limit+limit-1);
    if(error)throw error;return{rows:data||[],count:count||0}}catch(e){console.error("listPosts:",e.message);return{rows:[],count:0}}}
export async function getPost(slug){try{const {data}=await sb().from("posts").select("*").eq("slug",slug).eq("status","published").maybeSingle();return data}catch{return null}}
export async function allSlugs(){try{const {data}=await sb().from("posts").select("slug,updated_at").eq("status","published").order("published_at",{ascending:false}).limit(5000);return data||[]}catch{return[]}}
export async function getAdData(key){try{const c=sb();const [s,cs]=await Promise.all([c.from("ad_slots").select("*").eq("key",key).eq("enabled",true).maybeSingle(),c.from("ad_campaign_slots").select("ad_campaigns(*)").eq("slot_key",key)]);
  return{slot:s.data,camps:(cs.data||[]).map(r=>r.ad_campaigns&&{...r.ad_campaigns,slot_keys:[key]}).filter(Boolean)}}catch{return{slot:null,camps:[]}}}

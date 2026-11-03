export const dynamic="force-dynamic";
import {allSlugs,SITE} from "@/lib/db";
export default async function sitemap(){const rows=await allSlugs();
  return[{url:SITE,changeFrequency:"hourly",priority:1},...["about","privacy","disclaimer","contact"].map(s=>({url:`${SITE}/legal/${s}`,priority:.2})),
    ...rows.map(r=>({url:`${SITE}/post/${r.slug}`,lastModified:r.updated_at,changeFrequency:"daily",priority:.7}))]}

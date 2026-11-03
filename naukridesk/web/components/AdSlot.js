import {getAdData} from "@/lib/db";import {pickAd} from "@/lib/ads";import AdBeacon from "./AdBeacon";
export default async function AdSlot({slot,type,state}){
  const {slot:s,camps}=await getAdData(slot);if(!s)return null;
  const c=pickAd(camps,slot,{type,state}),cls=`ad dev-${s.device}`;
  if(!c)return s.fallback_html?<aside className={cls} aria-label="Advertisement"><small>Advertisement</small><div dangerouslySetInnerHTML={{__html:s.fallback_html}}/></aside>:null;
  return <aside className={cls} aria-label="Advertisement"><small>Advertisement</small>
    <a href={`/api/ad?c=${c.id}&s=${slot}`} target="_blank" rel="sponsored noopener noreferrer"><img src={c.creative_url} alt={c.alt_text||"Advertisement"} width={s.width||300} height={s.height||250} loading="lazy"/></a><AdBeacon c={c.id} s={slot}/></aside>}

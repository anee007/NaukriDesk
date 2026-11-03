// Ad selection. Image creatives only: third-party HTML from advertisers is a malware/XSS risk.
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>"&#"+c.charCodeAt(0)+";");
export function pickAd(campaigns,slotKey,{now=new Date(),rnd=Math.random,type,state,todayImpr={}}={}){
  const ok=campaigns.filter(c=>c.status==="active"&&(c.slot_keys||[]).includes(slotKey)
    &&new Date(c.starts_at)<=now&&(!c.ends_at||new Date(c.ends_at)>=now)
    &&/^https:\/\//.test(c.click_url||"")&&/^https:\/\//.test(c.creative_url||"")
    &&(!c.target_types?.length||c.target_types.includes(type))&&(!c.target_states?.length||c.target_states.includes(state))
    &&(!c.daily_impression_cap||(todayImpr[c.id]||0)<c.daily_impression_cap));
  if(!ok.length)return null;
  let r=rnd()*ok.reduce((a,c)=>a+(c.weight||1),0);
  for(const c of ok){r-=c.weight||1;if(r<0)return c}return ok[ok.length-1]}
export function renderAd(c,slot){
  if(!c)return slot?.fallback_html||"";
  return `<aside class="ad" aria-label="Advertisement"><small>Advertisement</small><a href="${esc(c.click_url)}" target="_blank" rel="sponsored noopener noreferrer" data-ad="${esc(c.id)}" data-slot="${esc(slot?.key)}"><img src="${esc(c.creative_url)}" alt="${esc(c.alt_text)}" width="${+slot?.width||300}" height="${+slot?.height||250}" loading="lazy"></a></aside>`}

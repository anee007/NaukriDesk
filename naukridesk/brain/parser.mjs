// Server-side notice parser. Node 18+. No dependencies.
export const STATES=["Andhra Pradesh","Bihar","Chhattisgarh","Delhi","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];
const MO={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
const pad=n=>String(n).padStart(2,"0");

export function pdate(s){
  let d,mo,y,m=s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if(m){d=+m[1];mo=+m[2]-1;y=+m[3]}
  else{
    m=s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})[,.\s]+(\d{4})/);
    if(!m||MO[m[2].slice(0,3).toLowerCase()]==null)return null;
    d=+m[1];mo=MO[m[2].slice(0,3).toLowerCase()];y=+m[3];
  }
  const dt=new Date(Date.UTC(y,mo,d));
  if(dt.getUTCMonth()!==mo||dt.getUTCDate()!==d)return null; // rejects 31 Feb etc.
  return `${y}-${pad(mo+1)}-${pad(d)}`;
}

export function parseNotice(text){
  const L=text.split(/\n+/).map(s=>s.trim()).filter(Boolean), f={};
  f.title=(L[0]||"").slice(0,160);
  f.type=/admit card|hall ticket|city intimation/i.test(text)?"admit":/answer key/i.test(text)?"key":
    /syllabus|exam pattern/i.test(text)?"syl":/\bresult\b|merit list|score ?card/i.test(text)?"result":
    /admission|counsell?ing|entrance/i.test(text)?"adm":"job";
  const p=text.match(/(\d[\d,]*)\s*(?:posts|vacanc|seats)/i)||text.match(/(?:vacanc(?:y|ies)|total posts)[^\d]{0,15}(\d[\d,]*)/i);
  f.total_posts=p?+p[1].replace(/,/g,""):null;
  const k=text.search(/last date|closing date|last day|apply (?:online )?(?:till|before|by)|end date/i);
  f.last_date=k>-1?pdate(text.slice(k,k+90)):null;
  f.state=STATES.find(s=>new RegExp(s,"i").test(text))||"All India";
  f.qualification=/post[\s-]?graduate|master|m\.?tech|mba/i.test(text)?"Post Graduate":
    /graduate|bachelor|degree|b\.?tech/i.test(text)?"Graduate":/diploma|\biti\b/i.test(text)?"Diploma/ITI":
    /12th|intermediate|10\+2/i.test(text)?"12th":/10th|matric/i.test(text)?"10th":"Graduate";
  f.org=L.find(s=>/commission|board|corporation|bank|railway|council|agency|university|police|authority|department/i.test(s)&&s.length<110)||L[1]||"";
  const missing=["last_date","total_posts"].filter(x=>f[x]==null);
  if(f.type==="job"&&!f.last_date&&!missing.includes("last_date"))missing.push("last_date");
  return {fields:f,missing,needsReview:true}; // never auto-publish parser output
}

export function slugify(title,date){
  const base=title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
  return date?`${base}-${date.slice(0,4)}`:base;
}

export function htmlToText(html){
  return html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi,"")
    .replace(/<\/(p|div|li|tr|h\d|br)>|<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"")
    .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();
}

// Only fetch official domains; blocks private/local hosts. Redirects are refused, not followed.
export const OFFICIAL=["gov.in","nic.in","ac.in","edu.in"];
export function assertOfficialUrl(u,allow=OFFICIAL){
  const url=new URL(u);
  if(url.protocol!=="https:")throw new Error("https required");
  const h=url.hostname.toLowerCase();
  if(/^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)||h.includes(":")||/^\d+\.\d+\.\d+\.\d+$/.test(h))
    throw new Error("private or IP host blocked");
  if(!allow.some(d=>h===d||h.endsWith("."+d)))throw new Error("domain not on official allowlist");
  return url;
}
export async function fetchNotice(u,allow){
  const url=assertOfficialUrl(u,allow);
  const r=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(10000),headers:{"user-agent":"NaukriDeskBot/1.0"}});
  if(r.status>=300&&r.status<400)throw new Error("redirect refused; submit the final URL");
  if(!r.ok)throw new Error("HTTP "+r.status);
  const text=htmlToText((await r.text()).slice(0,500000));
  const out=parseNotice(text);out.fields.source_url=u;return out;
}

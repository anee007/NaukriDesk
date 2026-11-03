import assert from "node:assert/strict";
import {parseNotice,pdate,slugify,assertOfficialUrl} from "./parser.mjs";
import {runBrain,extractLinks,validateExtraction} from "./brain.mjs";
import {MemoryStore} from "./store.mjs";
import {pickAd,renderAd} from "./ads.mjs";
// ---- parser (from v1)
const r=parseNotice("Graduate Level Recruitment 2026\nUttar Pradesh Public Service Commission\nTotal Posts: 3,500\nLast Date: 15 December 2026\nBachelor degree").fields;
assert.equal(r.last_date,"2026-12-15");assert.equal(r.total_posts,3500);assert.equal(pdate("31/02/2026"),null);
for(const b of ["http://x.gov.in","https://127.0.0.1/a","https://evil.com/a","https://gov.in.evil.com/a"])assert.throws(()=>assertOfficialUrl(b),b);
// ---- brain
const now=new Date("2026-11-02T10:00:00Z");
let jobPage=d=>`<h1>Graduate Level Recruitment 2026</h1><p>Staff Selection Commission</p><p>Total Posts: 3,500</p><p>Last Date: ${d}</p><p>Bachelor degree</p>`;
const pages={};const setPages=d=>{Object.assign(pages,{
 "https://recruit.gov.in/":`<nav><a href="/">Home page</a></nav><a href="/n/result">Constable Final Result 2026 Out</a><a href="/n/job">Graduate Level Recruitment 2026 Online Form</a><a href="/n/vac">Technical Staff Vacancy Notification</a><a href="https://evil.com/x">Recruitment scam notification</a><a href="/f/adv.pdf">Advertisement No 05 Recruitment PDF</a>`,
 "https://recruit.gov.in/n/result":"<h1>Constable Final Result</h1><p>State Police Recruitment Board</p><p>Uttar Pradesh. Final result declared.</p>",
 "https://recruit.gov.in/n/job":jobPage(d),
 "https://recruit.gov.in/n/vac":"<h1>Technical Staff Vacancy</h1><p>Apply soon, details to follow.</p>"})};
setPages("15 December 2026");
const fetchFn=async u=>pages[u]?{ok:true,status:200,text:async()=>pages[u]}:{ok:false,status:404,text:async()=>""};
const src=()=>[{id:"s1",url:"https://recruit.gov.in/",allow:["gov.in"],trust:"high"}];
assert.equal(extractLinks(pages["https://recruit.gov.in/"],"https://recruit.gov.in/").length,5);
// run 1: no LLM -> safe types auto, jobs/PDF queued, off-site link rejected
const A=new MemoryStore(src());let s=await runBrain({store:A,fetchFn,now,delayMs:0});
assert.equal(s.auto_published,1);assert.equal(s.queued,3);assert.equal(s.errors.length,1);
assert.equal(A.posts.find(p=>p.type==="result").status,"published");
assert.ok(A.posts.filter(p=>p.status==="pending_review").length===3);
// run 2: nothing changed -> everything skipped, no duplicates
s=await runBrain({store:A,fetchFn,now,delayMs:0});assert.equal(s.skipped,4);assert.equal(A.posts.length,4);
// run with LLM that agrees: job auto-publishes
const llm=async t=>validateExtraction({type:"job",title:"x",org:"Staff Selection Commission",state:"All India",qualification:"Graduate",total_posts:3500,last_date:(t.match(/15 December 2026/)?"2026-12-15":"2026-12-20")});
const B=new MemoryStore(src());s=await runBrain({store:B,fetchFn,llm,now,delayMs:0});
const job=B.posts.find(p=>p.type==="job"&&p.total_posts===3500);assert.equal(job.status,"published");assert.equal(job.auto_published,true);
// date extended on portal -> live post NOT changed silently; proposal queued
pages["https://recruit.gov.in/n/job"]=jobPage("20 December 2026");
s=await runBrain({store:B,fetchFn,llm,now,delayMs:0});
assert.equal(s.pending_changes,1);assert.equal(job.last_date,"2026-12-15");assert.equal(job.needs_review,true);
assert.equal(B.revs.at(-1).applied,false);assert.equal(B.revs.at(-1).changed.last_date.to,"2026-12-20");
// LLM that disagrees with rules -> never auto-publishes
setPages("15 December 2026");const C=new MemoryStore(src());
await runBrain({store:C,fetchFn,llm:async()=>validateExtraction({type:"job",last_date:"2027-01-01",total_posts:3500}),now,delayMs:0});
assert.notEqual(C.posts.find(p=>p.total_posts===3500).status,"published");
// bad model output is rejected
assert.equal(validateExtraction({type:"hack",last_date:null}),null);assert.equal(validateExtraction({type:"job",last_date:"2026-13-45"}),null);
// 5 failures disables a source
const D=new MemoryStore(src());for(let i=0;i<5;i++)await runBrain({store:D,fetchFn:async()=>({ok:false,status:500,text:async()=>""}),now,delayMs:0});
assert.equal(D.sources[0].enabled,false);
// ---- ads
const camps=[{id:"c1",status:"active",slot_keys:["feed_inline"],starts_at:"2026-10-01",ends_at:"2026-12-01",weight:3,click_url:"https://a.com",creative_url:"https://a.com/i.png",alt_text:'A "b"',target_states:["Bihar"]},
 {id:"c2",status:"active",slot_keys:["feed_inline"],starts_at:"2026-10-01",weight:1,click_url:"http://bad.com",creative_url:"https://a.com/i.png"},
 {id:"c3",status:"active",slot_keys:["feed_inline"],starts_at:"2027-01-01",weight:1,click_url:"https://b.com",creative_url:"https://b.com/i.png"}];
assert.equal(pickAd(camps,"feed_inline",{now,state:"Bihar"}).id,"c1");assert.equal(pickAd(camps,"feed_inline",{now,state:"Delhi"}),null);
assert.equal(pickAd(camps,"sidebar_rect",{now,state:"Bihar"}),null);assert.equal(pickAd(camps,"feed_inline",{now,state:"Bihar",todayImpr:{c1:5}}).id,"c1");
const html=renderAd(camps[0],{key:"feed_inline",width:300,height:250});assert.ok(html.includes("sponsored")&&html.includes("&#34;b&#34;"));
console.log("all tests passed");

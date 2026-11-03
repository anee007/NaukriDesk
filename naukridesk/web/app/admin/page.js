"use client";
import {useEffect,useState,useCallback} from "react";import {createClient} from "@supabase/supabase-js";
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||"http://localhost:54321",process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"anon");
export default function Admin(){
  const [user,setUser]=useState(null),[q,setQ]=useState([]),[revs,setRevs]=useState({}),[src,setSrc]=useState([]),[msg,setMsg]=useState("");
  const ok=user?.app_metadata?.role==="admin";
  const load=useCallback(async()=>{setQ((await db.from("admin_queue").select("*").limit(100)).data||[]);
    const m={};((await db.from("post_revisions").select("id,post_id,changed").eq("applied",false)).data||[]).forEach(x=>m[x.post_id]=x);setRevs(m);
    setSrc((await db.from("sources").select("*").order("created_at")).data||[])},[]);
  useEffect(()=>{db.auth.getSession().then(({data})=>setUser(data.session?.user||null));const {data:l}=db.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));return()=>l.subscription.unsubscribe()},[]);
  useEffect(()=>{if(ok)load()},[ok,load]);
  const act=async(fn,a)=>{const {error}=await db.rpc(fn,a);setMsg(error?error.message:"Done");load()};
  async function login(e){e.preventDefault();const f=new FormData(e.target),{error}=await db.auth.signInWithPassword({email:f.get("e"),password:f.get("p")});setMsg(error?error.message:"")}
  async function addSrc(e){e.preventDefault();const f=new FormData(e.target),{error}=await db.from("sources").insert({name:f.get("n"),url:f.get("u"),allow:String(f.get("a")).split(",").map(s=>s.trim()).filter(Boolean),trust:f.get("t")});setMsg(error?error.message:"Source added");if(!error)e.target.reset();load()}
  if(!user)return <div className="wrap legal"><h1>Admin login</h1><form className="filters" onSubmit={login}><input name="e" type="email" placeholder="Email" required/><input name="p" type="password" placeholder="Password" required/><button>Sign in</button></form><p>{msg}</p></div>;
  if(!ok)return <div className="wrap legal"><h1>Not authorised</h1><p>This account is not an admin.</p><button onClick={()=>db.auth.signOut()}>Sign out</button></div>;
  return <div className="wrap legal"><h1>Review queue ({q.length})</h1><p>{msg} <button onClick={()=>db.auth.signOut()}>Sign out</button></p>
    {q.map(p=>{const r=revs[p.id];return <div key={p.id} className="qrow"><b>{p.title}</b><div className="org">{p.type} · {p.org} · confidence {p.confidence} · last date {p.last_date||"—"}</div>
      <div className="org">{p.review_reason}</div>{r&&<pre>{JSON.stringify(r.changed)}</pre>}<a href={p.source_url} target="_blank" rel="noopener noreferrer">Open source ↗</a>{" "}
      {!r&&<button onClick={()=>act("approve_post",{p_id:p.id})}>Approve</button>}{r&&<button onClick={()=>act("apply_revision",{p_rev:r.id})}>Apply change</button>}{" "}
      <button onClick={()=>act("reject_post",{p_id:p.id})}>Reject</button></div>})}
    <h2>Sources</h2>{src.map(s=><div key={s.id} className="qrow">{s.name} · {s.url} · {s.enabled?"on":"OFF"} · fails {s.fail_count} <button onClick={async()=>{await db.from("sources").update({enabled:!s.enabled,fail_count:0}).eq("id",s.id);load()}}>{s.enabled?"Disable":"Enable"}</button></div>)}
    <form className="filters" onSubmit={addSrc}><input name="n" placeholder="Name" required/><input name="u" type="url" placeholder="https://listing-page" required/><input name="a" placeholder="allowed domains, comma separated" required/><select name="t"><option>low</option><option>high</option></select><button>Add source</button></form></div>}

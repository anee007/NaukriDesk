import Link from "next/link";import {listPosts} from "@/lib/db";import {TYPES,STATES,QUALS} from "@/lib/format";import PostCard from "@/components/PostCard";import AdSlot from "@/components/AdSlot";
export const metadata={alternates:{canonical:"/"}};
export default async function Home({searchParams}){
  const sp=await searchParams,pg=Math.max(1,+sp.page||1),type=TYPES[sp.type]?sp.type:undefined;
  const {rows,count}=await listPosts({type,q:sp.q,state:sp.state,qual:sp.qual,page:pg-1});
  const qs=(o)=>{const u=new URLSearchParams({...Object.fromEntries(Object.entries(sp).filter(([,v])=>typeof v==="string")),...o});return "/?"+u};
  return <>
    <section className="hero"><div className="wrap"><h1>Every government update, <em>one clean place.</em></h1><p>Jobs, results, admit cards, answer keys and syllabus, each linked to its official notice.</p>
      <form className="filters" action="/"><input name="q" defaultValue={sp.q||""} placeholder="Search exam, department or state…" aria-label="Search"/>
        <select name="type" defaultValue={type||""}><option value="">All types</option>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v[0]}</option>)}</select>
        <select name="state" defaultValue={sp.state||""}><option value="">All states</option>{STATES.map(s=><option key={s}>{s}</option>)}</select>
        <select name="qual" defaultValue={sp.qual||""}><option value="">Any qualification</option>{QUALS.map(s=><option key={s}>{s}</option>)}</select><button>Search</button></form></div></section>
    <div className="wrap"><AdSlot slot="header_leaderboard"/><AdSlot slot="header_mobile"/>
      <p className="cnt">{count.toLocaleString("en-IN")} updates{type?` in ${TYPES[type][0]}`:""}</p>
      {rows.length?<div className="grid">{rows.flatMap((p,i)=>[<PostCard key={p.id} p={p}/>,...(i%6===5?[<div key={"a"+i} className="adcell"><AdSlot slot="feed_inline" type={p.type} state={p.state}/></div>]:[])])}</div>
        :<p className="empty">No matching updates yet.</p>}
      <nav className="pager">{pg>1&&<Link href={qs({page:pg-1})}>← Newer</Link>}{pg*24<count&&<Link href={qs({page:pg+1})}>Older →</Link>}</nav></div>
    <div className="mobile-sticky"><AdSlot slot="mobile_sticky"/></div></>}

import Link from "next/link";import {TYPES,deadline} from "@/lib/format";
export default function PostCard({p}){const d=deadline(p.last_date),t=TYPES[p.type]||TYPES.job;
  return <Link href={`/post/${p.slug}`} className={`card t-${p.type}`}><span className="badge">{t[1]} {t[0]}</span><h3>{p.title}</h3><div className="org">{p.org}</div>
    <div className="meta"><span>{p.state}</span><span>{p.qualification}</span>{p.total_posts?<span>{p.total_posts.toLocaleString("en-IN")} posts</span>:null}</div>{d&&<div className={`dl ${d.c}`}>{d.t}</div>}</Link>}

import {notFound} from "next/navigation";import {getPost} from "@/lib/db";import {TYPES,deadline,fmtDate,daysLeft} from "@/lib/format";import AdSlot from "@/components/AdSlot";
export const revalidate=300;
export const dynamicParams=true;
export async function generateStaticParams(){return[]}
export async function generateMetadata({params}){const {slug}=await params,p=await getPost(slug);if(!p)return{title:"Not found",robots:{index:false}};
  const d=`${p.title} – ${p.org}. ${p.last_date?"Last date "+fmtDate(p.last_date)+". ":""}Check eligibility, dates and the official notice link.`;
  return{title:p.title,description:d.slice(0,158),alternates:{canonical:`/post/${p.slug}`},openGraph:{title:p.title,description:d.slice(0,158),type:"article"}}}
export default async function Post({params}){
  const {slug}=await params,p=await getPost(slug);if(!p)notFound();
  const d=deadline(p.last_date),t=TYPES[p.type]||TYPES.job,host=new URL(p.source_url).hostname;
  const ld=p.type==="job"&&p.last_date&&daysLeft(p.last_date)>=0?{"@context":"https://schema.org","@type":"JobPosting",title:p.title,description:`${p.title} recruitment by ${p.org}. Qualification: ${p.qualification}.`,datePosted:(p.published_at||p.created_at).slice(0,10),validThrough:p.last_date,hiringOrganization:{"@type":"Organization",name:p.org||host},jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",addressCountry:"IN",addressRegion:p.state}}}:null;
  return <div className="wrap post"><article>
    {ld&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,"\\u003c")}}/>}
    <span className="badge">{t[1]} {t[0]}</span><h1>{p.title}</h1><p className="org">{p.org} · {p.state}</p>{d&&<p className={`dl ${d.c}`}>{d.t}</p>}
    <AdSlot slot="post_top" type={p.type} state={p.state}/>
    <table><tbody><tr><th>Organisation</th><td>{p.org||"—"}</td></tr><tr><th>Qualification</th><td>{p.qualification}</td></tr><tr><th>State</th><td>{p.state}</td></tr>
      {p.total_posts?<tr><th>Total posts</th><td>{p.total_posts.toLocaleString("en-IN")}</td></tr>:null}{p.last_date?<tr><th>Last date</th><td>{fmtDate(p.last_date)}</td></tr>:null}
      <tr><th>Source</th><td>{host}</td></tr><tr><th>Last updated</th><td>{fmtDate(p.updated_at.slice(0,10))}</td></tr></tbody></table>
    <a className="btn" href={p.source_url} target="_blank" rel="noopener noreferrer">Open official notice ↗</a>
    <p className="note">Details are compiled from the official notice linked above. Confirm age limit, fee and dates there before applying.</p>
    <AdSlot slot="post_bottom" type={p.type} state={p.state}/></article>
    <aside><AdSlot slot="sidebar_rect" type={p.type} state={p.state}/></aside></div>}

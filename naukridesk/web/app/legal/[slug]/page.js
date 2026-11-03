import {notFound} from "next/navigation";
const E=process.env.NEXT_PUBLIC_CONTACT_EMAIL||"contact@example.com";
const P={
 about:["About NaukriDesk",["NaukriDesk collects government recruitment, result and admit card notices and links each one to its official source.","We are an independent portal and are not affiliated with any government department."]],
 privacy:["Privacy Policy",["We do not require you to create an account to read notices.","Our hosting provider records standard server logs. Third-party advertising partners, such as Google AdSense, may use cookies to show and measure ads. You can manage ad personalisation in your Google ad settings.","We store no personal data beyond what you send us by email.",`For privacy requests write to ${E}.`]],
 disclaimer:["Disclaimer",["NaukriDesk is not a government website. Information is compiled from official notices and may contain errors or become outdated.","Always verify eligibility, dates and fees on the official notification before applying. We are not responsible for decisions made using this information."]],
 contact:["Contact",[`Email: ${E}`,"Corrections are reviewed quickly; include the page link and the official source."]]};
export const generateStaticParams=()=>Object.keys(P).map(slug=>({slug}));
export async function generateMetadata({params}){const {slug}=await params;return P[slug]?{title:P[slug][0],alternates:{canonical:`/legal/${slug}`}}:{}}
export default async function Legal({params}){const {slug}=await params;if(!P[slug])notFound();
  return <div className="wrap legal"><h1>{P[slug][0]}</h1>{P[slug][1].map((t,i)=><p key={i}>{t}</p>)}</div>}

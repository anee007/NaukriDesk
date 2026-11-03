import "./globals.css";import Link from "next/link";import Script from "next/script";import {SITE} from "@/lib/db";
export const metadata={metadataBase:new URL(SITE),title:{default:"NaukriDesk – Government Jobs, Results & Admit Cards",template:"%s | NaukriDesk"},
  description:"Latest government job notifications, results, admit cards, answer keys and syllabus with official source links.",openGraph:{siteName:"NaukriDesk",type:"website",locale:"en_IN"}};
export default function Root({children}){const ad=process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return <html lang="en"><body>
    {ad&&<Script async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ad}`}/>}
    <header><div className="bar"><Link href="/" className="logo">NaukriDesk</Link><nav>{[["job","Jobs"],["result","Results"],["admit","Admit Cards"],["key","Answer Keys"]].map(([k,l])=><Link key={k} href={`/?type=${k}`}>{l}</Link>)}</nav></div></header>
    <main>{children}</main>
    <footer><div>{["about","privacy","disclaimer","contact"].map(s=><Link key={s} href={`/legal/${s}`}>{s[0].toUpperCase()+s.slice(1)}</Link>)}</div>
      <p>NaukriDesk is an independent information portal and is not affiliated with any government body. Always verify details on the official notification.</p></footer>
  </body></html>}

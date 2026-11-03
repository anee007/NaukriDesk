"use client";
import {useEffect,useRef} from "react";
export default function AdBeacon({c,s}){const r=useRef(null);
  useEffect(()=>{const el=r.current;if(!el||!("IntersectionObserver" in window))return;
    const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){o.disconnect();fetch("/api/ad",{method:"POST",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify({c,s})}).catch(()=>{})}},{threshold:.5});
    o.observe(el);return()=>o.disconnect()},[c,s]);
  return <span ref={r} className="beacon"/>}

// Two storage backends with the same interface: MemoryStore (tests) and SupabaseStore (PostgREST).
export class MemoryStore{
  constructor(sources){this.sources=sources;this.raw=new Set();this.posts=[];this.revs=[];this.n=0}
  async getSources(){return this.sources.filter(s=>s.enabled!==false)}
  async hasRaw(u,h){return this.raw.has(u+"|"+h)}
  async saveRaw(o){this.raw.add(o.url+"|"+o.content_hash)}
  async findPost(k){return this.posts.find(p=>p.dedupe_key===k)||null}
  async insertPost(p){const r={id:"id"+(++this.n),needs_review:false,...p};this.posts.push(r);return r}
  async updatePost(id,p){Object.assign(this.posts.find(x=>x.id===id),p)}
  async addRevision(o){this.revs.push(o)}
  async markSource(id,ok,err){const s=this.sources.find(x=>x.id===id);s.fail_count=ok?0:(s.fail_count||0)+1;s.last_error=ok?null:err;if(s.fail_count>=5)s.enabled=false}
}
export class SupabaseStore{
  constructor(url,serviceKey,fetchFn=fetch){this.url=url.replace(/\/$/,"");this.key=serviceKey;this.f=fetchFn}
  async q(path,o={}){
    const r=await this.f(`${this.url}/rest/v1/${path}`,{...o,headers:{apikey:this.key,Authorization:`Bearer ${this.key}`,"content-type":"application/json",Prefer:"return=representation",...(o.headers||{})}});
    if(!r.ok)throw new Error(`db ${r.status}: ${await r.text()}`);const t=await r.text();return t?JSON.parse(t):null}
  getSources(){return this.q("sources?enabled=eq.true&select=*")}
  async hasRaw(u,h){return (await this.q(`raw_items?url=eq.${encodeURIComponent(u)}&content_hash=eq.${h}&select=id`)).length>0}
  async saveRaw(o){await this.q("raw_items",{method:"POST",body:JSON.stringify(o)})}
  async findPost(k){return (await this.q(`posts?dedupe_key=eq.${k}&select=*`))[0]||null}
  async insertPost(p){return (await this.q("posts",{method:"POST",body:JSON.stringify(p)}))[0]}
  async updatePost(id,p){await this.q(`posts?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(p)})}
  async addRevision(o){await this.q("post_revisions",{method:"POST",body:JSON.stringify(o)})}
  async markSource(id,ok,err){
    const cur=(await this.q(`sources?id=eq.${id}&select=fail_count`))[0]?.fail_count||0,fc=ok?0:cur+1;
    await this.q(`sources?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(ok?{fail_count:0,last_ok:new Date().toISOString(),last_error:null}:{fail_count:fc,last_error:String(err).slice(0,300),enabled:fc<5})})}
}

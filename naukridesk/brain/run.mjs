// Entry point for a cron job (every 30 min). Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY (optional)
import {runBrain,claudeExtractor} from "./brain.mjs";
import {SupabaseStore} from "./store.mjs";
const {SUPABASE_URL:u,SUPABASE_SERVICE_KEY:k,ANTHROPIC_API_KEY:a}=process.env;
if(!u||!k){console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY");process.exit(1)}
const stats=await runBrain({store:new SupabaseStore(u,k),llm:a?claudeExtractor({apiKey:a}):null});
console.log(JSON.stringify(stats,null,1));process.exit(stats.errors.length>20?1:0);

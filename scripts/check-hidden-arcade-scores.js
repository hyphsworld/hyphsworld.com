const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
test('Hidden Arcade saves cleared and missed practice runs through the zero-CP server endpoint',async()=>{
 const calls=[],storage=new Map(),nodes=new Map();let actions=[];
 const client={rpc:async(name,args)=>{calls.push({name,args});return name==='submit_game_run'?{data:{ok:true,points_delta:0,balance:5},error:null}:{data:null,error:{message:'No authoritative reward'}};},from(){throw Error('Direct score INSERT must never be used');}};
 function node(id){if(!nodes.has(id)){const item={textContent:'',disabled:false,appendChild(){},addEventListener(){}};Object.defineProperty(item,'innerHTML',{set(value){if(id==='casinoControls')actions=[...value.matchAll(/data-action="([^"]+)"/g)].map(m=>({dataset:{action:m[1]},disabled:false}));}});nodes.set(id,item);}return nodes.get(id);}
 const window={HW_SUPABASE_CONFIG:{url:'https://fixture.supabase.co',anonKey:'fixture-public'},supabase:{createClient:()=>client},HWAuth:{getCurrentUser:async()=>({userId:'owner',email:'fixture@example.test',provider:'supabase',coolPoints:5}),getClient:async()=>client}};
 const context=vm.createContext({window,document:{readyState:'complete',getElementById:node,querySelectorAll:()=>actions,createElement:()=>({}),scripts:[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console:{warn(){}},Intl,Math:Object.assign(Object.create(Math),{random:()=>0}),crypto:webcrypto,setTimeout});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../casino-arcade.js'),'utf8'),context);
 const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};await flush();
 actions.find(n=>n.dataset.action==='start-hidden').onclick();await actions.find(n=>n.dataset.action==='choice-1').onclick();await flush();
 assert.ok(!node('casinoStatus').textContent.includes('Score could not be saved'));
 actions.find(n=>n.dataset.action==='start-hidden').onclick();await actions.find(n=>n.dataset.action==='choice-0').onclick();await flush();
 const saved=calls.filter(c=>c.name==='submit_game_run');assert.equal(saved.length,2);assert.deepEqual(saved.map(x=>x.args.p_metadata.result),['missed','cleared']);for(const c of saved){assert.equal(c.args.p_points_delta,0);assert.equal(c.args.p_game_key,'hidden_arcade_code-path');assert.match(c.args.p_metadata.submission_id,/^[0-9a-f-]{36}$/);}assert.notEqual(saved[0].args.p_metadata.submission_id,saved[1].args.p_metadata.submission_id);assert.equal(node('casinoPoints').textContent,'5');assert.ok(!node('casinoStatus').textContent.includes('Score could not be saved'));
});

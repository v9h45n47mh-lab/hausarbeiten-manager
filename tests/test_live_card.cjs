const assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');const {window}=parseHTML('<html><body></body></html>');
vm.runInNewContext(readFileSync(path.join(__dirname,'../custom_components/hausarbeiten_manager/frontend/card.js'),'utf8'),{window,HTMLElement:window.HTMLElement,customElements:window.customElements,Intl,Date,setInterval:()=>1,clearInterval:()=>{},Number,JSON,String,Set});
const Card=window.customElements.get('hausarbeiten-manager-card');
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve))};
let revision=0,done=false;const listeners=new Set();
const snapshot=person=>({revision,today:'2026-11-10',parent:person==='Vera',settings_allowed:person==='Vera',person,tasks:[],vacations:[],vacation_active:false,occurrences:[{id:'one',task_id:'one',person:'Paul',title:'Zimmer',date:'2026-11-10',description:'',completed:done}]});
const broadcast=()=>[...listeners].forEach(cb=>cb({}));
const api=person=>({user:{id:person},connection:{subscribeMessage:async(cb,msg)=>{assert.equal(msg.type,'hausarbeiten_manager/subscribe');listeners.add(cb);queueMicrotask(()=>cb({}));return ()=>listeners.delete(cb)}},callWS:async msg=>{
 if(msg.type!=='hausarbeiten_manager/get'){assert.equal(msg.revision,revision);done=msg.type.endsWith('/complete');revision++;broadcast();}
 return snapshot(person);
}});
(async()=>{
const parent=new Card(),child=new Card();parent.setConfig({});child.setConfig({});parent.hass=api('Vera');child.hass=api('Paul');parent.connectedCallback();child.connectedCallback();await flush();
assert.equal(listeners.size,2);assert.equal(parent.shadowRoot.querySelector('.assignee.completed'),null);
await child.mutate('complete',{task_id:'one',person:'Paul',date:'2026-11-10'});await flush();
assert.ok(parent.shadowRoot.querySelector('.assignee.completed'));assert.ok(child.shadowRoot.querySelector('.row.completed'));
assert.equal(parent._data.revision,1);
await child.mutate('reopen',{task_id:'one',person:'Paul',date:'2026-11-10'});await flush();
assert.equal(parent.shadowRoot.querySelector('.assignee.completed'),null);
// Updates refresh the revision without replacing an open form.
const dialog=window.document.createElement('dialog');dialog.setAttribute('open','');dialog.innerHTML='<input value="Ungespeicherter Text">';parent.shadowRoot.append(dialog);
done=true;revision++;broadcast();await flush();assert.equal(parent._data.revision,3);assert.equal(dialog.querySelector('input').value,'Ungespeicherter Text');assert.equal(parent._renderPending,true);
dialog.remove();parent.render();assert.ok(parent.shadowRoot.querySelector('.assignee.completed'));
// A second push during an in-flight GET must trigger a fresh GET afterwards.
let resolveOld;const oldSnapshot=snapshot('Vera');let first=true;parent._hass.callWS=()=>first?(first=false,new Promise(resolve=>resolveOld=resolve)):Promise.resolve(snapshot('Vera'));
parent.load();done=false;revision++;broadcast();resolveOld(oldSnapshot);await flush();assert.equal(parent._data.revision,4);assert.equal(parent.shadowRoot.querySelector('.assignee.completed'),null);
parent.disconnectedCallback();child.disconnectedCallback();await flush();assert.equal(listeners.size,0);
// Pending subscriptions must be cancelled if the card disappears before setup resolves.
let finishSub,unsubscribed=0;const pending=new Card();pending.setConfig({});pending.hass={user:{id:'Paul'},callWS:async()=>snapshot('Paul'),connection:{subscribeMessage:()=>new Promise(resolve=>finishSub=resolve)}};pending.connectedCallback();pending.disconnectedCallback();finishSub(()=>unsubscribed++);await flush();assert.equal(unsubscribed,1);
// A denied subscription preserves ordinary authenticated GET fallback.
const denied=new Card();denied.setConfig({});denied.hass={user:{id:'Paul'},callWS:async()=>snapshot('Paul'),connection:{subscribeMessage:async()=>{throw Error('denied')}}};denied.connectedCallback();await flush();assert.equal(denied._data.revision,4);denied.disconnectedCallback();
console.log('Live DOM checks passed: two clients, complete/reopen, no form loss, in-flight refresh, subscription cleanup and fallback.');
})().catch(error=>{console.error(error);process.exit(1)});

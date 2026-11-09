/* Development-only dependency: linkedom. */
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const {window}=parseHTML('<html><body></body></html>');
vm.runInNewContext(readFileSync(path.join(__dirname,'../custom_components/hausarbeiten_manager/frontend/card.js'),'utf8'),{
 window,HTMLElement:window.HTMLElement,customElements:window.customElements,Intl,Date,setInterval,clearInterval,FormData,Number,JSON,String});
const Card=window.customElements.get('hausarbeiten-manager-card');
const snapshot={revision:0,today:'2026-11-09',person:'Paul',parent:false,settings_allowed:false,people:['Paul'],tasks:[{
 id:'t',title:'Eigenes Zimmer',assignees:['Paul'],start:'2026-11-09',end:'',kind:'daily',interval:1,weekdays:[0],nth:1,editable:true}],
 occurrences:[{id:'t|Paul|2026-11-09',task_id:'t',person:'Paul',date:'2026-11-09',title:'Eigenes Zimmer',description:'<img src=x onerror=alert(1)>'}],vacation_active:false,vacations:[]};
(async()=>{
 const calls=[];
 const card=new Card();card.setConfig({});card._user='p';card._hass={user:{id:'p'},callWS:async message=>{
  calls.push(message);return {...snapshot,revision:1,occurrences:[]};}};card._data=snapshot;card.render();
 assert.equal(card.shadowRoot.querySelectorAll('.day').length,1);
 assert.equal(card.shadowRoot.querySelectorAll('[data-tab="settings"]').length,0);
 assert.equal(card.shadowRoot.querySelectorAll('[data-vacation]').length,0);
 assert.equal(card.shadowRoot.querySelectorAll('img,script').length,0);
 assert.equal(card.shadowRoot.querySelectorAll('[data-done]').length,1);
 card.shadowRoot.querySelector('[data-done]').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls[0].type,'hausarbeiten_manager/complete');assert.equal(calls[0].person,'Paul');
 assert.equal(card.shadowRoot.querySelectorAll('[data-done]').length,0);
 assert.equal(card.shadowRoot.querySelectorAll('.day').length,0);
 assert.match(card.shadowRoot.querySelector('.empty').textContent,/Keine offenen Hausarbeiten/);
 card._data={...snapshot,parent:true,settings_allowed:true,person:'Vera'};card.render();
 assert.equal(card.shadowRoot.querySelectorAll('[data-vacation]').length,0);
 assert.equal(card.shadowRoot.querySelectorAll('[data-tab="settings"]').length,1);
 card.shadowRoot.querySelector('[data-tab="settings"]').click();
 assert.equal(card.shadowRoot.querySelectorAll('[data-vacation]').length,1);
 assert.equal(card.shadowRoot.querySelectorAll('[data-add]').length,0);
 // Settings close when the role loses settings permission.
 card._data={...snapshot,parent:true,settings_allowed:false,person:'Administrator'};card.render();
 assert.equal(card._tab,'calendar');
 assert.equal(card.shadowRoot.querySelectorAll('[data-tab="settings"],[data-vacation]').length,0);
 card._data={...snapshot,parent:true,settings_allowed:true,person:'Manuel'};card.render();
 card.shadowRoot.querySelector('[data-tab="settings"]').click();
 assert.equal(card.shadowRoot.querySelectorAll('[data-vacation]').length,1);
 card.shadowRoot.querySelector('[data-tab="tasks"]').click();
 assert.equal(card.shadowRoot.querySelectorAll('[data-edit]').length,1);
 assert.equal(card.shadowRoot.querySelectorAll('[data-delete]').length,1);
 card._data={...snapshot,parent:false,person:'Paul',tasks:snapshot.tasks.map(t=>({...t,editable:false}))};card.render();
 assert.equal(card.shadowRoot.querySelectorAll('[data-edit],[data-delete]').length,0);
 // Changing user must clear the previous person's view before the response.
 let resolve;card._hass.callWS=()=>new Promise(r=>resolve=r);
 card.hass={...card._hass,user:{id:'max'}};
 assert.equal(card._data,null);
 assert.equal(card.shadowRoot.querySelectorAll('[data-done]').length,0);
 resolve({...snapshot,person:'Maximilian'});await new Promise(r=>setImmediate(r));
 assert.equal(card._data.person,'Maximilian');
 card.disconnectedCallback();
 console.log('Frontend DOM checks passed: nonempty days, completion, Vera/Manuel settings, role changes, escaping, user switching.');
})().catch(e=>{console.error(e);process.exit(1)});

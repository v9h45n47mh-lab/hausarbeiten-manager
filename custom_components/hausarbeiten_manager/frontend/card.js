/* Hausarbeiten Manager 0.2.2 — no external frontend dependencies. */
const HM_VERSION='0.2.2';
const hmEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hmDays=['Mo','Di','Mi','Do','Fr','Sa','So'];
const hmLabel=t=>{
 if(t.kind==='once')return 'Einmalig';
 if(t.kind==='daily')return t.interval===1?'Täglich':`Alle ${t.interval} Tage`;
 if(t.kind==='weekly')return `${t.interval===1?'Jede Woche':`Alle ${t.interval} Wochen`} · ${t.weekdays.map(w=>hmDays[w]).join(', ')}`;
 if(t.kind==='yearly')return `${t.interval===1?'Jährlich':`Alle ${t.interval} Jahre`} · ${new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long'}).format(new Date(t.start+'T12:00:00'))}`;
 const prefix=t.interval===1?'Monatlich':`Alle ${t.interval} Monate`;
 return t.kind==='monthly_date'?`${prefix} · am ${Number(t.start.slice(8))}. Tag`:`${prefix} · ${t.nth===-1?'Letzter':t.nth+'.'} ${t.weekdays.map(w=>hmDays[w]).join(', ')}`;
};
const HM_STYLE=`
.row.completed .main strong,.row.completed .description,.assignee.completed{text-decoration:line-through;color:var(--hm-muted)}.complete[aria-pressed="true"]{color:var(--success-color,#43a047)}

.repeat-toggle{display:inline-flex;align-items:center;gap:8px;margin:4px 0 10px;padding:8px 12px;border-radius:6px;background:var(--secondary-background-color,#f2f2f2);font-size:13px;cursor:pointer}.repeat-toggle input{width:18px;min-height:18px;accent-color:var(--hm-accent)}.repeat-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 12px}.repeat-line>span{font-size:12px;color:var(--hm-muted)}.repeat-line input{width:70px}.repeat-line select{width:110px}.repeat-weekdays{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.repeat-weekdays label{cursor:pointer;position:relative}.repeat-weekdays input{position:absolute;opacity:0;width:1px;min-height:1px}.repeat-weekdays span{display:grid;place-items:center;width:34px;height:34px;background:var(--secondary-background-color,#eee);font-size:13px;border-radius:3px}.repeat-weekdays input:checked+span{background:var(--hm-accent);color:var(--text-primary-color,#fff)}.repeat-weekdays input:focus-visible+span{outline:2px solid var(--hm-accent);outline-offset:2px}.repeat-until input{max-width:220px}.recurrence-controls[hidden],.repeat-weekdays[hidden],.recurrence[hidden]{display:none}

.settings-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 0;border-bottom:1px solid var(--hm-line)}.settings-row strong{font-size:14px;font-weight:500}.vacation-switch{appearance:none;position:relative;width:36px!important;min-height:20px!important;height:20px;border:0;border-radius:12px;background:var(--disabled-text-color,#9e9e9e);padding:0;cursor:pointer;flex-shrink:0}.vacation-switch:before{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:white;transition:transform .15s}.vacation-switch:checked{background:var(--hm-accent)}.vacation-switch:checked:before{transform:translateX(16px)}.assignee{font-size:12px;color:var(--hm-muted);padding:6px 8px}

:host{display:block;color:var(--primary-text-color,#212121);font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);font-size:14px;--hm-accent:var(--primary-color,#03a9f4);--hm-muted:var(--secondary-text-color,#727272);--hm-line:var(--divider-color,#e0e0e0);--hm-bg:var(--ha-card-background,var(--card-background-color,#fff))}*{box-sizing:border-box}ha-card{display:block;background:var(--hm-bg);border:var(--ha-card-border-width,1px) solid var(--ha-card-border-color,var(--hm-line));border-radius:var(--ha-card-border-radius,12px);overflow:hidden;box-shadow:var(--ha-card-box-shadow,none)}button,input,select,textarea{font:inherit}button{border:0;background:transparent;color:var(--hm-accent);border-radius:20px;padding:9px 13px;cursor:pointer;font-weight:500;line-height:1.4;min-height:40px}button:disabled{opacity:.45;cursor:default}button:hover{background:color-mix(in srgb,var(--hm-accent) 8%,transparent)}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--hm-accent);outline-offset:2px}.primary{background:var(--hm-accent);color:var(--text-primary-color,#fff)}button.primary:hover{filter:brightness(.95);background:var(--hm-accent)}.danger{color:var(--error-color,#db4437)}.header{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--hm-line);min-height:56px}.header ha-icon{color:var(--hm-accent);--mdc-icon-size:24px}.title{font-size:16px;font-weight:500;flex:1;min-width:0}.identity{font-size:12px;color:var(--hm-muted)}.tabs{display:flex;padding:0 8px;border-bottom:1px solid var(--hm-line)}.tabs button{border-radius:0;border-bottom:2px solid transparent;color:var(--hm-muted);padding:13px 12px;white-space:nowrap}.tabs button.settings-button{margin-left:auto;padding:10px;display:grid;place-items:center;min-width:44px}.settings-button ha-icon{--mdc-icon-size:22px}.tabs .active{color:var(--hm-accent);border-bottom-color:var(--hm-accent)}.content{padding:0 16px 12px}.toolbar{display:flex;gap:8px;align-items:center;padding:8px 0;flex-wrap:wrap}.toolbar .add{margin-left:auto}.pill{font-size:12px;color:var(--hm-muted);padding:5px 10px;border:1px solid var(--hm-line);border-radius:16px}.vacation-banner{font-size:13px;color:var(--hm-accent);padding:10px 12px;margin-bottom:8px;border-radius:6px;background:color-mix(in srgb,var(--hm-accent) 8%,transparent);line-height:1.5}.empty{padding:20px 0;color:var(--hm-muted);font-size:13px;line-height:1.6}.day{border-top:1px solid var(--hm-line)}.day-head{list-style:none;cursor:pointer}.day-head::-webkit-details-marker{display:none}.day-arrow{color:var(--hm-muted)}details[open]>.day-head .day-arrow{transform:rotate(180deg)}.checks{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.checks .complete{width:auto;display:flex;gap:5px;font-size:12px}.day-head{display:flex;gap:8px;align-items:center;padding:12px 0 6px}.day-head strong{font-size:13px;font-weight:500}.day-head small{margin-left:auto;color:var(--hm-muted);font-size:12px}.day.today .day-head strong{color:var(--hm-accent)}.row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--hm-line)}.row:last-child{border-bottom:0}.main{flex:1;min-width:0;overflow-wrap:anywhere}.main strong{font-size:14px;font-weight:500;display:block;line-height:1.5}.main small{display:block;font-size:12px;color:var(--hm-muted);line-height:1.5;margin-top:2px}.main .description{font-size:12px;color:var(--hm-muted);white-space:pre-wrap;line-height:1.5;margin-top:4px}.complete{display:grid;place-items:center;width:40px;min-width:40px;padding:8px;align-self:flex-start}.complete svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7}.row .icon{padding:7px;min-width:36px;display:grid;place-items:center}.icon ha-icon{--mdc-icon-size:20px}.error{font-size:13px;color:var(--error-color,#db4437);padding:10px 0;line-height:1.5}.footer{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:var(--hm-muted);padding-top:12px}.footer button{font-size:12px;min-height:32px;padding:5px 8px}.smallnote{font-size:12px;color:var(--hm-muted);line-height:1.6;margin:0 0 12px}dialog{width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto;border:1px solid var(--hm-line);border-radius:14px;padding:0;background:var(--hm-bg);color:var(--primary-text-color,#212121);box-shadow:0 12px 50px #0003}dialog::backdrop{background:#0006}.dialog-head{padding:18px 20px 12px;display:flex;align-items:center;gap:12px}.dialog-head strong{font-size:18px;font-weight:500;flex:1}.form{padding:0 20px 16px}.field{display:flex;flex-direction:column;gap:6px;margin:12px 0}.field>span{font-size:12px;color:var(--hm-muted)}input,select,textarea{width:100%;min-width:0;border:1px solid var(--hm-line);background:var(--hm-bg);color:inherit;border-radius:6px;padding:10px;min-height:42px}textarea{resize:vertical;min-height:72px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.choices{display:flex;gap:12px;flex-wrap:wrap}.choices label{display:flex;align-items:center;gap:6px;font-size:13px;min-height:36px}.choices input{width:18px;min-height:18px;accent-color:var(--hm-accent)}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.form-error{color:var(--error-color,#db4437);font-size:13px;line-height:1.5}.field[hidden],.grid[hidden]{display:none}@media(max-width:400px){.header{padding:12px;gap:8px}.content{padding:0 12px 12px}.identity{font-size:11px}.tabs button{padding:12px 10px}.form{padding:0 14px 14px}.dialog-head{padding:16px 14px 10px}.grid{gap:8px}.title{font-size:15px}}
`;
class HausarbeitenManagerCard extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this._tab='calendar';this._busy=false;this._timer=null;this._error='';this._user=null;this._seq=0;this._closedDays=new Set();this._groups=[];}
 setConfig(config){this._config={title:'Hausarbeiten',...config};this.render();}
 set hass(hass){this._hass=hass;const user=hass.user?.id;if(user!==this._user){this._seq++;this._user=user;this._data=null;this._loading=false;this.render();this.load();}else if(!this._data&&!this._loading)this.load();}
 connectedCallback(){if(!this._timer)this._timer=setInterval(()=>this.load(),15000);if(this._hass&&!this._data)this.load();}
 disconnectedCallback(){clearInterval(this._timer);this._timer=null;this._seq++;this._loading=false;}
 getCardSize(){return 7;}
 static getStubConfig(){return {title:'Hausarbeiten'};}
 async load(){if(!this._hass||this._loading||this._busy||this.shadowRoot.querySelector('dialog[open]'))return;this._loading=true;const seq=this._seq;try{const data=await this._hass.callWS({type:'hausarbeiten_manager/get'});if(seq!==this._seq)return;const changed=JSON.stringify(this._data)!==JSON.stringify(data);this._data=data;this._error='';if(changed&&!this.shadowRoot.querySelector('dialog[open]'))this.render();}catch(e){if(seq===this._seq){this._error=e.message||'Verbindung fehlgeschlagen.';if(!this.shadowRoot.querySelector('dialog[open]'))this.render();}}finally{if(seq===this._seq)this._loading=false;}}
 async mutate(type,data){if(this._busy)return;this._busy=true;const seq=this._seq;this.shadowRoot.querySelectorAll('button').forEach(b=>b.disabled=true);try{const result=await this._hass.callWS({type:'hausarbeiten_manager/'+type,revision:this._data.revision,...data});if(seq!==this._seq)return;this._data=result;this._error='';this.render();}catch(e){if(seq!==this._seq)return;this._error=e.message||'Speichern fehlgeschlagen.';const error=this.shadowRoot.querySelector('.form-error');if(error)error.textContent=this._error;else this.render();}finally{this._busy=false;this.shadowRoot.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 dayTitle(day){const d=new Date(day+'T12:00:00');return new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(d);}
 calendar(){
 const rows=this._data.occurrences;this._groups=[];let out='';
 for(let i=0;i<7;i++){
 const date=new Date(this._data.today+'T12:00:00');date.setDate(date.getDate()+i);
 const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const entries=rows.filter(r=>r.date===day);if(!entries.length)continue;
 const groups=[];
 for(const row of entries){let group=this._data.parent?groups.find(g=>g.title===row.title):null;if(!group){group={title:row.title,rows:[]};groups.push(group);}group.rows.push(row);}
 out+=`<details class="day ${i===0?'today':''}" data-day="${day}" ${this._closedDays.has(day)?'':'open'}><summary class="day-head"><strong>${i===0?'Heute · ':i===1?'Morgen · ':''}${hmEsc(this.dayTitle(day))}</strong><small>${entries.filter(r=>!r.completed).length} offen${entries.some(r=>r.completed)?` · ${entries.filter(r=>r.completed).length} erledigt`:""}</small><span class="day-arrow">⌄</span></summary>`;
 for(const group of groups){const index=this._groups.push(group)-1;
 const descriptions=[...new Set(group.rows.map(r=>r.description).filter(Boolean))];
 out+=`<div class="row ${group.rows.every(r=>r.completed)?'completed':''}"><div class="main"><strong>${hmEsc(group.title)}</strong>${descriptions.map(d=>`<div class="description">${hmEsc(d)}</div>`).join('')}</div><div class="checks">${[...new Set(group.rows.map(r=>r.person))].map(person=>{const done=group.rows.filter(r=>r.person===person).every(r=>r.completed);return this._data.parent?`<span class="assignee ${done?'completed':''}">${hmEsc(person)}${done?' ✓':''}</span>`:`<button class="complete" data-group="${index}" data-person="${hmEsc(person)}" aria-pressed="${done}" aria-label="${hmEsc(group.title+' für '+person+(done?' wieder öffnen':' erledigen'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/>${done?'<path d="m7 12 3 3 7-7"/>':''}</svg></button>`;}).join('')}</div></div>`;
 }out+='</details>';
 }return out||'<div class="empty">Keine offenen Hausarbeiten in den nächsten 7 Tagen.</div>';
 }
 tasks(){const tasks=this._data.tasks;return tasks.length?tasks.map(task=>`<div class="row"><div class="main"><strong>${hmEsc(task.title)}</strong><small>${hmEsc(task.assignees.join(' · '))}${task.alternating?' · Abwechselnd (Start: '+hmEsc(task.first_person)+')':''} · ${hmEsc(hmLabel(task))}</small><small>Ab ${hmEsc(this.dayTitle(task.start))}${task.end?' · bis '+hmEsc(this.dayTitle(task.end)):''}</small></div>${task.editable?`<button class="icon" data-edit="${hmEsc(task.id)}" aria-label="${hmEsc(task.title+' bearbeiten')}"><ha-icon icon="mdi:pencil-outline"></ha-icon></button><button class="icon danger" data-delete="${hmEsc(task.id)}" aria-label="${hmEsc(task.title+' löschen')}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>`:''}</div>`).join(''):'<div class="empty">Noch keine Hausarbeiten angelegt.</div>';}
 settings(){
  if(!this._data.settings_allowed)return '';
  return `<div class="settings-row"><strong>Urlaubsmodus</strong><input class="vacation-switch" type="checkbox" role="switch" aria-label="Urlaubsmodus" data-vacation ${this._data.vacation_active?'checked':''}></div><div class="toolbar"><button class="add" data-add>+ Hausarbeit</button></div><strong>Hausarbeiten</strong>${this.tasks()}`;
 }
 render(){
  if(!this._config)return;
  const d=this._data;
  if(this._tab==='settings'&&!d?.settings_allowed)this._tab='calendar';
  this.shadowRoot.innerHTML=`<style>${HM_STYLE}</style><ha-card>
    <div class="header"><ha-icon icon="mdi:calendar-check-outline"></ha-icon><span class="title">${hmEsc(this._config.title)}</span></div>
    ${d?`<div class="tabs"><button data-tab="calendar" class="${this._tab==='calendar'?'active':''}">Nächste 7 Tage</button>${d.settings_allowed?`<button data-tab="settings" class="settings-button ${this._tab==='settings'?'active':''}" aria-label="Einstellungen" title="Einstellungen"><ha-icon icon="mdi:cog-outline"></ha-icon></button>`:''}</div>`:''}
    <div class="content">${this._error?`<div class="error" role="alert">${hmEsc(this._error)}</div>`:''}
    ${d?`${this._tab==='settings'?this.settings():`<div class="toolbar"><span class="pill">${d.occurrences.filter(r=>!r.completed).length} offen</span>${!d.parent?'<button class="add" data-add>+ Einmalige Arbeit</button>':''}</div>${this.calendar()}`}<div class="footer">${this._tab==='settings'?`<span>Hausarbeiten Manager · ${HM_VERSION}</span>`:'<span></span>'}<button data-refresh>Aktualisieren</button></div>`:`<div class="empty">${this._error?'Bitte Benutzerzuordnung und Access-Control-Freigabe prüfen.':'Hausarbeiten werden geladen …'}</div>`}
    </div></ha-card><div class="dialog-host"></div>`;
 this.shadowRoot.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{this._tab=b.dataset.tab;this.render();});
 this.shadowRoot.querySelector('[data-refresh]')?.addEventListener('click',()=>this.load());
 this.shadowRoot.querySelector('[data-add]')?.addEventListener('click',()=>this.edit());
 this.shadowRoot.querySelector('[data-vacation]')?.addEventListener('change',e=>this.mutate('vacation',{enabled:e.target.checked}));
 this.shadowRoot.querySelectorAll('[data-day]').forEach(el=>el.addEventListener('toggle',()=>{if(el.open)this._closedDays.delete(el.dataset.day);else this._closedDays.add(el.dataset.day);}));
 this.shadowRoot.querySelectorAll('[data-group]').forEach(button=>button.onclick=async()=>{if(this._data.parent)return;const group=this._groups[Number(button.dataset.group)];const rows=group.rows.filter(r=>r.person===button.dataset.person);const operation=rows.every(r=>r.completed)?'reopen':'complete';for(const row of rows.filter(r=>operation==='reopen'||!r.completed)){await this.mutate(operation,{task_id:row.task_id,person:row.person,date:row.date});if(this._error)break;}});
 this.shadowRoot.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>this.edit(d.tasks.find(t=>t.id===b.dataset.edit)));
 this.shadowRoot.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const task=d.tasks.find(t=>t.id===b.dataset.delete);this.confirmDelete(task);});
 }
 dialog(title,body){const host=this.shadowRoot.querySelector('.dialog-host');host.innerHTML=`<dialog><div class="dialog-head"><strong>${hmEsc(title)}</strong><button data-close aria-label="Schließen">✕</button></div><form class="form">${body}<div class="form-error" role="alert"></div><div class="dialog-actions"><button type="button" data-cancel>Abbrechen</button><button class="primary" type="submit">Speichern</button></div></form></dialog>`;const dialog=host.querySelector('dialog');dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>host.replaceChildren());dialog.showModal();return dialog;}
 edit(task){
 if(this._data.parent&&!this._data.settings_allowed)return;
 const today=this._data.today;
 const startWeekday=(new Date((task?.start||today)+'T12:00:00').getDay()+6)%7;
 const value=task||{title:'',description:'',assignees:this._data.parent?[]:[this._data.person],start:today,end:'',kind:'once',interval:1,weekdays:[startWeekday],nth:Math.ceil(Number(today.slice(8))/7)};
 const unit=value.kind==='daily'?'day':value.kind==='yearly'?'year':value.kind.startsWith('monthly')?'month':'week';
 const dialog=this.dialog(task?'Hausarbeit bearbeiten':'Hausarbeit anlegen',`
 <label class="field"><span>Hausarbeit</span><input name="title" required maxlength="150" value="${hmEsc(value.title)}" placeholder="Zum Beispiel: Zimmer aufräumen"></label>
 <label class="field"><span>Beschreibung (optional)</span><textarea name="description" maxlength="2000">${hmEsc(value.description)}</textarea></label>
 ${this._data.parent?`<div class="field"><span>Für wen?</span><div class="choices">${['Maximilian','Paul'].map(p=>`<label><input type="checkbox" name="assignee" value="${p}" ${value.assignees.includes(p)?'checked':''}>${p}</label>`).join('')}</div></div><div class="field"><label class="repeat-toggle"><input type="checkbox" name="alternating" ${value.alternating?'checked':''}>Abwechselnd</label><label class="field first-person"><span>Wer beginnt?</span><select name="first_person">${['Paul','Maximilian'].map(p=>`<option value="${p}" ${(value.first_person||'Paul')===p?'selected':''}>${p}</option>`).join('')}</select></label></div>`:`<p class="smallnote">Für ${hmEsc(this._data.person)} · eigene Hausarbeit</p>`}
 <label class="field"><span>Startdatum</span><input type="date" name="start" required value="${hmEsc(value.start)}"></label>
 <div class="recurrence" ${this._data.parent?'':'hidden'}>
 <label class="repeat-toggle"><input type="checkbox" name="repeating" ${value.kind!=='once'?'checked':''}><ha-icon icon="mdi:repeat"></ha-icon>Wiederkehrend</label>
 <div class="recurrence-controls">
 <div class="repeat-line"><span>Wiederholen alle</span><input type="number" name="interval" min="1" max="365" required aria-label="Wiederholungsabstand" value="${value.interval}"><select name="unit" aria-label="Wiederholungseinheit">${[['day','Tag'],['week','Woche'],['month','Monat'],['year','Jahr']].map(([id,label])=>`<option value="${id}" ${unit===id?'selected':''}>${label}</option>`).join('')}</select></div>
 <label class="field month-mode"><span>Monatliches Muster</span><select name="month_mode"><option value="date" ${value.kind!=='monthly_nth'?'selected':''}>Am Tag des Startdatums</option><option value="nth" ${value.kind==='monthly_nth'?'selected':''}>An einem bestimmten Wochentag</option></select></label>
 <label class="field nth"><span>Welcher im Monat?</span><select name="nth">${[[1,'Erster'],[2,'Zweiter'],[3,'Dritter'],[4,'Vierter'],[5,'Fünfter'],[-1,'Letzter']].map(([id,label])=>`<option value="${id}" ${value.nth===id?'selected':''}>${label}</option>`).join('')}</select></label>
 <div class="repeat-weekdays" role="group" aria-label="Wochentage">${hmDays.map((day,i)=>`<label title="${['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][i]}"><input type="checkbox" name="weekday" value="${i}" aria-label="${day}" ${value.weekdays.includes(i)?'checked':''}><span>${['M','D','M','D','F','S','S'][i]}</span></label>`).join('')}</div>
 <label class="field repeat-until"><span>Bis (optional)</span><input type="date" name="end" value="${hmEsc(value.end)}" min="${hmEsc(value.start)}"></label>
 <p class="smallnote recurrence-hint" aria-live="polite"></p>
 </div></div>`);
 const form=dialog.querySelector('form');
 const input=name=>form.querySelector(`[name="${name}"]`);
 const readTask=()=>{
   const repeating=this._data.parent&&input('repeating').checked;
   const unit=input('unit').value;
   const kind=!repeating?'once':unit==='day'?'daily':unit==='week'?'weekly':unit==='year'?'yearly':input('month_mode').value==='nth'?'monthly_nth':'monthly_date';
   const weekdays=[...form.querySelectorAll('[name="weekday"]')].filter(el=>el.checked).map(el=>Number(el.value));
   const start=input('start').value;
   const result={title:input('title').value,description:input('description').value,start,end:repeating?input('end').value:'',kind,interval:repeating?Number(input('interval').value):1,weekdays:weekdays.length?weekdays:['weekly','monthly_nth'].includes(kind)?[]:[(new Date(start+'T12:00:00').getDay()+6)%7],nth:Number(input('nth').value),assignees:this._data.parent?[...form.querySelectorAll('[name="assignee"]')].filter(el=>el.checked).map(el=>el.value):[this._data.person]};
   result.alternating=Boolean(this._data.parent&&input('alternating')?.checked);
   result.first_person=result.alternating?input('first_person').value:'Paul';
   if(result.alternating)result.assignees=['Maximilian','Paul'];
   if(value.id)result.id=value.id;
   return result;
 };
 const update=event=>{
   if(this._data.parent){
     if(event?.target===input('repeating')&&!input('repeating').checked)input('alternating').checked=false;
     const alternate=input('alternating').checked;
     if(alternate)input('repeating').checked=true;
     dialog.querySelector('.first-person').hidden=!alternate;
     form.querySelectorAll('[name="assignee"]').forEach(el=>{el.disabled=alternate;if(alternate)el.checked=true;});
   }
   const task=readTask();const repeated=task.kind!=='once';
   dialog.querySelector('.recurrence-controls').hidden=!repeated;
   input('interval').disabled=!repeated;
   input('end').disabled=!repeated;input('end').min=input('start').value;
   dialog.querySelector('.month-mode').hidden=input('unit').value!=='month';
   dialog.querySelector('.repeat-weekdays').hidden=!['weekly','monthly_nth'].includes(task.kind);
   dialog.querySelector('.nth').hidden=task.kind!=='monthly_nth';
   if(!task.start||!Number.isFinite(new Date(task.start+'T12:00:00').getTime())){dialog.querySelector('.recurrence-hint').textContent='Bitte ein Startdatum auswählen.';return;}
   let note=repeated&&task.weekdays.length?hmLabel(task):'Bitte mindestens einen Wochentag auswählen.';
   if(task.alternating)note+=' · Abwechselnd, Beginn: '+task.first_person;
   if(task.kind==='monthly_date'&&Number(task.start.slice(8))>28)note+=' · Monate ohne diesen Tag werden übersprungen.';
   if(task.kind==='yearly'&&task.start.slice(5)==='02-29')note+=' · Jahre ohne den 29. Februar werden übersprungen.';
   dialog.querySelector('.recurrence-hint').textContent=note;
 };
 form.addEventListener('change',update);form.addEventListener('input',update);update();
 form.onsubmit=e=>{e.preventDefault();const task=readTask();if(!task.weekdays.length){dialog.querySelector('.form-error').textContent='Bitte mindestens einen Wochentag auswählen.';return;}this.mutate('save_task',{task});};
 }
 confirmDelete(task){if(!task)return;const dialog=this.dialog('Hausarbeit löschen',`<p class="smallnote">„${hmEsc(task.title)}“ mit allen zukünftigen Terminen löschen?</p>`);dialog.querySelector('button[type="submit"]').textContent='Löschen';dialog.querySelector('form').onsubmit=e=>{e.preventDefault();this.mutate('delete_task',{task_id:task.id});};}
}
if(!customElements.get('hausarbeiten-manager-card'))customElements.define('hausarbeiten-manager-card',HausarbeitenManagerCard);
window.customCards=window.customCards||[];if(!window.customCards.some(c=>c.type==='hausarbeiten-manager-card'))window.customCards.push({type:'hausarbeiten-manager-card',name:'Hausarbeiten Manager',description:'Familienaufgaben mit Sieben-Tage-Kalender und Erledigt-Häkchen'});

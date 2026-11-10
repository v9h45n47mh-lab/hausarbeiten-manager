import {UI_CSS, UI_VERSION, navigation, section, row as uiRow, button, iconButton, toggle, field, selectField, dialog as uiDialog, notice, versionInfo, icon, escapeHtml, bindUI, completionRow, dayAgenda, checkboxGroup, weekdayPicker, textareaField, counter, recurrenceEditor, formError, confirmDialog} from './family-ui/1.2.1/family-ui.js';
/* Hausarbeiten Manager 0.3.4 — no external frontend dependencies. */
const HM_VERSION='0.3.4';
const hmEsc=escapeHtml;
const hmDays=['Mo','Di','Mi','Do','Fr','Sa','So'];
const hmLabel=t=>{
 if(t.kind==='once')return 'Einmalig';
 if(t.kind==='daily')return t.interval===1?'Täglich':`Alle ${t.interval} Tage`;
 if(t.kind==='weekly')return `${t.interval===1?'Jede Woche':`Alle ${t.interval} Wochen`} · ${t.weekdays.map(w=>hmDays[w]).join(', ')}`;
 if(t.kind==='yearly')return `${t.interval===1?'Jährlich':`Alle ${t.interval} Jahre`} · ${new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long'}).format(new Date(t.start+'T12:00:00'))}`;
 const prefix=t.interval===1?'Monatlich':`Alle ${t.interval} Monate`;
 return t.kind==='monthly_date'?`${prefix} · am ${Number(t.start.slice(8))}. Tag`:`${prefix} · ${t.nth===-1?'Letzter':t.nth+'.'} ${t.weekdays.map(w=>hmDays[w]).join(', ')}`;
};
const hmField=({name,...options})=>field({id:'hm-'+name,name,...options});
const hmSelect=({name,...options})=>selectField({id:'hm-'+name,name,...options});
const hmRow=(options,classes='')=>uiRow(options).replace('class="setting-row"',`class="setting-row row ${classes}"`);
class HausarbeitenManagerCard extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this._tab='calendar';this._busy=false;this._timer=null;this._error='';this._user=null;this._seq=0;this._closedDays=new Set();this._groups=[];this._active=false;this._dirty=false;this._unsub=null;this._subConn=null;this._subToken=0;this._bindUI();}
 _bindUI(){this._unbindUI ||= bindUI(this.shadowRoot,({action,data,checked,value,element})=>{if(action==='navigate'){if(data.page==='settings'&&!this._data?.settings_allowed)return;this._tab=data.page;this.render();}else if(action==='add')this.edit();else if(action==='edit')this.edit(this._data.tasks.find(t=>t.id===data.id));else if(action==='delete')this.confirmDelete(this._data.tasks.find(t=>t.id===data.id));else if(action==='completion-change')this._completeGroup(data.id,data.person);else if(action==='recurrence-change')this._syncAssignees(element,value);else if(action==='delete-confirm'){if(this._pendingDelete)this.mutate('delete_task',{task_id:this._pendingDelete});}else if(action==='vacation'&&this._data.settings_allowed)this.mutate('vacation',{enabled:checked});});}
 setConfig(config){this._config={title:'Hausarbeiten',...config};this.render();}
 set hass(hass){this._hass=hass;const user=hass.user?.id;if(user!==this._user){this._stopSubscription();this._seq++;this._user=user;this._data=null;this._loading=false;this.render();this.load();}else if(!this._data&&!this._loading)this.load();this._subscribe();}
 connectedCallback(){this._bindUI();this._active=true;if(!this._timer)this._timer=setInterval(()=>{this._subscribe();this.load();},15000);this._subscribe();if(this._hass)this.load();}
 disconnectedCallback(){this._unbindUI?.();this._unbindUI=null;this._active=false;clearInterval(this._timer);this._timer=null;this._stopSubscription();this._seq++;this._loading=false;}
 _stopSubscription(){this._subToken++;const unsub=this._unsub;this._unsub=null;this._subConn=null;if(unsub)Promise.resolve(unsub()).catch(()=>{});}
 async _subscribe(){
 const connection=this._hass?.connection;
 if(!this._active||!this._user||!connection?.subscribeMessage||this._subConn===connection)return;
 this._stopSubscription();this._subConn=connection;const token=this._subToken;
 try{const unsub=await connection.subscribeMessage(()=>{if(this._active&&token===this._subToken)this._requestRefresh();},{type:'hausarbeiten_manager/subscribe'});
 if(!this._active||token!==this._subToken){await unsub();return;}this._unsub=unsub;
 }catch{if(token===this._subToken)this._subConn=null;}
 }
 _requestRefresh(){this._dirty=true;this.load();}
 getCardSize(){return 7;}
 static getStubConfig(){return {title:'Hausarbeiten'};}
 async load(){if(!this._hass||this._loading||this._busy)return;this._dirty=false;this._loading=true;const seq=this._seq;try{const data=await this._hass.callWS({type:'hausarbeiten_manager/get'});if(seq!==this._seq||this._data&&(data.revision<this._data.revision||data.today<this._data.today))return;const changed=JSON.stringify(this._data)!==JSON.stringify(data);this._data=data;this._error='';if(changed){if(this.shadowRoot.querySelector('dialog[open]'))this._renderPending=true;else this.render();}}catch(e){if(seq===this._seq){this._error=e.message||'Verbindung fehlgeschlagen.';if(!this.shadowRoot.querySelector('dialog[open]'))this.render();}}finally{if(seq===this._seq){this._loading=false;if(this._dirty&&!this._busy&&!this.shadowRoot.querySelector('dialog[open]'))this.load();}}}
 async mutate(type,data){if(this._busy)return;this._busy=true;const seq=this._seq;this.shadowRoot.querySelectorAll('button,[data-ui-completion] input').forEach(b=>b.disabled=true);try{const result=await this._hass.callWS({type:'hausarbeiten_manager/'+type,revision:this._data.revision,...data});if(seq!==this._seq)return;if(!this._data||result.revision>=this._data.revision)this._data=result;this._error='';if(type==='delete_task')this._pendingDelete=null;const hadDialog=Boolean(this.shadowRoot.querySelector('dialog[open]'));this.render();if(hadDialog)this.shadowRoot.querySelector('[data-action="add"],nav button')?.focus();}catch(e){if(seq!==this._seq)return;this._error=e.message||'Speichern fehlgeschlagen.';const error=this.shadowRoot.querySelector('.form-error');if(error){error.textContent=this._error;error.hidden=false;}else this.render();}finally{this._busy=false;this.shadowRoot.querySelectorAll('button,[data-ui-completion] input').forEach(b=>b.disabled=false);if(this._dirty&&!this.shadowRoot.querySelector('dialog[open]'))this.load();}}
 dayTitle(day){const d=new Date(day+'T12:00:00');return new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(d);}
 _rememberDays(){this.shadowRoot.querySelectorAll('[data-day]').forEach(el=>{const expanded=el.querySelector('.settings-fold')?.getAttribute('aria-expanded');if(expanded==='true')this._closedDays.delete(el.dataset.day);else if(expanded==='false')this._closedDays.add(el.dataset.day);});}
 calendar(){
 const rows=this._data.occurrences;this._groups=[];let out='';
 for(let i=0;i<7;i++){
 const date=new Date(this._data.today+'T12:00:00');date.setDate(date.getDate()+i);
 const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const entries=rows.filter(r=>r.date===day);if(!entries.length)continue;
 const groups=[];
 for(const entry of entries){let group=this._data.parent?groups.find(g=>g.title===entry.title):null;if(!group){group={title:entry.title,rows:[]};groups.push(group);}group.rows.push(entry);}
 const content=groups.map(group=>{const index=this._groups.push(group)-1;
 const descriptions=[...new Set(group.rows.map(r=>r.description).filter(Boolean))];
 const people=[...new Set(group.rows.map(r=>r.person))].map(person=>({id:person,label:person,completed:group.rows.filter(r=>r.person===person).every(r=>r.completed)}));
 return completionRow({id:String(index),title:group.title,description:descriptions.join(' · '),people,readOnly:this._data.parent}).replace('class="setting-row', 'class="row setting-row');
 }).join('');
 out+=`<div class="day" data-day="${day}">${dayAgenda({id:'day-'+day,days:[{title:(i===0?'Heute · ':i===1?'Morgen · ':'')+this.dayTitle(day),expanded:!this._closedDays.has(day),count:entries.filter(r=>!r.completed).length+' offen'+(entries.some(r=>r.completed)?' · '+entries.filter(r=>r.completed).length+' erledigt':''),content}]})}</div>`;
 }return out||notice('Keine offenen Hausarbeiten in den nächsten 7 Tagen.');
 }
 tasks(){return this._data.tasks.length?this._data.tasks.map(task=>hmRow({title:task.title,description:task.assignees.join(' · ')+(task.alternating?' · Abwechselnd (Start: '+task.first_person+')':'')+' · '+hmLabel(task)+' · Ab '+this.dayTitle(task.start)+(task.end?' · bis '+this.dayTitle(task.end):''),trailing:task.editable?iconButton({icon:'edit',label:task.title+' bearbeiten',action:'edit',data:{id:task.id}})+iconButton({icon:'trash',label:task.title+' löschen',action:'delete',danger:true,data:{id:task.id}}):''})).join(''):notice('Noch keine Hausarbeiten angelegt.');}
 settings(){if(!this._data.settings_allowed)return '';return uiRow({title:'Urlaubsmodus',trailing:toggle({label:'Urlaubsmodus',action:'vacation',checked:this._data.vacation_active})})+section({id:'tasks',title:'Hausarbeiten',trailing:button({label:'Hausarbeit',icon:'add',action:'add',variant:'primary'}),content:this.tasks()});}
 render(){
  if(!this._config)return;
  const d=this._data;this._rememberDays();
  if(this._tab==='settings'&&!d?.settings_allowed)this._tab='calendar';
  this.shadowRoot.innerHTML=`<style>${UI_CSS}</style><ha-card>
  ${navigation({label:this._config.title,items:[{id:'calendar',label:this._config.title}],active:this._tab,settings:Boolean(d?.settings_allowed),help:false})}
  <main>${this._error?notice(this._error,{error:true}):''}
  ${d?(this._tab==='settings'?this.settings()+versionInfo({frontend:HM_VERSION,backend:d.version,ui:UI_VERSION}):`<div class="page-actions">${counter(d.occurrences.filter(r=>!r.completed).length+' offen').replace('class="fui-counter"','class="fui-counter pill"')}${!d.parent?button({label:'Einmalige Arbeit',icon:'add',action:'add'}):''}</div>${this.calendar()}`):notice(this._error?'Bitte Benutzerzuordnung und Access-Control-Freigabe prüfen.':'Hausarbeiten werden geladen …')}
  </main></ha-card><div class="dialog-host"></div>`;
 }
 async _completeGroup(index,person){if(this._data.parent||this._busy)return;const group=this._groups[Number(index)];if(!group)return;const entries=group.rows.filter(r=>r.person===person);const operation=entries.every(r=>r.completed)?'reopen':'complete';for(const entry of entries.filter(r=>operation==='reopen'||!r.completed)){await this.mutate(operation,{task_id:entry.task_id,person:entry.person,date:entry.date});if(this._error)break;}}
 _syncAssignees(control,rule){const form=control.closest('form');if(!form||!this._data.parent)return;form.querySelectorAll('[name="assignee"]').forEach(input=>{input.disabled=Boolean(rule.alternating);if(rule.alternating)input.checked=true;});}

 dialog(title,body){
 const host=this.shadowRoot.querySelector('.dialog-host');const opener=this.shadowRoot.activeElement;
 host.innerHTML=uiDialog({id:'hm-editor',title,content:`<form id="hm-form" class="grid">${body}<div class="full">${formError('').replace('class="modal-save-error"','class="modal-save-error form-error"')}</div></form>`,actions:button({label:'Abbrechen',action:'cancel'}).replace('data-action="cancel"','data-ui="close-dialog"')+button({label:'Speichern',icon:'save',action:'save',variant:'primary'}).replace('type="button"','type="submit" form="hm-form"')});
 const modal=host.querySelector('dialog');modal.addEventListener('close',()=>{host.replaceChildren();if(this._renderPending){this._renderPending=false;this.render();}if(opener?.isConnected)opener.focus();else this.shadowRoot.querySelector('.settings-button,nav button')?.focus();if(this._dirty)this.load();});modal.showModal();return modal;
 }
 edit(task){
 if(this._data.parent&&!this._data.settings_allowed)return;
 const today=this._data.today;
 const startWeekday=(new Date((task?.start||today)+'T12:00:00').getDay()+6)%7;
 const value=task||{title:'',description:'',assignees:this._data.parent?[]:[this._data.person],start:today,end:'',kind:'once',interval:1,weekdays:[startWeekday],nth:Math.ceil(Number(today.slice(8))/7)};
 const parts=[
 hmField({name:'title',label:'Hausarbeit',required:true,value:value.title,maxLength:150,placeholder:'Zum Beispiel: Zimmer aufräumen'}),
 textareaField({id:'hm-description',name:'description',label:'Beschreibung (optional)',maxLength:2000,value:value.description}),
 this._data.parent?checkboxGroup({id:'hm-assignees',label:'Für wen?',items:['Maximilian','Paul'].map(p=>({value:p,label:p})),values:value.assignees}).replaceAll('<input ','<input name="assignee" '):`<p class="hint">Für ${hmEsc(this._data.person)} · eigene Hausarbeit</p>`,
 this._data.parent?recurrenceEditor({id:'hm-recurrence',value,people:['Paul','Maximilian']}):hmField({name:'start',label:'Startdatum',type:'date',required:true,value:value.start})
 ];
 const dialog=this.dialog(task?'Hausarbeit bearbeiten':'Hausarbeit anlegen',parts.map(content=>`<div class="full">${content}</div>`).join(''));
 const form=dialog.querySelector('form');
 const input=name=>form.querySelector(`[name="${name}"]`);
 const readTask=()=>{
   const recurring=this._data.parent&&input('repeating').checked;
   const unit=input('unit')?.value;
   const kind=!recurring?'once':unit==='day'?'daily':unit==='week'?'weekly':unit==='year'?'yearly':input('month_mode').value==='nth'?'monthly_nth':'monthly_date';
   const weekdays=[...form.querySelectorAll('[data-ui-recurrence] [data-ui-checks] input')].filter(el=>el.checked).map(el=>Number(el.value));
   const start=input('start').value;
   const result={title:input('title').value,description:input('description').value,start,end:recurring?input('end').value:'',kind,interval:recurring?Number(input('interval').value):1,weekdays:weekdays.length?weekdays:['weekly','monthly_nth'].includes(kind)?[]:[(new Date(start+'T12:00:00').getDay()+6)%7],nth:Number(input('nth')?.value||1),assignees:this._data.parent?[...form.querySelectorAll('[name="assignee"]')].filter(el=>el.checked).map(el=>el.value):[this._data.person],alternating:Boolean(this._data.parent&&input('alternating')?.checked)};
   result.first_person=result.alternating?input('first_person').value:'Paul';if(result.alternating)result.assignees=['Maximilian','Paul'];if(value.id)result.id=value.id;return result;
 };
 const recurrence=form.querySelector('[data-ui-recurrence]');if(recurrence)this._syncAssignees(recurrence,value);
 form.onsubmit=e=>{e.preventDefault();const task=readTask();if(!task.weekdays.length){const error=dialog.querySelector('.form-error');error.textContent='Bitte mindestens einen Wochentag auswählen.';error.hidden=false;return;}this.mutate('save_task',{task});};
 }
 confirmDelete(task){if(!task||!task.editable)return;this._pendingDelete=task.id;const host=this.shadowRoot.querySelector('.dialog-host');const opener=this.shadowRoot.activeElement;host.innerHTML=confirmDialog({id:'hm-delete',title:'Hausarbeit löschen',message:'„'+task.title+'“ mit allen zukünftigen Terminen löschen?',confirmAction:'delete-confirm'});const modal=host.querySelector('dialog');modal.addEventListener('close',()=>{this._pendingDelete=null;host.replaceChildren();if(this._renderPending){this._renderPending=false;this.render();}if(opener?.isConnected)opener.focus();if(this._dirty)this.load();});modal.showModal();}

}
if(!customElements.get('hausarbeiten-manager-card'))customElements.define('hausarbeiten-manager-card',HausarbeitenManagerCard);
window.customCards=window.customCards||[];if(!window.customCards.some(c=>c.type==='hausarbeiten-manager-card'))window.customCards.push({type:'hausarbeiten-manager-card',name:'Hausarbeiten Manager',description:'Familienaufgaben mit Sieben-Tage-Kalender und Erledigt-Häkchen'});

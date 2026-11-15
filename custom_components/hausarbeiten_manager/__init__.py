"""Local household calendar with server-side family permissions."""
import asyncio
from copy import deepcopy
from datetime import timedelta
from pathlib import Path
import logging
try:
    import probatio as vol
except ImportError:
    import voluptuous as vol
from homeassistant.components import frontend, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from .family_access import allows, require, register
from . import vacation_client
from .engine import (CHILDREN, actor_for, can_edit, can_manage_settings, complete, delete_task, empty_data,
                     migrate_vacation, occurrences, reopen, save_task, save_vacation, visible_people, vacation_on)

DOMAIN = 'hausarbeiten_manager'
VERSION = '0.5.0'
SIGNAL = DOMAIN + '_updated'
_LOGGER = logging.getLogger(__name__)


async def async_setup(hass, config):
    await hass.http.async_register_static_paths([StaticPathConfig(
        '/hausarbeiten-manager', str(Path(__file__).parent/'frontend'), False)])
    frontend.add_extra_js_url(hass, '/hausarbeiten-manager/card.js?v='+VERSION)
    for command in (ws_get, ws_subscribe, ws_save, ws_complete, ws_reopen, ws_delete, ws_vacation):
        websocket_api.async_register_command(hass, command)
    return True


async def async_setup_entry(hass, entry):
    mapping = entry.options.get('users',entry.data.get('users',{}))
    def legacy(user):
        person=next((person for person,uid in mapping.items() if uid==user.id),None)
        return {'view':bool(person) or user.is_admin,'manage':user.is_admin or person in ('Vera','Manuel'),'settings':user.is_admin or person in ('Vera','Manuel')}
    await register(hass, DOMAIN, ('view','manage','settings'), legacy, entry=entry, notify=lambda:async_dispatcher_send(hass,SIGNAL))
    manager = Manager(hass, entry)
    await manager.load()
    hass.data[DOMAIN] = manager
    await vacation_client.register(hass, DOMAIN, manager.legacy_vacation, lambda:hass.async_create_task(manager.sync_vacation()), entry=entry)
    await manager.sync_vacation()
    await hass.config_entries.async_forward_entry_setups(entry, [Platform.CALENDAR])
    entry.async_on_unload(async_track_time_interval(hass, manager.tick, timedelta(minutes=1)))
    entry.async_on_unload(entry.add_update_listener(reload_entry))
    return True


async def reload_entry(hass, entry):
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass, entry):
    if await hass.config_entries.async_unload_platforms(entry, [Platform.CALENDAR]):
        hass.data.pop(DOMAIN, None)
        return True
    return False


class Manager:
    def __init__(self, hass, entry):
        self.hass, self.entry = hass, entry
        self.data = empty_data()
        self.lock = asyncio.Lock()
        self.store = Store(hass, 1, DOMAIN)
        self.last_day = None

    async def load(self):
        stored = await self.store.async_load() or empty_data()
        self.data = migrate_vacation(stored, self.today())
        if self.data != stored:
            await self.store.async_save(self.data)
        self.last_day = self.today()

    def legacy_vacation(self):
        return {'enabled':self.data.get('vacation_enabled',False),
                'started':self.data.get('vacation_started'),
                'periods':[{'start':p['start'],'end':p['end']} for p in self.data.get('vacations',[])]}

    def vacation_snapshot(self):
        return vacation_client.snapshot(self.hass,self.legacy_vacation(),DOMAIN)

    def effective_data(self):
        state=self.vacation_snapshot()
        if not state['central']:return deepcopy(self.data)
        data=deepcopy(self.data)
        data['vacation_enabled']=state['enabled']
        data['vacation_started']=state['started']
        data['vacations']=[{'id':'central_'+p['start']+'_'+p['end'],**p} for p in state['periods']]
        return data

    async def sync_vacation_locked(self):
        result=self.effective_data()
        if result==self.data:return False
        result['revision']=self.data['revision']+1
        await self.store.async_save(result)
        self.data=result
        async_dispatcher_send(self.hass,SIGNAL)
        return True

    async def sync_vacation(self):
        async with self.lock:
            await self.sync_vacation_locked()

    def today(self):
        return dt_util.as_local(dt_util.utcnow()).date()

    def actor(self, user):
        if not user or not user.is_active:
            raise PermissionError('Keine gültige Anmeldung.')
        mapping = self.entry.options.get('users', self.entry.data['users'])
        require(self.hass,user,DOMAIN,'view',user.is_admin or user.id in mapping.values())
        try:
            actor = actor_for(user.id, mapping, user.is_admin)
        except PermissionError:
            if not allows(self.hass,user,DOMAIN,'manage',False):
                raise
            actor={'user_id':user.id,'id':user.id,'person':user.name or user.id,'parent':False}
        actor['parent']=allows(self.hass,user,DOMAIN,'manage',actor['parent'])
        actor['settings_allowed']=allows(self.hass,user,DOMAIN,'settings',actor.get('settings_allowed',actor['parent']))
        return actor

    def snapshot(self, actor):
        people = visible_people(actor)
        tasks = []
        for task in self.data['tasks']:
            if not any(p in people for p in task['assignees']):
                continue
            row = deepcopy(task)
            if not actor['parent']:
                row['assignees'] = [actor['person']]
                row.pop('created_by', None)
            row['editable'] = can_edit(actor, task)
            tasks.append(row)
        today = self.today()
        effective=self.effective_data()
        return {'revision': self.data['revision'], 'today': today.isoformat(),
                'person': actor['person'], 'parent': actor['parent'],
                'settings_allowed': can_manage_settings(actor), 'people': people,
                'tasks': tasks, 'occurrences': occurrences(effective, people, today, today+timedelta(days=6), include_done=True),
                'vacation':vacation_client.status(self.hass,self.legacy_vacation(),DOMAIN),'vacation_active': effective.get('vacation_enabled', False),
                'vacations': deepcopy(effective['vacations']) if can_manage_settings(actor) else [], 'version': VERSION}

    async def mutate(self, actor, revision, operation, payload):
        if operation=='vacation':raise PermissionError('Urlaubsmodus bitte zentral in Family Access ändern.')
        async with self.lock:
            await self.sync_vacation_locked()
            if revision != self.data['revision']:
                raise ValueError('Die Daten wurden geändert. Bitte neu laden und erneut versuchen.')
            if operation == 'save':
                result = save_task(self.data, payload, actor)
            elif operation == 'complete':
                result = complete(self.data, payload['task_id'], payload['person'], payload['date'], actor, self.today())
            elif operation == 'reopen':
                result = reopen(self.data, payload['task_id'], payload['person'], payload['date'], actor, self.today())
            elif operation == 'delete':
                result = delete_task(self.data, payload['task_id'], actor)
            else:
                raise ValueError('Unbekannte Aktion.')
            result['revision'] = self.data['revision']+1
            # Publish only after durable storage succeeds.
            await self.store.async_save(result)
            self.data = result
            async_dispatcher_send(self.hass, SIGNAL)
            return self.snapshot(actor)

    async def tick(self, now):
        await self.sync_vacation()
        if self.last_day != self.today():
            self.last_day = self.today()
            async_dispatcher_send(self.hass, SIGNAL)


async def respond(hass, connection, msg, operation=None):
    manager = hass.data.get(DOMAIN)
    if not manager:
        connection.send_error(msg['id'], 'not_loaded', 'Hausarbeiten Manager zuerst als Integration einrichten.')
        return
    try:
        actor = manager.actor(connection.user)
        if operation:
            result = await manager.mutate(actor, msg['revision'], operation, msg.get('task', msg))
        else:
            result = manager.snapshot(actor)
        connection.send_result(msg['id'], result)
    except PermissionError as err:
        connection.send_error(msg['id'], 'unauthorized', str(err))
    except (ValueError, KeyError, TypeError, OverflowError) as err:
        connection.send_error(msg['id'], 'invalid_input', str(err))
    except Exception:
        _LOGGER.exception('Hausarbeiten konnten nicht verarbeitet werden')
        connection.send_error(msg['id'], 'storage_error', 'Speichern fehlgeschlagen. Bitte Protokoll prüfen.')


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/get'})
@websocket_api.async_response
async def ws_get(hass, connection, msg):
    await respond(hass, connection, msg)


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/subscribe'})
@websocket_api.async_response
async def ws_subscribe(hass, connection, msg):
    """Notify authorized clients to fetch a fresh, individually filtered snapshot.

    No task or user data is broadcast. Every fetch rechecks the current actor.
    An initial event also covers reconnects and the gap after the first GET.
    """
    manager = hass.data.get(DOMAIN)
    if manager is None:
        connection.send_error(msg['id'], 'not_loaded', 'Hausarbeiten Manager ist nicht geladen.')
        return
    try:
        manager.actor(connection.user)
    except PermissionError as err:
        connection.send_error(msg['id'], 'unauthorized', str(err))
        return

    @callback
    def changed():
        connection.send_message(websocket_api.event_message(msg['id'], {}))

    connection.subscriptions[msg['id']] = async_dispatcher_connect(hass, SIGNAL, changed)
    connection.send_result(msg['id'])
    changed()


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/save_task',
    vol.Required('revision'): vol.All(int, vol.Range(min=0)), vol.Required('task'): dict})
@websocket_api.async_response
async def ws_save(hass, connection, msg):
    await respond(hass, connection, msg, 'save')


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/complete',
    vol.Required('revision'): vol.All(int, vol.Range(min=0)), vol.Required('task_id'): str,
    vol.Required('person'): str, vol.Required('date'): str})
@websocket_api.async_response
async def ws_complete(hass, connection, msg):
    await respond(hass, connection, msg, 'complete')


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/reopen',
    vol.Required('revision'): vol.All(int, vol.Range(min=0)), vol.Required('task_id'): str,
    vol.Required('person'): str, vol.Required('date'): str})
@websocket_api.async_response
async def ws_reopen(hass, connection, msg):
    await respond(hass, connection, msg, 'reopen')


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/delete_task',
    vol.Required('revision'): vol.All(int, vol.Range(min=0)), vol.Required('task_id'): str})
@websocket_api.async_response
async def ws_delete(hass, connection, msg):
    await respond(hass, connection, msg, 'delete')


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/vacation',
    vol.Required('revision'): vol.All(int, vol.Range(min=0)), vol.Required('enabled'): bool})
@websocket_api.async_response
async def ws_vacation(hass, connection, msg):
    await respond(hass, connection, msg, 'vacation')

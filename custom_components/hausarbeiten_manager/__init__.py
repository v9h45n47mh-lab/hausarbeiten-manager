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
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from .engine import (CHILDREN, actor_for, can_edit, complete, delete_task, empty_data,
                     occurrences, save_task, save_vacation, visible_people, vacation_on)

DOMAIN = 'hausarbeiten_manager'
VERSION = '0.1.0'
SIGNAL = DOMAIN + '_updated'
_LOGGER = logging.getLogger(__name__)


async def async_setup(hass, config):
    await hass.http.async_register_static_paths([StaticPathConfig(
        '/hausarbeiten-manager/card.js', str(Path(__file__).parent/'frontend'/'card.js'), False)])
    frontend.add_extra_js_url(hass, '/hausarbeiten-manager/card.js?v='+VERSION)
    for command in (ws_get, ws_save, ws_complete, ws_delete, ws_vacation):
        websocket_api.async_register_command(hass, command)
    return True


async def async_setup_entry(hass, entry):
    manager = Manager(hass, entry)
    await manager.load()
    hass.data[DOMAIN] = manager
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
        self.data = await self.store.async_load() or empty_data()
        self.last_day = self.today()

    def today(self):
        return dt_util.as_local(dt_util.utcnow()).date()

    def actor(self, user):
        if not user or not user.is_active:
            raise PermissionError('Keine gültige Anmeldung.')
        mapping = self.entry.options.get('users', self.entry.data['users'])
        return actor_for(user.id, mapping, user.is_admin)

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
        return {'revision': self.data['revision'], 'today': today.isoformat(),
                'person': actor['person'], 'parent': actor['parent'], 'people': people,
                'tasks': tasks, 'occurrences': occurrences(self.data, people, today, today+timedelta(days=6)),
                'vacation_active': vacation_on(self.data, today),
                'vacations': deepcopy(self.data['vacations']), 'version': VERSION}

    async def mutate(self, actor, revision, operation, payload):
        async with self.lock:
            if revision != self.data['revision']:
                raise ValueError('Die Daten wurden geändert. Bitte neu laden und erneut versuchen.')
            if operation == 'save':
                result = save_task(self.data, payload, actor)
            elif operation == 'complete':
                result = complete(self.data, payload['task_id'], payload['person'], payload['date'], actor, self.today())
            elif operation == 'delete':
                result = delete_task(self.data, payload['task_id'], actor)
            else:
                result = save_vacation(self.data, payload['enabled'], payload.get('start'), payload.get('end'), actor, self.today())
            result['revision'] = self.data['revision']+1
            # Publish only after durable storage succeeds.
            await self.store.async_save(result)
            self.data = result
            async_dispatcher_send(self.hass, SIGNAL)
            return self.snapshot(actor)

    async def tick(self, now):
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


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/delete_task',
    vol.Required('revision'): vol.All(int, vol.Range(min=0)), vol.Required('task_id'): str})
@websocket_api.async_response
async def ws_delete(hass, connection, msg):
    await respond(hass, connection, msg, 'delete')


@websocket_api.websocket_command({vol.Required('type'): DOMAIN+'/vacation',
    vol.Required('revision'): vol.All(int, vol.Range(min=0)), vol.Required('enabled'): bool,
    vol.Optional('start'): str, vol.Optional('end'): str})
@websocket_api.async_response
async def ws_vacation(hass, connection, msg):
    await respond(hass, connection, msg, 'vacation')

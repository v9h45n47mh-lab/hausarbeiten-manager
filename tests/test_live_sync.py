"""Run the actual subscription and manager code with HA transport adapters stubbed."""
import ast
import asyncio
from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace
import unittest
from test_engine import e, MAPPING, PAUL, PARENT, TODAY, raw

SOURCE=Path(__file__).parents[1]/'custom_components/hausarbeiten_manager/__init__.py'


class LiveSyncTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.listeners=[]
        def connect(hass, signal, listener):
            self.listeners.append(listener)
            return lambda: self.listeners.remove(listener)
        def send(hass, signal):
            for listener in list(self.listeners):listener()
        namespace={'callback':lambda f:f, 'async_dispatcher_connect':connect,
                   'async_dispatcher_send':send, 'websocket_api':SimpleNamespace(event_message=lambda ident,data:{'id':ident,'type':'event','event':data}),
                   'DOMAIN':'hausarbeiten_manager','SIGNAL':'updated','VERSION':'0.2.4',
                   'timedelta':timedelta,'deepcopy':deepcopy,**vars(e)}
        tree=ast.parse(SOURCE.read_text())
        selected=[node for node in tree.body if isinstance(node,ast.ClassDef) and node.name=='Manager' or isinstance(node,ast.AsyncFunctionDef) and node.name=='ws_subscribe']
        for node in selected:node.decorator_list=[]
        exec(compile(ast.Module(body=selected,type_ignores=[]),str(SOURCE),'exec'),namespace)
        self.subscribe=namespace['ws_subscribe']
        self.manager=object.__new__(namespace['Manager'])
        self.manager.data=e.save_task(e.empty_data(),raw(kind='daily'),PARENT)
        self.manager.today=lambda:TODAY
        self.manager.lock=asyncio.Lock()
        self.saved=[]
        async def save(value):self.saved.append(deepcopy(value))
        self.manager.store=SimpleNamespace(async_save=save)
        self.manager.entry=SimpleNamespace(data={'users':MAPPING},options={})
        self.hass=SimpleNamespace(data={'hausarbeiten_manager':self.manager})
        self.manager.hass=self.hass

    def connection(self, user_id):
        events=[];results=[];errors=[]
        return SimpleNamespace(user=SimpleNamespace(id=user_id,is_active=True,is_admin=False),subscriptions={},
            send_message=events.append,send_result=lambda *args:results.append(args),
            send_error=lambda *args:errors.append(args),events=events,results=results,errors=errors)

    async def test_complete_and_reopen_notify_all_without_task_data(self):
        parent=self.connection('v');child=self.connection('p')
        for conn in [parent,child]:await self.subscribe(self.hass,conn,{'id':1})
        self.assertEqual(parent.events,[{'id':1,'type':'event','event':{}}])
        ident=self.manager.data['tasks'][0]['id']
        await self.manager.mutate(PAUL,0,'complete',{'task_id':ident,'person':'Paul','date':'2026-11-09'})
        self.assertEqual(len(parent.events),2);self.assertEqual(len(child.events),2)
        self.assertEqual(parent.events[-1]['event'],{})
        snapshot=self.manager.snapshot(PAUL)
        self.assertTrue(all(row['person']=='Paul' for row in snapshot['occurrences']))
        self.assertTrue(next(row for row in snapshot['occurrences'] if row['date']=='2026-11-09')['completed'])
        await self.manager.mutate(PAUL,1,'reopen',{'task_id':ident,'person':'Paul','date':'2026-11-09'})
        self.assertEqual(len(parent.events),3)
        parent.subscriptions[1]()
        await self.manager.mutate(PAUL,2,'complete',{'task_id':ident,'person':'Paul','date':'2026-11-09'})
        self.assertEqual(len(parent.events),3);self.assertEqual(len(child.events),4)

    async def test_subscription_authorization_and_unloaded_integration(self):
        conn=self.connection('stranger')
        await self.subscribe(self.hass,conn,{'id':1})
        self.assertEqual(conn.errors[0][1],'unauthorized');self.assertFalse(self.listeners)
        self.hass.data.clear()
        await self.subscribe(self.hass,conn,{'id':2})
        self.assertEqual(conn.errors[-1][1],'not_loaded')

    async def test_failed_storage_never_publishes_update(self):
        conn=self.connection('v');await self.subscribe(self.hass,conn,{'id':1})
        async def fail(value):raise OSError('storage unavailable')
        self.manager.store.async_save=fail
        ident=self.manager.data['tasks'][0]['id']
        with self.assertRaises(OSError):await self.manager.mutate(PAUL,0,'complete',{'task_id':ident,'person':'Paul','date':'2026-11-09'})
        self.assertEqual(len(conn.events),1);self.assertEqual(self.manager.data['revision'],0)

    async def test_day_rollover_emits_refresh(self):
        conn=self.connection('v');await self.subscribe(self.hass,conn,{'id':1})
        self.manager.last_day=date(2026,11,8)
        await self.manager.tick(None)
        self.assertEqual(len(conn.events),2)
        await self.manager.tick(None)
        self.assertEqual(len(conn.events),2)

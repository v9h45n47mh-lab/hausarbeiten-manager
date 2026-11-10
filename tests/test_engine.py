import importlib.util
import json
from datetime import date
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('engine',Path(__file__).parents[1]/'custom_components/hausarbeiten_manager/engine.py')
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
MAPPING={'Vera':'v','Manuel':'m','Maximilian':'max','Paul':'p'}
PARENT=e.actor_for('v',MAPPING)
MAX=e.actor_for('max',MAPPING)
PAUL=e.actor_for('p',MAPPING)
TODAY=date(2026,11,9)


def raw(**kwargs):
    return {'title':'Zimmer aufräumen','assignees':['Maximilian','Paul'],'start':'2026-11-09','kind':'once',**kwargs}


class EngineTests(unittest.TestCase):
    def task(self,**kwargs):
        return e.validate_task(raw(**kwargs),PARENT)

    def test_once_only_its_date(self):
        task=self.task()
        self.assertTrue(e.occurs(task,TODAY))
        self.assertFalse(e.occurs(task,date(2026,11,10)))

    def test_daily_interval(self):
        task=self.task(kind='daily',interval=2)
        self.assertTrue(e.occurs(task,date(2026,11,11)))
        self.assertFalse(e.occurs(task,date(2026,11,10)))

    def test_every_other_saturday_is_anchored_to_start_week(self):
        task=self.task(kind='weekly',interval=2,weekdays=[5])
        for day,expected in [(14,True),(21,False),(28,True)]:
            self.assertEqual(e.occurs(task,date(2026,11,day)),expected)

    def test_second_saturday_each_month(self):
        task=self.task(kind='monthly_nth',start='2026-01-01',weekdays=[5],nth=2)
        self.assertTrue(e.occurs(task,date(2026,11,14)))
        self.assertFalse(e.occurs(task,date(2026,11,21)))
        self.assertTrue(e.occurs(task,date(2026,12,12)))

    def test_last_weekday_and_leap_day(self):
        task=self.task(kind='monthly_nth',start='2024-01-01',weekdays=[3],nth=-1)
        self.assertTrue(e.occurs(task,date(2024,2,29)))
        self.assertFalse(e.occurs(task,date(2024,2,22)))

    def test_nonexistent_fifth_saturday_has_no_occurrence(self):
        task=self.task(kind='monthly_nth',start='2026-01-01',weekdays=[5],nth=5)
        rows=e.occurrences({'tasks':[task],'done':{},'vacations':[]},['Paul'],date(2026,2,1),date(2026,2,28))
        self.assertEqual(rows,[])

    def test_start_and_end_are_inclusive(self):
        task=self.task(kind='daily',end='2026-11-10')
        self.assertTrue(e.occurs(task,TODAY))
        self.assertTrue(e.occurs(task,date(2026,11,10)))
        self.assertFalse(e.occurs(task,date(2026,11,11)))

    def test_children_cannot_create_repeating_tasks(self):
        for kind in ['daily','weekly','monthly_nth']:
            with self.assertRaises(PermissionError):
                e.validate_task(raw(assignees=['Paul'],kind=kind),PAUL)

    def test_child_can_create_only_for_self(self):
        e.validate_task(raw(assignees=['Paul']),PAUL)
        for names in [['Maximilian'],['Maximilian','Paul']]:
            with self.assertRaises(PermissionError):e.validate_task(raw(assignees=names),PAUL)

    def test_unmapped_user_is_denied(self):
        with self.assertRaises(PermissionError):e.actor_for('guest',MAPPING)
        self.assertTrue(e.actor_for('admin',MAPPING,True)['parent'])
        self.assertFalse(MAX['parent'])

    def test_visibility_contains_only_child_occurrences(self):
        data=e.save_task(e.empty_data(),raw(),PARENT)
        rows=e.occurrences(data,e.visible_people(PAUL),TODAY,date(2026,11,15))
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['person'],'Paul')

    def test_child_cannot_edit_parent_task(self):
        task=self.task(assignees=['Paul'])
        with self.assertRaises(PermissionError):e.validate_task(raw(assignees=['Paul']),PAUL,task)

    def test_creator_is_server_assigned(self):
        task=e.validate_task(raw(assignees=['Paul'],created_by='v',parent=True),PAUL)
        self.assertEqual(task['created_by'],'p')
        updated=e.validate_task({**task,'title':'Neu'},PAUL,task)
        self.assertEqual(updated['created_by'],'p')

    def test_child_cannot_delete_other_or_parent_task(self):
        data=e.save_task(e.empty_data(),raw(),PARENT)
        with self.assertRaises(PermissionError):e.delete_task(data,data['tasks'][0]['id'],PAUL)

    def test_child_can_edit_delete_own_task(self):
        data=e.save_task(e.empty_data(),raw(assignees=['Paul']),PAUL)
        task=data['tasks'][0]
        updated=e.save_task(data,{**task,'title':'Mein Zimmer'},PAUL)
        self.assertEqual(updated['tasks'][0]['title'],'Mein Zimmer')
        self.assertEqual(e.delete_task(updated,task['id'],PAUL)['tasks'],[])

    def test_completion_is_separate_per_person_and_date(self):
        data=e.save_task(e.empty_data(),raw(kind='daily'),PARENT)
        task=data['tasks'][0]
        completed=e.complete(data,task['id'],'Paul',TODAY.isoformat(),PAUL,TODAY)
        rows=e.occurrences(completed,['Paul','Maximilian'],TODAY,date(2026,11,10))
        self.assertEqual(len(rows),3)
        self.assertTrue(any(r['person']=='Maximilian' and r['date']==TODAY.isoformat() for r in rows))
        self.assertTrue(any(r['person']=='Paul' and r['date']=='2026-11-10' for r in rows))
        self.assertEqual(data['done'],{})

    def test_cannot_complete_for_other_child(self):
        data=e.save_task(e.empty_data(),raw(),PARENT)
        with self.assertRaises(PermissionError):e.complete(data,data['tasks'][0]['id'],'Maximilian','2026-11-09',PAUL,TODAY)

    def test_cannot_complete_nonexistent_occurrence(self):
        data=e.save_task(e.empty_data(),raw(),PARENT)
        with self.assertRaises(ValueError):e.complete(data,data['tasks'][0]['id'],'Paul','2026-11-10',PAUL,TODAY)

    def test_completion_idempotent_and_json_restorable(self):
        data=e.save_task(e.empty_data(),raw(),PARENT)
        ident=data['tasks'][0]['id']
        one=e.complete(data,ident,'Paul','2026-11-09',PAUL,TODAY)
        reloaded=json.loads(json.dumps(one))
        two=e.complete(reloaded,ident,'Paul','2026-11-09',PAUL,TODAY)
        self.assertEqual(one,two)

    def test_parent_cannot_complete_for_either_child(self):
        data=e.save_task(e.empty_data(),raw(),PARENT)
        for person in e.CHILDREN:
            with self.assertRaises(PermissionError):
                e.complete(data,data['tasks'][0]['id'],person,'2026-11-09',PARENT,TODAY)

    def test_vacation_skips_dates_without_shifting_rhythm(self):
        data=e.save_task(e.empty_data(),raw(kind='daily',interval=2),PARENT)
        paused=e.save_vacation(data,True,PARENT,TODAY)
        self.assertEqual(e.occurrences(paused,['Paul'],TODAY,date(2026,11,15)),[])
        paused=e.save_vacation(paused,False,PARENT,date(2026,11,13))
        rows=e.occurrences(paused,['Paul'],TODAY,date(2026,11,15))
        self.assertEqual([r['date'] for r in rows],['2026-11-13','2026-11-15'])

    def test_ending_vacation_preserves_past_skipped_days(self):
        data=e.save_task(e.empty_data(),raw(kind='daily'),PARENT)
        data=e.save_vacation(data,True,PARENT,TODAY)
        data=e.save_vacation(data,False,PARENT,date(2026,11,12))
        self.assertTrue(e.vacation_on(data,date(2026,11,11)))
        self.assertFalse(e.vacation_on(data,date(2026,11,12)))

    def test_only_mapped_parents_can_manage_settings(self):
        for user_id in ['v', 'm']:
            actor=e.actor_for(user_id,MAPPING)
            self.assertTrue(e.can_manage_settings(actor))
            e.save_vacation(e.empty_data(),True,actor,TODAY)
        for actor in [MAX,PAUL,e.actor_for('other_admin',MAPPING,True)]:
            self.assertFalse(e.can_manage_settings(actor))
            with self.assertRaises(PermissionError):
                e.save_vacation(e.empty_data(),True,actor,TODAY)
            with self.assertRaises(PermissionError):
                e.save_vacation(e.empty_data(),False,actor,TODAY)

    def test_child_cannot_change_vacation(self):
        with self.assertRaises(PermissionError):e.save_vacation(e.empty_data(),True,PAUL,TODAY)

    def test_done_does_not_reappear_after_task_title_edit(self):
        data=e.save_task(e.empty_data(),raw(assignees=['Paul']),PAUL)
        task=data['tasks'][0]
        data=e.complete(data,task['id'],'Paul','2026-11-09',PAUL,TODAY)
        data=e.save_task(data,{**task,'title':'Anderer Titel'},PAUL)
        self.assertEqual(e.occurrences(data,['Paul'],TODAY,TODAY),[])

    def test_vacation_migration(self):
        old={'tasks':[],'done':{},'revision':2,'vacations':[{'start':'2026-11-08','end':'2026-11-12'}]}
        migrated=e.migrate_vacation(old,TODAY)
        self.assertTrue(migrated['vacation_enabled'])
        self.assertTrue(e.vacation_on(migrated,date(2027,1,1)))
        stopped=e.save_vacation(migrated,False,PARENT,date(2026,11,10))
        self.assertTrue(e.vacation_on(stopped,TODAY))
        self.assertFalse(e.vacation_on(stopped,date(2026,11,10)))
        self.assertEqual(e.migrate_vacation(migrated,TODAY),migrated)

    def test_bad_inputs_rejected(self):
        for changes in [{'title':''},{'interval':0},{'weekdays':[8]},{'end':'2026-11-01'},{'kind':'magic'}]:
            with self.assertRaises((ValueError,TypeError)):self.task(**changes)


if __name__=='__main__':unittest.main()

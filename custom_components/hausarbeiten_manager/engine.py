"""Household tasks, recurrence and authorization, independent of HA."""
from copy import deepcopy
from datetime import date, timedelta, datetime, timezone
from calendar import monthrange
from uuid import uuid4

CHILDREN = ('Maximilian', 'Paul')
ADULTS = ('Vera', 'Manuel')
KINDS = ('once', 'daily', 'weekly', 'monthly_nth')


def empty_data():
    return {'tasks': [], 'done': {}, 'vacations': [], 'revision': 0}


def iso_date(value):
    return date.fromisoformat(str(value))


def actor_for(user_id, mapping, is_admin=False):
    person = next((p for p, ident in mapping.items() if ident == user_id), None)
    if not person and not is_admin:
        raise PermissionError('Dieses HA-Konto ist keinem Familienmitglied zugeordnet.')
    return {'user_id': user_id, 'person': person or 'Administrator', 'parent': is_admin or person in ADULTS}


def can_manage_settings(actor):
    return actor['person'] in ADULTS


def visible_people(actor):
    return list(CHILDREN) if actor['parent'] else [actor['person']]


def can_edit(actor, task):
    return actor['parent'] or (task['created_by'] == actor['user_id'] and task['assignees'] == [actor['person']])


def validate_task(raw, actor, old=None):
    if old and not can_edit(actor, old):
        raise PermissionError('Nur eigene selbst angelegte Aufgaben können bearbeitet werden.')
    title = str(raw.get('title', '')).strip()
    if not title or len(title) > 150:
        raise ValueError('Bitte einen Titel mit 1 bis 150 Zeichen angeben.')
    description = str(raw.get('description', '')).strip()
    if len(description) > 2000:
        raise ValueError('Die Beschreibung ist zu lang.')
    assignees = raw.get('assignees', [])
    if not isinstance(assignees, list) or not assignees or any(p not in CHILDREN for p in assignees):
        raise ValueError('Maximilian und/oder Paul auswählen.')
    assignees = [p for p in CHILDREN if p in assignees]
    if not actor['parent'] and assignees != [actor['person']]:
        raise PermissionError('Du kannst Aufgaben nur für dich selbst anlegen.')
    start = iso_date(raw['start'])
    end = iso_date(raw['end']) if raw.get('end') else None
    if end and end < start:
        raise ValueError('Das Enddatum liegt vor dem Startdatum.')
    kind = raw.get('kind', 'once')
    if not actor['parent'] and kind != 'once':
        raise PermissionError('Kinder können nur einmalige Arbeiten anlegen.')
    if kind not in KINDS:
        raise ValueError('Unbekannte Wiederholung.')
    interval = int(raw.get('interval', 1))
    if not 1 <= interval <= 365:
        raise ValueError('Der Abstand muss zwischen 1 und 365 liegen.')
    weekdays = raw.get('weekdays', [start.weekday()])
    if not isinstance(weekdays, list) or not weekdays or any(type(w) is not int or w < 0 or w > 6 for w in weekdays):
        raise ValueError('Mindestens einen gültigen Wochentag wählen.')
    nth = int(raw.get('nth', 1))
    if nth not in (1, 2, 3, 4, 5, -1):
        raise ValueError('Ungültige Position im Monat.')
    return {'id': old['id'] if old else uuid4().hex, 'title': title, 'description': description,
            'assignees': assignees, 'start': start.isoformat(), 'end': end.isoformat() if end else '',
            'kind': kind, 'interval': interval, 'weekdays': sorted(set(weekdays)), 'nth': nth,
            'created_by': old['created_by'] if old else actor['user_id']}


def occurs(task, day):
    start = iso_date(task['start'])
    if day < start or (task.get('end') and day > iso_date(task['end'])):
        return False
    kind = task['kind']
    if kind == 'once':
        return day == start
    if kind == 'daily':
        return (day-start).days % task['interval'] == 0
    if kind == 'weekly':
        anchor = start-timedelta(days=start.weekday())
        return ((day-anchor).days//7) % task['interval'] == 0 and day.weekday() in task['weekdays']
    months = (day.year-start.year)*12 + day.month-start.month
    if months % task['interval'] or day.weekday() not in task['weekdays']:
        return False
    if task['nth'] == -1:
        return day.day+7 > monthrange(day.year, day.month)[1]
    return (day.day-1)//7+1 == task['nth']


def vacation_on(data, day):
    return any(iso_date(v['start']) <= day <= iso_date(v['end']) for v in data['vacations'])


def key_for(task_id, person, day):
    return f'{task_id}|{person}|{day.isoformat()}'


def occurrences(data, people, start, end):
    if end < start or (end-start).days > 366:
        raise ValueError('Maximal 366 Tage pro Abruf.')
    result = []
    for task in data['tasks']:
        assigned = [p for p in task['assignees'] if p in people]
        if not assigned:
            continue
        day = max(start, iso_date(task['start']))
        last = min(end, iso_date(task['end'])) if task.get('end') else end
        while day <= last:
            if occurs(task, day) and not vacation_on(data, day):
                for person in assigned:
                    ident = key_for(task['id'], person, day)
                    if ident not in data['done']:
                        result.append({'id': ident, 'task_id': task['id'], 'person': person,
                                       'date': day.isoformat(), 'title': task['title'],
                                       'description': task['description']})
            day += timedelta(days=1)
    return sorted(result, key=lambda r: (r['date'], r['person'], r['title'].casefold(), r['id']))


def save_task(data, raw, actor):
    result = deepcopy(data)
    old = next((t for t in result['tasks'] if t['id'] == raw.get('id')), None)
    if raw.get('id') and not old:
        raise ValueError('Aufgabe wurde inzwischen entfernt.')
    if not old and len(result['tasks']) >= 500:
        raise ValueError('Maximal 500 Aufgabenserien möglich.')
    task = validate_task(raw, actor, old)
    result['tasks'] = [t for t in result['tasks'] if t['id'] != task['id']] + [task]
    return result


def delete_task(data, task_id, actor):
    task = next((t for t in data['tasks'] if t['id'] == task_id), None)
    if not task:
        raise ValueError('Aufgabe nicht gefunden.')
    if not can_edit(actor, task):
        raise PermissionError('Diese Aufgabe darfst du nicht löschen.')
    result = deepcopy(data)
    result['tasks'] = [t for t in result['tasks'] if t['id'] != task_id]
    return result


def complete(data, task_id, person, day_text, actor, today):
    if person not in visible_people(actor):
        raise PermissionError('Du kannst nur deine eigenen Hausarbeiten abhaken.')
    day = iso_date(day_text)
    if day > today+timedelta(days=6):
        raise ValueError('Dieser Termin liegt außerhalb der nächsten sieben Tage.')
    task = next((t for t in data['tasks'] if t['id'] == task_id), None)
    if not task or person not in task['assignees'] or not occurs(task, day) or vacation_on(data, day):
        raise ValueError('Dieser Termin ist nicht mehr offen.')
    result = deepcopy(data)
    ident = key_for(task_id, person, day)
    if ident not in result['done']:
        result['done'][ident] = {'at': datetime.now(timezone.utc).isoformat(), 'by': actor['user_id']}
    return result


def save_vacation(data, enabled, start, end, actor, today):
    if not can_manage_settings(actor):
        raise PermissionError('Nur Vera und Manuel dürfen die Einstellungen ändern.')
    result = deepcopy(data)
    if enabled:
        first, last = iso_date(start), iso_date(end)
        if last < first or last < today:
            raise ValueError('Bitte einen gültigen aktuellen oder zukünftigen Urlaubszeitraum wählen.')
        # No retroactive hiding of older overdue tasks.
        first = max(first, today)
        result['vacations'].append({'id': uuid4().hex, 'start': first.isoformat(), 'end': last.isoformat()})
    else:
        retained = []
        for item in result['vacations']:
            if iso_date(item['end']) < today:
                retained.append(item)
            elif iso_date(item['start']) < today:
                retained.append({**item, 'end': (today-timedelta(days=1)).isoformat()})
        result['vacations'] = retained
    return result

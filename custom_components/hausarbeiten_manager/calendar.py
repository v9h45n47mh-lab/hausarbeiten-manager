"""One native all-day calendar per child; completed occurrences are omitted."""
from datetime import timedelta
from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.util import dt as dt_util
from . import DOMAIN, SIGNAL
from .engine import CHILDREN, occurrences


async def async_setup_entry(hass, entry, async_add_entities):
    manager = hass.data[DOMAIN]
    async_add_entities([ChoreCalendar(manager, child) for child in CHILDREN])


class ChoreCalendar(CalendarEntity):
    _attr_should_poll = False
    _attr_icon = 'mdi:calendar-check'

    def __init__(self, manager, child):
        self.manager, self.child = manager, child
        self._attr_name = f'Hausarbeiten {child}'
        self._attr_unique_id = f'{DOMAIN}_{child.lower()}'

    @property
    def event(self):
        today = self.manager.today()
        rows = occurrences(self.manager.data, [self.child], today, today+timedelta(days=60))
        return self.make_event(rows[0]) if rows else None

    def make_event(self, row):
        from datetime import date
        day = date.fromisoformat(row['date'])
        return CalendarEvent(start=day,end=day+timedelta(days=1),summary=row['title'],description=row['description'])

    async def async_get_events(self, hass, start_date, end_date):
        # Calendar queries are end-exclusive and rendered in HA's configured zone.
        first = dt_util.as_local(start_date).date()
        local_end = dt_util.as_local(end_date)
        last = (local_end-timedelta(microseconds=1)).date()
        rows = occurrences(self.manager.data,[self.child],first,last)
        return [self.make_event(row) for row in rows]

    async def async_added_to_hass(self):
        self.async_on_remove(async_dispatcher_connect(self.hass,SIGNAL,self.async_write_ha_state))

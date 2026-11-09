"""Map family members to actual HA users, never to client-provided names."""
try:
    import probatio as vol
except ImportError:
    import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .engine import ADULTS, CHILDREN

DOMAIN = 'hausarbeiten_manager'


async def user_schema(hass, defaults):
    users = {u.id: u.name or u.id for u in await hass.auth.async_get_users()
             if u.is_active and not u.system_generated}
    return vol.Schema({vol.Required(person, **({'default': defaults[person]} if defaults.get(person) in users else {})):
                       vol.In(users) for person in (*ADULTS, *CHILDREN)})


class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        errors = {}
        if user_input:
            if len(set(user_input.values())) != 4:
                errors['base'] = 'distinct_users'
            else:
                return self.async_create_entry(title='Hausarbeiten Manager', data={'users':user_input})
        return self.async_show_form(step_id='user', data_schema=await user_schema(self.hass,user_input or {}),errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return OptionsFlow()


class OptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        errors = {}
        if user_input:
            if len(set(user_input.values())) != 4:
                errors['base'] = 'distinct_users'
            else:
                return self.async_create_entry(title='',data={'users':user_input})
        defaults = self.config_entry.options.get('users',self.config_entry.data['users'])
        return self.async_show_form(step_id='init',data_schema=await user_schema(self.hass,defaults),errors=errors)

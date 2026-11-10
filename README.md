# Hausarbeiten Manager

Lokaler Hausarbeitenkalender für Home Assistant. Eltern planen Aufgaben für Maximilian und Paul; die Kinder sehen ihre eigenen Aufgaben und können eigene Hausarbeiten anlegen. Wiederholungen, Urlaubszeiträume und Erledigungen werden lokal gespeichert.

## Version 0.1.1

- **Vera/Manuel:** einmalige und wiederkehrende Aufgaben für Maximilian, Paul oder beide Kinder anlegen, bearbeiten und löschen. Erledigungen für beide Kinder möglich.
- **Maximilian/Paul:** eigene Termine der nächsten sieben Tage sehen und abhaken. Selbst angelegte Aufgaben für sich selbst bearbeiten und löschen. Von Eltern zugewiesene Aufgaben dürfen erledigt, aber nicht umgeplant werden.
- **Kalenderkarte:** heute und die folgenden sechs Tage, gruppiert nach Datum. Es erscheinen nur Tage mit offenen Einträgen; leere Tage werden ausgeblendet. Erledigte Termine verschwinden. Jede Zuordnung an ein Kind hat eine eigene Erledigung: Bei einer Aufgabe für beide muss jedes Kind seinen Termin abhaken.
- **Wiederholungen:** einmalig; täglich/alle X Tage; wöchentlich/alle X Wochen an gewählten Wochentagen; erster bis fünfter oder letzter Wochentag im Monat, auch alle X Monate.
- **Urlaub:** Eltern pausieren alle Hausarbeiten beider Kinder für einen Datumsbereich. Termine im Zeitraum entfallen, auch einmalige Aufgaben. Kein Nachholstapel und keine Verschiebung des Wiederholungsrhythmus. Nach dem Ende des Zeitraums laufen die regulären Termine weiter.
- **Native HA-Kalender:** je ein Kalender für Maximilian und Paul, zusätzlich zur interaktiven Karte.
- **Gestaltung:** kompakte Karte, Register und Zeilen im Stil von Light Manager und Shutter Manager. HA-Themenfarben, keine externen Frontend-Bibliotheken.

## Installation über Marketplace/HACS

1. Marketplace/HACS → ⋮ → Benutzerdefinierte Repositories.
2. Repository `https://github.com/v9h45n47mh-lab/hausarbeiten-manager` hinzufügen, Kategorie **Integration**.
3. **Hausarbeiten Manager** herunterladen und Home Assistant neu starten.
4. Einstellungen → Geräte & Dienste → Integration hinzufügen → **Hausarbeiten Manager**.
5. Vera, Manuel, Maximilian und Paul jeweils dem tatsächlichen, eigenen **HA-Benutzerkonto** zuordnen. Vier unterschiedliche Konten sind erforderlich. Es sind Benutzer-IDs, keine iPhone-Geräte-IDs. Änderungen sind später über die Optionen der Integration möglich.
6. Dashboard bearbeiten → Karte hinzufügen → Manuell:

```yaml
type: custom:hausarbeiten-manager-card
title: Hausarbeiten
```

Auf den Kinder-Dashboards dieselbe Karte einfügen. Die Ansicht richtet sich nach dem angemeldeten HA-Konto. Kein `person:`-Parameter und keine Namensauswahl im Kinder-Dashboard nötig. Die JavaScript-Karte wird mit der Integration automatisch geladen. Browser bzw. Companion-App nach dem HA-Neustart neu laden.

Bei manueller Installation den Ordner `custom_components/hausarbeiten_manager` nach `/config/custom_components/` kopieren, dann ab Schritt 3 fortfahren.

## Access Control

Für die Rollen von Maximilian und Paul (sowie eingeschränkte Elternrollen) unter **Advanced → Always allow (one pattern per line)** ergänzen:

```text
hausarbeiten_manager/*
```

Damit werden ausschließlich die Befehle dieser Integration zugelassen. Die Integration prüft bei JEDEM Abruf und Schreibaufruf die tatsächliche angemeldete Benutzer-ID: Kinder bekommen nur ihre eigenen Termine und dürfen weder für das andere Kind schreiben noch Urlaube ändern. Native HA-Administratoren dürfen die Aufgabenverwaltung verwenden; die Einstellungen und der Urlaubsmodus sind ausschließlich den zugeordneten Konten Vera und Manuel vorbehalten. Auch Vera und Manuel erhalten die Elternfunktionen über die explizite Kontozuordnung, ohne HA-Administratoren sein zu müssen.

Für die zusätzlichen nativen Kalender die tatsächlichen Entitäts-IDs unter Entwicklerwerkzeuge → Zustände prüfen. Erwartet:

- `calendar.hausarbeiten_maximilian`
- `calendar.hausarbeiten_paul`

Maximilian nur seinen Kalender mit Lesen freigeben, Paul nur seinen, Eltern beide. Vorhandene Labels können hierfür verwendet werden. Die Rechte auf native Kalender werden von HA bzw. Access Control verwaltet; die eigene Karte filtert unabhängig davon im Backend. Ohne eine solche Einschränkung zeigt das normale HA-Berechtigungsmodell möglicherweise auch andere Kalender. Die Kontozuordnung allein ändert keine HA-Entitätsrechte.

## Aufgaben anlegen

In der Karte auf **+ Hausarbeit** klicken. Eltern wählen ein oder beide Kinder. Bei den Kindern ist nur die eigene Person zulässig.

- **Täglich:** Startdatum wählen, Wiederholung täglich, Abstand 1.
- **Alle zwei Wochen samstags:** Startdatum in der gewünschten ersten Woche, Wiederholung wöchentlich, Abstand 2, Wochentag Sa. Die erste Woche beginnt montags; es gibt keine Termine vor dem Startdatum.
- **Jeden zweiten Samstag im Monat:** Wiederholung bestimmter Wochentag im Monat, Abstand 1, Sa, Zweiter.
- **Einmalig:** Datum und einmalig wählen.

Ein fünfter Samstag erzeugt nur in Monaten mit fünf Samstagen einen Termin. Eine optionale Endgrenze gilt einschließlich dieses Tages.

## Erledigen und Bearbeiten

Das leere Kästchen neben einem Termin markiert genau diesen Termin für genau dieses Kind als erledigt. Er verschwindet nach erfolgreichem Speichern. Andere Termine derselben Serie und das andere Kind bleiben offen. Die Karte aktualisiert sich spätestens alle 15 Sekunden; nach eigenen Änderungen sofort.

Unter **Hausarbeiten / Meine Aufgaben** liegen die Vorlagen. Das Löschen einer Vorlage entfernt alle noch angezeigten Termine dieser Vorlage. Bestehende Erledigungsnachweise bleiben im lokalen Speicher erhalten; ein eigener Erledigungsverlauf ist in 0.1.0 noch nicht Teil der Oberfläche.

Die Standardansicht zeigt heute bis heute + 6 Tage. Frühere unerledigte Termine bleiben im nativen Kalender am ursprünglichen Datum sichtbar und werden nicht automatisch auf heute verschoben.

## Urlaubsmodus

Vera und Manuel öffnen das **Zahnrad (Einstellungen)** und wählen dort **Urlaub planen / Verwalten**, Von und Bis einschließlich, danach Speichern. Weitere Zeiträume können ergänzt werden. Mit **Urlaub beenden / Planung aufheben** werden zukünftige Urlaubszeiträume aufgehoben und ein laufender Urlaub mit gestern beendet. Bereits vergangene Urlaubstage bleiben gespeichert, damit ausgelassene Termine nicht nachträglich wieder erscheinen. Das Setzen eines Urlaubs kann keine vergangenen Tage nachträglich überspringen.

## Speicherung und Grenzen

Aufgaben, Erledigungen, Urlaubszeiträume und Revisionen werden über HA Store in `/config/.storage/hausarbeiten_manager` gespeichert und gehören in das HA-Backup. Die Integration hat keine Verbindung zur Haushalts-App und übernimmt bisherige Hausarbeiten nicht automatisch. Diese müssen zunächst neu angelegt werden; die alte Verwaltung erst nach dem Test abschalten. Der Spülmaschinendienst bleibt eine separate Integration.

Änderungen werden erst nach erfolgreichem Speichern an die Karte gemeldet. Gleichzeitige Änderungen werden über eine Revision geprüft; bei Konflikten neu laden und erneut bearbeiten. Ein geöffnetes Formular wird nicht durch Hintergrundaktualisierung überschrieben.

Grenzen: maximal 500 Vorlagen, keine zusätzlichen Erinnerungs-Pushes, kein Punktesystem, keine automatische Übernahme aus der Haushalts-App. Diese Version verwendet ganztägige Aufgaben ohne Uhrzeit.

## Validierung

25 Tests prüfen Wiederholungen (einschließlich Monatspositionen und Schaltjahr), Urlaubsverhalten, getrennte Erledigungen, JSON-Wiederherstellung und serverseitige Rechte. DOM-Prüfungen decken die Sieben-Tage-Ansicht, Abhaken, Eltern-/Kinderbedienelemente, sichere Textdarstellung und Benutzerwechsel ab.

```sh
python3 -m unittest discover -s tests -v
# Für die optionale Frontend-Entwicklungsprüfung linkedom installieren:
node tests/test_card.cjs
```

Python- und JavaScript-Syntax wurden geprüft. Ein Lauf in einer echten HA-Instanz und ein visueller Test mit deinen iPhones stehen aus.

## Neu in 0.1.1

- Urlaubsmodus und Urlaubsverwaltung befinden sich im Einstellungsbereich (Zahnrad).
- Einstellungen sehen und ändern ausschließlich die in der Integration zugeordneten Konten von Vera und Manuel. Andere Administratoren erhalten dadurch keinen Zugriff auf den Urlaubsmodus.
- Die Sieben-Tage-Ansicht blendet Tage ohne offene Einträge aus. Wird der letzte Termin eines Tages erledigt, verschwindet auch dessen Tagesüberschrift.
- Das vorgemerkte Logo wird mit dieser Version noch nicht erstellt.

## Neu in 0.1.2

Vera und Manuel legen Hausarbeiten unter Einstellungen (Zahnrad) an und verwalten sie dort. Kinder haben auf der Hauptseite **+ Einmalige Arbeit**, ausschließlich für sich selbst. Kinder können keine Wiederholungen anlegen. Tagesüberschriften sind auf- und zuklappbar. Gleichnamige Aufgaben eines Tages werden in der Elternansicht zusammengefasst; jedes Kind behält ein eigenes Häkchen. Bei mehreren gleichnamigen Aufgaben desselben Kindes am selben Tag erledigt dessen Häkchen alle dazugehörigen Termine. Die Erledigung für das andere Kind bleibt offen.

## Neu in 0.1.3

Versionsnummer nur in Einstellungen; kein Benutzername im Kartenkopf. Urlaubsmodus über den Schalter unter Einstellungen ein-/ausschalten. Kein Zeitraum, keine automatische Abschaltung. Während der Pause entfallen Hausarbeiten; nach Ausschalten laufen sie ab heute wieder im gewohnten Rhythmus. Vergangene pausierte Tage bleiben ausgelassen. Beim Update wird ein aktuell laufender alter Urlaubszeitraum zu einem dauerhaft eingeschalteten Schalter; zukünftige alte Urlaubsplanungen entfallen.

Nur Maximilian und Paul können jeweils eigene Termine abhaken. Vera und Manuel sehen die Zuordnung und verwalten Aufgaben, können aber keine Erledigungen vornehmen. Das wird im Backend geprüft.

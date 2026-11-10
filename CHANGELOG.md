# Änderungen

## 0.3.2

- HA UI Kit auf fest eingebundene Version 1.2.0 aktualisiert.
- Passende gemeinsame Aufgaben-, Auswahl- und Statistikbausteine direkt verwendet; lokale Kopien gemeinsamer Stile entfernt.
- Bestehende Aufgaben-, Live-Sync-, NFC- und Berechtigungslogik erhalten.

## 0.3.1

- Fest eingebundenes HA UI Kit auf 1.1.0 aktualisiert, einschließlich der neuesten gemeinsamen Komponenten und Symbole.
- Versionierter Modulpfad, Ressourcenkennung, Prüfsummen und Versionsanzeige aktualisiert. Funktionen und Berechtigungen bleiben unverändert.

## 0.3.0

- Vollständige Oberfläche auf lokal fest eingebundenes HA UI Kit 1.0.0 umgestellt: Navigation, Klappbereiche, Zeilen, Symbole, Farben, Schrift, Abstände und Versionsanzeige.
- Gemeinsame Buttons, Eingaben, Schalter und native Dialoge für Hausarbeiten; bestehende Aufgaben-, NFC- und Berechtigungslogik unverändert.
- Frontend-Verzeichnis liefert auch die versionierten Kit-Module aus; keine zusätzliche Integration und kein CDN erforderlich.

## 0.2.5

- Einstellungssymbol exakt wie im Shutter Manager: identisches SVG, 24 px, grau im Normalzustand und HA-Akzentfarbe mit getöntem Hintergrund bei geöffneten Einstellungen.

## 0.2.4

- Live-Sync für geöffnete Hausarbeiten-Karten: Änderungen lösen sofort einen individuell berechtigten Abruf aus.
- Neuer WebSocket-Befehl hausarbeiten_manager/subscribe. Es werden keine Aufgaben-/Benutzerdaten gemeinsam ausgesendet.
- Sofortiger Abruf beim Verbindungsaufbau/Wiederverbinden; Abos werden beim Entfernen oder Benutzerwechsel beendet.
- Geöffnete Formulare bleiben erhalten, Revisionen werden aktualisiert. Ältere Antworten überschreiben keine neueren Daten.
- Bestehender 15-Sekunden-Abruf als Rückfallebene bleibt aktiv.
- Einstellungssymbol wie bei Spülmaschine: mdi:cog.
- 49 Python-Tests und beide Frontend-Prüfungen erfolgreich.

## 0.2.3

- Tabzeile Nächste 7 Tage entfernt; die Sieben-Tage-Ansicht bleibt bestehen.
- Aktualisieren-Button und leerer Kartenfuß auf der Hauptseite entfernt.
- Eltern-Einstellungen jetzt über das Zahnrad im Kopf; dort führt ein Zurück-Pfeil wieder zur Übersicht.
- Versionsnummer bleibt nur in den Einstellungen sichtbar. Automatische Aktualisierung alle 15 Sekunden bleibt erhalten.

## 0.2.2

- Neue Option Abwechselnd für wiederkehrende Aufgaben, mit wählbarem Startkind Paul/Maximilian.
- Genau ein Kind je fälligem Termin; Wechsel nach geplantem Termin, unabhängig vom Abhaken oder Wiederöffnen.
- Funktioniert mit Tagen, Wochen, Monaten und Jahren. Bei mehreren Wochentagen wechselt der Dienst pro Termin.
- Urlaubsmodus verändert den festen Terminrhythmus nicht. Nicht existierende Kalenderdaten zählen nicht als Termin.
- Zuständigkeit wird beim Abhaken und Wiederöffnen serverseitig geprüft.
- Bisherige Aufgaben und die Zuordnung an beide Kinder bleiben unverändert, solange Abwechselnd nicht eingeschaltet wird.
- 45 Logiktests und Frontend-Prüfungen erfolgreich.

## 0.2.1

- Abgehakte Hausarbeiten bleiben durchgestrichen bis einschließlich ihres Fälligkeitstags sichtbar.
- Erneuter Klick öffnet die eigene Aufgabe wieder; serverseitig nur für das zugeteilte Kind erlaubt.
- Eltern sehen getrennte Erledigt-Markierungen für beide Kinder, haben weiterhin keine Häkchen zum Bedienen.
- Offene Zähler schließen erledigte Aufgaben aus. Automatisches Ausblenden am Tag nach Fälligkeit in der HA-Zeitzone.
- Bestehende gespeicherte Erledigungen werden ebenfalls berücksichtigt; keine Datenmigration erforderlich.
- 38 Logiktests und Frontend-Prüfungen erfolgreich.

## 0.2.0

- Neuer Wiederholungseditor nach Kalendermuster: Wiederkehrend, Wiederholen alle X Tag/Woche/Monat/Jahr, auswählbare Wochentage und optionales Bis-Datum.
- Monatlich am Tag des Startdatums oder an einem bestimmten Wochentag (z. B. zweiter/letzter Samstag); jährliche Wiederholungen ergänzt.
- Keine Felder für Uhrzeiten oder Ganztägig.
- Bestehende tägliche, wöchentliche und monatliche Aufgabenserien bleiben kompatibel; Erledigungen behalten ihre Serien-ID.
- Neues Marketplace-Logo mit Aufgabenliste und Besen in 256/512 Pixeln.
- Kinder können weiterhin nur einmalige eigene Arbeiten anlegen und nur ihre eigenen Aufgaben abhaken.
- 33 Logiktests und Frontend-Prüfungen erfolgreich.

## 0.1.3

- Versionsanzeige ausschließlich unter Einstellungen; Benutzername im Kopf entfernt.
- Urlaubsmodus als dauerhafter Ein/Aus-Schalter ohne Zeitraum im Stil des Shutter Managers.
- Nur Kinder dürfen ihre eigenen Aufgaben abhaken; Eltern sehen nur die Zuordnung.
- Bisher aktive Urlaubszeiträume werden in einen eingeschalteten Schalter übernommen; zukünftige Zeitplanungen entfallen. Vergangene Pausen bleiben erhalten.

## 0.1.2

- Elternverwaltung und Anlage von Hausarbeiten unter Einstellungen.
- Kinder erhalten auf der Hauptseite einen Button für eigene einmalige Arbeiten; Wiederholungen werden im Backend abgewiesen.
- Tage sind auf- und zuklappbar.
- Gleichnamige Aufgaben am selben Tag werden in der Elternansicht zusammengefasst, mit separaten Erledigungen je Kind.

## 0.1.1

- Urlaubsmodus in den Einstellungsbereich verschoben.
- Einstellungen ausschließlich für die zugeordneten Konten von Vera und Manuel, inklusive Backend-Prüfung.
- Nur Tage mit offenen Einträgen werden angezeigt; leere Tage entfallen.
- 25 Logiktests und erweiterte Frontend-DOM-Prüfungen erfolgreich.

## 0.1.0

- Hausarbeiten für Maximilian und Paul mit einmaligen und wiederkehrenden Terminen.
- Explizite Zuordnung der vier Familienmitglieder zu HA-Benutzerkonten.
- Elternverwaltung und backendseitig beschränkte Kinderansichten.
- Sieben-Tage-Kalender mit Erledigt-Häkchen, Urlaubspausen und nativen Kalendern.
- Lokale Speicherung und Karte im Manager-Stil.

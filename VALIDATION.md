# Validierung der UI-Kit-Umstellung

- HA UI Kit 1.0.0 lokal mitgeliefert. Lock-Datei, JS, CSS und Lizenz per SHA-256 geprüft.
- Gemeinsame responsive Regeln bis 600 px, mobile einspaltige Formulare, HA-Theme-Variablen, Schrift, Touchflächen, umbrechende Namen und Dialoghöhe strukturell geprüft.
- Das vollständige Frontendverzeichnis wird am bisherigen URL-Präfix ausgeliefert. Relative ES-Modulimporte funktionieren ohne CDN oder zusätzliche HA-Integration.
- Bestehende Backend- und DOM-Funktionstests inklusive Rollen-/Eingabeprüfungen ausgeführt. Testadapter laden das tatsächliche Kit und die tatsächliche Karte.
- Einschränkung: Die visuelle Desktop-/Mobilprüfung konnte in dieser Umgebung nicht ausgeführt werden. Chromium startet wegen einer gesperrten Betriebssystemfunktion nicht; der Cloud-Browser erlaubt keine lokalen Dateivorschauen. Die Prüfung der Layoutregeln ersetzt keine Sichtprüfung in HA. Kein Test an einer laufenden HA-Instanz.

Nach Installation: HA neu starten, Dashboard/App neu laden; Desktop und iPhone mit Vera/Manuel sowie dem jeweiligen Kinderkonto prüfen. Bestehende Daten, Karten-YAML und Freigaben bleiben gültig.

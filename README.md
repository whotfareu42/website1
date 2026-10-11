# Nation-Website – Einrichtung

Website für deine Minecraft-Nation mit drei Reitern (**Constitution**, **Builds**, **Apply for Citizenship**) und einem Admin-Bereich (**Council login**) zum Bearbeiten der Verfassung, Hochladen von Builds und Bearbeiten von Bürgerschaftsanträgen.

Ohne Einrichtung läuft die Seite im **Demo-Modus** mit Beispielinhalten. So kannst du sie sofort auf GitHub Pages ansehen.

## Dateien

| Datei | Wofür |
|---|---|
| `config.js` | **Die einzige Datei, die du anpassen musst**: Name, Motto, Supabase-Zugangsdaten |
| `index.html` | Öffentliche Seite mit den drei Reitern |
| `admin.html` | Admin-Login und Verwaltung |
| `css/styles.css` | Design |
| `js/` | Logik |
| `supabase-setup.sql` | Datenbank-Setup (einmalig in Supabase ausführen) |

---

## 1. Auf GitHub Pages veröffentlichen

1. In **GitHub Desktop**: *File → New Repository*, Name z. B. `nation-website`, Ordner wählen.
2. Alle Dateien aus diesem Ordner in den Repository-Ordner kopieren (die `index.html` muss direkt im Hauptordner liegen).
3. Unten links als Summary eintragen und auf **Commit to main** klicken:
   ```
   Erste Version der Nation-Website
   ```
4. **Publish repository** klicken und den Haken bei *Keep this code private* **entfernen** (GitHub Pages ist kostenlos nur für öffentliche Repos).
5. Auf github.com im Repo: *Settings → Pages → Branch: `main` / `(root)` → Save*.
6. Nach 1–2 Minuten ist die Seite unter `https://DEINNAME.github.io/nation-website/` erreichbar.

## 2. Name und Motto ändern

In `config.js` die Werte bei `nationName` und `motto` ersetzen, dann committen und pushen:
```
Name und Motto angepasst
```

## 3. Supabase einrichten (für Admin-Login, Uploads und Anträge)

1. Auf [supabase.com](https://supabase.com) kostenlos registrieren und ein **neues Projekt** anlegen (Region: z. B. Frankfurt).
2. Links **SQL Editor** öffnen → *New query* → den kompletten Inhalt von `supabase-setup.sql` einfügen → **Run**.
3. **Öffentliche Registrierung abschalten**: *Authentication → Sign In / Providers* → „Allow new users to sign up" **ausschalten**. So kann sich niemand selbst ein Konto anlegen.
4. **Zugangsdaten holen**: *Project Settings → API* (bzw. *API Keys*). Kopiere die **Project URL** und den **anon / publishable key** in `config.js`:
   ```js
   supabaseUrl: "https://xxxxxxxx.supabase.co",
   supabaseAnonKey: "eyJ... oder sb_publishable_..."
   ```
   Dieser Schlüssel darf öffentlich sein, die Sicherheitsregeln in der Datenbank schützen alles. Den **service_role / secret key** dagegen **niemals** in die Website einbauen.
5. Committen und pushen:
   ```
   Supabase verbunden
   ```

## 4. Admins hinzufügen

Für jeden Admin:

1. *Authentication → Users → Add user → Create new user*: E-Mail und Passwort eingeben, **Auto Confirm User** anhaken.
2. Im **SQL Editor** ausführen (E-Mail anpassen):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';
   ```

Danach kann sich der Admin unten auf der Seite über **Council login** anmelden.

Admin entfernen:
```sql
delete from public.admins where user_id = (select id from auth.users where email = 'admin@example.com');
```

## 5. Später auf eigene Domain (z. B. icchteste.de)

1. Domain kaufen.
2. GitHub: *Settings → Pages → Custom domain* → `icchteste.de` eintragen.
3. Beim Domain-Anbieter DNS-Einträge setzen:
   - **A-Records** für `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **CNAME** für `www`: `DEINNAME.github.io`
4. Wenn verfügbar, **Enforce HTTPS** anhaken.

Am Code und an Supabase musst du dafür nichts ändern.

## Sicherheit kurz erklärt

- Besucher können nur lesen und Anträge abschicken (immer mit Status „pending").
- Nur Konten in der Tabelle `admins` können Inhalte ändern, Bilder hochladen und Anträge sehen.
- Ein normales Konto ohne Admin-Eintrag wird beim Login sofort wieder abgemeldet.

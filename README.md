# SafeFakes

Bezpieczne fejki do Plemion. Skrypt wybiera cel z koordynatow, graczy albo plemion, sprawdza aktualnego wlasciciela i relacje z mapy, a potem wypelnia formularz na placu.

Skrypt nie wysyla rozkazu automatycznie.

## Gotowy skrypt do paska

Gotowy adres skryptu: `https://bartoszwiszniewski.github.io/safe-fakes/SafeFakes.js`.

```js
javascript:window.SafeFakes={
  "coords":"500|500 501|500 502|500 503|500",
  "players":"",
  "player_ids":"",
  "allies":"",
  "ally_tags":"",
  "ally_ids":"",
  "boundaries":[],
  "exclude_players":"",
  "exclude_player_ids":"",
  "exclude_allies":"",
  "exclude_ally_tags":"",
  "exclude_ally_ids":"",
  "min_points":0,
  "troops_templates":[
    {"ram":1},
    {"catapult":1}
  ],
  "fill_troops":"axe,spy,light,catapult,spear",
  "fill_exact":false,
  "safeguard":{},
  "allow_barbarians":false,
  "date_ranges":[
    "02.07.2026 12:00 - 02.07.2026 23:59"
  ],
  "skip_night_bonus":true,
  "blocking_enabled":false,
  "blocking_local":null,
  "blocking_global":[],
  "changing_village_enabled":true,
  "random_target":true,
  "random_target_by":"village",
  "require_relations":true,
  "load_map_frame":true,
  "map_frame_timeout_ms":10000,
  "messages":{
    "rally_point_required":"Uruchom skrypt na placu, w widoku wysylania rozkazu.",
    "confirmation_screen":"Jestes na ekranie potwierdzenia. Skrypt nic tu nie zmienia.",
    "no_targets":"Brak celow. Podaj coords, players/player_ids albo allies/ally_tags/ally_ids.",
    "missing_relations":"Brak danych relacji z mapy. Zatrzymano wybor celu dla bezpieczenstwa.",
    "no_safe_targets":"Brak bezpiecznych celow. Odrzucono: {rejected}.",
    "no_timed_targets":"Bezpieczne cele istnieja, ale zaden nie pasuje do czasu dojscia albo bonusu nocnego.",
    "no_unblocked_targets":"Bezpieczne cele istnieja, ale wszystkie sa zablokowane przez ustawienia blockingu.",
    "selected_target":"Wybrano {target} ({player}), dojscie {arrival}. Rozkaz nie zostal wyslany automatycznie.",
    "fetch_failed":"Nie moge pobrac {url}: HTTP {status}",
    "not_enough_troops":"Brakuje wojska do ustawionych szablonow fejka."
  }
};$.getScript("https://bartoszwiszniewski.github.io/safe-fakes/SafeFakes.js");void 0;
```

## Pelna konfiguracja

Ten sam przyklad w czytelniejszej formie:

```js
window.SafeFakes = {
  // Konkretne wioski. Skrypt wyciaga same koordy, wiec nazwy moga zostac.
  coords: "500|500 501|500 502|500 503|500",

  // Opcjonalnie: cele po graczach. Zostaw puste, jesli uzywasz tylko coords.
  players: "",
  player_ids: "",

  // Opcjonalnie: cele po plemionach. Najwygodniej uzywac tagow.
  allies: "",
  ally_tags: "",
  ally_ids: "",

  // Opcjonalnie: ograniczenie puli z graczy/plemion do obszaru.
  // Reczne coords omijaja boundaries, tak jak w Hermitowskich Fejkach.
  boundaries: [
    // { min_x: 490, max_x: 510, min_y: 490, max_y: 510 },
    // { x: 500, y: 500, r: 20 }
  ],

  // Opcjonalnie: reczne wykluczenia z puli celow.
  exclude_players: "",
  exclude_player_ids: "",
  exclude_allies: "",
  exclude_ally_tags: "",
  exclude_ally_ids: "",

  // Minimalna liczba punktow wioski celu. 0 = wylaczone.
  min_points: 0,

  // Szablony wojska. Skrypt bierze pierwszy szablon, na ktory masz wojsko.
  troops_templates: [
    { ram: 1 },
    { catapult: 1 }
  ],

  // Jednostki do dopelniania fejka pod limit swiata.
  // Mozna dac limit, np. axe:100,spy:5,light:20.
  fill_troops: "axe,spy,light,catapult,spear",
  fill_exact: false,

  // Wojsko zostawiane w wiosce.
  safeguard: {},

  // Barbarzynskie wioski bez wlasciciela. Domyslnie nie atakowac.
  allow_barbarians: false,

  // Okna dojscia rozkazu. To jest czas dojscia, nie czas odpalenia skryptu.
  date_ranges: [
    "02.07.2026 12:00 - 02.07.2026 23:59"
  ],

  // Omijaj bonus nocny, chyba ze idzie sam zwiad.
  skip_night_bonus: true,

  // Blokowanie ponownego wyboru celu po uzyciu.
  blocking_enabled: false,
  blocking_local: null,
  // Przyklad lokalny:
  // blocking_local: { time_s: 3600, count: 1, block_players: false },
  blocking_global: [
    // { name: "moje_fejki", time_s: 3600, count: 1, block_players: true }
  ],

  // Jesli w tej wiosce nie ma celu/wojska, przejdz do nastepnej wioski z grupy.
  changing_village_enabled: true,

  // Losowanie celu.
  random_target: true,
  random_target_by: "village",

  // Zatrzymaj skrypt, jesli nie da sie pobrac relacji z mapy.
  require_relations: true,
  load_map_frame: true,
  map_frame_timeout_ms: 10000,

  // Polskie komunikaty.
  messages: {
    rally_point_required: "Uruchom skrypt na placu, w widoku wysylania rozkazu.",
    confirmation_screen: "Jestes na ekranie potwierdzenia. Skrypt nic tu nie zmienia.",
    no_targets: "Brak celow. Podaj coords, players/player_ids albo allies/ally_tags/ally_ids.",
    missing_relations: "Brak danych relacji z mapy. Zatrzymano wybor celu dla bezpieczenstwa.",
    no_safe_targets: "Brak bezpiecznych celow. Odrzucono: {rejected}.",
    no_timed_targets: "Bezpieczne cele istnieja, ale zaden nie pasuje do czasu dojscia albo bonusu nocnego.",
    no_unblocked_targets: "Bezpieczne cele istnieja, ale wszystkie sa zablokowane przez ustawienia blockingu.",
    selected_target: "Wybrano {target} ({player}), dojscie {arrival}. Rozkaz nie zostal wyslany automatycznie.",
    fetch_failed: "Nie moge pobrac {url}: HTTP {status}",
    not_enough_troops: "Brakuje wojska do ustawionych szablonow fejka."
  }
};
```

## Co mozna ustawic

- `coords` - lista koordynatow, moze byc z nazwami wiosek.
- `players` - nicki graczy po przecinku.
- `player_ids` - ID graczy po przecinku.
- `allies` - nazwy plemion po przecinku.
- `ally_tags` - tagi plemion po przecinku.
- `ally_ids` - ID plemion po przecinku.
- `boundaries` - ogranicza cele z graczy/plemion do boxa albo kola.
- `exclude_players` - nicki graczy do recznego wykluczenia.
- `exclude_player_ids` - ID graczy do recznego wykluczenia.
- `exclude_allies` - nazwy plemion do recznego wykluczenia.
- `exclude_ally_tags` - tagi plemion do recznego wykluczenia.
- `exclude_ally_ids` - ID plemion do recznego wykluczenia.
- `min_points` - minimalne punkty celu.
- `troops_templates` - lista szablonow wojska.
- `fill_troops` - czym dopelniac fake pod limit swiata.
- `fill_exact` - `false` dopelnia tylko tyle, ile trzeba; `true` bierze dostepny limit z `fill_troops`.
- `safeguard` - wojsko, ktore ma zostac w wiosce.
- `allow_barbarians` - `false` blokuje wioski barbarzynskie.
- `date_ranges` - okna czasu dojscia.
- `skip_night_bonus` - blokuje dojscie w bonus nocny.
- `blocking_enabled` - wlacza blokowanie juz wybranych celow.
- `blocking_local` - blokada lokalna dla aktualnej wioski albo instancji ustawien.
- `blocking_global` - blokada wspoldzielona po nazwie.
- `changing_village_enabled` - po braku celu/wojska przechodzi do nastepnej wioski.
- `random_target` - wlacza losowanie celu.
- `random_target_by` - sposob losowania: `village`, `player`, `ally`.
- `require_relations` - zatrzymuje skrypt, jesli nie ma danych relacji.
- `messages` - wlasne komunikaty.

## Losowanie celu

`random_target_by`:

- `"village"` - losuje z wszystkich bezpiecznych wiosek
- `"player"` - najpierw losuje gracza, potem jedna z jego wiosek
- `"ally"` - najpierw losuje plemie, potem jedna z jego wiosek

## Boundaries

`boundaries` ogranicza pule budowana z `players`, `player_ids`, `allies`, `ally_tags`, `ally_ids`. Reczne `coords` zawsze zostaja w puli, tak jak w Hermitowskich Fejkach.

```js
boundaries: [
  { min_x: 490, max_x: 510, min_y: 490, max_y: 510 },
  { x: 500, y: 500, r: 20 }
]
```

## Blocking

Blocking zapisuje ostatnio wybrane cele w `localStorage` i odrzuca je przez ustawiony czas.

```js
blocking_enabled: true,
blocking_local: { time_s: 3600, count: 1, block_players: false },
blocking_global: [
  { name: "fake_pack_1", time_s: 3600, count: 1, block_players: true }
]
```

- `time_s` - ile sekund cel ma byc zablokowany
- `count` - ile razy dany cel/gracz moze przejsc zanim zostanie odrzucony
- `block_players:false` - blokuje konkretna wioske
- `block_players:true` - blokuje wszystkie wioski tego gracza
- `blocking_local.scope:"instance"` - blokada lokalna dla tej konfiguracji, nie tylko aktualnej wioski

## Blokowane cele

Skrypt odrzuca:

- wioski barbarzynskie, jesli `allow_barbarians:false`
- twoje wioski
- wioski graczy z twojego sojuszu
- sprzymierzencow (`partner`)
- pakty o nieagresji (`nap`)
- znajomych
- graczy nieatakowalnych
- wioski ponizej `min_points`
- koordynaty, ktorych nie ma w aktualnych plikach mapy

## Czas dojscia

`date_ranges` filtruje po czasie dojscia rozkazu. Skrypt bierze czas serwera z `#serverDate` i `#serverTime`, pobiera `interface.php?func=get_unit_info` oraz `interface.php?func=get_config`, a dojscie liczy z odleglosci i najwolniejszej jednostki w wybranym szablonie.

## Testy

```bash
npm test
```

## Licencja

MIT. Skrypt jest napisany jako clean-room i nie zawiera kodu z projektow GPL.

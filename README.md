# SafeFakes

Bezpieczne fejki do Plemion. Skrypt wybiera cel z koordynatow, graczy albo plemion, sprawdza aktualnego wlasciciela i relacje z mapy, a potem wypelnia formularz na placu.

Skrypt nie wysyla rozkazu automatycznie.

## Gotowy skrypt do paska

Gotowy adres skryptu: `https://cdn.jsdelivr.net/gh/BartoszWiszniewski/safe-fakes/SafeFakes.js`.

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
  "exclude_coords":"",
  "min_points":0,
  "max_points":0,
  "min_distance":0,
  "max_distance":0,
  "target_limit_per_player":0,
  "target_limit_per_ally":0,
  "target_weights":{
    "players":{},
    "allies":{},
    "coords":{}
  },
  "preview_mode":false,
  "debug_report":false,
  "troops_templates":[
    {"spy":1,"ram":1},
    {"spy":1,"catapult":1},
    {"ram":1},
    {"catapult":1}
  ],
  "fill_troops":"axe,spy,light,catapult,spear",
  "fill_exact":false,
  "safeguard":{},
  "include_barbarians":false,
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
    "no_snob_targets":"Bezpieczne cele istnieja, ale wszystkie sa poza zasiegiem szlachcica.",
    "no_distance_targets":"Bezpieczne cele istnieja, ale zaden nie pasuje do filtrow dystansu.",
    "no_limited_targets":"Bezpieczne cele istnieja, ale wszystkie odpadly przez limity na gracza albo plemie.",
    "no_timed_targets":"Bezpieczne cele istnieja, ale zaden nie pasuje do czasu dojscia albo bonusu nocnego.",
    "no_unblocked_targets":"Bezpieczne cele istnieja, ale wszystkie sa zablokowane przez ustawienia blockingu.",
    "troops_selected":"Wybrano samo wojsko. Nie ustawiono celu.",
    "preview_target":"Podglad {target} ({player}) [{ally}], dojscie {arrival}. Odrzucono: {rejected}.",
    "selected_target":"Wybrano {target} ({player}), dojscie {arrival}. Rozkaz nie zostal wyslany automatycznie.",
    "fetch_failed":"Nie moge pobrac {url}: HTTP {status}",
    "not_enough_troops":"Brakuje wojska do ustawionych szablonow fejka.",
    "screen_redirect":"Przechodze na plac, do widoku wysylania rozkazu.",
    "village_out_of_group":"Wioska poza grupa. Przechodze do nastepnej wioski z grupy."
  }
};$.getScript("https://cdn.jsdelivr.net/gh/BartoszWiszniewski/safe-fakes/SafeFakes.js");void 0;
```

## Kreator Konfiguracji Z Mapy

Drugi skrypt sluzy tylko do zbudowania konfiguracji. Uruchom go na mapie, klikaj wioski i eksportuj gotowy bookmarklet dla `SafeFakes.js`.

Gotowy adres buildera: `https://cdn.jsdelivr.net/gh/BartoszWiszniewski/safe-fakes/SafeFakesBuilder.js`.

```js
javascript:$.getScript("https://cdn.jsdelivr.net/gh/BartoszWiszniewski/safe-fakes/SafeFakesBuilder.js");void 0;
```

Jak dziala:

- wejdz na mape i odpal bookmarklet buildera
- kliknij wioske na mapie
- popup pokaze wlasciciela, plemie, punkty i relacje
- wybierz `Cel: koord`, `Cel: gracz`, `Cel: plemie` albo `Chron koord/gracza/plemie`
- chronione relacje (`twoja wioska`, `twoje plemie`, `sojusznik`, `pakt NAP`, `znajomy`, `nieatakowalny`) nie maja aktywnych przyciskow dodania do celow
- panel po prawej pokazuje liczby, minimalne/maksymalne punkty, sposob losowania, reczne dodawanie, listy i eksport
- w `Dodaj recznie` mozna wyszukac gracza, plemie po nazwie/tagu/ID, dodac wszystkie plemiona z wyniku albo wkleic koordy
- sekcje `Cele` oraz `Nie ruszac` mozna otwierac i chowac; z list mozna usuwac koordy, graczy i plemiona
- `Bookmarklet` generuje gotowy kod do paska zakladek
- `Config` generuje samo `window.SafeFakes = {...};`

Kolory na mapie:

- zielony - konkretne koordy dodane jako cel
- niebieski - wioski pasujace do dodanego gracza albo plemienia
- czerwony - reczne wykluczenia i chronione koordy/gracze/plemiona

Builder oznacza na glownej mapie tylko widoczne wioski z `TWMap.villages`, przez `#map_village_ID` i kolorowy border, tak jak typowe skrypty mapowe oparte o `TWMap`. Dzieki temu przesuwanie mapy nie skanuje calego swiata.

Jesli strona ma `#minimap_mover`, builder dorysowuje nad jego kontenerem lekki canvas z kolorami wybranych celow na minimapie. Ten canvas odswieza sie po zmianie list albo pobraniu danych mapy, nie przy kazdym przesunieciu glownej mapy.

Builder zapisuje stan w `localStorage` pod `SafeFakesBuilder.state`, wiec mozna zamknac okno i wrocic do pracy pozniej. Sam builder niczego nie wysyla i nie wypelnia placu; robi tylko konfiguracje.

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
  exclude_coords: "",

  // Punkty i dystans celu. 0 = wylaczone.
  min_points: 0,
  max_points: 0,
  min_distance: 0,
  max_distance: 0,

  // Limity w aktualnej puli po filtrach bezpieczenstwa.
  // 0 = wylaczone.
  target_limit_per_player: 0,
  target_limit_per_ally: 0,

  // Wagi losowania. Kluczem moze byc ID albo nazwa/tag.
  target_weights: {
    players: {
      // EnemyNick: 3,
      // "123456": 5
    },
    allies: {
      // ENM: 2,
      // "999": 4
    },
    coords: {
      // "500|500": 3
    }
  },

  // Podglad pokazuje wybrany cel bez wpisywania formularza.
  preview_mode: false,

  // Raport w konsoli: ile celow bylo w kazdym etapie filtrowania.
  debug_report: false,

  // Szablony wojska. Skrypt bierze pierwszy szablon, na ktory masz wojsko.
  troops_templates: [
    { spy: 1, ram: 1 },
    { spy: 1, catapult: 1 },
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
  include_barbarians: false,

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

  // Opcjonalnie: konfiguracja trzymana w spoilerze na forum.
  // Lokalna konfiguracja nadpisuje forum przy config_merge:"forum+user".
  forum_config: null,
  // forum_config: {
  //   thread_id: 12345,
  //   spoiler_name: "SafeFakes",
  //   page: 0,
  //   time_to_live_s: 3600,
  //   config_merge: "forum+user",
  //   config_keys: []
  // },

  // Polskie komunikaty.
  messages: {
    rally_point_required: "Uruchom skrypt na placu, w widoku wysylania rozkazu.",
    confirmation_screen: "Jestes na ekranie potwierdzenia. Skrypt nic tu nie zmienia.",
    no_targets: "Brak celow. Podaj coords, players/player_ids albo allies/ally_tags/ally_ids.",
    missing_relations: "Brak danych relacji z mapy. Zatrzymano wybor celu dla bezpieczenstwa.",
    no_safe_targets: "Brak bezpiecznych celow. Odrzucono: {rejected}.",
    no_snob_targets: "Bezpieczne cele istnieja, ale wszystkie sa poza zasiegiem szlachcica.",
    no_distance_targets: "Bezpieczne cele istnieja, ale zaden nie pasuje do filtrow dystansu.",
    no_limited_targets: "Bezpieczne cele istnieja, ale wszystkie odpadly przez limity na gracza albo plemie.",
    no_timed_targets: "Bezpieczne cele istnieja, ale zaden nie pasuje do czasu dojscia albo bonusu nocnego.",
    no_unblocked_targets: "Bezpieczne cele istnieja, ale wszystkie sa zablokowane przez ustawienia blockingu.",
    troops_selected: "Wybrano samo wojsko. Nie ustawiono celu.",
    preview_target: "Podglad {target} ({player}) [{ally}], dojscie {arrival}. Odrzucono: {rejected}.",
    selected_target: "Wybrano {target} ({player}), dojscie {arrival}. Rozkaz nie zostal wyslany automatycznie.",
    fetch_failed: "Nie moge pobrac {url}: HTTP {status}",
    not_enough_troops: "Brakuje wojska do ustawionych szablonow fejka.",
    screen_redirect: "Przechodze na plac, do widoku wysylania rozkazu.",
    village_out_of_group: "Wioska poza grupa. Przechodze do nastepnej wioski z grupy."
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
- `exclude_coords` - koordynaty do recznego wykluczenia.
- `min_points` - minimalne punkty celu.
- `max_points` - maksymalne punkty celu; `0` wylacza.
- `min_distance` - minimalny dystans od aktualnej wioski; `0` wylacza.
- `max_distance` - maksymalny dystans od aktualnej wioski; `0` wylacza.
- `target_limit_per_player` - maksymalna liczba wiosek jednego gracza w puli po filtrach; `0` wylacza.
- `target_limit_per_ally` - maksymalna liczba wiosek jednego plemienia w puli po filtrach; `0` wylacza.
- `target_weights` - wagi losowania po graczach, plemionach albo koordach.
- `preview_mode` - pokazuje wybrany cel bez wpisywania formularza.
- `debug_report` - wypisuje raport filtrowania do konsoli przegladarki.
- `troops_templates` - lista szablonow wojska.
- `fill_troops` - czym dopelniac fake pod limit swiata.
- `fill_exact` - `false` dopelnia tylko tyle, ile trzeba; `true` bierze dostepny limit z `fill_troops`.
- `safeguard` - wojsko, ktore ma zostac w wiosce.
- `include_barbarians` - `false` blokuje wioski barbarzynskie; `true` dodaje barbarzynskie do puli celow.
- `allow_barbarians` - stary alias dla `include_barbarians`, zostawiony dla zgodnosci.
- `date_ranges` - okna czasu dojscia.
- `skip_night_bonus` - blokuje dojscie w bonus nocny.
- `blocking_enabled` - wlacza blokowanie juz wybranych celow.
- `blocking_local` - blokada lokalna dla aktualnej wioski albo instancji ustawien.
- `blocking_global` - blokada wspoldzielona po nazwie.
- `changing_village_enabled` - po braku celu/wojska przechodzi do nastepnej wioski.
- `random_target` - wlacza losowanie celu.
- `random_target_by` - sposob losowania: `village`, `player`, `ally`.
- `require_relations` - zatrzymuje skrypt, jesli nie ma danych relacji.
- `forum_config` - opcjonalne pobranie konfiguracji ze spoilera na forum.
- `messages` - wlasne komunikaty.

## Losowanie celu

`random_target_by`:

- `"village"` - losuje z wszystkich bezpiecznych wiosek
- `"player"` - najpierw losuje gracza, potem jedna z jego wiosek
- `"ally"` - najpierw losuje plemie, potem jedna z jego wiosek

## Wagi Losowania

`target_weights` zmienia szanse losowania. Waga moze byc ustawiona po nicku/ID gracza, tagu/ID/nazwie plemienia albo konkretnych koordach. Jesli cel pasuje do kilku wag, skrypt bierze najwyzsza.

```js
target_weights: {
  players: {
    EnemyNick: 3,
    "123456": 5
  },
  allies: {
    ENM: 2,
    "999": 4
  },
  coords: {
    "500|500": 3
  }
}
```

## Podglad I Debug

`preview_mode:true` wybiera cel i pokazuje komunikat, ale nie wpisuje wojsk ani celu do formularza. `debug_report:true` wypisuje do konsoli obiekt z liczba celow po etapach: kandydaci, bezpieczne, zasieg szlachcica, dystans, limity, czas, blocking i finalny wybor.

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

## Forum Config

`forum_config` pobiera konfiguracje ze spoilera na forum. W spoilerze musi byc jeden blok `pre` z JSON-em albo snippetem podobnym do bookmarkletu.

```js
forum_config: {
  thread_id: 12345,
  spoiler_name: "SafeFakes",
  page: 0,
  time_to_live_s: 3600,
  config_merge: "forum+user",
  config_keys: []
}
```

- `forum+user` - forum jest baza, lokalne ustawienia nadpisuja forum
- `user+forum` - lokalne ustawienia sa baza, a z forum nadpisywane sa tylko pola z `config_keys`

## Blokowane cele

Skrypt odrzuca:

- wioski barbarzynskie, jesli `include_barbarians:false`
- twoje wioski
- wioski graczy z twojego sojuszu
- sprzymierzencow (`partner`)
- pakty o nieagresji (`nap`)
- znajomych
- graczy nieatakowalnych
- wioski ponizej `min_points`
- wioski powyzej `max_points`, jesli ustawione
- wioski poza `min_distance` / `max_distance`, jesli ustawione
- cele wykluczone przez `exclude_coords`
- nadmiarowe cele po `target_limit_per_player` / `target_limit_per_ally`
- cele poza zasiegiem szlachcica, gdy szablon zawiera `snob`
- koordynaty, ktorych nie ma w aktualnych plikach mapy

## Czas dojscia

`date_ranges` filtruje po czasie dojscia rozkazu. Skrypt bierze czas serwera z `#serverDate` i `#serverTime`, pobiera `interface.php?func=get_unit_info` oraz `interface.php?func=get_config`, a dojscie liczy z odleglosci i najwolniejszej jednostki w wybranym szablonie.

## Testy

```bash
npm test
```

## Licencja

MIT. Skrypt jest napisany jako clean-room i nie zawiera kodu z projektow GPL.

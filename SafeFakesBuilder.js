/* MIT License
 * SafeFakesBuilder - map configurator for SafeFakes.
 */
(function (root, factory) {
  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.SafeFakesBuilder = api;
  }

  if (
    root &&
    root.document &&
    !root.__SAFE_FAKES_BUILDER_NO_AUTOSTART__
  ) {
    api.run().catch(api.showError);
  }
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  const STORAGE_KEY = "SafeFakesBuilder.state";
  const SAFE_FAKES_SCRIPT_URL = "https://cdn.jsdelivr.net/gh/BartoszWiszniewski/safe-fakes@main/SafeFakes.js";
  const BARBARIAN_PLAYER_ID = "0";
  const NO_ALLY_ID = "0";
  const PROTECTED_RELATIONS = new Set(["own", "same_ally", "partner", "nap", "friend", "non_attackable"]);
  const LIST_KEYS = [
    "coords",
    "players",
    "player_ids",
    "allies",
    "ally_tags",
    "ally_ids",
    "exclude_coords",
    "exclude_players",
    "exclude_player_ids",
    "exclude_allies",
    "exclude_ally_tags",
    "exclude_ally_ids",
  ];
  const COLORS = {
    coord: "#20b455",
    group: "#2f7df6",
    exclude: "#d33f49",
  };
  const RELATION_LABELS = {
    own: "twoja wioska",
    same_ally: "twoje plemie",
    partner: "sojusznik",
    nap: "pakt NAP",
    friend: "znajomy",
    non_attackable: "nieatakowalny",
    barbarian: "barbarzynska",
    enemy: "mozliwy cel",
    neutral: "bez plemienia",
    missing_player: "brak danych gracza",
  };
  const DEFAULT_STATE = {
    coords: [],
    players: [],
    player_ids: [],
    allies: [],
    ally_tags: [],
    ally_ids: [],
    exclude_coords: [],
    exclude_players: [],
    exclude_player_ids: [],
    exclude_allies: [],
    exclude_ally_tags: [],
    exclude_ally_ids: [],
    include_barbarians: false,
    min_points: 0,
    max_points: 0,
    random_target: true,
    random_target_by: "village",
    target_weights: {
      players: {},
      allies: {},
      coords: {},
    },
  };

  function createBuilderState() {
    return normalizeBuilderState({});
  }

  function normalizeBuilderState(raw = {}) {
    const state = Object.assign({}, DEFAULT_STATE, raw || {});
    for (const key of LIST_KEYS) {
      const values = key.endsWith("coords") || key === "coords" || key.endsWith("_ids")
        ? splitLooseList(state[key])
        : splitNamedList(state[key]);
      state[key] = uniqueList(key.endsWith("coords") || key === "coords"
        ? values.map(normalizeCoordKey).filter(Boolean)
        : values);
    }

    state.include_barbarians = asBoolean(state.include_barbarians, DEFAULT_STATE.include_barbarians);
    state.min_points = asNumber(state.min_points, DEFAULT_STATE.min_points);
    state.max_points = asNumber(state.max_points, DEFAULT_STATE.max_points);
    state.random_target = asBoolean(state.random_target, DEFAULT_STATE.random_target);
    state.random_target_by = ["village", "player", "ally"].includes(state.random_target_by)
      ? state.random_target_by
      : DEFAULT_STATE.random_target_by;
    state.target_weights = normalizeWeights(state.target_weights);

    return state;
  }

  function normalizeWeights(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      players: normalizeWeightTable(source.players),
      allies: normalizeWeightTable(source.allies),
      coords: normalizeWeightTable(source.coords),
    };
  }

  function normalizeWeightTable(value) {
    const result = {};
    if (!value || typeof value !== "object") return result;
    for (const [key, weight] of Object.entries(value)) {
      const normalizedWeight = Number(weight);
      if (key && Number.isFinite(normalizedWeight) && normalizedWeight > 1) {
        result[String(key)] = normalizedWeight;
      }
    }
    return result;
  }

  function asBoolean(value, defaultValue) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return defaultValue;
  }

  function asNumber(value, defaultValue) {
    const number = Number(value);
    return Number.isFinite(number) ? number : defaultValue;
  }

  function splitLooseList(value) {
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
    return String(value || "").split(/[,;\s]+/).map((item) => item.trim()).filter(Boolean);
  }

  function splitNamedList(value) {
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
    return String(value || "").split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  }

  function uniqueList(values) {
    return Array.from(new Set(values.map(String).map((item) => item.trim()).filter(Boolean)));
  }

  function normalizeCoordKey(value) {
    if (value && typeof value === "object" && value.x != null && value.y != null) {
      return coordKey(value);
    }
    const match = /(\d{1,3})\|(\d{1,3})/.exec(String(value || ""));
    return match ? `${Number(match[1])}|${Number(match[2])}` : "";
  }

  function coordKey(village) {
    return `${Number(village.x)}|${Number(village.y)}`;
  }

  function addUnique(values, value) {
    if (!value) return uniqueList(values);
    return uniqueList([].concat(values || [], [String(value)]));
  }

  function removeValue(values, value) {
    const key = String(value || "");
    return uniqueList(values).filter((item) => item !== key);
  }

  function applyVillageAction(rawState, rawVillage, action) {
    const state = normalizeBuilderState(rawState);
    const village = normalizeVillage(rawVillage);
    const key = coordKey(village);

    if (action === "add_coord") {
      state.coords = addUnique(state.coords, key);
      state.exclude_coords = removeValue(state.exclude_coords, key);
    } else if (action === "exclude_coord") {
      state.exclude_coords = addUnique(state.exclude_coords, key);
      state.coords = removeValue(state.coords, key);
      delete state.target_weights.coords[key];
    } else if (action === "remove_coord") {
      state.coords = removeValue(state.coords, key);
      delete state.target_weights.coords[key];
    } else if (action === "remove_exclude_coord") {
      state.exclude_coords = removeValue(state.exclude_coords, key);
    } else if (action === "add_player") {
      addPlayerTarget(state, village, false);
    } else if (action === "exclude_player") {
      addPlayerTarget(state, village, true);
    } else if (action === "remove_player") {
      removePlayerTarget(state, village, false);
    } else if (action === "remove_exclude_player") {
      removePlayerTarget(state, village, true);
    } else if (action === "add_ally") {
      addAllyTarget(state, village, false);
    } else if (action === "exclude_ally") {
      addAllyTarget(state, village, true);
    } else if (action === "remove_ally") {
      removeAllyTarget(state, village, false);
    } else if (action === "remove_exclude_ally") {
      removeAllyTarget(state, village, true);
    }

    return normalizeBuilderState(state);
  }

  function addPlayerTarget(state, village, excluded) {
    if (!village.player || !village.player.id || String(village.player.id) === BARBARIAN_PLAYER_ID) return;
    const prefix = excluded ? "exclude_" : "";
    const opposite = excluded ? "" : "exclude_";
    state[`${prefix}players`] = addUnique(state[`${prefix}players`], village.player.name);
    state[`${prefix}player_ids`] = addUnique(state[`${prefix}player_ids`], village.player.id);
    state[`${opposite}players`] = removeValue(state[`${opposite}players`], village.player.name);
    state[`${opposite}player_ids`] = removeValue(state[`${opposite}player_ids`], village.player.id);
    if (excluded) delete state.target_weights.players[String(village.player.id)];
  }

  function removePlayerTarget(state, village, excluded) {
    if (!village.player) return;
    const prefix = excluded ? "exclude_" : "";
    state[`${prefix}players`] = removeValue(state[`${prefix}players`], village.player.name);
    state[`${prefix}player_ids`] = removeValue(state[`${prefix}player_ids`], village.player.id);
    delete state.target_weights.players[String(village.player.id)];
    delete state.target_weights.players[String(village.player.name)];
  }

  function addAllyTarget(state, village, excluded) {
    if (!village.ally || !village.ally.id || String(village.ally.id) === NO_ALLY_ID) return;
    const prefix = excluded ? "exclude_" : "";
    const opposite = excluded ? "" : "exclude_";
    state[`${prefix}allies`] = addUnique(state[`${prefix}allies`], village.ally.name);
    state[`${prefix}ally_tags`] = addUnique(state[`${prefix}ally_tags`], village.ally.tag);
    state[`${prefix}ally_ids`] = addUnique(state[`${prefix}ally_ids`], village.ally.id);
    state[`${opposite}allies`] = removeValue(state[`${opposite}allies`], village.ally.name);
    state[`${opposite}ally_tags`] = removeValue(state[`${opposite}ally_tags`], village.ally.tag);
    state[`${opposite}ally_ids`] = removeValue(state[`${opposite}ally_ids`], village.ally.id);
    if (excluded) delete state.target_weights.allies[String(village.ally.id)];
  }

  function removeAllyTarget(state, village, excluded) {
    if (!village.ally) return;
    const prefix = excluded ? "exclude_" : "";
    state[`${prefix}allies`] = removeValue(state[`${prefix}allies`], village.ally.name);
    state[`${prefix}ally_tags`] = removeValue(state[`${prefix}ally_tags`], village.ally.tag);
    state[`${prefix}ally_ids`] = removeValue(state[`${prefix}ally_ids`], village.ally.id);
    delete state.target_weights.allies[String(village.ally.id)];
    delete state.target_weights.allies[String(village.ally.tag)];
    delete state.target_weights.allies[String(village.ally.name)];
  }

  function setTargetWeight(rawState, group, key, weight) {
    const state = normalizeBuilderState(rawState);
    const normalizedWeight = Number(weight);
    if (!state.target_weights[group]) return state;
    if (!Number.isFinite(normalizedWeight) || normalizedWeight <= 1) delete state.target_weights[group][String(key)];
    else state.target_weights[group][String(key)] = normalizedWeight;
    return normalizeBuilderState(state);
  }

  function normalizeVillage(raw = {}) {
    const player = normalizePlayer(raw.player || raw.owner || {});
    const playerId = String(raw.playerId || raw.player_id || raw.owner_id || player.id || BARBARIAN_PLAYER_ID);
    const ally = normalizeAlly(raw.ally || {});
    const x = Number(raw.x);
    const y = Number(raw.y);

    if (!player.id && playerId !== BARBARIAN_PLAYER_ID) player.id = playerId;
    if (!player.allyId && ally.id) player.allyId = ally.id;

    return {
      id: raw.id != null ? String(raw.id) : "",
      name: raw.name || "",
      x,
      y,
      playerId,
      points: Number(raw.points || 0),
      player: player.id ? player : null,
      ally: ally.id ? ally : null,
    };
  }

  function normalizePlayer(raw = {}) {
    return {
      id: raw.id != null ? String(raw.id) : "",
      name: raw.name || "",
      allyId: raw.allyId != null ? String(raw.allyId) : raw.ally_id != null ? String(raw.ally_id) : "",
    };
  }

  function normalizeAlly(raw = {}) {
    return {
      id: raw.id != null ? String(raw.id) : "",
      name: raw.name || "",
      tag: raw.tag || "",
    };
  }

  function classifyVillage(rawVillage, context = {}) {
    const village = normalizeVillage(rawVillage);
    const currentPlayer = context.currentPlayer || {};
    const relations = context.relations || {};

    if (village.playerId === BARBARIAN_PLAYER_ID) return "barbarian";
    if (String(currentPlayer.id || "") && village.playerId === String(currentPlayer.id)) return "own";

    const player = village.player || {};
    const allyId = String(player.allyId || NO_ALLY_ID);
    const currentAlly = String(currentPlayer.ally || currentPlayer.allyId || NO_ALLY_ID);
    if (currentAlly !== NO_ALLY_ID && allyId === currentAlly) return "same_ally";
    if (idIn(relations.non_attackable_players, village.playerId)) return "non_attackable";
    if (idIn(relations.friends, village.playerId)) return "friend";

    const relation = String(valueById(relations.allyRelations, allyId) || "").toLowerCase();
    if (relation === "partner") return "partner";
    if (relation === "nap") return "nap";
    if (!player.id) return "missing_player";
    return allyId && allyId !== NO_ALLY_ID ? "enemy" : "neutral";
  }

  function idIn(collection, id) {
    const key = String(id);
    if (!collection) return false;
    if (collection instanceof Map) return collection.has(key) || collection.has(Number(key));
    if (Array.isArray(collection) || (typeof collection[Symbol.iterator] === "function" && typeof collection !== "string")) {
      return Array.from(collection).some((value) => String(value) === key);
    }
    if (typeof collection === "object") return Boolean(collection[key]);
    return String(collection) === key;
  }

  function valueById(collection, id) {
    const key = String(id);
    if (!collection) return undefined;
    if (collection instanceof Map) return collection.get(key) || collection.get(Number(key));
    return typeof collection === "object" ? collection[key] : undefined;
  }

  function buildSafeFakesConfig(rawState) {
    const state = normalizeBuilderState(rawState);
    return {
      coords: state.coords.join(" "),
      players: state.players.join(","),
      player_ids: state.player_ids.join(","),
      allies: state.allies.join(","),
      ally_tags: state.ally_tags.join(","),
      ally_ids: state.ally_ids.join(","),
      exclude_coords: state.exclude_coords.join(" "),
      exclude_players: state.exclude_players.join(","),
      exclude_player_ids: state.exclude_player_ids.join(","),
      exclude_allies: state.exclude_allies.join(","),
      exclude_ally_tags: state.exclude_ally_tags.join(","),
      exclude_ally_ids: state.exclude_ally_ids.join(","),
      include_barbarians: state.include_barbarians,
      min_points: state.min_points,
      max_points: state.max_points,
      random_target: state.random_target,
      random_target_by: state.random_target_by,
      target_weights: state.target_weights,
    };
  }

  function buildBookmarklet(config, scriptUrl = SAFE_FAKES_SCRIPT_URL) {
    return `javascript:window.SafeFakes=${JSON.stringify(config)};$.getScript(${JSON.stringify(scriptUrl)});void 0;`;
  }

  function parseMapRows(text) {
    return String(text || "")
      .trim()
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => line.split(",").map(decodeMapValue));
  }

  function decodeMapValue(value) {
    try {
      return decodeURIComponent(String(value || "").replace(/\+/g, " "));
    } catch (_) {
      return String(value || "").replace(/\+/g, " ");
    }
  }

  function parseWorld(villageText, playerText, allyText) {
    const villagesByCoord = new Map();
    const playersById = new Map();
    const alliesById = new Map();

    for (const row of parseMapRows(villageText)) {
      const village = {
        id: row[0],
        name: row[1],
        x: Number(row[2]),
        y: Number(row[3]),
        playerId: row[4],
        points: Number(row[5] || 0),
      };
      if (Number.isFinite(village.x) && Number.isFinite(village.y)) {
        villagesByCoord.set(coordKey(village), village);
      }
    }

    for (const row of parseMapRows(playerText)) {
      playersById.set(row[0], {
        id: row[0],
        name: row[1],
        allyId: row[2],
      });
    }

    for (const row of parseMapRows(allyText)) {
      alliesById.set(row[0], {
        id: row[0],
        name: row[1],
        tag: row[2],
      });
    }

    for (const village of villagesByCoord.values()) {
      village.player = playersById.get(String(village.playerId)) || null;
      village.ally = village.player ? alliesById.get(String(village.player.allyId)) || null : null;
    }

    return { villagesByCoord, playersById, alliesById };
  }

  async function fetchWorld() {
    const [village, player, ally] = await Promise.all([
      fetchText("map/village.txt"),
      fetchText("map/player.txt"),
      fetchText("map/ally.txt"),
    ]);
    return parseWorld(village, player, ally);
  }

  async function fetchText(url) {
    const response = await root.fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Nie moge pobrac ${url}: HTTP ${response.status}`);
    return response.text();
  }

  function snapshotRelations(twMap) {
    if (!twMap) return {};
    return {
      allyRelations: twMap.allyRelations || {},
      friends: twMap.friends || {},
      non_attackable_players: normalizeIdList(twMap.non_attackable_players),
    };
  }

  function normalizeIdList(value) {
    if (!value) return [];
    if (Array.isArray(value) || (typeof value[Symbol.iterator] === "function" && typeof value !== "string")) {
      return Array.from(value).map(String);
    }
    if (typeof value === "object") return Object.keys(value).filter((key) => value[key]);
    return splitLooseList(value);
  }

  async function run() {
    const app = getApp();
    await app.start();
  }

  function getApp() {
    if (root.__safeFakesBuilderApp) return root.__safeFakesBuilderApp;
    root.__safeFakesBuilderApp = createApp();
    return root.__safeFakesBuilderApp;
  }

  function createApp() {
    const documentRef = root.document;
    let state = loadState();
    let world = { villagesByCoord: new Map(), playersById: new Map(), alliesById: new Map() };
    let relations = {};
    let panel = null;
    let popup = null;
    let exportText = null;
    let status = "Laduje dane mapy...";
    let highlightedElements = new Set();
    let originalOnClick = null;
    let originalSpawnSector = null;
    let spawnHost = null;

    async function start() {
      if (!documentRef) return;
      if (!isMapScreen()) {
        redirectToMap();
        return;
      }
      renderStyle();
      renderPanel();
      await waitForTwMap();
      relations = snapshotRelations(root.TWMap);
      hookMap();
      renderPanel();
      await loadWorld();
    }

    function stop() {
      restoreMap();
      clearHighlights();
      if (popup) popup.remove();
      if (panel) panel.remove();
      popup = null;
      panel = null;
      root.__safeFakesBuilderApp = null;
    }

    async function loadWorld() {
      try {
        world = await fetchWorld();
        status = `Dane mapy OK: ${world.villagesByCoord.size} wiosek`;
      } catch (error) {
        status = `Brak pelnych danych mapy: ${error.message}`;
      }
      renderPanel();
      applyHighlights();
    }

    function isMapScreen() {
      return !root.game_data || !root.game_data.screen || root.game_data.screen === "map";
    }

    function redirectToMap() {
      showInfo("Przechodze na mape.");
      const url = root.TribalWars
        ? root.TribalWars.buildURL("GET", "map", {})
        : "game.php?screen=map";
      root.location.href = url;
    }

    function waitForTwMap(timeoutMs = 5000) {
      if (root.TWMap && root.TWMap.map && root.TWMap.map.handler) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const timer = root.setInterval(() => {
          if (root.TWMap && root.TWMap.map && root.TWMap.map.handler) {
            root.clearInterval(timer);
            resolve();
          } else if (Date.now() - startedAt > timeoutMs) {
            root.clearInterval(timer);
            reject(new Error("TWMap nie jest gotowy na tej stronie."));
          }
        }, 100);
      });
    }

    function hookMap() {
      const handler = root.TWMap && root.TWMap.map && root.TWMap.map.handler;
      if (handler && !handler.__safeFakesBuilderOnClick) {
        originalOnClick = handler.onClick;
        handler.__safeFakesBuilderOnClick = originalOnClick;
        handler.onClick = (x, y, event) => {
          if (event && event.preventDefault) event.preventDefault();
          handleMapClick(x, y, event || root.event);
          return false;
        };
      }

      spawnHost = root.TWMap && (root.TWMap.mapHandler || (root.TWMap.map && root.TWMap.map.handler));
      if (spawnHost && typeof spawnHost.spawnSector === "function" && !spawnHost.__safeFakesBuilderSpawnSector) {
        originalSpawnSector = spawnHost.spawnSector;
        spawnHost.__safeFakesBuilderSpawnSector = originalSpawnSector;
        spawnHost.spawnSector = function safeFakesBuilderSpawnSector() {
          const result = originalSpawnSector.apply(this, arguments);
          root.setTimeout(applyHighlights, 0);
          return result;
        };
      }
    }

    function restoreMap() {
      const handler = root.TWMap && root.TWMap.map && root.TWMap.map.handler;
      if (handler && handler.__safeFakesBuilderOnClick) {
        handler.onClick = handler.__safeFakesBuilderOnClick;
        delete handler.__safeFakesBuilderOnClick;
      } else if (handler && originalOnClick) {
        handler.onClick = originalOnClick;
      }

      if (spawnHost && spawnHost.__safeFakesBuilderSpawnSector) {
        spawnHost.spawnSector = spawnHost.__safeFakesBuilderSpawnSector;
        delete spawnHost.__safeFakesBuilderSpawnSector;
      } else if (spawnHost && originalSpawnSector) {
        spawnHost.spawnSector = originalSpawnSector;
      }
    }

    function handleMapClick(x, y, event) {
      const village = getVillageAt(x, y);
      if (!village || !Number.isFinite(village.x) || !Number.isFinite(village.y)) return;
      showVillagePopup(village, event);
    }

    function getVillageAt(x, y) {
      const key = `${Number(x)}|${Number(y)}`;
      const worldVillage = world.villagesByCoord.get(key);
      const mapVillage = getTwMapVillage(x, y) || {};
      return enrichVillage(Object.assign({}, mapVillage, worldVillage || {}, { x: Number(x), y: Number(y) }));
    }

    function enrichVillage(raw) {
      const village = normalizeVillage(raw);
      if (!village.player && village.playerId !== BARBARIAN_PLAYER_ID) {
        village.player = world.playersById.get(String(village.playerId)) || null;
      }
      if (!village.ally && village.player) {
        village.ally = world.alliesById.get(String(village.player.allyId)) || null;
      }
      return village;
    }

    function getTwMapVillage(x, y) {
      const villages = root.TWMap && root.TWMap.villages;
      if (!villages) return null;
      const joined = `${Number(x)}${Number(y)}`;
      return villages[joined] || villages[Number(joined)] || villages[`${Number(x)}|${Number(y)}`] || villages[Number(x) * 1000 + Number(y)] || null;
    }

    function showVillagePopup(village, event) {
      if (popup) popup.remove();

      const relation = classifyVillage(village, {
        currentPlayer: root.game_data && root.game_data.player,
        relations,
      });
      const canTarget = canTargetVillage(relation);
      const hasPlayer = village.player && village.player.id && village.player.id !== BARBARIAN_PLAYER_ID;
      const hasAlly = village.ally && village.ally.id && village.ally.id !== NO_ALLY_ID;

      popup = documentRef.createElement("div");
      popup.id = "safe-fakes-builder-popup";
      popup.appendChild(createPopupHeader(village, relation));
      popup.appendChild(createButtonGrid([
        makeActionButton(state.coords.includes(coordKey(village)) ? "Usun koord" : "Cel: koord", state.coords.includes(coordKey(village)) ? "remove_coord" : "add_coord", village, !canTarget),
        makeActionButton(state.exclude_coords.includes(coordKey(village)) ? "Usun blokade" : "Chron koord", state.exclude_coords.includes(coordKey(village)) ? "remove_exclude_coord" : "exclude_coord", village, false),
        makeActionButton("Cel: gracz", "add_player", village, !canTarget || !hasPlayer),
        makeActionButton("Chron gracza", "exclude_player", village, !hasPlayer),
        makeActionButton("Cel: plemie", "add_ally", village, !canTarget || !hasAlly),
        makeActionButton("Chron plemie", "exclude_ally", village, !hasAlly),
        makeWeightButton("Waga koord", "coords", coordKey(village), state.target_weights.coords[coordKey(village)]),
        makeCloseButton(),
      ]));

      documentRef.body.appendChild(popup);
      positionPopup(popup, event);
    }

    function createPopupHeader(village, relation) {
      const header = documentRef.createElement("div");
      header.className = "sfb-popup-header";

      const title = documentRef.createElement("strong");
      title.textContent = `${village.name || "Wioska"} (${coordKey(village)})`;
      header.appendChild(title);

      const meta = documentRef.createElement("div");
      meta.className = "sfb-popup-meta";
      const player = village.player ? village.player.name || village.player.id : "brak gracza";
      const ally = village.ally ? village.ally.tag || village.ally.name || village.ally.id : "bez plemienia";
      meta.textContent = `${player} / ${ally} / ${village.points || 0} pkt`;
      header.appendChild(meta);

      const badge = documentRef.createElement("span");
      badge.className = `sfb-relation sfb-relation-${relation}`;
      badge.textContent = RELATION_LABELS[relation] || relation;
      header.appendChild(badge);

      return header;
    }

    function createButtonGrid(buttons) {
      const grid = documentRef.createElement("div");
      grid.className = "sfb-button-grid";
      for (const button of buttons) grid.appendChild(button);
      return grid;
    }

    function makeActionButton(label, action, village, disabled) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.disabled = Boolean(disabled);
      button.addEventListener("click", () => {
        updateState(applyVillageAction(state, village, action));
        showVillagePopup(village, null);
      });
      return button;
    }

    function makeWeightButton(label, group, key, current) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = current ? `${label}: ${current}` : label;
      button.addEventListener("click", () => {
        const value = root.prompt("Podaj wage losowania. 1 usuwa wage.", current || "2");
        if (value == null) return;
        updateState(setTargetWeight(state, group, key, value));
      });
      return button;
    }

    function makeCloseButton() {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = "Zamknij";
      button.addEventListener("click", () => {
        if (popup) popup.remove();
        popup = null;
      });
      return button;
    }

    function canTargetVillage(relation) {
      if (PROTECTED_RELATIONS.has(relation)) return false;
      if (relation === "barbarian" && !state.include_barbarians) return false;
      return relation !== "missing_player";
    }

    function positionPopup(element, event) {
      const width = 330;
      const height = 260;
      const x = event && Number.isFinite(event.clientX) ? event.clientX + 12 : root.innerWidth - width - 20;
      const y = event && Number.isFinite(event.clientY) ? event.clientY + 12 : 130;
      element.style.left = `${Math.max(8, Math.min(x, root.innerWidth - width - 8))}px`;
      element.style.top = `${Math.max(8, Math.min(y, root.innerHeight - height - 8))}px`;
    }

    function updateState(nextState) {
      state = normalizeBuilderState(nextState);
      saveState(state);
      renderPanel();
      applyHighlights();
    }

    function renderPanel() {
      if (!panel) {
        panel = documentRef.createElement("div");
        panel.id = "safe-fakes-builder";
        documentRef.body.appendChild(panel);
      }

      panel.innerHTML = "";
      const title = documentRef.createElement("div");
      title.className = "sfb-title";
      title.textContent = "SafeFakes Builder";
      panel.appendChild(title);

      const statusNode = documentRef.createElement("div");
      statusNode.className = "sfb-status";
      statusNode.textContent = status;
      panel.appendChild(statusNode);

      panel.appendChild(createCounts());
      panel.appendChild(createOptions());
      panel.appendChild(createLegend());
      panel.appendChild(createExportControls());
    }

    function createCounts() {
      const wrap = documentRef.createElement("div");
      wrap.className = "sfb-counts";
      const rows = [
        ["koordy", state.coords.length],
        ["gracze", state.player_ids.length || state.players.length],
        ["plemiona", state.ally_ids.length || state.ally_tags.length],
        ["wykluczenia", state.exclude_coords.length + state.exclude_player_ids.length + state.exclude_ally_ids.length],
      ];
      for (const [label, count] of rows) {
        const item = documentRef.createElement("span");
        item.textContent = `${label}: ${count}`;
        wrap.appendChild(item);
      }
      return wrap;
    }

    function createOptions() {
      const wrap = documentRef.createElement("div");
      wrap.className = "sfb-options";

      const barbarians = createCheckbox("Barbarzynskie jako cele", state.include_barbarians, (checked) => {
        updateState(Object.assign({}, state, { include_barbarians: checked }));
      });
      wrap.appendChild(barbarians);

      const minPoints = createNumberInput("Min pkt", state.min_points, (value) => {
        updateState(Object.assign({}, state, { min_points: value }));
      });
      wrap.appendChild(minPoints);

      const maxPoints = createNumberInput("Max pkt", state.max_points, (value) => {
        updateState(Object.assign({}, state, { max_points: value }));
      });
      wrap.appendChild(maxPoints);

      const randomBy = documentRef.createElement("select");
      for (const [value, label] of [["village", "losuj wioske"], ["player", "losuj gracza"], ["ally", "losuj plemie"]]) {
        const option = documentRef.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = state.random_target_by === value;
        randomBy.appendChild(option);
      }
      randomBy.addEventListener("change", () => {
        updateState(Object.assign({}, state, { random_target_by: randomBy.value }));
      });
      wrap.appendChild(randomBy);

      return wrap;
    }

    function createCheckbox(label, checked, onChange) {
      const wrap = documentRef.createElement("label");
      const input = documentRef.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(checked);
      input.addEventListener("change", () => onChange(input.checked));
      wrap.appendChild(input);
      wrap.appendChild(documentRef.createTextNode(` ${label}`));
      return wrap;
    }

    function createNumberInput(label, value, onChange) {
      const wrap = documentRef.createElement("label");
      wrap.textContent = label;
      const input = documentRef.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.value = String(value || 0);
      input.addEventListener("change", () => onChange(Math.max(0, Number(input.value || 0))));
      wrap.appendChild(input);
      return wrap;
    }

    function createLegend() {
      const legend = documentRef.createElement("div");
      legend.className = "sfb-legend";
      for (const [label, color] of [["koord", COLORS.coord], ["gracz/plemie", COLORS.group], ["chronione", COLORS.exclude]]) {
        const item = documentRef.createElement("span");
        const swatch = documentRef.createElement("i");
        swatch.style.background = color;
        item.appendChild(swatch);
        item.appendChild(documentRef.createTextNode(label));
        legend.appendChild(item);
      }
      return legend;
    }

    function createExportControls() {
      const wrap = documentRef.createElement("div");
      wrap.className = "sfb-export";

      const buttons = documentRef.createElement("div");
      buttons.className = "sfb-actions";
      buttons.appendChild(createPanelButton("Bookmarklet", () => writeExport("bookmarklet")));
      buttons.appendChild(createPanelButton("Config", () => writeExport("config")));
      buttons.appendChild(createPanelButton("Kopiuj", copyExport));
      buttons.appendChild(createPanelButton("Wyczysc", clearState));
      buttons.appendChild(createPanelButton("Zamknij", stop));
      wrap.appendChild(buttons);

      exportText = documentRef.createElement("textarea");
      exportText.readOnly = true;
      exportText.value = buildBookmarklet(buildSafeFakesConfig(state));
      wrap.appendChild(exportText);

      return wrap;
    }

    function createPanelButton(label, onClick) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", onClick);
      return button;
    }

    function writeExport(type) {
      if (!exportText) return;
      const config = buildSafeFakesConfig(state);
      exportText.value = type === "config"
        ? `window.SafeFakes = ${JSON.stringify(config, null, 2)};`
        : buildBookmarklet(config);
      exportText.focus();
      exportText.select();
    }

    function copyExport() {
      if (!exportText) return;
      exportText.focus();
      exportText.select();
      if (root.navigator && root.navigator.clipboard) {
        root.navigator.clipboard.writeText(exportText.value).then(
          () => showInfo("Skopiowano konfiguracje."),
          () => documentRef.execCommand("copy"),
        );
      } else {
        documentRef.execCommand("copy");
      }
    }

    function clearState() {
      if (!root.confirm || root.confirm("Wyczysc konfiguracje buildera?")) {
        updateState(createBuilderState());
      }
    }

    function applyHighlights() {
      clearHighlights();
      highlightPlayerAndAllyMatches(COLORS.group);
      for (const key of state.coords) highlightCoord(key, COLORS.coord);
      highlightExcludedMatches(COLORS.exclude);
      for (const key of state.exclude_coords) highlightCoord(key, COLORS.exclude);
    }

    function highlightPlayerAndAllyMatches(color) {
      const playerIds = new Set(state.player_ids);
      const playerNames = new Set(state.players.map((name) => name.toLowerCase()));
      const allyIds = new Set(state.ally_ids);
      const allyTags = new Set(state.ally_tags.map((tag) => tag.toLowerCase()));
      const allyNames = new Set(state.allies.map((name) => name.toLowerCase()));
      if (!playerIds.size && !playerNames.size && !allyIds.size && !allyTags.size && !allyNames.size) return;

      for (const village of world.villagesByCoord.values()) {
        if (matchesVillageSelector(village, playerIds, playerNames, allyIds, allyTags, allyNames)) {
          highlightVillage(village, color);
        }
      }
    }

    function highlightExcludedMatches(color) {
      const playerIds = new Set(state.exclude_player_ids);
      const playerNames = new Set(state.exclude_players.map((name) => name.toLowerCase()));
      const allyIds = new Set(state.exclude_ally_ids);
      const allyTags = new Set(state.exclude_ally_tags.map((tag) => tag.toLowerCase()));
      const allyNames = new Set(state.exclude_allies.map((name) => name.toLowerCase()));
      if (!playerIds.size && !playerNames.size && !allyIds.size && !allyTags.size && !allyNames.size) return;

      for (const village of world.villagesByCoord.values()) {
        if (matchesVillageSelector(village, playerIds, playerNames, allyIds, allyTags, allyNames)) {
          highlightVillage(village, color);
        }
      }
    }

    function matchesVillageSelector(village, playerIds, playerNames, allyIds, allyTags, allyNames) {
      const player = village.player || world.playersById.get(String(village.playerId)) || {};
      const ally = village.ally || world.alliesById.get(String(player.allyId)) || {};
      return playerIds.has(String(village.playerId)) ||
        playerIds.has(String(player.id)) ||
        playerNames.has(String(player.name || "").toLowerCase()) ||
        allyIds.has(String(player.allyId)) ||
        allyIds.has(String(ally.id)) ||
        allyTags.has(String(ally.tag || "").toLowerCase()) ||
        allyNames.has(String(ally.name || "").toLowerCase());
    }

    function highlightCoord(key, color) {
      const village = world.villagesByCoord.get(key) || villageFromCoordKey(key);
      if (village) highlightVillage(village, color);
    }

    function villageFromCoordKey(key) {
      const match = /^(\d{1,3})\|(\d{1,3})$/.exec(String(key || ""));
      return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
    }

    function highlightVillage(village, color) {
      const element = getMapVillageElement(village);
      if (!element) return;
      element.style.boxSizing = "border-box";
      element.style.boxShadow = `inset 0 0 0 4px ${color}, 0 0 0 1px rgba(0,0,0,.55)`;
      highlightedElements.add(element);
    }

    function clearHighlights() {
      for (const element of highlightedElements) element.style.boxShadow = "";
      highlightedElements = new Set();
    }

    function getMapVillageElement(village) {
      let id = village.id;
      if (!id) {
        const twVillage = getTwMapVillage(village.x, village.y);
        id = twVillage && twVillage.id;
      }
      return id ? documentRef.querySelector(`#map_village_${id}`) : null;
    }

    function renderStyle() {
      if (documentRef.querySelector("#safe-fakes-builder-style")) return;
      const style = documentRef.createElement("style");
      style.id = "safe-fakes-builder-style";
      style.textContent = `
#safe-fakes-builder,#safe-fakes-builder-popup{position:fixed;z-index:15000;background:#f5efe0;color:#1e1a14;border:1px solid #8c7b5b;box-shadow:0 8px 24px rgba(0,0,0,.28);font:12px Arial,sans-serif}
#safe-fakes-builder{right:12px;top:82px;width:336px;padding:10px}
#safe-fakes-builder button,#safe-fakes-builder-popup button{font:12px Arial,sans-serif;line-height:1.2;padding:5px 7px;border:1px solid #8c7b5b;background:#fff7e8;color:#1e1a14;cursor:pointer}
#safe-fakes-builder button:hover,#safe-fakes-builder-popup button:hover{background:#fff}
#safe-fakes-builder button:disabled,#safe-fakes-builder-popup button:disabled{opacity:.45;cursor:not-allowed}
.sfb-title{font-weight:700;margin-bottom:6px}
.sfb-status{margin-bottom:8px;color:#4f4636}
.sfb-counts{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px}
.sfb-options{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
.sfb-options label{display:flex;align-items:center;gap:5px}
.sfb-options input[type=number]{width:64px}
.sfb-options select{grid-column:1 / -1}
.sfb-legend{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.sfb-legend span{display:inline-flex;align-items:center;gap:4px}
.sfb-legend i{width:10px;height:10px;display:inline-block;border:1px solid rgba(0,0,0,.45)}
.sfb-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:6px}
.sfb-export textarea{width:100%;height:86px;box-sizing:border-box;resize:vertical;font:11px Consolas,monospace}
#safe-fakes-builder-popup{width:330px;padding:9px}
.sfb-popup-header{margin-bottom:8px}
.sfb-popup-meta{margin:3px 0 5px;color:#4f4636}
.sfb-relation{display:inline-block;padding:2px 5px;border-radius:2px;background:#ddd}
.sfb-relation-enemy{background:#d8ecff}
.sfb-relation-neutral{background:#eeeeee}
.sfb-relation-barbarian{background:#e4e4e4}
.sfb-relation-own,.sfb-relation-same_ally,.sfb-relation-partner,.sfb-relation-nap,.sfb-relation-friend,.sfb-relation-non_attackable{background:#ffd9a8}
.sfb-button-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
`;
      documentRef.head.appendChild(style);
    }

    return { start, stop };
  }

  function loadState() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      return normalizeBuilderState(raw ? JSON.parse(raw) : {});
    } catch (_) {
      return createBuilderState();
    }
  }

  function saveState(state) {
    try {
      if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeBuilderState(state)));
    } catch (_) {
      // localStorage can be unavailable in privacy modes.
    }
  }

  function showInfo(message) {
    if (root && root.UI && root.UI.InfoMessage) root.UI.InfoMessage(message);
    else if (root && root.alert) root.alert(message);
    else console.info(message);
  }

  function showError(error) {
    const message = error && error.message ? error.message : String(error);
    if (root && root.UI && root.UI.ErrorMessage) root.UI.ErrorMessage(message);
    else if (root && root.alert) root.alert(message);
    else console.error(message);
  }

  return {
    createBuilderState,
    normalizeBuilderState,
    applyVillageAction,
    classifyVillage,
    setTargetWeight,
    buildSafeFakesConfig,
    buildBookmarklet,
    parseWorld,
    run,
    showError,
  };
});

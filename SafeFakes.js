/* MIT License
 * SafeFakes - clean-room script for Plemiona / Tribal Wars.
 */
(function (root, factory) {
  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (
    root &&
    root.document &&
    !root.__SAFE_FAKES_NO_AUTOSTART__
  ) {
    api.run().catch(api.showError);
  }
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  const BARBARIAN_PLAYER_ID = "0";
  const NO_ALLY_ID = "0";
  const UNIT_NAMES = [
    "spear",
    "sword",
    "axe",
    "archer",
    "spy",
    "light",
    "marcher",
    "heavy",
    "ram",
    "catapult",
    "knight",
    "snob",
  ];

  const DEFAULT_CONFIG = {
    coords: "",
    players: "",
    player_ids: "",
    allies: "",
    ally_tags: "",
    ally_ids: "",
    boundaries: [],
    exclude_players: "",
    exclude_player_ids: "",
    exclude_allies: "",
    exclude_ally_tags: "",
    exclude_ally_ids: "",
    exclude_coords: "",
    min_points: 0,
    max_points: 0,
    min_distance: 0,
    max_distance: 0,
    target_limit_per_player: 0,
    target_limit_per_ally: 0,
    target_weights: {},
    preview_mode: false,
    debug_report: false,
    troops_templates: [{ spy: 1, ram: 1 }, { spy: 1, catapult: 1 }, { ram: 1 }, { catapult: 1 }],
    fill_troops: "spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult",
    fill_exact: false,
    safeguard: {},
    include_barbarians: false,
    date_ranges: [],
    skip_night_bonus: true,
    blocking_enabled: false,
    blocking_local: null,
    blocking_global: [],
    changing_village_enabled: true,
    random_target: true,
    random_target_by: "village",
    require_relations: true,
    load_map_frame: true,
    map_frame_timeout_ms: 10000,
    messages: {},
  };

  const DEFAULT_MESSAGES = {
    rally_point_required: "Run this script on the rally point command screen.",
    confirmation_screen: "This is the confirmation screen. The script will not change it.",
    no_targets: "No targets. Set coords, players/player_ids, or allies/ally_tags/ally_ids.",
    missing_relations: "Relation data is unavailable. Target selection stopped for safety.",
    no_safe_targets: "No safe targets. Rejected: {rejected}.",
    no_timed_targets: "Safe targets exist, but none match the arrival time or night bonus filters.",
    no_unblocked_targets: "Safe targets exist, but all are blocked by blocking settings.",
    no_snob_targets: "Safe targets exist, but all are outside noble range.",
    no_distance_targets: "Safe targets exist, but none match distance filters.",
    no_limited_targets: "Safe targets exist, but all are removed by per-player or per-ally limits.",
    troops_selected: "Troops selected. No target was configured.",
    preview_target: "Preview {target} ({player}) [{ally}] arrival {arrival}. Rejected: {rejected}.",
    selected_target: "Selected {target} ({player}) arrival {arrival}. Command was not sent automatically.",
    fetch_failed: "Cannot fetch {url}: HTTP {status}",
    not_enough_troops: "Not enough troops for configured fake templates.",
    screen_redirect: "Redirecting to the rally point command screen.",
    village_out_of_group: "Village is outside the current group. Redirecting to the next village.",
  };

  function getConfig() {
    return normalizeConfig(root.SafeFakes || {});
  }

  async function getResolvedConfig() {
    const userConfig = root.SafeFakes || {};
    const forumConfig = normalizeForumConfig(userConfig.forum_config);
    if (Object.prototype.hasOwnProperty.call(userConfig, "forum_config") && userConfig.forum_config && !forumConfig) {
      throw new Error("forum_config: thread_id and spoiler_name are required");
    }
    if (!forumConfig) return normalizeConfig(userConfig);

    const loaded = await loadForumConfig(forumConfig);
    if (forumConfig.config_merge === "user+forum") {
      const merged = Object.assign({}, userConfig);
      for (const key of forumConfig.config_keys) merged[key] = loaded[key];
      return normalizeConfig(merged);
    }

    return normalizeConfig(Object.assign({}, loaded, userConfig));
  }

  function normalizeConfig(userConfig = {}) {
    const hasInclude = Object.prototype.hasOwnProperty.call(userConfig, "include_barbarians");
    const hasAllow = Object.prototype.hasOwnProperty.call(userConfig, "allow_barbarians");
    const config = Object.assign({}, DEFAULT_CONFIG, userConfig || {});

    config.fill_exact = asBoolean(config.fill_exact, DEFAULT_CONFIG.fill_exact);
    config.include_barbarians = asBoolean(
      hasInclude ? userConfig.include_barbarians : hasAllow ? userConfig.allow_barbarians : config.include_barbarians,
      DEFAULT_CONFIG.include_barbarians,
    );
    config.allow_barbarians = config.include_barbarians;
    config.skip_night_bonus = asBoolean(config.skip_night_bonus, DEFAULT_CONFIG.skip_night_bonus);
    config.blocking_enabled = asBoolean(config.blocking_enabled, DEFAULT_CONFIG.blocking_enabled);
    config.changing_village_enabled = asBoolean(config.changing_village_enabled, DEFAULT_CONFIG.changing_village_enabled);
    config.random_target = asBoolean(config.random_target, DEFAULT_CONFIG.random_target);
    config.require_relations = asBoolean(config.require_relations, DEFAULT_CONFIG.require_relations);
    config.load_map_frame = asBoolean(config.load_map_frame, DEFAULT_CONFIG.load_map_frame);
    config.preview_mode = asBoolean(config.preview_mode, DEFAULT_CONFIG.preview_mode);
    config.debug_report = asBoolean(config.debug_report, DEFAULT_CONFIG.debug_report);
    config.min_points = asNumber(config.min_points, DEFAULT_CONFIG.min_points);
    config.max_points = asNumber(config.max_points, DEFAULT_CONFIG.max_points);
    config.min_distance = asNumber(config.min_distance, DEFAULT_CONFIG.min_distance);
    config.max_distance = asNumber(config.max_distance, DEFAULT_CONFIG.max_distance);
    config.target_limit_per_player = asNumber(config.target_limit_per_player, DEFAULT_CONFIG.target_limit_per_player);
    config.target_limit_per_ally = asNumber(config.target_limit_per_ally, DEFAULT_CONFIG.target_limit_per_ally);
    config.map_frame_timeout_ms = asNumber(config.map_frame_timeout_ms, DEFAULT_CONFIG.map_frame_timeout_ms);
    config.boundaries = Array.isArray(config.boundaries) ? config.boundaries : [];
    config.date_ranges = Array.isArray(config.date_ranges) ? config.date_ranges : [];
    config.troops_templates = Array.isArray(config.troops_templates) ? config.troops_templates : DEFAULT_CONFIG.troops_templates;
    config.target_weights = config.target_weights && typeof config.target_weights === "object" ? config.target_weights : {};
    config.blocking_local = normalizeBlockingLocal(config.blocking_local);
    config.blocking_global = Array.isArray(config.blocking_global)
      ? config.blocking_global.map(normalizeBlockingGlobal).filter(Boolean)
      : [];

    return config;
  }

  function normalizeBlockingLocal(value) {
    if (!value || typeof value !== "object") return null;
    return {
      time_s: asNumber(value.time_s, 0),
      count: asNumber(value.count, 1),
      block_players: asBoolean(value.block_players, false),
      scope: value.scope === "instance" ? "instance" : null,
    };
  }

  function normalizeBlockingGlobal(value) {
    if (!value || typeof value !== "object" || value.name == null) return null;
    return {
      name: String(value.name),
      time_s: asNumber(value.time_s, 0),
      count: asNumber(value.count, 1),
      block_players: asBoolean(value.block_players, false),
    };
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

  function formatMessage(config, key, values = {}) {
    const template = (config.messages && config.messages[key]) || DEFAULT_MESSAGES[key] || key;
    return template.replace(/\{([a-z_]+)\}/g, (match, name) => {
      return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match;
    });
  }

  function parseCoords(text) {
    const coords = [];
    const regex = /(\d{1,3})\|(\d{1,3})(?::(\d+))?/g;
    let match;

    while ((match = regex.exec(text || "")) !== null) {
      const count = Math.max(1, Number(match[3] || 1));
      for (let i = 0; i < count; i++) {
        coords.push({ x: Number(match[1]), y: Number(match[2]) });
      }
    }

    return coords;
  }

  function coordKey(target) {
    return `${target.x}|${target.y}`;
  }

  function splitList(value) {
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
    return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
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

  function normalizeIdList(value) {
    if (!value) return [];
    if (Array.isArray(value) || (typeof value[Symbol.iterator] === "function" && typeof value !== "string")) {
      return Array.from(value).map(String);
    }
    if (typeof value === "object") return Object.keys(value).filter((key) => value[key]);
    return splitList(value);
  }

  function buildCandidateCoords({ config, world }) {
    const coords = parseCoords(config.coords);
    const seen = new Set(coords.map(coordKey));

    const playerNames = new Set(splitList(config.players).map((item) => item.toLowerCase()));
    const playerIds = new Set(splitList(config.player_ids));
    const allyNames = new Set(splitList(config.allies).map((item) => item.toLowerCase()));
    const allyTags = new Set(splitList(config.ally_tags).map((item) => item.toLowerCase()));
    const allyIds = new Set(splitList(config.ally_ids));

    const targetAllyIds = new Set();
    for (const ally of world.alliesById.values()) {
      if (
        allyNames.has(String(ally.name || "").toLowerCase()) ||
        allyTags.has(String(ally.tag || "").toLowerCase()) ||
        allyIds.has(String(ally.id))
      ) {
        targetAllyIds.add(String(ally.id));
      }
    }

    const targetPlayerIds = new Set();
    for (const player of world.playersById.values()) {
      if (
        playerNames.has(String(player.name || "").toLowerCase()) ||
        playerIds.has(String(player.id)) ||
        targetAllyIds.has(String(player.allyId))
      ) {
        targetPlayerIds.add(String(player.id));
      }
    }

    for (const village of world.villagesByCoord.values()) {
      if (
        !(config.include_barbarians && String(village.playerId) === BARBARIAN_PLAYER_ID) &&
        !targetPlayerIds.has(String(village.playerId))
      ) {
        continue;
      }
      if (!isInsideBoundaries(village, config.boundaries)) continue;
      const coord = { x: village.x, y: village.y };
      const key = coordKey(coord);
      if (!seen.has(key)) {
        seen.add(key);
        coords.push(coord);
      }
    }

    return coords;
  }

  function isInsideBoundaries(village, boundaries) {
    if (!boundaries || boundaries.length === 0) return true;
    return boundaries.some((boundary) => {
      if (boundary && boundary.r != null) {
        const dx = Number(boundary.x) - village.x;
        const dy = Number(boundary.y) - village.y;
        return dx * dx + dy * dy <= Number(boundary.r) * Number(boundary.r);
      }
      return boundary &&
        Number(boundary.min_x) <= village.x && village.x <= Number(boundary.max_x) &&
        Number(boundary.min_y) <= village.y && village.y <= Number(boundary.max_y);
    });
  }

  function buildExcludedIds({ config, world }) {
    const playerNames = new Set(splitList(config.exclude_players).map((item) => item.toLowerCase()));
    const playerIds = new Set(splitList(config.exclude_player_ids));
    const allyNames = new Set(splitList(config.exclude_allies).map((item) => item.toLowerCase()));
    const allyTags = new Set(splitList(config.exclude_ally_tags).map((item) => item.toLowerCase()));
    const allyIds = new Set(splitList(config.exclude_ally_ids));
    const coordKeys = new Set(parseCoords(config.exclude_coords).map(coordKey));

    for (const ally of world.alliesById.values()) {
      if (
        allyNames.has(String(ally.name || "").toLowerCase()) ||
        allyTags.has(String(ally.tag || "").toLowerCase()) ||
        allyIds.has(String(ally.id))
      ) {
        allyIds.add(String(ally.id));
      }
    }

    for (const player of world.playersById.values()) {
      if (
        playerNames.has(String(player.name || "").toLowerCase())
      ) {
        playerIds.add(String(player.id));
      }
    }

    return { playerIds, allyIds, coordKeys };
  }

  function selectSafeTargets({
    coords,
    world,
    relations,
    currentPlayer,
    allowBarbarians = false,
    minPoints = 0,
    maxPoints = 0,
    exclusions = { playerIds: new Set(), allyIds: new Set(), coordKeys: new Set() },
  }) {
    const accepted = [];
    const rejected = [];

    for (const coord of coords) {
      const reason = getBlockReason(coord, world, relations, currentPlayer, allowBarbarians, minPoints, maxPoints, exclusions);
      if (reason) {
        rejected.push(Object.assign({}, coord, { reason }));
        continue;
      }

      const village = world.villagesByCoord.get(coordKey(coord));
      const player = world.playersById.get(village.playerId);
      const ally = player ? world.alliesById.get(player.allyId) : null;
      accepted.push(Object.assign({}, coord, {
        village,
        player: player || null,
        ally: ally || null,
      }));
    }

    return { accepted, rejected };
  }

  function getBlockReason(coord, world, relations, currentPlayer, allowBarbarians, minPoints, maxPoints, exclusions) {
    if (exclusions.coordKeys && exclusions.coordKeys.has(coordKey(coord))) return "excluded_coord";
    const village = world.villagesByCoord.get(coordKey(coord));
    if (!village) return "missing_village";
    if (village.playerId === BARBARIAN_PLAYER_ID) return allowBarbarians ? null : "barbarian";
    if (Number(village.points || 0) < Number(minPoints || 0)) return "not_enough_points";
    if (Number(maxPoints || 0) > 0 && Number(village.points || 0) > Number(maxPoints || 0)) return "too_many_points";
    if (village.playerId === String(currentPlayer.id)) return "own";

    const player = world.playersById.get(village.playerId);
    if (!player) return "missing_player";
    if (exclusions.playerIds.has(String(player.id))) return "excluded_player";
    if (exclusions.allyIds.has(String(player.allyId))) return "excluded_ally";

    const currentAlly = String(currentPlayer.ally || NO_ALLY_ID);
    if (currentAlly !== NO_ALLY_ID && player.allyId === currentAlly) {
      return "same_ally";
    }

    if (!relations) return "missing_relations";

    if (idIn(relations.non_attackable_players, village.playerId)) {
      return "non_attackable";
    }

    if (idIn(relations.friends, village.playerId)) {
      return "friend";
    }

    const relation = String(valueById(relations.allyRelations, player.allyId) || "").toLowerCase();
    if (relation === "partner") return "partner";
    if (relation === "nap") return "nap";

    return null;
  }

  function decodeMapValue(value) {
    return decodeURIComponent(String(value || "").replace(/\+/g, " "));
  }

  function parseMapRows(text) {
    return String(text || "")
      .trim()
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => line.split(",").map(decodeMapValue));
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
      villagesByCoord.set(coordKey(village), village);
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

    return { villagesByCoord, playersById, alliesById };
  }

  async function fetchText(url) {
    const response = await root.fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(formatMessage(getConfig(), "fetch_failed", { url, status: response.status }));
    }
    return response.text();
  }

  function normalizeForumConfig(value) {
    if (!value || typeof value !== "object") return null;
    const threadId = asNumber(value.thread_id, null);
    const spoilerName = typeof value.spoiler_name === "string" ? value.spoiler_name : null;
    if (threadId == null || !spoilerName) return null;
    return {
      thread_id: threadId,
      spoiler_name: spoilerName,
      page: asNumber(value.page, 0),
      time_to_live_s: asNumber(value.time_to_live_s, 3600),
      config_merge: value.config_merge === "user+forum" ? "user+forum" : "forum+user",
      config_keys: Array.isArray(value.config_keys) ? value.config_keys.map(String) : [],
    };
  }

  async function loadForumConfig(forumConfig) {
    const key = `SafeFakes.forum_config.${hashString(JSON.stringify(forumConfig))}`;
    const cached = getCachedForumConfig(key);
    if (cached) return cached;

    const url = root.TribalWars
      ? root.TribalWars.buildURL("GET", "forum", {
        screenmode: "view_thread",
        thread_id: forumConfig.thread_id,
        page: forumConfig.page,
      })
      : `game.php?screen=forum&screenmode=view_thread&thread_id=${forumConfig.thread_id}&page=${forumConfig.page}`;
    const html = await fetchText(url);
    const documentRef = new root.DOMParser().parseFromString(html, "text/html");
    const spoilers = Array.from(documentRef.querySelectorAll("div.spoiler > input"))
      .filter((input) => input.value === forumConfig.spoiler_name)
      .map((input) => input.parentElement);
    if (spoilers.length !== 1) throw new Error("forum_config: invalid spoiler_name");

    const snippets = spoilers[0].querySelectorAll("pre");
    if (snippets.length !== 1) throw new Error("forum_config: invalid code snippet");

    const config = parseForumConfiguration(snippets[0].textContent || snippets[0].innerText || "");
    setCachedForumConfig(key, config, forumConfig.time_to_live_s);
    return config;
  }

  function getCachedForumConfig(key) {
    try {
      const raw = getStorageValue(root.localStorage, key);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      return Number(cached.expiresAt || 0) > Date.now() ? cached.config : null;
    } catch (_) {
      return null;
    }
  }

  function setCachedForumConfig(key, config, timeToLiveS) {
    try {
      setStorageValue(root.localStorage, key, JSON.stringify({
        expiresAt: Date.now() + Number(timeToLiveS || 0) * 1000,
        config,
      }));
    } catch (_) {
      // localStorage can be unavailable in some browser privacy modes.
    }
  }

  function parseForumConfiguration(text) {
    let snippet = String(text || "").trim();
    try {
      return JSON.parse(snippet);
    } catch (_) {
      if (snippet.includes("HermitowskieFejki") || snippet.includes("SafeFakes")) {
        snippet = snippet.slice(snippet.indexOf("=") + 1);
      }
      if (snippet.includes(";")) snippet = snippet.slice(0, snippet.indexOf(";"));
      snippet = snippet
        .replace(/'/g, "\"")
        .replace(/\/\/.*/g, "")
        .replace(/\/\*.*?\*\//gs, "")
        .trim();
      return JSON.parse(snippet);
    }
  }

  async function fetchWorld() {
    const [village, player, ally] = await Promise.all([
      fetchText("map/village.txt"),
      fetchText("map/player.txt"),
      fetchText("map/ally.txt"),
    ]);
    return parseWorld(village, player, ally);
  }

  function snapshotRelations(twMap) {
    if (!twMap) return null;
    return {
      allyRelations: twMap.allyRelations || {},
      friends: twMap.friends || {},
      non_attackable_players: normalizeIdList(twMap.non_attackable_players),
    };
  }

  async function fetchRelations(config) {
    if (root.TWMap) return snapshotRelations(root.TWMap);
    if (!config.load_map_frame) return null;

    const src = root.TribalWars
      ? root.TribalWars.buildURL("GET", "map", {})
      : "game.php?screen=map";

    return new Promise((resolve) => {
      const iframe = root.document.createElement("iframe");
      let done = false;

      const finish = (relations) => {
        if (done) return;
        done = true;
        iframe.remove();
        resolve(relations);
      };

      iframe.style.cssText = "position:absolute;left:-99999px;top:-99999px;width:1px;height:1px;border:0;";
      iframe.onload = () => {
        const start = Date.now();
        const timer = root.setInterval(() => {
          const twMap = iframe.contentWindow && iframe.contentWindow.TWMap;
          if (twMap) {
            root.clearInterval(timer);
            finish(snapshotRelations(twMap));
          } else if (Date.now() - start > config.map_frame_timeout_ms) {
            root.clearInterval(timer);
            finish(null);
          }
        }, 100);
      };
      iframe.onerror = () => finish(null);
      root.setTimeout(() => finish(null), config.map_frame_timeout_ms + 500);
      root.document.body.appendChild(iframe);
      iframe.src = src;
    });
  }

  async function fetchXmlObject(url) {
    const text = await fetchText(url);
    const xml = new root.DOMParser().parseFromString(text, "text/xml");
    return xmlToObject(xml.documentElement);
  }

  function xmlToObject(node) {
    const result = {};
    for (const child of Array.from(node.children)) {
      result[child.nodeName] = child.children.length ? xmlToObject(child) : child.textContent;
    }
    return result;
  }

  function getAvailableTroops(documentRef, gameData, safeguard) {
    const result = {};
    for (const unit of (gameData.units || UNIT_NAMES)) {
      if (unit === "militia") continue;
      const input = documentRef.querySelector(`#unit_input_${unit}`);
      if (!input) continue;
      const count = Number(input.dataset.allCount || input.getAttribute("data-all-count") || 0);
      result[unit] = Math.max(0, count - Number((safeguard || {})[unit] || 0));
    }
    return result;
  }

  function selectTroops(config, available, unitInfo, gameData, worldConfig) {
    for (const template of config.troops_templates || []) {
      const troops = Object.assign({}, template);
      if (!hasTroops(available, troops)) continue;
      if (meetsFakeLimit(troops, unitInfo, gameData, worldConfig)) return troops;
      const filled = fillTroops(troops, available, unitInfo, gameData, worldConfig, config);
      if (filled && meetsFakeLimit(filled, unitInfo, gameData, worldConfig)) {
        return filled;
      }
    }
    throw new Error(formatMessage(config, "not_enough_troops"));
  }

  function hasTroops(available, troops) {
    return Object.keys(troops).every((unit) => Number(available[unit] || 0) >= Number(troops[unit] || 0));
  }

  function population(troops, unitInfo) {
    return Object.keys(troops).reduce((sum, unit) => {
      return sum + Number(troops[unit] || 0) * Number(unitInfo[unit] && unitInfo[unit].pop || 0);
    }, 0);
  }

  function requiredFakePopulation(gameData, worldConfig) {
    const fakeLimit = Number(worldConfig.game && worldConfig.game.fake_limit || 0);
    return fakeLimit ? Math.floor(Number(gameData.village.points || 0) * fakeLimit * 0.01) : 0;
  }

  function meetsFakeLimit(troops, unitInfo, gameData, worldConfig) {
    const required = requiredFakePopulation(gameData, worldConfig);
    if (!required) return true;
    const onlyScouts = Number(troops.spy || 0) >= 5 &&
      Object.keys(troops).every((unit) => unit === "spy" || Number(troops[unit] || 0) === 0);
    return onlyScouts || population(troops, unitInfo) >= required;
  }

  function fillTroops(troops, available, unitInfo, gameData, worldConfig, config) {
    const result = Object.assign({}, troops);
    let missing = requiredFakePopulation(gameData, worldConfig) - population(result, unitInfo);
    if (missing <= 0) return result;

    for (const entry of String(config.fill_troops || "").split(",")) {
      const [unit, limitText] = entry.trim().split(":");
      if (!unit || !unitInfo[unit]) continue;
      const remaining = Number(available[unit] || 0) - Number(result[unit] || 0);
      if (remaining <= 0) continue;
      const pop = Number(unitInfo[unit].pop || 0);
      const needed = config.fill_exact ? remaining : Math.ceil(missing / pop);
      const limit = limitText ? Number(limitText) : Infinity;
      const add = Math.max(0, Math.min(remaining, needed, limit));
      result[unit] = Number(result[unit] || 0) + add;
      missing -= add * pop;
      if (missing <= 0) return result;
    }

    return null;
  }

  function troopSpeed(troops, unitInfo) {
    return Object.keys(troops).reduce((max, unit) => {
      if (!troops[unit]) return max;
      return Math.max(max, Number(unitInfo[unit] && unitInfo[unit].speed || 0));
    }, 0);
  }

  function distance(gameData, target) {
    const dx = Number(gameData.village.x) - target.x;
    const dy = Number(gameData.village.y) - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getArrivalTime(gameData, target, troops, unitInfo, now = new Date()) {
    return new Date(now.getTime() + distance(gameData, target) * troopSpeed(troops, unitInfo) * 60 * 1000);
  }

  function parseDateRange(text, now = new Date()) {
    const parts = String(text || "").split(/\s*-\s*/);
    if (parts.length !== 2) return null;
    return {
      timeOnly: isTimeOnly(parts[0]) && isTimeOnly(parts[1]),
      from: parseDatePart(parts[0], now),
      to: parseDatePart(parts[1], now),
    };
  }

  function isTimeOnly(text) {
    return /^\d{1,2}:\d{2}$/.test(String(text || "").trim());
  }

  function parseDatePart(text, now) {
    const full = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(text.trim());
    if (full) return new Date(Number(full[3]), Number(full[2]) - 1, Number(full[1]), Number(full[4]), Number(full[5]));

    const hour = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
    if (hour) return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hour[1]), Number(hour[2]));

    return new Date(NaN);
  }

  function isInDateRanges(date, ranges) {
    if (!ranges || ranges.length === 0) return true;
    return ranges
      .map((range) => parseDateRange(range))
      .filter((range) => range && !Number.isNaN(range.from.getTime()) && !Number.isNaN(range.to.getTime()))
      .some((range) => {
        if (!range.timeOnly) return range.from <= date && date <= range.to;
        const from = range.from.getHours() * 60 + range.from.getMinutes();
        const to = range.to.getHours() * 60 + range.to.getMinutes();
        const current = date.getHours() * 60 + date.getMinutes();
        return from <= to ? from <= current && current <= to : current >= from || current <= to;
      });
  }

  function isNightBonus(date, worldConfig) {
    const night = worldConfig.night || {};
    if (night.active !== "1") return false;
    const start = Number(night.start_hour);
    const end = Number(night.end_hour);
    const hour = date.getHours();
    return start < end ? start <= hour && hour < end : hour >= start || hour < end;
  }

  function filterByTroopConstraints(targets, troops, gameData, worldConfig) {
    if (Number(troops.snob || 0) <= 0) return targets;
    const maxDist = Number(worldConfig.snob && worldConfig.snob.max_dist);
    if (!Number.isFinite(maxDist) || maxDist <= 0) return targets;
    return targets.filter((target) => distance(gameData, target) < maxDist);
  }

  function filterByDistanceConstraints(targets, gameData, config) {
    const min = Number(config.min_distance || 0);
    const max = Number(config.max_distance || 0);
    if (min <= 0 && max <= 0) return targets;
    return targets.filter((target) => {
      const value = distance(gameData, target);
      return (min <= 0 || value >= min) && (max <= 0 || value <= max);
    });
  }

  function applyTargetLimits(targets, config) {
    const playerLimit = Number(config.target_limit_per_player || 0);
    const allyLimit = Number(config.target_limit_per_ally || 0);
    if (playerLimit <= 0 && allyLimit <= 0) return targets;

    const playerCounts = new Map();
    const allyCounts = new Map();
    return targets.filter((target) => {
      const playerId = String(target.village && target.village.playerId || "");
      const allyId = String(target.player && target.player.allyId || "");
      if (playerLimit > 0 && (playerCounts.get(playerId) || 0) >= playerLimit) return false;
      if (allyLimit > 0 && allyId && allyId !== NO_ALLY_ID && (allyCounts.get(allyId) || 0) >= allyLimit) return false;
      playerCounts.set(playerId, (playerCounts.get(playerId) || 0) + 1);
      if (allyId && allyId !== NO_ALLY_ID) allyCounts.set(allyId, (allyCounts.get(allyId) || 0) + 1);
      return true;
    });
  }

  function filterByArrivalTime(targets, troops, unitInfo, gameData, worldConfig, config, now = new Date()) {
    const onlyScouts = Object.keys(troops).every((unit) => unit === "spy" || Number(troops[unit] || 0) === 0);
    return targets
      .map((target) => Object.assign({}, target, {
        arrival: getArrivalTime(gameData, target, troops, unitInfo, now),
      }))
      .filter((target) => isInDateRanges(target.arrival, config.date_ranges))
      .filter((target) => {
        const barbarian = String(target.village && target.village.playerId) === BARBARIAN_PLAYER_ID;
        return !config.skip_night_bonus || onlyScouts || barbarian || !isNightBonus(target.arrival, worldConfig);
      });
  }

  function getBlockSpecs(config, gameData) {
    if (!config.blocking_enabled) return [];
    const specs = [];
    if (config.blocking_local) {
      specs.push({
        key: config.blocking_local.scope === "instance"
          ? `SafeFakes.blocking.local.instance.${hashString(JSON.stringify(Object.assign({}, config, { messages: undefined })))}`
          : `SafeFakes.blocking.local.${gameData.village.id}`,
        time_s: Number(config.blocking_local.time_s || 0),
        count: Number(config.blocking_local.count || 1),
        block_players: Boolean(config.blocking_local.block_players),
      });
    }
    for (const entry of config.blocking_global || []) {
      specs.push({
        key: `SafeFakes.blocking.global.${entry.name}`,
        time_s: Number(entry.time_s || 0),
        count: Number(entry.count || 1),
        block_players: Boolean(entry.block_players),
      });
    }
    return specs;
  }

  function applyBlocking(targets, config, gameData, storage = root.localStorage, now = new Date()) {
    let result = targets;
    for (const spec of getBlockSpecs(config, gameData)) {
      const entries = getBlockEntries(storage, spec.key, now);
      const villageCounts = new Map();
      const playerCounts = new Map();
      for (const entry of entries) {
        const villageKey = `${entry.x}|${entry.y}`;
        villageCounts.set(villageKey, (villageCounts.get(villageKey) || 0) + 1);
        if (spec.block_players && entry.playerId !== BARBARIAN_PLAYER_ID) {
          playerCounts.set(entry.playerId, (playerCounts.get(entry.playerId) || 0) + 1);
        }
      }
      result = result.filter((target) => {
        if (spec.block_players) {
          return (playerCounts.get(String(target.village && target.village.playerId)) || 0) < spec.count;
        }
        return (villageCounts.get(coordKey(target)) || 0) < spec.count;
      });
    }
    return result;
  }

  function recordBlocking(target, config, gameData, storage = root.localStorage, now = new Date()) {
    for (const spec of getBlockSpecs(config, gameData)) {
      const entries = getBlockEntries(storage, spec.key, now);
      entries.push({
        expiresAt: now.getTime() + spec.time_s * 1000,
        x: target.x,
        y: target.y,
        playerId: String(target.village && target.village.playerId || ""),
      });
      setStorageValue(storage, spec.key, JSON.stringify(entries));
    }
  }

  function getBlockEntries(storage, key, now) {
    if (!storage) return [];
    try {
      const raw = getStorageValue(storage, key);
      const entries = raw ? JSON.parse(raw) : [];
      return entries.filter((entry) => Number(entry.expiresAt || 0) >= now.getTime());
    } catch (_) {
      return [];
    }
  }

  function getStorageValue(storage, key) {
    return typeof storage.getItem === "function" ? storage.getItem(key) : storage.get(key);
  }

  function setStorageValue(storage, key, value) {
    if (typeof storage.setItem === "function") storage.setItem(key, value);
    else storage.set(key, value);
  }

  function hashString(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function getServerTime(documentRef) {
    const dateNode = documentRef.querySelector("#serverDate");
    const timeNode = documentRef.querySelector("#serverTime");
    const dateText = dateNode && dateNode.textContent ? dateNode.textContent.trim() : "";
    const timeText = timeNode && timeNode.textContent ? timeNode.textContent.trim() : "";
    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(`${dateText} ${timeText}`);
    return match
      ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6] || 0))
      : new Date();
  }

  function getNextVillageUrl(documentRef, config) {
    if (!config.changing_village_enabled) return null;
    const link = documentRef.querySelector("#village_switch_right");
    return link && link.href ? link.href : null;
  }

  function fillTroopInputs(documentRef, troops) {
    for (const unit of UNIT_NAMES) {
      const input = documentRef.querySelector(`#unit_input_${unit}`);
      if (input) input.value = troops[unit] ? String(troops[unit]) : "";
    }
  }

  function fillTargetInputs(documentRef, target) {
    const quick = documentRef.querySelector(".target-input-field");
    if (quick) {
      quick.value = coordKey(target);
      return;
    }
    const inputX = documentRef.querySelector("#inputx");
    const inputY = documentRef.querySelector("#inputy");
    if (inputX && inputY) {
      inputX.value = String(target.x);
      inputY.value = String(target.y);
    }
  }

  function chooseTarget(items, config, random = Math.random) {
    if (!config.random_target) return items[0];

    if (config.random_target_by === "player") {
      return chooseFromGroups(items, config, (item) => item.village && item.village.playerId, random);
    }

    if (config.random_target_by === "ally") {
      return chooseFromGroups(items, config, (item) => item.player && item.player.allyId, random);
    }

    return pickWeighted(items, (item) => getTargetWeight(item, config), random);
  }

  function chooseFromGroups(items, config, keyFn, random) {
    const groups = new Map();
    for (const item of items) {
      const key = String(keyFn(item) || "");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const group = pickWeighted(Array.from(groups.values()), (items) => {
      return Math.max(...items.map((item) => getTargetWeight(item, config)));
    }, random);
    return pickWeighted(group, (item) => getTargetWeight(item, config), random);
  }

  function pickWeighted(items, weightFn, random) {
    const weights = items.map((item) => Math.max(1, Number(weightFn(item) || 1)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = random() * total;
    for (let i = 0; i < items.length; i++) {
      cursor -= weights[i];
      if (cursor < 0) return items[i];
    }
    return items[items.length - 1];
  }

  function getTargetWeight(target, config) {
    const weights = config.target_weights || {};
    return Math.max(
      1,
      lookupWeight(weights.coords, [coordKey(target)]),
      lookupWeight(weights.players, [
        target.village && target.village.playerId,
        target.player && target.player.id,
        target.player && target.player.name,
      ]),
      lookupWeight(weights.allies, [
        target.player && target.player.allyId,
        target.ally && target.ally.id,
        target.ally && target.ally.tag,
        target.ally && target.ally.name,
      ]),
    );
  }

  function lookupWeight(table, keys) {
    if (!table || typeof table !== "object") return 0;
    for (const key of keys) {
      if (key == null) continue;
      const direct = table[String(key)];
      if (direct != null) return Number(direct) || 0;
      const lower = table[String(key).toLowerCase()];
      if (lower != null) return Number(lower) || 0;
      const loose = Object.keys(table).find((item) => item.toLowerCase() === String(key).toLowerCase());
      if (loose != null) return Number(table[loose]) || 0;
    }
    return 0;
  }

  function formatArrival(date) {
    return date.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function buildTargetMessage(config, key, target, rejected = []) {
    return formatMessage(config, key, {
      target: coordKey(target),
      player: target.player ? target.player.name : "no player",
      ally: target.ally ? target.ally.tag || target.ally.name || target.ally.id : "",
      arrival: target.arrival ? formatArrival(target.arrival) : "",
      rejected: summarizeRejected(rejected) || "none",
    });
  }

  function buildDebugReport({
    coords = [],
    safeTargets = { accepted: [], rejected: [] },
    troopConstrainedTargets = [],
    distanceTargets = [],
    limitedTargets = [],
    timedTargets = [],
    unblockedTargets = [],
    selectedTarget = null,
  }) {
    return {
      candidates: coords.length,
      safe: safeTargets.accepted.length,
      rejected: summarizeRejectedObject(safeTargets.rejected),
      troop_constrained: troopConstrainedTargets.length,
      distance: distanceTargets.length,
      limited: limitedTargets.length,
      timed: timedTargets.length,
      unblocked: unblockedTargets.length,
      selected: selectedTarget ? coordKey(selectedTarget) : null,
    };
  }

  function emitDebugReport(config, report) {
    if (!config.debug_report) return;
    const consoleRef = root.console || console;
    if (consoleRef && consoleRef.info) consoleRef.info("SafeFakes debug", report);
  }

  async function run() {
    let config = getConfig();
    const documentRef = root.document;
    const gameData = root.game_data;
    const jumpLink = documentRef.querySelector(".jump_link");
    if (jumpLink && jumpLink.href) {
      const error = new Error(formatMessage(config, "village_out_of_group"));
      error.nextVillageUrl = jumpLink.href;
      throw error;
    }

    if ((gameData && gameData.screen && gameData.screen !== "place") || !documentRef.querySelector("#command-data-form")) {
      const error = new Error(formatMessage(config, gameData && gameData.screen ? "screen_redirect" : "rally_point_required"));
      error.nextVillageUrl = root.TribalWars
        ? root.TribalWars.buildURL("GET", "place", { mode: "command" })
        : "game.php?screen=place&mode=command";
      throw error;
    }
    if (documentRef.querySelector("#troop_confirm_go") || documentRef.querySelector("#troop_confirm_submit")) {
      throw new Error(formatMessage(config, "confirmation_screen"));
    }

    try {
      config = await getResolvedConfig();
      const [world, relations, unitInfo, worldConfig] = await Promise.all([
        fetchWorld(),
        fetchRelations(config),
        fetchXmlObject("interface.php?func=get_unit_info"),
        fetchXmlObject("interface.php?func=get_config"),
      ]);

      const available = getAvailableTroops(documentRef, gameData, config.safeguard);
      const troops = selectTroops(config, available, unitInfo, gameData, worldConfig);

      const coords = buildCandidateCoords({ config, world });
      if (coords.length === 0) {
        fillTroopInputs(documentRef, troops);
        showInfo(formatMessage(config, "troops_selected"));
        return;
      }
      if (!relations && config.require_relations) {
        throw new Error(formatMessage(config, "missing_relations"));
      }

      const safeTargets = selectSafeTargets({
        coords,
        world,
        relations: relations || {},
        currentPlayer: gameData.player,
        allowBarbarians: config.include_barbarians,
        minPoints: config.min_points,
        maxPoints: config.max_points,
        exclusions: buildExcludedIds({ config, world }),
      });
      if (safeTargets.accepted.length === 0) {
        throw new Error(formatMessage(config, "no_safe_targets", { rejected: summarizeRejected(safeTargets.rejected) }));
      }

      const troopConstrainedTargets = filterByTroopConstraints(safeTargets.accepted, troops, gameData, worldConfig);
      if (troopConstrainedTargets.length === 0) {
        throw new Error(formatMessage(config, "no_snob_targets"));
      }

      const distanceTargets = filterByDistanceConstraints(troopConstrainedTargets, gameData, config);
      if (distanceTargets.length === 0) {
        throw new Error(formatMessage(config, "no_distance_targets"));
      }

      const limitedTargets = applyTargetLimits(distanceTargets, config);
      if (limitedTargets.length === 0) {
        throw new Error(formatMessage(config, "no_limited_targets"));
      }

      const timedTargets = filterByArrivalTime(
        limitedTargets,
        troops,
        unitInfo,
        gameData,
        worldConfig,
        config,
        getServerTime(documentRef),
      );
      if (timedTargets.length === 0) {
        throw new Error(formatMessage(config, "no_timed_targets"));
      }

      const unblockedTargets = applyBlocking(timedTargets, config, gameData);
      if (unblockedTargets.length === 0) {
        throw new Error(formatMessage(config, "no_unblocked_targets"));
      }

      const target = chooseTarget(unblockedTargets, config);
      const debugReport = buildDebugReport({
        coords,
        safeTargets,
        troopConstrainedTargets,
        distanceTargets,
        limitedTargets,
        timedTargets,
        unblockedTargets,
        selectedTarget: target,
      });
      emitDebugReport(config, debugReport);

      if (config.preview_mode) {
        showInfo(buildTargetMessage(config, "preview_target", target, safeTargets.rejected));
        return;
      }

      recordBlocking(target, config, gameData);
      fillTroopInputs(documentRef, troops);
      fillTargetInputs(documentRef, target);
      showInfo(buildTargetMessage(config, "selected_target", target, safeTargets.rejected));
    } catch (error) {
      error.nextVillageUrl = getNextVillageUrl(documentRef, config);
      throw error;
    }
  }

  function summarizeRejected(rejected) {
    const counts = summarizeRejectedObject(rejected);
    return Object.keys(counts).map((key) => `${key}: ${counts[key]}`).join(", ");
  }

  function summarizeRejectedObject(rejected) {
    const counts = {};
    for (const item of rejected || []) counts[item.reason] = (counts[item.reason] || 0) + 1;
    return counts;
  }

  function showInfo(message) {
    if (root.UI && root.UI.InfoMessage) root.UI.InfoMessage(message);
    else root.alert(message);
  }

  function showError(error) {
    const message = error && error.message ? error.message : String(error);
    if (root && root.UI && root.UI.ErrorMessage) root.UI.ErrorMessage(message);
    else if (root && root.alert) root.alert(message);
    else console.error(message);
    if (error && error.nextVillageUrl && root.location) {
      root.location.href = error.nextVillageUrl;
    }
  }

  return {
    parseCoords,
    parseWorld,
    buildCandidateCoords,
    buildExcludedIds,
    selectSafeTargets,
    normalizeConfig,
    parseForumConfiguration,
    applyTargetLimits,
    buildDebugReport,
    buildTargetMessage,
    applyBlocking,
    recordBlocking,
    getNextVillageUrl,
    chooseTarget,
    formatMessage,
    getArrivalTime,
    filterByDistanceConstraints,
    filterByTroopConstraints,
    filterByArrivalTime,
    getServerTime,
    run,
    showError,
  };
});

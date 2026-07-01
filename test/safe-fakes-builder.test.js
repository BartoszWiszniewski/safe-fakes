const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createBuilderState,
  normalizeBuilderState,
  applyVillageAction,
  classifyVillage,
  getVillageSelectionState,
  getVillageMarkerType,
  removeStateItem,
  parseCoordKeys,
  searchWorldTargets,
  buildSafeFakesConfig,
  buildBookmarklet,
} = require("../SafeFakesBuilder");

const enemyVillage = {
  id: "123",
  name: "Enemy village",
  x: 500,
  y: 501,
  playerId: "10",
  points: 4321,
  player: { id: "10", name: "EnemyNick", allyId: "200" },
  ally: { id: "200", name: "Enemy Tribe", tag: "ENM" },
};

test("applyVillageAction builds coord, player, and tribe target selectors without duplicates", () => {
  let state = createBuilderState();
  state = applyVillageAction(state, enemyVillage, "add_coord");
  state = applyVillageAction(state, enemyVillage, "add_coord");
  state = applyVillageAction(state, enemyVillage, "add_player");
  state = applyVillageAction(state, enemyVillage, "add_ally");

  assert.deepEqual(state.coords, ["500|501"]);
  assert.deepEqual(state.players, ["EnemyNick"]);
  assert.deepEqual(state.player_ids, ["10"]);
  assert.deepEqual(state.ally_tags, ["ENM"]);
  assert.deepEqual(state.ally_ids, ["200"]);
});

test("normalizeBuilderState keeps player and tribe names with spaces", () => {
  const state = normalizeBuilderState({
    coords: "500|501 500|502",
    players: "Enemy Nick,Second Enemy",
    allies: "Enemy Tribe",
  });

  assert.deepEqual(state.coords, ["500|501", "500|502"]);
  assert.deepEqual(state.players, ["Enemy Nick", "Second Enemy"]);
  assert.deepEqual(state.allies, ["Enemy Tribe"]);
});

test("exclude actions remove matching target selectors before export", () => {
  let state = normalizeBuilderState({
    coords: ["500|501"],
    players: ["EnemyNick"],
    player_ids: ["10"],
    ally_tags: ["ENM"],
    ally_ids: ["200"],
  });

  state = applyVillageAction(state, enemyVillage, "exclude_coord");
  state = applyVillageAction(state, enemyVillage, "exclude_player");
  state = applyVillageAction(state, enemyVillage, "exclude_ally");

  assert.deepEqual(buildSafeFakesConfig(state), {
    coords: "",
    players: "",
    player_ids: "",
    allies: "",
    ally_tags: "",
    ally_ids: "",
    exclude_coords: "500|501",
    exclude_players: "EnemyNick",
    exclude_player_ids: "10",
    exclude_allies: "Enemy Tribe",
    exclude_ally_tags: "ENM",
    exclude_ally_ids: "200",
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
  });
});

test("getVillageSelectionState reports target and protected toggles for popup buttons", () => {
  const state = normalizeBuilderState({
    coords: ["500|501"],
    player_ids: ["10"],
    ally_ids: ["200"],
    exclude_coords: ["500|502"],
    exclude_player_ids: ["11"],
    exclude_ally_ids: ["201"],
  });

  assert.deepEqual(getVillageSelectionState(state, enemyVillage), {
    coordTargeted: true,
    playerTargeted: true,
    allyTargeted: true,
    coordProtected: false,
    playerProtected: false,
    allyProtected: false,
  });
  assert.deepEqual(getVillageSelectionState(state, {
    x: 500,
    y: 502,
    playerId: "11",
    player: { id: "11", name: "Protected", allyId: "201" },
    ally: { id: "201", name: "Protected Tribe", tag: "PRT" },
  }), {
    coordTargeted: false,
    playerTargeted: false,
    allyTargeted: false,
    coordProtected: true,
    playerProtected: true,
    allyProtected: true,
  });
});

test("getVillageMarkerType gives protection priority over target colors", () => {
  assert.equal(getVillageMarkerType(normalizeBuilderState({ coords: ["500|501"] }), enemyVillage), "coord");
  assert.equal(getVillageMarkerType(normalizeBuilderState({ ally_ids: ["200"] }), enemyVillage), "group");
  assert.equal(getVillageMarkerType(normalizeBuilderState({
    ally_ids: ["200"],
    exclude_player_ids: ["10"],
  }), enemyVillage), "exclude");
  assert.equal(getVillageMarkerType(createBuilderState(), enemyVillage), null);
});

test("removeStateItem removes list entries and matching weights", () => {
  const state = normalizeBuilderState({
    coords: ["500|501"],
    player_ids: ["10"],
    target_weights: {
      coords: { "500|501": 3 },
      players: { 10: 2 },
    },
  });

  const withoutCoord = removeStateItem(state, "coords", "500|501");
  const withoutPlayer = removeStateItem(withoutCoord, "player_ids", "10");

  assert.deepEqual(withoutPlayer.coords, []);
  assert.deepEqual(withoutPlayer.player_ids, []);
  assert.deepEqual(withoutPlayer.target_weights.coords, {});
  assert.deepEqual(withoutPlayer.target_weights.players, {});
});

test("parseCoordKeys extracts unique manual coords", () => {
  assert.deepEqual(parseCoordKeys("500|501, (502|503) 500|501 bad"), ["500|501", "502|503"]);
});

test("searchWorldTargets finds players and tribes by partial name, tag, or id", () => {
  const world = {
    playersById: new Map([
      ["10", { id: "10", name: "EnemyNick", allyId: "200" }],
      ["11", { id: "11", name: "Other", allyId: "201" }],
    ]),
    alliesById: new Map([
      ["200", { id: "200", name: "Enemy Main", tag: "ENM" }],
      ["201", { id: "201", name: "Enemy Academy", tag: "ENM-A" }],
      ["300", { id: "300", name: "Neutral", tag: "NTR" }],
    ]),
  };

  const byName = searchWorldTargets(world, "enemy", 10);
  const byTag = searchWorldTargets(world, "enm", 10);
  const byId = searchWorldTargets(world, "201", 10);

  assert.deepEqual(byName.players.map((player) => player.id), ["10"]);
  assert.deepEqual(byName.allies.map((ally) => ally.id), ["200", "201"]);
  assert.deepEqual(byTag.allies.map((ally) => ally.id), ["200", "201"]);
  assert.deepEqual(byId.allies.map((ally) => ally.id), ["201"]);
});

test("classifyVillage marks protected relations before generic targets", () => {
  const context = {
    currentPlayer: { id: "1", ally: "100" },
    relations: {
      allyRelations: { 300: "partner", 400: "nap" },
      friends: { 50: true },
      non_attackable_players: { 60: true },
    },
  };

  assert.equal(classifyVillage({ playerId: "0" }, context), "barbarian");
  assert.equal(classifyVillage({ playerId: "1", player: { allyId: "100" } }, context), "own");
  assert.equal(classifyVillage({ playerId: "20", player: { allyId: "100" } }, context), "same_ally");
  assert.equal(classifyVillage({ playerId: "30", player: { allyId: "300" } }, context), "partner");
  assert.equal(classifyVillage({ playerId: "40", player: { allyId: "400" } }, context), "nap");
  assert.equal(classifyVillage({ playerId: "50", player: { allyId: "500" } }, context), "friend");
  assert.equal(classifyVillage({ playerId: "60", player: { allyId: "600" } }, context), "non_attackable");
  assert.equal(classifyVillage({ playerId: "70", player: { allyId: "700" } }, context), "enemy");
  assert.equal(classifyVillage({ playerId: "80", player: { allyId: "0" } }, context), "neutral");
});

test("buildBookmarklet serializes a ready SafeFakes loader", () => {
  const state = normalizeBuilderState({
    coords: ["500|501"],
    target_weights: { coords: { "500|501": 3 } },
  });
  const bookmarklet = buildBookmarklet(
    buildSafeFakesConfig(state),
    "https://example.test/SafeFakes.js",
  );

  assert.match(bookmarklet, /^javascript:window\.SafeFakes=/);
  assert.match(bookmarklet, /"coords":"500\|501"/);
  assert.match(bookmarklet, /"target_weights":\{"players":\{\},"allies":\{\},"coords":\{"500\|501":3\}\}/);
  assert.match(bookmarklet, /\$\.getScript\("https:\/\/example\.test\/SafeFakes\.js"\);void 0;$/);
});

test("buildBookmarklet defaults to the public jsDelivr SafeFakes URL", () => {
  const bookmarklet = buildBookmarklet(buildSafeFakesConfig(createBuilderState()));

  assert.match(
    bookmarklet,
    /\$\.getScript\("https:\/\/cdn\.jsdelivr\.net\/gh\/BartoszWiszniewski\/safe-fakes\/SafeFakes\.js"\);void 0;$/,
  );
});

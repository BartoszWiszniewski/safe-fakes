const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createBuilderState,
  normalizeBuilderState,
  applyVillageAction,
  classifyVillage,
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

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseCoords,
  parseWorld,
  buildCandidateCoords,
  selectSafeTargets,
  chooseTarget,
  getServerTime,
  filterByArrivalTime,
  formatMessage,
} = require("../SafeFakes");

const world = {
  villagesByCoord: new Map([
    ["480|491", { x: 480, y: 491, playerId: "10", points: 1200 }],
    ["481|491", { x: 481, y: 491, playerId: "0", points: 300 }],
    ["482|491", { x: 482, y: 491, playerId: "11", points: 9000 }],
    ["483|491", { x: 483, y: 491, playerId: "12", points: 7000 }],
    ["484|491", { x: 484, y: 491, playerId: "13", points: 8000 }],
    ["485|491", { x: 485, y: 491, playerId: "14", points: 6000 }],
    ["486|491", { x: 486, y: 491, playerId: "15", points: 4000 }],
  ]),
  playersById: new Map([
    ["10", { id: "10", name: "Enemy", allyId: "200" }],
    ["11", { id: "11", name: "Me", allyId: "100" }],
    ["12", { id: "12", name: "AllyMember", allyId: "100" }],
    ["13", { id: "13", name: "NapPlayer", allyId: "300" }],
    ["14", { id: "14", name: "PartnerPlayer", allyId: "400" }],
    ["15", { id: "15", name: "FriendPlayer", allyId: "500" }],
  ]),
  alliesById: new Map([
    ["100", { id: "100", tag: "MY" }],
    ["200", { id: "200", tag: "ENM" }],
    ["300", { id: "300", tag: "NAP" }],
    ["400", { id: "400", tag: "ALLY" }],
    ["500", { id: "500", tag: "FR" }],
  ]),
};

test("parseCoords extracts village coords and repeats entries with :count", () => {
  assert.deepEqual(parseCoords("Village (480|491) K44, 481|491:2"), [
    { x: 480, y: 491 },
    { x: 481, y: 491 },
    { x: 481, y: 491 },
  ]);
});

test("parseWorld reads village points from map files", () => {
  const parsed = parseWorld("1,Village,480,491,10,1234\n", "10,Enemy,200\n", "200,Enemies,ENM\n");

  assert.equal(parsed.villagesByCoord.get("480|491").points, 1234);
});

test("selectSafeTargets keeps only targets without protected relations", () => {
  const result = selectSafeTargets({
    coords: parseCoords("480|491 481|491 482|491 483|491 484|491 485|491 486|491 499|499"),
    world,
    relations: {
      allyRelations: {
        300: "nap",
        400: "partner",
      },
      friends: {
        15: true,
      },
      non_attackable_players: [],
    },
    currentPlayer: {
      id: "11",
      ally: "100",
    },
  });

  assert.deepEqual(result.accepted.map((target) => `${target.x}|${target.y}`), ["480|491"]);
  assert.deepEqual(result.rejected.map((target) => target.reason), [
    "barbarian",
    "own",
    "same_ally",
    "nap",
    "partner",
    "friend",
    "missing_village",
  ]);
});

test("selectSafeTargets rejects villages below min_points", () => {
  const result = selectSafeTargets({
    coords: parseCoords("480|491"),
    world,
    relations: { allyRelations: {}, friends: {}, non_attackable_players: [] },
    currentPlayer: { id: "11", ally: "100" },
    minPoints: 1500,
  });

  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].reason, "not_enough_points");
});

test("buildCandidateCoords merges coords, players, and tribes", () => {
  const result = buildCandidateCoords({
    config: {
      coords: "499|499",
      players: "Enemy",
      player_ids: "",
      allies: "",
      ally_tags: "ENM",
      ally_ids: "",
    },
    world,
  });

  assert.deepEqual(result.map((target) => `${target.x}|${target.y}`), ["499|499", "480|491"]);
});

test("chooseTarget can randomize by player or ally first", () => {
  const targets = [
    { x: 480, y: 491, village: { playerId: "10" }, player: { allyId: "200" } },
    { x: 481, y: 491, village: { playerId: "10" }, player: { allyId: "200" } },
    { x: 482, y: 491, village: { playerId: "20" }, player: { allyId: "200" } },
    { x: 483, y: 491, village: { playerId: "30" }, player: { allyId: "300" } },
  ];

  assert.equal(chooseTarget(targets, { random_target: true, random_target_by: "player" }, () => 0.80).village.playerId, "30");
  assert.equal(chooseTarget(targets, { random_target: true, random_target_by: "ally" }, () => 0.80).player.allyId, "300");
  assert.equal(chooseTarget(targets, { random_target: false, random_target_by: "player" }, () => 0.80).x, 480);
});

test("filterByArrivalTime calculates arrival from the provided base time", () => {
  const result = filterByArrivalTime(
    [{ x: 1, y: 0 }],
    { ram: 1 },
    { ram: { speed: "30" } },
    { village: { x: 0, y: 0 } },
    { night: { active: "0" } },
    { date_ranges: ["02.07.2026 12:29 - 02.07.2026 12:31"], skip_night_bonus: true },
    new Date(2026, 6, 2, 12, 0),
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].arrival.getHours(), 12);
  assert.equal(result[0].arrival.getMinutes(), 30);
});

test("getServerTime reads server date and time from DOM", () => {
  const documentRef = {
    querySelector(selector) {
      if (selector === "#serverDate") return { textContent: "02.07.2026" };
      if (selector === "#serverTime") return { textContent: "12:34:56" };
      return null;
    },
  };

  assert.equal(getServerTime(documentRef).getTime(), new Date(2026, 6, 2, 12, 34, 56).getTime());
});

test("formatMessage supports configured message overrides and placeholders", () => {
  assert.equal(
    formatMessage(
      { messages: { selected_target: "Wybrano {target} dla {player}" } },
      "selected_target",
      { target: "480|491", player: "Enemy" },
    ),
    "Wybrano 480|491 dla Enemy",
  );

  assert.equal(
    formatMessage({ messages: {} }, "no_targets", {}),
    "No targets. Set coords, players/player_ids, or allies/ally_tags/ally_ids.",
  );
});

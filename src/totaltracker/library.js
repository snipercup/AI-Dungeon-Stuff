// Strip single- or double-quoted segments (simple, non-nested)
function _stripQuotedSegments(t) {
  return t.replace(/"[^"]*"|'[^']*'/g, "");
}


// Detect movement, ignoring quoted text, but allowing verb + quoted place
function didMove(aiText) {
  if (!aiText || typeof aiText !== "string") return false;
  const t = aiText.toLowerCase();
  const unq = _stripQuotedSegments(t); // text with quotes removed

  // Motion verbs only (no generic prepositions)
  const MOTION_TOKENS = new RegExp(
    "\\b(?:" + [
      "enter","entered","enters",
      "leave","left","leaves",
      "exit","exited","exits",
      "go","goes","going","went",
      "walk","walked","walking",
      "step","stepped","steps",
      "head","headed","heads",
      "move","moved","moves",
      "travel","traveled","travels","traveling",           // ← NEW
      "proceed","proceeded","proceeds",
      "approach","approached","approaches",
      "near","nearing",
      "arrive","arrived","arrives",
      "return","returned","returns",
      "continue","continued","continues","continuing"      // ← NEW
    ].join("|") + ")\\b",
    "i"
  );

  // Macro location targets
  const LOCATION_TARGETS = /\b(gate|gates|street|streets|alley|alleyway|plaza|square|district|market|city|outside|inside|hallway|main hall|office|guild|inn|tavern|shop|building|house|home|doorway|threshold|road|path|trail|tunnel|cavern|chamber|sewer|crypt|catacombs?|manor|estate|grounds|foyer|entrance|village hall|waystation|border post|horizon)\b/; // ← added waystation, border post, horizon

  // High-confidence macro transitions (evaluated on unquoted text)
  const MACRO_PATTERNS = [
    /\b(through the (?:city )?gates|city gates? (?:stand )?(?:open|ajar)|to the (?:west|east|north|south) gate)\b/,
    /\b(out\s+into|out\s+onto|back\s+to|down\s+the|along\s+the|into\s+the)\s+(street|road|alley|hallway|main hall|plaza|square|tunnel|cavern|chamber|sewer|foyer|entrance|village hall)\b/,
    /\b(step(?:s|ped)?\s+outside|step(?:s|ped)?\s+inside)\b/,
    /\b(enter(?:ed|s)?|leave|left|exit(?:ed)?)\s+(?:the\s+)?(city|office|guild|inn|tavern|shop|building|house|home|tunnel|cavern|chamber|sewer|crypt|manor|estate|foyer|village hall)\b/,
    /\b(through|along)\s+the\s+(street|streets|alley|alleyway)\b/,
    /\bback\s+to\s+(scale haven)\b/,
    /\broad\b.*\b(winds?|curv(?:e|es|ing)|bends?)\b/,                 // ← enhanced: curving/bending
    /\b(as you )?near(?:ing)?\s+(?:the\s+)?(estate|manor|entrance)\b/,
    /\blooms?\s+ahead\b/,

    // NEW: explicit approach/progress cues
    /\bwaystation\b.*\b(recedes|falls away|fades)\b/,
    /\b(continue|continuing|continued)\s+(eastward|westward|northward|southward)\b/,
    /\b(towers?|border post)\s+(?:appear|looms?)\s+(?:on\s+)?the\s+horizon\b/
  ];

  // SPECIAL CASE: verb outside quotes + quoted place name → movement
  const VERB_PLUS_QUOTED_PLACE = /\b(enter|go|head|walk|step|proceed|return|arrive|travel)\b[^"']{0,40}["'][^"']+["']/.test(t);

  const hasMotionVerbUnquoted = MOTION_TOKENS.test(unq);
  const hasMacroTransitionUnquoted = MACRO_PATTERNS.some((re) => re.test(unq));
  if (!hasMotionVerbUnquoted && !hasMacroTransitionUnquoted && !VERB_PLUS_QUOTED_PLACE) return false;

  if (hasMacroTransitionUnquoted) return true;
  if (VERB_PLUS_QUOTED_PLACE) return true;

  // Otherwise require verb + macro location target *outside quotes*
  return hasMotionVerbUnquoted && LOCATION_TARGETS.test(unq);
}

function detectArea(aiText) {
  if (!aiText || typeof aiText !== "string") return "unknown: invalid input";
  const raw = aiText.toLowerCase();

  // Ignore quoted dialogue for area scoring
  const text = _stripQuotedSegments(raw);

  const rx = (pat, flags = "gi") =>
    pat instanceof RegExp ? new RegExp(pat.source, flags) : new RegExp(pat, flags);

  const PHRASES = {
    city: [
      { re: rx(/\b(city gates?)\b/), weight: 9 },
      { re: rx(/\b(guards?\s+at\s+the\s+gates?)\b/), weight: 9 },
      { re: rx(/\b(through the (?:city )?gates)\b/), weight: 8 },
      { re: rx(/\b(city gates? (?:stand )?(?:open|ajar))\b/), weight: 9 },
      { re: rx(/\b(inside (?:the )?city)\b/), weight: 8 },

      // ⭐ Strong street/commerce cues
      { re: rx(/\bstreets?\s+of\s+[a-z']+/), weight: 10 },                 // "streets of Thornmere"
      { re: rx(/\bmerchants?\s+hawking\s+wares?\b/), weight: 10 },
      { re: rx(/\bwooden\s+stalls?\b/), weight: 9 },
      { re: rx(/\bshops?\b/), weight: 8 },
      { re: rx(/\bworkshops?\b/), weight: 8 },
      { re: rx(/\bcraftsmen\b/), weight: 7 },

      // ⭐ Tavern/inn entry & interior
      { re: rx(/\b(inn|tavern)\b.*\b(open doors|welcomes?\s+travelers?)\b/), weight: 10 },
      { re: rx(/\bthe\s+thorne?\s*&\s*vine\b/), weight: 9 },               // specific name helps
      { re: rx(/\binside,\s*warm\s+lantern\s+light\b/), weight: 9 },
      { re: rx(/\bwooden\s+tables?\b/), weight: 7 },
      { re: rx(/\bpatrons?\b/), weight: 7 },
      { re: rx(/\b(mugs?\s+of\s+ale|roasting\s+meat|plates?\s+of\s+steaming\s+food)\b/), weight: 8 },

      // Urban public space (kept)
      { re: rx(/\b(cobbled streets?|market square|plaza|district|alley|alleyway)\b/), weight: 7 },
    ],

    road: [
      { re: rx(/\b(on|along|back|down)\s+the\s+road(s)?\b/), weight: 6 },
      { re: rx(/\b(path|trail|highway|roadside)\b/), weight: 5 },
      { re: rx(/\bking'?s road\b/), weight: 8 },
      { re: rx(/\broad (?:back )?to\b/), weight: 7 },
      { re: rx(/\b(bustle of [a-z' ]+ fading (?:behind|away))\b/), weight: 7 },
      { re: rx(/\b(near|nearing|approach(?:ing)?)\s+(?:the\s+)?(gate|gates|city)\b/), weight: 8 },
    ],

    underground: [
      { re: rx(/\b(?:underground )?(?:chamber|tunnel|cavern|catacombs?|crypt|sewer)\b/), weight: 8 },
      { re: rx(/\bdescend(?:ing|s|ed)?|downward\s+slope\b/), weight: 7 },
      { re: rx(/\bdarkness|blackness\b/), weight: 6 },
      { re: rx(/\borb of (?:divine )?light|divine light|recess(es)?\b/), weight: 4 },
    ],

    wilderness: [
      // keep scenery terms but they won’t dominate over strong city cues
      { re: rx(/\b(ruins?|forest|trees?|glade|clearing|meadow|riverbank|marsh|swamp|hills?|mountains?|desert|canyon|wilds?|shrub|wildflowers?|woods?)\b/), weight: 5 },
      { re: rx(/\b(open air|nature has (overtaken|reclaimed))\b/), weight: 5 },
    ],
  };

  const WORDS = {
    city: [
      { re: rx(/\bcity\b/), weight: 4 },
      { re: rx(/\bstreet(s)?\b/), weight: 5 },
      { re: rx(/\bshop(s)?|stall(s)?|workshop(s)?|merchant(s)?\b/), weight: 5 },
      { re: rx(/\binn|tavern|lantern|patrons?\b/), weight: 5 },
    ],
    road: [
      { re: rx(/\broad(s)?\b/), weight: 4 },
      { re: rx(/\bpath|trail\b/), weight: 3 },
    ],
    underground: [
      { re: rx(/\btunnel(s)?|cavern(s)?|sewer(s)?|crypt(s)?|catacomb(s)?\b/), weight: 6 },
      { re: rx(/\bdark(ness)?\b/), weight: 4 },
    ],
    wilderness: [
      { re: rx(/\bforest(s)?|tree(s)?|ruin(s)?|meadow(s)?|hill(s)?|woods?\b/), weight: 4 },
    ],
  };

  function scoreCategory(category) {
    const patterns = [...PHRASES[category], ...WORDS[category]];
    let best = { weight: 0, index: -1 };
    for (const { re, weight } of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const idx = m.index;
        if (weight > best.weight || (weight === best.weight && idx > best.index)) {
          best = { weight, index: idx };
        }
        if (re.lastIndex === idx) re.lastIndex++;
      }
    }
    return best;
  }

  const cats = ["underground", "city", "road", "wilderness"];
  const results = cats.map((c) => ({ c, ...scoreCategory(c) }));

  // 🧭 Conflict resolver: if city street/shop/tavern cues appear with nature scenery, bias to city
  const hasCityCommerce =
    /\b(streets?\s+of\s+[a-z']+|merchants?\s+hawking\s+wares?|wooden\s+stalls?|shops?|workshops?|craftsmen|inn|tavern|lantern|patrons?)\b/.test(text);
  const hasNatureScenery =
    /\b(forest|trees?|meadow|meadows|hills?|wildflowers?|woods?)\b/.test(text);

  if (hasCityCommerce && hasNatureScenery) {
    const c = results.find(r => r.c === "city");
    const w = results.find(r => r.c === "wilderness");
    if (c) c.weight += 4;
    if (w) w.weight -= 3;
  }

  // Additional nudge: “inside” + tavern/inn → city interior
  if (/\binside\b/.test(text) && /\b(tavern|inn)\b/.test(text)) {
    const c = results.find(r => r.c === "city");
    if (c) c.weight += 3;
  }

  results.sort((a, b) => (b.weight - a.weight) || (b.index - a.index));
  return results[0].weight > 0 ? results[0].c : "unknown: no cues";
}

// Helper: extract only the player's DO text from state.inputtext (exclude SAY actions)
function getPlayerDoText() {
  if (!state || typeof state.inputtext !== "string") return "";
  const isPromptLine = /^\s*>\s*/;
  const isSay = /^\s*>\s*you say\s*"/i;

  const doLines = state.inputtext
    .split(/\r?\n/)
    .filter(line => isPromptLine.test(line) && !isSay.test(line))
    .map(line => line.replace(/^\s*>\s*/, "").trim())
    .filter(Boolean);

  return doLines.join(" ");
}

// Describe how much time the player spends in an area based on percentages
function describeAreaShare(area) {
  if (!state.areaTurns || !state.totalTurns) return "no data yet";
  const count = state.areaTurns[area] || 0;
  const total = state.totalTurns || 1;
  const pct = (count / total) * 100;

  if (pct >= 55) return "most of your time";
  if (pct >= 35) return "a moderate amount of your time";
  if (pct >= 15) return "some of your time";
  return "very little of your time";
}

function classifyTurn(aiText) {
  // Ensure global state
  if (typeof globalThis.state !== "object" || !globalThis.state) globalThis.state = {};
  if (!("currentArea" in state)) state.currentArea = "unknown";
  if (!("previousArea" in state)) state.previousArea = null;
  if (!Array.isArray(state.cityNames)) state.cityNames = ["lavender"];
  if (typeof state.totalTurns !== "number") state.totalTurns = 0;
  if (!state.areaTurns) {
    state.areaTurns = { city: 0, road: 0, underground: 0, wilderness: 0, unknown: 0 };
  } else {
    for (const k of ["city","road","underground","wilderness","unknown"]) {
      if (typeof state.areaTurns[k] !== "number") state.areaTurns[k] = 0;
    }
  }

  if (!aiText || typeof aiText !== "string") return "unknown: invalid input";

  // ❌ Choice prompt: short-circuit immediately
  if (aiText.trim().toLowerCase().startsWith(">>> please select")) {
    return "unknown: invalid input";
  }

  // Combine AI text + player's DO action text
  const playerDo = getPlayerDoText();
  const combined = playerDo ? (aiText + "\n" + playerDo) : aiText;

  const moved = didMove(combined);
  const detected = detectArea(combined);

  const classification = detected.startsWith("unknown")
    ? (state.currentArea || state.previousArea || detected)
    : detected;

  if (moved && !classification.startsWith("unknown") && classification !== state.currentArea) {
    state.previousArea = state.currentArea;
    state.currentArea = classification;
  }

  let areaToCredit = state.currentArea && state.currentArea !== "unknown"
    ? state.currentArea
    : (!classification.startsWith("unknown") ? classification : "unknown");

  state.areaTurns[areaToCredit] = (state.areaTurns[areaToCredit] || 0) + 1;
  state.totalTurns += 1;

  const share = describeAreaShare(areaToCredit);
  state.currentscene = `current scene: you are in the ${areaToCredit}, where you spend ${share}.`;

  const cardHit = findFirstCardInPlayerDo(playerDo);

  log(
    `Detected area: ${detected}, Movement: ${moved}, Final classification: ${classification}` +
    (playerDo ? `, Player DO: ${JSON.stringify(playerDo)}` : `, Player DO: <none>`) +
    `. Time so far — city:${state.areaTurns.city}, road:${state.areaTurns.road}, underground:${state.areaTurns.underground}, wilderness:${state.areaTurns.wilderness}, total:${state.totalTurns}. Summary: the player is currently in "${areaToCredit}", a place where they spend ${share}.` +
    ` Card mention: ${cardHit ? cardHit.title : "<none>"}`
  );

  return classification;
}

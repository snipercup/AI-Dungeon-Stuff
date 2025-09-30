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
      "travel","traveled","travels",
      "proceed","proceeded","proceeds",
      "approach","approached","approaches",
      "near","nearing",
      "arrive","arrived","arrives",
      "return","returned","returns"
    ].join("|") + ")\\b",
    "i"
  );

  // Macro location targets
  const LOCATION_TARGETS = /\b(gate|gates|street|streets|alley|alleyway|plaza|square|district|market|city|outside|inside|hallway|main hall|office|guild|inn|tavern|shop|building|house|home|doorway|threshold|road|path|trail|tunnel|cavern|chamber|sewer|crypt|catacombs?|manor|estate|grounds|foyer|entrance|village hall)\b/;

  // High-confidence macro transitions (evaluated on unquoted text)
  const MACRO_PATTERNS = [
    /\b(through the (?:city )?gates|city gates? (?:stand )?(?:open|ajar)|to the (?:west|east|north|south) gate)\b/,
    /\b(out\s+into|out\s+onto|back\s+to|down\s+the|along\s+the|into\s+the)\s+(street|road|alley|hallway|main hall|plaza|square|tunnel|cavern|chamber|sewer|foyer|entrance|village hall)\b/,
    /\b(step(?:s|ped)?\s+outside|step(?:s|ped)?\s+inside)\b/,
    /\b(enter(?:ed|s)?|leave|left|exit(?:ed)?)\s+(?:the\s+)?(city|office|guild|inn|tavern|shop|building|house|home|tunnel|cavern|chamber|sewer|crypt|manor|estate|foyer|village hall)\b/,
    /\b(through|along)\s+the\s+(street|streets|alley|alleyway)\b/,
    /\bback\s+to\s+(scale haven)\b/,
    /\broad\b.*\bwinds?\b/,
    /\b(as you )?near(?:ing)?\s+(?:the\s+)?(estate|manor|entrance)\b/,
    /\blooms?\s+ahead\b/
  ];

  // SPECIAL CASE: verb outside quotes + quoted place name → movement
  // e.g., 'you head to "Weathered Duckling"' or 'enter "The Tangled Skein"'
  const VERB_PLUS_QUOTED_PLACE = /\b(enter|go|head|walk|step|proceed|return|arrive)\b[^"']{0,40}["'][^"']+["']/.test(t);

  // 1) If no motion verbs in UNQUOTED text and no special case and no macro transition → no movement
  const hasMotionVerbUnquoted = MOTION_TOKENS.test(unq);
  const hasMacroTransitionUnquoted = MACRO_PATTERNS.some((re) => re.test(unq));
  if (!hasMotionVerbUnquoted && !hasMacroTransitionUnquoted && !VERB_PLUS_QUOTED_PLACE) return false;

  // 2) Macro transition outside quotes → movement
  if (hasMacroTransitionUnquoted) return true;

  // 3) Special case: verb + quoted place → movement
  if (VERB_PLUS_QUOTED_PLACE) return true;

  // 4) Otherwise require verb + macro location target *outside quotes*
  return hasMotionVerbUnquoted && LOCATION_TARGETS.test(unq);
}
function detectArea(aiText) {
  if (!aiText || typeof aiText !== "string") return "unknown: invalid input";
  const text = aiText.toLowerCase();
  const rx = (pat, flags = "gi") =>
    pat instanceof RegExp ? new RegExp(pat.source, flags) : new RegExp(pat, flags);

  const PHRASES = {
    city: [
      // City/urban entry & structures
      { re: rx(/\b(city gates?)\b/), weight: 7 },
      { re: rx(/\b(guards? at the gates?)\b/), weight: 7 },
      { re: rx(/\b(city gates? (?:stand )?(?:open|ajar))\b/), weight: 9 },
      { re: rx(/\b(through the (?:city )?gates)\b/), weight: 8 },
      { re: rx(/\b(inside (?:the )?city)\b/), weight: 8 },
      { re: rx(/\b(cobbled streets?|market square|plaza|district|alley|alleyway)\b/), weight: 7 },

      // ⭐ Village / town treated as "city"
      { re: rx(/\b(enter(?:ed|s)?|step(?:s|ped)?\s+into)\s+(?:the\s+)?(village|village square|village hall|town square)\b/), weight: 10 },
      { re: rx(/\b(village|hamlet|small town|settlement)\b/), weight: 7 },
      { re: rx(/\b(village\s+square|village\s+hall|town\s+square|meeting\s+hall)\b/), weight: 9 },
      { re: rx(/\b(village\s+elder|elder\b.*\b(village|hall)|council\s*elder)\b/), weight: 8 },

      // Common village-scene tokens (mild)
      { re: rx(/\b(blacksmith|bellows)\b/), weight: 6 },
      { re: rx(/\b(herbs?|chickens?)\b/), weight: 5 },
      { re: rx(/\b(gardens?|doorways?\s+with\s+flowers)\b/), weight: 5 },

      // Guild / civic / interiors
      { re: rx(/\b(adventurer'?s guild|guild hall|main hall|hallway|front desk|counter)\b/), weight: 7 },
      { re: rx(/\b(office|private office|council chamber|study|archives?|records (?:room|office))\b/), weight: 8 },

      // Home/shop interiors
      { re: rx(/\b(front door|shutters?|room|oak (?:cabinet|desk)|cabinet|wardrobe|shelf|counter|cupboard|desk|incense|shuttered windows?)\b/), weight: 8 },
      { re: rx(/\b(table|tabletop|teapot|tea|bread|plate|purse|coins?)\b/), weight: 6 },
      { re: rx(/\b(home|house|apartment|sanctuary|lodgings?)\b/), weight: 7 },

      // Neighborhood/home anchors
      { re: rx(/\b(in|inside|within)\s+(?:the\s+)?[a-z]+(?:'s)?\s+(alley|quarter|ward|market)\b/), weight: 8 },
      { re: rx(/\b(scale haven)\b/), weight: 8 },
    ],

    road: [
      { re: rx(/\b(on|along|back|down)\s+the\s+road(s)?\b/), weight: 6 },
      { re: rx(/\b(path|trail|highway|roadside)\b/), weight: 5 },
      { re: rx(/\bking'?s road\b/), weight: 8 },
      { re: rx(/\broad (?:back )?to\b/), weight: 7 },
      { re: rx(/\b(bustle of [a-z' ]+ fading (?:behind|away))\b/), weight: 7 },
      { re: rx(/\broad\b.*\bwinds?\b/), weight: 9 },
      { re: rx(/\bpath\b.*\b(uneven|cracked)\b/), weight: 8 },
      { re: rx(/\b(manor|estate)\s+grounds\b/), weight: 7 },
      { re: rx(/\b(as you )?near(?:ing)?\s+(?:the\s+)?(estate|manor)\b/), weight: 8 },
      { re: rx(/\blooms?\s+ahead\b/), weight: 7 },
      { re: rx(/\bovergrown\b.*\b(lavender|hedges?)\b/), weight: 6 },
    ],

    underground: [
      { re: rx(/\b(?:underground )?(?:chamber|tunnel|cavern|catacombs?|crypt|sewer)\b/), weight: 8 },
      { re: rx(/\bdescend(?:ing|s|ed)?|downward\s+slope\b/), weight: 7 },
      { re: rx(/\bdarkness|blackness\b/), weight: 6 },
      { re: rx(/\borb of (?:divine )?light|divine light|recess(es)?\b/), weight: 4 },
    ],

    wilderness: [
      // 'brush' intentionally removed to avoid hair-brush collisions
      { re: rx(/\b(ruins?|forest|trees?|glade|clearing|meadow|riverbank|marsh|swamp|hills?|mountains?|desert|canyon|wilds?|shrub)\b/), weight: 5 },
      { re: rx(/\b(abandoned structure|stone foundations?|old mill|mill race)\b/), weight: 4 },
      { re: rx(/\b(open air|nature has (overtaken|reclaimed))\b/), weight: 5 },
    ],
  };

  const WORDS = {
    city: [
      { re: rx(/\bcity\b/), weight: 4 },
      { re: rx(/\bvillage|hamlet|town|settlement\b/), weight: 6 },              // NEW
      { re: rx(/\bvillage\s+square|village\s+hall|town\s+square\b/), weight: 7 }, // NEW
      { re: rx(/\belder\b/), weight: 5 },                                        // NEW (contextual civic role)
      { re: rx(/\bstreet(s)?|alley|alleyway|plaza|market\b/), weight: 4 },
      { re: rx(/\bshop|inn|tavern|hall|hallway|office|home|house\b/), weight: 5 },
      { re: rx(/\bblacksmith|bellows|herbs?|chickens?|gardens?\b/), weight: 4 }, // light reinforcement
    ],
    road: [
      { re: rx(/\broad(s)?\b/), weight: 4 },
      { re: rx(/\bpath|trail\b/), weight: 3 },
      { re: rx(/\bmanor|estate|grounds\b/), weight: 3 },
    ],
    underground: [
      { re: rx(/\btunnel(s)?|cavern(s)?|sewer(s)?|crypt(s)?|catacomb(s)?\b/), weight: 6 },
      { re: rx(/\bdark(ness)?\b/), weight: 4 },
    ],
    wilderness: [
      { re: rx(/\bforest(s)?|tree(s)?|ruin(s)?\b/), weight: 4 },
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
  const results = cats.map((c) => ({ c, ...scoreCategory(c) }))
                      .sort((a, b) => (b.weight - a.weight) || (b.index - a.index));

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

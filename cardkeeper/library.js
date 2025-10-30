//Put this in your shared library card in your adventure (make sure LSIv2 is enabled in the configure autocards story card)

//An array of functions that operate on a single card
let processorRegistry = [];
// An array of functions that operate on the entire tracked map periodically
let scheduledProcessorRegistry = [];

///////////////////////////////////
///////// Main functions //////////
///////////////////////////////////
//Main function to tie the other functions together.
function cardKeeper() {
  // 🟡 Step 1: Get or create the keeper card
  const keeperCard = getOrCreateKeeperCard();
  if (!keeperCard) return null;

  // 🟠 Step 2: Get matching cards
  const matchingCards = getMatchingCards();

  // 🟢 Step 3: Load the tracked object once
  let tracked = parseTrackedCards(keeperCard);

  // 🔵 Step 4: Update tracked cards based on matches
  tracked = runCardProcessors(tracked, matchingCards);

  // 🔶 Step 5: Run scheduled processors
  for (const scheduled of scheduledProcessorRegistry) {
    tracked = runScheduledProcessor(scheduled, tracked) || tracked;
  }

  // 📝 Step 6: Write updated tracking back to the card
  keeperCard.description = JSON.stringify(tracked, null, 2);
  log("Saved updated tracked map to keeperCard.description");

  // 🔴 Step 7: Return matching cards
  return matchingCards;
}

//Create the actual keeper card to keep track of card data
function getOrCreateKeeperCard() {
  let keeperCard = AutoCards().API.getCard(card => card.title === "cardKeeper");

  if (!keeperCard) {
    log('cardKeeper card not found. Creating it now...');
    keeperCard = AutoCards().API.buildCard({
      title: "cardKeeper",
      entry: "",
      type: "class",
      keys: "",
      description: ""
    });

    if (keeperCard) {
      log('cardKeeper card successfully created:', keeperCard);
    } else {
      log('Failed to create cardKeeper card.');
    }
  }
  return keeperCard;
}

//Wrapper for the autocards api call to return matching cards that are triggered
function getMatchingCards() {
  const matches = AutoCards().API.getCard(checkCardTrigger, true);
  if (Array.isArray(matches)) {
    log("Matching cards found:", matches.length);
    return matches;
  } else {
    log("No matching cards found");
    return [];
  }
}

//Parse the contents of the keepercard to manipulate it
function parseTrackedCards(card) {
  try {
    const tracked = JSON.parse(card.description || '{}');
    if (typeof tracked === 'object' && tracked !== null) {
      return tracked;
    }
  } catch (err) {
    log("Invalid JSON in keeperCard.description, resetting.");
  }
  return {};
}

//Returns true if the text variable contains any of the triggers
//The value of text depends on if it's run in the input, context or output modifier card
//The script expect it is run in the output modifier card
function checkCardTrigger(card) {
  if (!card?.keys || typeof card.keys !== "string") {
    log("Invalid or missing card.keys");
    return false;
  }

  const keywords = card.keys
    .split(",")
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  const normalizedText = text?.toLowerCase() || "";

  for (const key of keywords) {
    if (normalizedText.includes(key)) {
      log(`Match found: "${key}" is in text`);
      return true;
    }
  }
  return false;
}

//If any functions are in `processorRegistry`, run them against the card that was triggered
function runCardProcessors(tracked, matchingCards) {
  if (Array.isArray(matchingCards)) {
    for (const match of matchingCards) {
      const title = match.title;
      log(`Evaluating matched card: "${title}"`);

      const trackedEntry = createOrGetTrackedEntry(title, tracked);

      const processors = processorRegistry;
      log("Processor functions available:", processors.length);

      for (const fn of processors) {
        try {
          log(`Running processor "${fn.name || 'anonymous'}" on tracked card "${title}"`);
          fn(trackedEntry);
        } catch (err) {
          log(`Processor function "${fn.name || 'anonymous'}" failed for card "${title}":`, err);
        }
      }
    }
  } else {
    log("matchingCards is not an array — skipping tracking");
  }

  return tracked;
}

//See if any functions are in the `scheduledProcessorRegistry`
//Each time the current turn number is divisible by the `every` property, run the function
//The function runs against all card tracker objects in the keepercard.
function runScheduledProcessor(scheduleObj, tracked) {
  const turn = getTurn();

  if (!scheduleObj || typeof scheduleObj.fn !== 'function' || typeof scheduleObj.every !== 'number') {
    log("Invalid scheduled processor object:", scheduleObj);
    return tracked;
  }

  log(`Checking scheduled processor "${scheduleObj.fn.name || 'anonymous'}" on turn ${turn}`);

  if (turn % scheduleObj.every === 0) {
    try {
      log(`Running scheduled processor "${scheduleObj.fn.name || 'anonymous'}" (every ${scheduleObj.every} turns)`);
      const result = scheduleObj.fn(tracked);
      return result || tracked;
    } catch (err) {
      log(`Scheduled processor "${scheduleObj.fn.name || 'anonymous'}" failed:`, err);
      return tracked;
    }
  } else {
    log(`Skipping scheduled processor — not on cycle (every ${scheduleObj.every} turns)`);
    return tracked;
  }
}

//////////////////////////////////////
///////// Support functions //////////
//////////////////////////////////////
//Thanks lewdleah. Gets the current amount of turns.
function getTurn() {
    if (Number.isInteger(info?.actionCount)) {
        return Math.abs(info.actionCount);
    } else {
        return 0;
    }
}

//Creates an empty object for a tracked card if none exists
function createOrGetTrackedEntry(title, trackedMap) {
  if (!trackedMap.hasOwnProperty(title)) {
    log(`"${title}" is a new match — adding to tracked`);
    trackedMap[title] = {};
  } else {
    log(`"${title}" is already tracked`);
  }

  return trackedMap[title];
}

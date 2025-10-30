//Put this code in the output modifier story card in your adventure (make sure LSIv2 is enabled in autocards)

//Simply counts the number of times a card was triggered
function incrementTriggerCount(cardObj) {
  if (typeof cardObj === 'object' && cardObj !== null) {
    if (typeof cardObj.triggercount === 'number') {
      cardObj.triggercount++;
      log("Trigger count incremented:", cardObj.triggercount);
    } else {
      cardObj.triggercount = 1;
      log("Trigger count initialized to 1");
    }
  }
}

//Registers at what turn the card was last triggered
function updateLastTurn(cardObj) {
  if (typeof cardObj === 'object' && cardObj !== null) {
    const turn = getTurn();
    if (typeof turn === 'number' && turn >= 0) {
      cardObj.lastturn = turn;
      log("Updated lastturn to:", turn);
    } else {
      log("Invalid turn value from getturn():", turn);
    }
  }
}

//Cleanup empty card registries
function markEmptyTrackedCards(tracked) {
  if (typeof tracked !== 'object' || tracked === null) {
    log("Invalid tracked object — skipping markEmptyTrackedCards");
    return tracked;
  }

  let modifiedCount = 0;

  for (const title in tracked) {
    const cardObj = tracked[title];
    if (typeof cardObj === 'object' && cardObj !== null) {
      const keys = Object.keys(cardObj);

      if (keys.length === 0) {
        tracked[title] = { removetracking: true };
        log(`Marked "${title}" for removal — it was empty`);
        modifiedCount++;
      }
    }
  }

  log(`markEmptyTrackedCards completed — marked ${modifiedCount} entr${modifiedCount === 1 ? 'y' : 'ies'}`);
  return tracked;
}

//Check if cards still exist if they haven't been triggered in over 100 turns
//If they haven't been triggered, mark them for deletion
function removeStaleTrackedCards(tracked) {
  if (typeof tracked !== 'object' || tracked === null) {
    log("Invalid tracked object — skipping removeStaleTrackedCards");
    return tracked;
  }

  const currentTurn = getTurn();
  let initializedCount = 0;
  let staleChecked = 0;
  let removedCount = 0;
  const removedTitles = [];

  for (const title in tracked) {
    const cardObj = tracked[title];

    if (typeof cardObj !== 'object' || cardObj === null) continue;

    // Initialize lastturn if missing
    if (typeof cardObj.lastturn !== 'number') {
      cardObj.lastturn = currentTurn;
      initializedCount++;
      continue;
    }

    const diff = currentTurn - cardObj.lastturn;

    if (diff > 100) {
      staleChecked++;

      const cardRef = AutoCards().API.getCard(
        card => card.title === title,
        false
      );

      if (!cardRef) {
        tracked[title].removetracking = true;
        removedCount++;
        removedTitles.push(title);
      } else {
        tracked[title].lastturn = currentTurn;
      }
    }
  }

  // 📋 Summary Log
  log(
    `[StaleCardSweep @ Turn ${currentTurn}] ` +
    `Initialized: ${initializedCount}, ` +
    `Checked stale: ${staleChecked}, ` +
    `Removed: ${removedCount}` +
    (removedTitles.length > 0 ? ` → [${removedTitles.join(", ")}]` : '')
  );

  return tracked;
}

//Remove any card that is marked for deletion
function cleanupTrackedCards(tracked) {
  if (typeof tracked !== 'object' || tracked === null) {
    log("Invalid tracked object — skipping cleanupTrackedCards");
    return tracked;
  }

  let removedCount = 0;
  const removedTitles = [];

  for (const title in tracked) {
    if (tracked[title]?.removetracking === true) {
      delete tracked[title];
      removedCount++;
      removedTitles.push(title);
    }
  }

  log(
    `[Cleanup @ Turn ${getTurn()}] Removed ${removedCount} entr${removedCount === 1 ? 'y' : 'ies'}` +
    (removedTitles.length > 0 ? ` → [${removedTitles.join(", ")}]` : '')
  );

  return tracked;
}

//The registry of functions that will run against every card that is triggered in the output text
processorRegistry = [incrementTriggerCount,updateLastTurn];
//The registry of scheduled processor functions every x turns
//Will run against all card tracker objects.
scheduledProcessorRegistry = [
  { fn: markEmptyTrackedCards, every: 25 },
  { fn: removeStaleTrackedCards, every: 30 },
  { fn: cleanupTrackedCards, every: 20 }
];
//Execute the main function
cardKeeper();

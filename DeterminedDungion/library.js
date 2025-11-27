function handleAction(action) {
    if (!action || typeof action !== "object") {
        return "invalid command";
    }

    const text = cleanActionText(action);

    log('last action: "' + text + '"');

    if (text === "mn") {
        return "move north";
    }

    if (action.type === "story") {
        return text;
    }

    if (action.type === "continue") {
        return action.text;
    }

    return "invalid command";
}


function getLastAction(history) {
    if (Array.isArray(history) && history.length > 0) {
        return history[history.length - 1];
    }
    return null; // No history or invalid input
}

function cleanActionText(action) {
    if (!action || typeof action !== "object") return "";

    let text = action.text ?? "";

    // Trim newlines and outer whitespace
    text = text.trim();

    if (action.type === "do") {
        text = text.replace(/^>\s*You\s*/i, "");
        text = text.replace(/\.\s*$/, "");
    } else if (action.type === "say") {
        text = text.replace(/^>\s*You\s+say\s*/i, "");
        text = text.replace(/^["']?(.*?)["']?$/, "$1");
        text = text.replace(/\.\s*$/, "");
    } else if (action.type === "story") {
        // Strip whitespace only — already covered in normalization
    }

    // Collapse internal whitespace & trim again
    return text.replace(/\s+/g, " ").trim();
}

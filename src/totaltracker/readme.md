This is a script for AI dungeon that tracks in what areas the player is in. Currently tracks `underground`, `road`, `wilderness` and `city`. It is developed using the `live scripting interface` of lewdleah's `autocards`.

Installation:
1. in the `output modifier` card, put `classifyTurn(text)`
2. In the `input modifier` card, put `state.inputtext = text`
3. in the `context modifier` card, put `text = (state.currentscene + "\n" + text );`
4. Put the contents of `library.js` in the `shared library` card

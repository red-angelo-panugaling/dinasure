# DINO PA BA? — Offline Dino Runner

A lightweight, bitter-edition dinosaur runner made with HTML, CSS, Canvas, and vanilla JavaScript. The game makes no network requests and needs no dependencies.

Every game over now adds a random Filipino hugot question, a changing sarcastic aside, and a short dramatic reveal with a tiny crash effect. The question pool is kept in `script.js` so it is easy to extend.

## Run locally

From the workspace root (`Dinasure`), run:

```powershell
npm run dev
```

Then open <http://127.0.0.1:5500/offline-dino/>. Stop the server with **Ctrl+C**.

You can also open `index.html` directly in a modern browser.

## Controls

- **Space**, **Up Arrow**, or tap the game to jump
- **Down Arrow** or hold **DUCK** on mobile to duck
- **P** or **Escape** to pause and resume
- Use the sound button to mute or unmute generated sound effects

The best score and mute preference are stored locally in the browser. Graphics are drawn on the Canvas and sound effects are synthesized with the Web Audio API.

# Neon Raiders

An open-source, fixed-screen arcade shooter in plain JavaScript, CSS and HTML: no frameworks, no build step.
Clear each wave of raiders before they reach the ground; they speed up and drop more bombs every level.

- **Play it:** [games.johnandrestrujillo.com/play/neon-raiders](https://games.johnandrestrujillo.com/play/neon-raiders)
- **Controls:** arrow keys or swipe to move, space bar or tap to fire.

## Roadmap

- New enemy types and wave patterns.
- A mobile-first layout with on-screen controls.
- A neon visual style to match [OpenArcade](https://games.johnandrestrujillo.com/play).

Ideas and pull requests are welcome.

## Credits and license

Neon Raiders is a fork of [dwmkerr/spaceinvaders](https://github.com/dwmkerr/spaceinvaders) by Dave Kerr, a learning
exercise released under the MIT license. Thank you, Dave.

Changes in this fork so far:

- New name and texts.
- The sound effects are new: they are synthesized from scratch. The upstream sounds came from the original 1978
  arcade game and were not covered by the MIT license, so they were removed.
- The upstream Google Analytics tag, sponsor button, Replit config and the unrelated `jev-invaders` project were removed.
- An optional hook reports the final score to game portals that provide `window.PortalSDK`; standalone it does nothing.
- The GitHub Pages workflow uses the current official actions.

Released under the [MIT license](LICENSE). The original copyright notice is kept, and changes from 2026 on are
copyright John Andrés Trujillo. This project is not affiliated with or endorsed by the owners of any classic arcade
game or trademark.

## Embedding the game

```html
<canvas id="gameCanvas"></canvas>
<script src="js/spaceinvaders.js"></script>
<script>
  var canvas = document.getElementById("gameCanvas");
  canvas.width = 800;
  canvas.height = 600;
  var game = new Game();
  game.initialise(canvas);
  game.start();
  window.addEventListener("keydown", function (e) { game.keyDown(e.which); });
  window.addEventListener("keyup", function (e) { game.keyUp(e.which); });
</script>
```

See `index.html` for the full setup, including touch controls and the starfield.

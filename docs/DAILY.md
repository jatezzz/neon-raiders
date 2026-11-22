# Daily challenge, sharing and measurement

Neon Raiders has one challenge per day, the same for everyone. The goal is simple: a result worth comparing
with friends, and a link that always leads to the portal, <https://games.johnandrestrujillo.com>.

## The challenge

- The day is the player's local calendar date. Challenge #1 is 2026-11-18 (`firstDay` in `js/daily.js`).
- The date seeds a small random generator (`NeonDaily.rng`). From it come:
  - **the formation of each wave**: one of nine patterns (block, checker, columns, wedge, frame, twins, stripes,
    diamond, zigzag), with at least 24 enemies;
  - **the bonus-ship schedule**: when it appears in each wave and from which side;
  - **the bombs**: the same random sequence for every run of the day.
- Two players on the same day get the same waves and the same bonus ships. What they do with them is the score.
- Players can retry as often as they want. The best score of the day is the one that counts.

The bomb sequence is the same, but when each number is used depends on the frame timing and on which enemies are
still alive, so two runs are comparable, not identical.

## Shared challenges: same waves on any day, in any time zone

"Today" is each player's own calendar date, so two players far apart can be on different challenges at the same
moment (at 07:00 UTC it is already tomorrow in Kiritimati and still yesterday in Pago Pago). A comparison of
scores would then be unfair.

So a shared result carries its challenge day: `.../play/neon-raiders?d=2026-11-18&utm_source=share...`.
Whoever opens that link plays **that** challenge, on any later day and in any time zone. The title says
"Reto compartido #1 · 18 nov", and a link under the game switches to today's challenge.

- A shared challenge of another day has its own best score (`nr.shared`) and does not count for the streak.
- A day before challenge #1, more than one day ahead, or not a real date is ignored: the player gets today's.
- Inside a portal the parameter is read from the page around the game.

## A score to beat: challenge someone

A link can carry a score to beat: `...?d=2026-11-18&vs=915` (and `&by=bot` when the score is the auto-player's).

- The goal is shown on the title screen and stays in the score line during the whole run ("Meta: 915"); it turns
  green when passed.
- The result card is different for a **win**, a **tie** and a **loss**, each with its own line. The line is picked by
  the score, so the same result always reads the same.
- Sharing a result dares the next person to beat **that** score: the link carries `vs=<your score>` and the same
  challenge day.

**Declared and verified scores.** Anybody can type a number in a link, so a score that arrives in a link is only
*declared*, and the title screen says so. It is shown as *verified* only when it matches a run on record in
`VERIFIED` (`js/daily.js`): today that is the auto-player's 915 on challenge #1: the best of five recorded runs without turbo on 2026-11-22
(915, 885, 720, 680 and 470). An earlier build scored 220; that record was replaced.
Player scores are never marked verified by the game alone.

Portals with their own game-over screen receive the outcome too:
`PortalSDK.gameOver(score, { level, share, outcome, headline, joke })`.

## Turbo

The up arrow, or the bolt button on a phone, gives a short burst: for 1.2 seconds the ship fires 2.5 times as often
and its rockets fly 1.8 times as fast (they are drawn longer and yellow). Then it recharges for 5 seconds, counted from
the press; the thin gauge under the ship shows it. Holding the key does not extend it: the choice is when to use it.

It is the same for every player and every device, so daily scores stay comparable. The numbers are in the game
config (`turboSeconds`, `turboCooldown`, `turboFireRate`, `turboRocketSpeed`). The auto-player's verified 915 was
scored without turbo.

## Pause

- **Keyboard:** Esc or P pauses and resumes; Space resumes too.
- **Phone:** the button on the top-right corner of the game pauses and resumes; a tap on the game resumes.
- **By itself:** the game pauses when the page goes to the background (another app, another tab).
- **Inside a portal:** the portal's own pause button pauses the game (`PortalSDK.on('PAUSE' / 'RESUME')`), and Esc
  asks the portal to pause, so both stay in step. The game's corner button is hidden there.

Only a run in progress can be paused. The frozen run stays in sight, dimmed. No game time passes while paused:
the turbo, the bonus-ship schedule and the enemies continue exactly where they were.

## The bonus ship

- It crosses the top of the screen 6 to 12 seconds into a wave, then every 12 to 20 seconds.
- A hit gives 100 points and shows the topic of the day for 2.5 seconds, where the ship was flying.
- The topic is the theme's `texts.topic` (see [THEMES.md](THEMES.md)). Without one, the message is "+100 puntos".
- Its hit box is fixed at 24×12, like every other component.

## Progress, without accounts

Everything is kept in the player's browser (`localStorage`), nothing on a server:

| Key | Content |
|---|---|
| `nr.day` | Today's best score, the wave reached and the number of attempts |
| `nr.streak` | The last day played and how many days in a row |
| `nr.shared` | Best score and attempts on a shared challenge of another day |
| `nr.days` | How many different days this browser has played (a count, to measure returning players without identifying them) |
| `nr.lang` | The language chosen with `?lang=` |

If the browser blocks storage (private mode), the game still works, without streak or best score.

## The game-over screen

It is the only place where the game asks for a click:

1. **Share result**, the main button. On phones it opens the system share sheet (`navigator.share`). Where that
   is not available it shows the text with a WhatsApp link and a copy button.
2. **Play again.**
3. **One recommended game** from the portal, a different one each day, and a link to all games. These two are
   hidden when the game runs inside the portal, because the page around it already lists the games.

The buttons ignore taps for the first 0.7 seconds, because the player is usually still firing.

The shared text looks like this:

```
Neon Raiders · Reto #12 (29 nov)
👾 1.240 pts · oleada 3 · 🛸×2 · 🔥 racha 4
🟩🟩💥
¿Me superas?
https://games.johnandrestrujillo.com/play/neon-raiders?d=2026-11-29&utm_source=share&utm_medium=score&utm_campaign=d20261129&utm_content=portal
```

One green square per wave cleared, then the wave where the run ended.

## One address for every copy

The game can be played on the portal and on GitHub Pages. Both copies:

- share links that point to the portal (`CONFIG.portal` + `CONFIG.playPath`);
- declare the portal as `rel="canonical"` and `og:url`;
- use the same preview image (`og.png`, 1200×630, under 300 KB, as WhatsApp requires).

Off the portal, the title screen also says where the other games are.

## Language

Spanish is the default. English is used when the browser language is English or with `?lang=en`
(`?lang=es` switches back). The texts are in `js/i18n.js`. Theme texts can be given in both languages.

## Anonymous measurement

To learn which mechanic brings visits, the game sends small counters to the portal
(`https://games.johnandrestrujillo.com/e?ev=...`). They contain **no identifier and no cookie**: only the event
name, the challenge day, the host the game runs on, whether it is embedded, the language, and the fields below.

| Event | When | Extra fields |
|---|---|---|
| `arrive` | The page was opened from a tagged link | `src`, `med` (the link's `utm_source` and `utm_medium`) |
| `run` | A run starts | `n` attempt number today, `sh` 1 on a shared challenge, `dp` how many different days this browser has played, `st` current streak |
| `bonus` | A bonus ship is hit | `w` wave |
| `over` | A run ends | `s` score, `w` wave, `b` bonus ships, `n` attempt, `vs` score to beat, `o` outcome (`win`, `tie`, `lose`), `tb` times the turbo was used |
| `share_tap` | The share button is pressed | |
| `share` | A result was shared | `how`: `native`, `whatsapp` or `copy` |
| `rec` | The recommended game is opened | `to` game |
| `more` | The "more games" link is opened | |

Nothing is sent when the browser has "Do Not Track" on, or on `localhost` and plain `http`.
Measurement never blocks or breaks the game.

Links carry a tag so the portal can tell where a visit came from:

| Link | Tag |
|---|---|
| Shared result | `utm_source=share&utm_medium=score` |
| Recommended game on game over | `utm_source=game&utm_medium=gameover` |
| "More games" on game over | `utm_source=game&utm_medium=gameover-more` |
| Footer link | `utm_source=game&utm_medium=footer` |

Every tag also has `utm_campaign=dYYYYMMDD` (the challenge day) and `utm_content` (`portal`, `ghpages` or `other`:
the copy that produced the link).

The number that matters: **arrivals from shared links divided by players who shared**. That is how many new
visitors each sharing player brings.

## Testing

`?debug=true&day=2026-11-20` plays the challenge of another day without touching the saved progress.
`NeonDaily.sent` lists the events of the session, also when sending is off.

## Reading the numbers

The counters and the tagged visits end up in the portal's access log, so no analytics service is needed.

On the OpenArcade portal they are part of its traffic report (visitors, what they saw, what they asked for), built
from the same log. For any other server with a standard access log, `tools/events_report.py` prints the game's
numbers per day: runs started and finished, shares by method, clicks on the game-over links, visits by tag, and
visits per shared result:

```
python3 tools/events_report.py access.log
```

Link-preview and search crawlers are left out.

## Inside a portal

A portal that embeds the game and provides `window.PortalSDK` usually shows its own game-over screen on top of
the game. In that case the game does not open its own screen: it sends the result and the text to share with
`PortalSDK.gameOver(score, { level, share })`, and the portal shows the share button.

## Updating the game

`index.html` loads its scripts and styles with `?v=<version>`. Change the version in `index.html` whenever a script
or style changes, so a browser never runs an old cached script with a new page.

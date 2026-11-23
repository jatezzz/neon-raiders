/*
  spaceinvaders.js

  the core logic for the space invaders game.

*/

/*  
    Game Class

    The Game class represents a Neon Raiders game.
    Create an instance of it, change any of the default values
    in the settings, and call 'start' to run the game.

    Call 'initialise' before 'start' to set the canvas the game
    will draw to.

    Call 'moveShip' or 'shipFire' to control the ship.

    Listen for 'gameWon' or 'gameLost' events to handle the game
    ending.
*/

//  Constants for the keyboard.
var KEY_LEFT = 37;
var KEY_RIGHT = 39;
var KEY_SPACE = 32;
var KEY_UP = 38;
var KEY_ESC = 27;
var KEY_P = 80;

//  Text in the player's language (js/i18n.js); the English fallback keeps this file usable alone.
function T(key, vars, fallback) {
    if (window.NeonI18n) { return window.NeonI18n.t(key, vars); }
    return fallback;
}

//  Creates an instance of the Game class.
function Game() {

    //  Set the initial config.
    this.config = {
        bombRate: 0.05,
        bombMinVelocity: 50,
        bombMaxVelocity: 50,
        invaderInitialVelocity: 25,
        invaderAcceleration: 0,
        invaderDropDistance: 20,
        rocketVelocity: 120,
        rocketMaxFireRate: 2,
        gameWidth: 400,
        gameHeight: 300,
        fps: 50,
        debugMode: false,
        invaderRanks: 5,
        invaderFiles: 10,
        shipSpeed: 120,
        levelDifficultyMultiplier: 0.2,
        pointsPerInvader: 5,
        pointsPerBonus: 100,
        bonusSpeed: 60,
        bonusFirstDelay: [6, 12],
        bonusNextDelay: [12, 20],
        bonusBannerSeconds: 2.5,
        introSeconds: 2,
        //  Turbo (arrow up, or the bolt button): for an instant the ship fires faster and its rockets fly faster.
        turboSeconds: 1.2,
        turboCooldown: 5,
        turboFireRate: 2.5,
        turboRocketSpeed: 1.8,
        limitLevelIncrease: 25
    };

    //  All state is in the variables below.
    this.lives = 3;
    //  Active visual theme (js/theme.js); built-in neon until a theme loads.
    this.theme = window.NeonTheme ? window.NeonTheme.sanitize(null) : null;
    this.width = 0;
    this.height = 0;
    this.gameBounds = {left: 0, top: 0, right: 0, bottom: 0};
    this.intervalId = 0;
    this.score = 0;
    this.level = 1;

    //  Random numbers for a run. The daily challenge replaces this with a generator seeded from
    //  the date, so everyone gets the same waves on the same day.
    this.rng = Math.random;
    this.runStats = { kills: 0, bonus: 0 };

    //  Feel: screen shake, flash and a short freeze on impact. Only looks; hit boxes and scores do not change.
    this.fx = { shake: 0, shakeTotal: 1, mag: 0, flash: 0, flashColor: '#ffffff', hitstop: 0 };

    //  The state stack.
    this.stateStack = [];

    //  Input/output
    this.pressedKeys = {};
    this.gameCanvas =  null;

    //  All sounds.
    this.sounds = null;

    //  The previous x position, used for touch.
    this.previousX = 0;
}

//  Initialis the Game with a canvas.
Game.prototype.initialise = function(gameCanvas) {

    //  Set the game canvas.
    this.gameCanvas = gameCanvas;

    //  Set the game width and height.
    this.width = gameCanvas.width;
    this.height = gameCanvas.height;

    //  Set the state game bounds.
    this.gameBounds = {
        left: gameCanvas.width / 2 - this.config.gameWidth / 2,
        right: gameCanvas.width / 2 + this.config.gameWidth / 2,
        top: gameCanvas.height / 2 - this.config.gameHeight / 2,
        bottom: gameCanvas.height / 2 + this.config.gameHeight / 2,
    };
};

Game.prototype.moveToState = function(state) {
 
   //  If we are in a state, leave it.
   if(this.currentState() && this.currentState().leave) {
     this.currentState().leave(game);
     this.stateStack.pop();
   }
   
   //  If there's an enter function for the new state, call it.
   if(state.enter) {
     state.enter(game);
   }
 
   //  Set the current state.
   this.stateStack.pop();
   this.stateStack.push(state);
   this.announce();
 };

//  Tell the page which screen is showing (it shows or hides the pause button with it).
Game.prototype.announce = function() {
    try {
        var state = this.currentState();
        document.body.setAttribute('data-state', state ? state.constructor.name : '');
    } catch (err) { /* no page around the game */ }
};

//  Pause and resume. Esc or P on a keyboard, the pause button on a phone, a portal's own pause button, or the page
//  going to the background. Only a run in progress can be paused.
Game.prototype.pause = function() {
    if (!(this.currentState() instanceof PlayState)) { return false; }
    this.fx.shake = 0; this.fx.flash = 0;
    this.pressedKeys = {};
    this.pushState(new PauseState());
    return true;
};
Game.prototype.resume = function() {
    if (!(this.currentState() instanceof PauseState)) { return false; }
    this.popState();
    this.lastTick = undefined;          // no time passed while paused
    return true;
};
//  A portal that embeds the game has its own pause button and screen: ask it, and it answers with PAUSE or RESUME.
Game.prototype.requestPause = function(paused) {
    var sdk = window.PortalSDK;
    if (sdk && sdk.pause && sdk.resume) { if (paused) { sdk.pause(); } else { sdk.resume(); } }
    return paused ? this.pause() : this.resume();
};

//  An impact: shake the screen, flash it, freeze the action for an instant and buzz the phone.
//  People who ask their system for less motion get no shake and no flash.
Game.prototype.impact = function(magnitude, seconds, flashColor, hitstop, vibrate) {
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm) {
        this.fx.shake = seconds; this.fx.shakeTotal = seconds; this.fx.mag = magnitude;
        this.fx.flash = 0.25; this.fx.flashColor = flashColor;
    }
    this.fx.hitstop = hitstop || 0;
    try { if (vibrate && navigator.vibrate) { navigator.vibrate(vibrate); } } catch (err) { /* not allowed here */ }
};

//  Reset everything for a new run.
Game.prototype.newRun = function() {
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.runStats = { kills: 0, bonus: 0 };
    this.fx = { shake: 0, shakeTotal: 1, mag: 0, flash: 0, flashColor: '#ffffff', hitstop: 0 };
    this.goalPassed = false;
    this.rng = window.NeonDaily ? window.NeonDaily.rng('run') : Math.random;
    if (window.NeonDaily) { window.NeonDaily.onRunStart(); }
    this.moveToState(new LevelIntroState(this.level));
};

//  Start the Game.
Game.prototype.start = function() {
    if (window.NeonStage) { window.NeonStage.event('run'); }

    //  Move into the 'welcome' state.
    this.moveToState(new WelcomeState());

    //  A portal's own pause button pauses and resumes the game too.
    var self = this;
    if (window.PortalSDK && window.PortalSDK.on) {
        window.PortalSDK.on('PAUSE', function () { self.pause(); });
        window.PortalSDK.on('RESUME', function () { self.resume(); });
    }

    //  Set the game variables.
    this.lives = 3;
    this.config.debugMode = /debug=true/.test(window.location.href);

    //  Start the game loop.
    var game = this;
    this.intervalId = setInterval(function () { GameLoop(game);}, 1000 / this.config.fps);

};

//  Returns the current state.
Game.prototype.currentState = function() {
    return this.stateStack.length > 0 ? this.stateStack[this.stateStack.length - 1] : null;
};

//  Mutes or unmutes the game.
Game.prototype.mute = function(mute) {

    //  If we've been told to mute, mute.
    if(mute === true) {
        this.sounds.mute = true;
    } else if (mute === false) {
        this.sounds.mute = false;
    } else {
        // Toggle mute instead...
        this.sounds.mute = this.sounds.mute ? false : true;
    }
};

//  The main loop.
function GameLoop(game) {
    var currentState = game.currentState();
    if(!currentState) { return; }

    //  The game advances by the real time that has passed, in fixed steps. A busy page (for example a portal
    //  around the game) fires this timer less often than asked; without this the whole game would run in slow
    //  motion and scores would not be comparable. After a long pause (hidden tab) the lost time is dropped.
    var dt = 1 / game.config.fps;
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (game.lastTick === undefined) { game.lastTick = now; game.tickDebt = 0; }
    game.tickDebt += (now - game.lastTick) / 1000;
    game.lastTick = now;
    var steps = Math.floor(game.tickDebt / dt + 0.001);
    if (steps > 5) { steps = 5; game.tickDebt = 0; } else { game.tickDebt -= steps * dt; }

    for (var i = 0; i < steps; i++) {
        currentState = game.currentState();
        if(currentState && currentState.update) {
            currentState.update(game, dt);
        }
    }

    //  Draw once per tick, whatever state the updates ended in.
    currentState = game.currentState();
    if(currentState && currentState.draw) {
        currentState.draw(game, dt, game.gameCanvas.getContext("2d"));
    }
}

Game.prototype.pushState = function(state) {

    //  If there's an enter function for the new state, call it.
    if(state.enter) {
        state.enter(game);
    }
    //  Set the current state.
    this.stateStack.push(state);
    this.announce();
};

Game.prototype.popState = function() {

    //  Leave and pop the state.
    if(this.currentState()) {
        if(this.currentState().leave) {
            this.currentState().leave(game);
        }

        //  Set the current state.
        this.stateStack.pop();
    }
    this.announce();
};

//  The stop function stops the game.
Game.prototype.stop = function Stop() {
    clearInterval(this.intervalId);
};

//  Inform the game a key is down.
Game.prototype.keyDown = function(keyCode) {
    this.pressedKeys[keyCode] = true;
    //  Delegate to the current state too.
    if(this.currentState() && this.currentState().keyDown) {
        this.currentState().keyDown(this, keyCode);
    }
};

Game.prototype.touchstart = function(s) {
    if(this.currentState() && this.currentState().keyDown) {
        this.currentState().keyDown(this, KEY_SPACE);
    }    
};

Game.prototype.touchend = function(s) {
    delete this.pressedKeys[KEY_RIGHT];
    delete this.pressedKeys[KEY_LEFT];
};

Game.prototype.touchmove = function(e) {
	var currentX = e.changedTouches[0].pageX;
    if (this.previousX > 0) {
        if (currentX > this.previousX) {
            delete this.pressedKeys[KEY_LEFT];
            this.pressedKeys[KEY_RIGHT] = true;
        } else {
            delete this.pressedKeys[KEY_RIGHT];
            this.pressedKeys[KEY_LEFT] = true;
        }
    }
    this.previousX = currentX;
};

//  Inform the game a key is up.
Game.prototype.keyUp = function(keyCode) {
    delete this.pressedKeys[keyCode];
    //  Delegate to the current state too.
    if(this.currentState() && this.currentState().keyUp) {
        this.currentState().keyUp(this, keyCode);
    }
};

function WelcomeState() {

}

WelcomeState.prototype.enter = function(game) {

    // Create and load the sounds.
    game.sounds = new Sounds();
    game.sounds.init();
    game.sounds.loadSound('shoot', 'sounds/shoot.wav');
    game.sounds.loadSound('bang', 'sounds/bang.wav');
    game.sounds.loadSound('explosion', 'sounds/explosion.wav');
    game.sounds.loadSound('death', 'sounds/death.wav');
};

WelcomeState.prototype.update = function (game, dt) {


};

WelcomeState.prototype.draw = function(game, dt, ctx) {

    //  Clear the background.
    ctx.clearRect(0, 0, game.width, game.height);

    ctx.font="30px Arial";
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline="middle"; 
    ctx.textAlign="center"; 
    var texts = (game.theme && game.theme.texts) || { title: "Neon Raiders", subtitle: "" };
    var cx = game.width / 2, cy = game.height / 2;
    ctx.fillText(texts.title, cx, cy - 70);
    var daily = window.NeonDaily, i18n = window.NeonI18n;
    if (daily && i18n) {
        //  Today's challenge, the same for everyone.
        ctx.font="16px Arial";
        ctx.fillStyle = (game.theme && game.theme.palette.ship) || '#00f0ff';
        ctx.fillText(i18n.t(daily.sharedDay ? 'title.shared' : 'title.daily', { n: daily.challengeNumber(), date: i18n.shortDate(daily.today()) }), cx, cy - 36);
    }
    ctx.font="16px Arial";
    if (daily && i18n && daily.target) {
        //  A score to beat came with the link: it is the goal of this run.
        ctx.fillStyle = '#ffdc3c';
        ctx.fillText(i18n.t('target.title.' + daily.target.by, { t: i18n.number(daily.target.score) }), cx, cy - 12);
        ctx.font="11px Arial";
        ctx.fillStyle = '#b0b0c0';
        ctx.fillText(i18n.t(daily.target.verified ? 'target.verified' : 'target.declared'), cx, cy + 3);
        ctx.font="16px Arial";
    } else if (texts.subtitle) {
        ctx.fillStyle = (game.theme && game.theme.palette.enemyA) || '#ffffff';
        ctx.fillText(texts.subtitle, cx, cy - 12);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(T('title.start', null, "Press 'Space' or touch to start."), cx, cy + 20);
    if (daily && i18n) {
        var progress = daily.todayProgress(), streak = daily.currentStreak();
        ctx.font="13px Arial";
        ctx.fillStyle = '#b0b0c0';
        if (progress.attempts > 0) {
            ctx.fillText(i18n.t('title.status', { best: i18n.number(progress.best), streak: streak }), cx, cy + 50);
        } else if (streak > 0) {
            ctx.fillText(i18n.t('title.streak', { streak: streak }), cx, cy + 50);
        }
        if (!daily.onPortal) {
            ctx.fillText(i18n.t('title.more', { host: daily.CONFIG.portalHost }), cx, cy + 72);
        }
    }
};

WelcomeState.prototype.keyDown = function(game, keyCode) {
    if(keyCode == KEY_SPACE) {
        //  Space starts the game.
        game.newRun();
    }
};

function GameOverState() {

}

//  Record the run and open the game-over screen (js/daily.js) with the share button.
GameOverState.prototype.enter = function(game) {
    this.overlay = false;
    var share = null;
    if (window.NeonDaily) {
        window.NeonDaily.onGameOver(game);
        share = window.NeonDaily.shareMessage();
        this.overlay = !!document.getElementById('gameover');
    }
    //  Optional arcade hook: portals such as OpenArcade inject window.PortalSDK; standalone it does nothing.
    //  The portal shows its own game-over screen, so it also gets the text to share.
    if (window.PortalSDK && window.PortalSDK.gameOver) {
        var last = window.NeonDaily ? window.NeonDaily.lastResult() : null;
        var sdkArgs = [game.score, { level: game.level, share: share, outcome: last && last.outcome,
            headline: last && last.headline, joke: last && last.joke }];
        //  Let the shared celebration play over the game before the portal covers it with its own screen.
        setTimeout(function () { window.PortalSDK.gameOver.apply(window.PortalSDK, sdkArgs); }, window.NeonFx ? window.NeonFx.portalDelay() : 0);
    }
};

GameOverState.prototype.update = function(game, dt) {

};

GameOverState.prototype.draw = function(game, dt, ctx) {

    //  Clear the background.
    ctx.clearRect(0, 0, game.width, game.height);
    if (this.overlay) { return; }      // the HTML game-over screen shows the result

    ctx.font="30px Arial";
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline="center"; 
    ctx.textAlign="center"; 
    ctx.fillText("Game Over!", game.width / 2, game.height/2 - 40); 
    ctx.font="16px Arial";
    ctx.fillText("You scored " + game.score + " and got to level " + game.level, game.width / 2, game.height/2);
    ctx.font="16px Arial";
    ctx.fillText("Press 'Space' to play again.", game.width / 2, game.height/2 + 40);   
};

GameOverState.prototype.keyDown = function(game, keyCode) {
    if(keyCode == KEY_SPACE) {
        //  Space restarts the game. Ignore it for a moment: the player may still be firing.
        if (window.NeonDaily && window.NeonDaily.locked()) { return; }
        game.newRun();
    }
};

//  Create a PlayState with the game config and the level you are on.
function PlayState(config, level) {
    this.config = config;
    this.level = level;

    //  Game state.
    this.invaderCurrentVelocity =  10;
    this.invaderCurrentDropDistance =  0;
    this.invadersAreDropping =  false;
    this.lastRocketTime = null;

    //  Game entities.
    this.ship = null;
    this.invaders = [];
    this.rockets = [];
    this.bombs = [];
    this.bonus = null;          // the bonus ship crossing the top, if any
    this.bonusTimer = 0;        // seconds until the next bonus ship
    this.banner = null;         // short message after a bonus ship is hit
}

PlayState.prototype.enter = function(game) {

    //  Create the ship.
    this.ship = new Ship(game.width / 2, game.gameBounds.bottom);
    this.explosions = [];
    this.pieces = [];           // debris of the ship (looks only)
    this.dying = null;          // the last second and a half of a run, before the result
    this.shipTilt = 0;          // -1 banking left ... 1 banking right
    this.turbo = 0;             // seconds of turbo left
    this.turboWait = 0;         // seconds until the turbo can be used again
    this.lastShipX = this.ship.x;

    //  Setup initial state.
    this.invaderCurrentVelocity =  10;
    this.invaderCurrentDropDistance =  0;
    this.invadersAreDropping =  false;

    //  Set the ship speed for this level, as well as invader params.
    var levelMultiplier = this.level * this.config.levelDifficultyMultiplier;
    var limitLevel = (this.level < this.config.limitLevelIncrease ? this.level : this.config.limitLevelIncrease);
    this.shipSpeed = this.config.shipSpeed;
    this.invaderInitialVelocity = this.config.invaderInitialVelocity + 1.5 * (levelMultiplier * this.config.invaderInitialVelocity);
    this.bombRate = this.config.bombRate + (levelMultiplier * this.config.bombRate);
    this.bombMinVelocity = this.config.bombMinVelocity + (levelMultiplier * this.config.bombMinVelocity);
    this.bombMaxVelocity = this.config.bombMaxVelocity + (levelMultiplier * this.config.bombMaxVelocity);
    this.rocketMaxFireRate = this.config.rocketMaxFireRate + 0.4 * limitLevel;

    //  Create the invaders.
    var ranks = this.config.invaderRanks + 0.1 * limitLevel;
    var files = this.config.invaderFiles + 0.2 * limitLevel;
    var invaders = [];
    //  The daily challenge decides which slots of the grid hold an enemy in this wave.
    var formation = window.NeonDaily ? window.NeonDaily.formation(this.level, Math.ceil(ranks), Math.ceil(files)) : null;
    this.formationName = formation ? formation.name : 'block';
    for(var rank = 0; rank < ranks; rank++){
        for(var file = 0; file < files; file++) {
            if (formation && !formation.keep(rank, file)) { continue; }
            invaders.push(new Invader(
                (game.width / 2) + ((files/2 - file) * 200 / files),
                (game.gameBounds.top + rank * 20),
                rank, file, 'Invader'));
        }
    }
    this.invaders = invaders;
    this.invaderCurrentVelocity = this.invaderInitialVelocity;
    this.invaderVelocity = {x: -this.invaderInitialVelocity, y:0};
    this.invaderNextVelocity = null;

    //  Bonus ship schedule for this wave, the same for everyone on the same day.
    this.bonusRng = window.NeonDaily ? window.NeonDaily.rng('bonus' + this.level) : Math.random;
    this.bonus = null;
    this.banner = null;
    this.bonusTimer = this.between(this.config.bonusFirstDelay);
};

PlayState.prototype.between = function(range) {
    return range[0] + this.bonusRng() * (range[1] - range[0]);
};

//  Throw debris from a point: square shards with their own speed and spin.
PlayState.prototype.spawnPieces = function(x, y, count, speed, color) {
    for (var i = 0; i < count; i++) {
        var angle = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
        this.pieces.push({ x: x, y: y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - speed * 0.5, rot: Math.random() * 6,
            vr: (Math.random() - 0.5) * 14, size: 2 + Math.random() * 4, age: 0, life: 0.7 + Math.random() * 0.7, color: color });
    }
};

//  The ship is destroyed: everything stops, the ship breaks apart, and only then comes the result.
PlayState.prototype.startDying = function(game) {
    this.dying = { t: 0, duration: 1.5 };
    var color = (game.theme && game.theme.palette.ship) || '#00f0ff';
    this.spawnPieces(this.ship.x, this.ship.y, 14, 150, color);
    this.spawnPieces(this.ship.x, this.ship.y, 6, 70, '#ffffff');
    this.explosions.push({ x: this.ship.x, y: this.ship.y, age: 0 });
    game.impact(10, 0.7, '#ffffff', 0, [90, 60, 180]);
    game.sounds.playSound('death');
};

PlayState.prototype.update = function(game, dt) {

    //  Effects run on their own clock.
    var fx = game.fx;
    if (fx.shake > 0) { fx.shake -= dt; }
    if (fx.flash > 0) { fx.flash -= dt; }
    for (var p = 0; p < this.pieces.length; p++) {
        var piece = this.pieces[p];
        piece.age += dt; piece.vy += 240 * dt; piece.x += piece.vx * dt; piece.y += piece.vy * dt; piece.rot += piece.vr * dt;
        if (piece.age > piece.life) { this.pieces.splice(p--, 1); }
    }
    if (this.dying) {
        this.dying.t += dt;
        for (var x = 0; x < this.explosions.length; x++) {
            this.explosions[x].age += dt;
            if (this.explosions[x].age > PlayState.EXPLOSION_TIME) { this.explosions.splice(x--, 1); }
        }
        if (this.dying.t >= this.dying.duration) { game.moveToState(new GameOverState()); }
        return;
    }
    if (fx.hitstop > 0) { fx.hitstop -= dt; return; }       // the instant of an impact
    if (this.turbo > 0) { this.turbo -= dt; }
    if (this.turboWait > 0) { this.turboWait -= dt; }
    
    //  If the left or right arrow keys are pressed, move
    //  the ship. Check this on ticks rather than via a keydown
    //  event for smooth movement, otherwise the ship would move
    //  more like a text editor caret.
    if(game.pressedKeys[KEY_LEFT]) {
        this.ship.x -= this.shipSpeed * dt;
    }
    if(game.pressedKeys[KEY_RIGHT]) {
        this.ship.x += this.shipSpeed * dt;
    }
    if(game.pressedKeys[KEY_SPACE]) {
        this.fireRocket();
    }

    //  Keep the ship in bounds.
    if(this.ship.x < game.gameBounds.left) {
        this.ship.x = game.gameBounds.left;
    }
    if(this.ship.x > game.gameBounds.right) {
        this.ship.x = game.gameBounds.right;
    }

    //  The ship banks towards the side it is moving to (keys, buttons or dragging) and levels out when it stops.
    var moved = this.ship.x - this.lastShipX;
    this.lastShipX = this.ship.x;
    var lean = moved > 0.2 ? 1 : (moved < -0.2 ? -1 : 0);
    this.shipTilt += (lean - this.shipTilt) * Math.min(1, dt * 12);

    //  Move each bomb.
    for(var i=0; i<this.bombs.length; i++) {
        var bomb = this.bombs[i];
        bomb.y += dt * bomb.velocity;

        //  If the rocket has gone off the screen remove it.
        if(bomb.y > this.height) {
            this.bombs.splice(i--, 1);
        }
    }

    //  Move each rocket.
    for(i=0; i<this.rockets.length; i++) {
        var rocket = this.rockets[i];
        rocket.y -= dt * rocket.velocity;

        //  If the rocket has gone off the screen remove it.
        if(rocket.y < 0) {
            this.rockets.splice(i--, 1);
        }
    }

    //  The bonus ship crosses the top of the screen from time to time.
    if (this.bonus) {
        this.bonus.x += this.bonus.velocity * dt;
        if (this.bonus.x < game.gameBounds.left - 30 || this.bonus.x > game.gameBounds.right + 30) {
            this.bonus = null;
            this.bonusTimer = this.between(this.config.bonusNextDelay);
        }
    } else {
        this.bonusTimer -= dt;
        if (this.bonusTimer <= 0) {
            var fromLeft = this.bonusRng() < 0.5;
            this.bonus = new BonusShip(fromLeft ? game.gameBounds.left - 20 : game.gameBounds.right + 20,
                game.gameBounds.top - 16, (fromLeft ? 1 : -1) * this.config.bonusSpeed);
        }
    }
    if (this.banner) {
        this.banner.age += dt;
        if (this.banner.age > this.config.bonusBannerSeconds) { this.banner = null; }
    }

    //  Check for rocket/bonus ship collisions.
    if (this.bonus) {
        for(i=0; i<this.rockets.length; i++) {
            var shot = this.rockets[i];
            if(shot.x >= (this.bonus.x - this.bonus.width/2) && shot.x <= (this.bonus.x + this.bonus.width/2) &&
                shot.y >= (this.bonus.y - this.bonus.height/2) && shot.y <= (this.bonus.y + this.bonus.height/2)) {
                this.rockets.splice(i, 1);
                this.hitBonus(game);
                break;
            }
        }
    }

    //  Move the invaders.
    var hitLeft = false, hitRight = false, hitBottom = false;
    for(i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        var newx = invader.x + this.invaderVelocity.x * dt;
        var newy = invader.y + this.invaderVelocity.y * dt;
        if(hitLeft == false && newx < game.gameBounds.left) {
            hitLeft = true;
        }
        else if(hitRight == false && newx > game.gameBounds.right) {
            hitRight = true;
        }
        else if(hitBottom == false && newy > game.gameBounds.bottom) {
            hitBottom = true;
        }

        if(!hitLeft && !hitRight && !hitBottom) {
            invader.x = newx;
            invader.y = newy;
        }
    }

    //  Update invader velocities.
    if(this.invadersAreDropping) {
        this.invaderCurrentDropDistance += this.invaderVelocity.y * dt;
        if(this.invaderCurrentDropDistance >= this.config.invaderDropDistance) {
            this.invadersAreDropping = false;
            this.invaderVelocity = this.invaderNextVelocity;
            this.invaderCurrentDropDistance = 0;
        }
    }
    //  If we've hit the left, move down then right.
    if(hitLeft) {
        this.invaderCurrentVelocity += this.config.invaderAcceleration;
        this.invaderVelocity = {x: 0, y:this.invaderCurrentVelocity };
        this.invadersAreDropping = true;
        this.invaderNextVelocity = {x: this.invaderCurrentVelocity , y:0};
    }
    //  If we've hit the right, move down then left.
    if(hitRight) {
        this.invaderCurrentVelocity += this.config.invaderAcceleration;
        this.invaderVelocity = {x: 0, y:this.invaderCurrentVelocity };
        this.invadersAreDropping = true;
        this.invaderNextVelocity = {x: -this.invaderCurrentVelocity , y:0};
    }
    //  If we've hit the bottom, it's game over.
    if(hitBottom) {
        game.lives = 0;
    }
    
    //  Age explosions and drop finished ones.
    for(var e=0; e<this.explosions.length; e++) {
        this.explosions[e].age += dt;
        if(this.explosions[e].age > PlayState.EXPLOSION_TIME) { this.explosions.splice(e--, 1); }
    }

    //  Check for rocket/invader collisions.
    for(i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        var bang = false;

        for(var j=0; j<this.rockets.length; j++){
            var rocket = this.rockets[j];

            if(rocket.x >= (invader.x - invader.width/2) && rocket.x <= (invader.x + invader.width/2) &&
                rocket.y >= (invader.y - invader.height/2) && rocket.y <= (invader.y + invader.height/2)) {
                
                //  Remove the rocket, set 'bang' so we don't process
                //  this rocket again.
                this.rockets.splice(j--, 1);
                bang = true;
                game.score += this.config.pointsPerInvader;
                game.runStats.kills += 1;
                break;
            }
        }
        if(bang) {
            this.explosions.push({ x: invader.x, y: invader.y, age: 0 });
            this.invaders.splice(i--, 1);
            game.sounds.playSound('bang');
        }
    }

    //  Find all of the front rank invaders.
    var frontRankInvaders = {};
    for(var i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        //  If we have no invader for game file, or the invader
        //  for game file is futher behind, set the front
        //  rank invader to game one.
        if(!frontRankInvaders[invader.file] || frontRankInvaders[invader.file].rank < invader.rank) {
            frontRankInvaders[invader.file] = invader;
        }
    }

    //  Give each front rank invader a chance to drop a bomb.
    for(var fileKey in frontRankInvaders) {
        var invader = frontRankInvaders[fileKey];
        var chance = this.bombRate * dt;
        if(chance > game.rng()) {
            //  Fire!
            this.bombs.push(new Bomb(invader.x, invader.y + invader.height / 2, 
                this.bombMinVelocity + game.rng()*(this.bombMaxVelocity - this.bombMinVelocity)));
        }
    }

    //  Check for bomb/ship collisions.
    for(var i=0; i<this.bombs.length; i++) {
        var bomb = this.bombs[i];
        if(bomb.x >= (this.ship.x - this.ship.width/2) && bomb.x <= (this.ship.x + this.ship.width/2) &&
                bomb.y >= (this.ship.y - this.ship.height/2) && bomb.y <= (this.ship.y + this.ship.height/2)) {
            this.bombs.splice(i--, 1);
            game.lives--;
            if (window.NeonStage) { window.NeonStage.event('hit'); }
            this.explosions.push({ x: this.ship.x, y: this.ship.y, age: 0 });
            //  Being hit must be felt: a jolt, a red flash, sparks and an instant of stillness.
            this.spawnPieces(this.ship.x, this.ship.y, 5, 90, '#ff3050');
            game.impact(5, 0.35, '#ff3050', 0.08, 60);
            game.sounds.playSound('explosion');
        }
                
    }

    //  Check for invader/ship collisions.
    for(var i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        if((invader.x + invader.width/2) > (this.ship.x - this.ship.width/2) && 
            (invader.x - invader.width/2) < (this.ship.x + this.ship.width/2) &&
            (invader.y + invader.height/2) > (this.ship.y - this.ship.height/2) &&
            (invader.y - invader.height/2) < (this.ship.y + this.ship.height/2)) {
            //  Dead by collision!
            game.lives = 0;
            game.sounds.playSound('explosion');
        }
    }

    //  Keep the portal's score display up to date (optional arcade hook, see GameOverState.enter).
    if (window.PortalSDK && window.PortalSDK.reportScore && game.score !== this.reportedScore) {
        this.reportedScore = game.score;
        window.PortalSDK.reportScore(game.score);
    }

    //  Check for failure
    if(game.lives <= 0) {
        this.startDying(game);
        return;
    }

    //  Check for victory
    if(this.invaders.length === 0) {
        game.score += this.level * 50;
        game.level += 1;
        if (window.NeonStage) { window.NeonStage.event('wave', { level: game.level }); }
        game.moveToState(new LevelIntroState(game.level));
    }
};

PlayState.EXPLOSION_TIME = 0.35;   // seconds

//  A rocket hit the bonus ship: extra points and, if the theme has one, the topic of the day.
PlayState.prototype.hitBonus = function(game) {
    game.score += this.config.pointsPerBonus;
    if (window.NeonStage) { window.NeonStage.event('bonus'); }
    game.runStats.bonus += 1;
    this.explosions.push({ x: this.bonus.x, y: this.bonus.y, age: 0 });
    var topic = game.theme && game.theme.texts && game.theme.texts.topic;
    this.banner = {
        age: 0,
        text: topic ? T('bonus.topic', { t: topic }, 'Topic of the day: ' + topic)
                    : T('bonus.points', { p: this.config.pointsPerBonus }, '+' + this.config.pointsPerBonus + ' points')
    };
    this.bonus = null;
    this.bonusTimer = this.between(this.config.bonusNextDelay);
    game.sounds.playSound('bang');
    if (window.NeonDaily) { window.NeonDaily.track('bonus', { w: this.level }); }
};

PlayState.prototype.draw = function(game, dt, ctx) {

    //  Clear the background.
    ctx.clearRect(0, 0, game.width, game.height);
    
    //  Draw everything through the active theme (fixed hit boxes, themed look).
    var theme = game.theme;
    var now = (window.performance ? performance.now() : Date.now()) / 1000;

    //  Screen shake: the whole scene is drawn slightly off, less and less.
    var fx = game.fx, shaking = fx.shake > 0;
    ctx.save();
    if (shaking) {
        var power = fx.mag * (fx.shake / fx.shakeTotal);
        ctx.translate((Math.random() * 2 - 1) * power, (Math.random() * 2 - 1) * power);
    }

    if (theme && window.NeonTheme) {
        if (!this.dying) {
            //  The ship leans into the turn; a theme can bring its own left and right images.
            var tilt = this.shipTilt, side = tilt < -0.5 ? 'shipLeft' : (tilt > 0.5 ? 'shipRight' : null);
            var ownSide = side && theme.images && theme.images[side] && theme.images[side].length;
            ctx.save();
            ctx.translate(this.ship.x, this.ship.y);
            if (!ownSide) { ctx.rotate(tilt * 0.26); ctx.scale(1 - Math.abs(tilt) * 0.16, 1); }
            if (!(theme.images && theme.images.ship && theme.images.ship.length)) {
                //  Engine flame of the built-in ship: it flickers, and trails to the side when banking.
                var flame = 5 + 3 * Math.abs(Math.sin(now * 30)) + 3 * Math.abs(tilt);
                ctx.fillStyle = theme.palette.bomb;
                ctx.beginPath();
                ctx.moveTo(-4, this.ship.height / 2); ctx.lineTo(4, this.ship.height / 2); ctx.lineTo(-tilt * 4, this.ship.height / 2 + flame);
                ctx.closePath(); ctx.fill();
            }
            NeonTheme.draw(ctx, theme, ownSide ? side : 'ship', 0, 0, this.ship.width, this.ship.height, now);
            ctx.restore();
        }
        for(var i=0; i<this.invaders.length; i++) {
            var invader = this.invaders[i];
            NeonTheme.draw(ctx, theme, NeonTheme.enemyKind(invader.rank), invader.x, invader.y, invader.width, invader.height, now);
        }
        for(var i=0; i<this.bombs.length; i++) {
            NeonTheme.draw(ctx, theme, 'bomb', this.bombs[i].x, this.bombs[i].y, 4, 8, now);
        }
        if (this.bonus) {
            NeonTheme.draw(ctx, theme, 'bonus', this.bonus.x, this.bonus.y, this.bonus.width, this.bonus.height, now);
        }
        for(var i=0; i<this.rockets.length; i++) {
            var shot = this.rockets[i];
            ctx.fillStyle = shot.boosted ? theme.palette.bomb : theme.palette.rocket;
            ctx.fillRect(shot.x - (shot.boosted ? 1 : 0), shot.y - (shot.boosted ? 6 : 3), shot.boosted ? 3 : 2, shot.boosted ? 12 : 6);
        }
        //  Turbo gauge under the ship: full when ready, emptying while it burns, refilling while it recharges.
        if (!this.dying) {
            var gaugeW = 26, gx = this.ship.x - gaugeW / 2, gy = this.ship.y + this.ship.height / 2 + 4;
            var burning = this.turbo > 0;
            var level = burning ? this.turbo / this.config.turboSeconds : 1 - Math.max(0, this.turboWait) / this.config.turboCooldown;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(gx, gy, gaugeW, 2);
            ctx.fillStyle = burning ? theme.palette.bomb : (this.turboWait > 0 ? '#7a8090' : theme.palette.ship);
            ctx.fillRect(gx, gy, gaugeW * Math.max(0, Math.min(1, level)), 2);
        }
        for(var i=0; i<this.explosions.length; i++) {
            var ex = this.explosions[i];
            NeonTheme.drawExplosion(ctx, theme, ex.x, ex.y, ex.age, PlayState.EXPLOSION_TIME);
        }
        //  Debris.
        for(var i=0; i<this.pieces.length; i++) {
            var pc = this.pieces[i];
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - pc.age / pc.life);
            ctx.translate(pc.x, pc.y); ctx.rotate(pc.rot);
            ctx.fillStyle = pc.color; ctx.shadowColor = pc.color; ctx.shadowBlur = 6;
            ctx.fillRect(-pc.size / 2, -pc.size / 2, pc.size, pc.size);
            ctx.restore();
        }
    } else {
        //  Original look (no theme support loaded).
        ctx.fillStyle = '#999999';
        ctx.fillRect(this.ship.x - (this.ship.width / 2), this.ship.y - (this.ship.height / 2), this.ship.width, this.ship.height);
        ctx.fillStyle = '#006600';
        for(var i=0; i<this.invaders.length; i++) {
            var inv = this.invaders[i];
            ctx.fillRect(inv.x - inv.width/2, inv.y - inv.height/2, inv.width, inv.height);
        }
        ctx.fillStyle = '#ff5555';
        for(var i=0; i<this.bombs.length; i++) { ctx.fillRect(this.bombs[i].x - 2, this.bombs[i].y - 2, 4, 4); }
        ctx.fillStyle = '#ff0000';
        for(var i=0; i<this.rockets.length; i++) { ctx.fillRect(this.rockets[i].x, this.rockets[i].y - 2, 1, 4); }
    }

    //  Draw info.
    var textYpos = game.gameBounds.bottom + ((game.height - game.gameBounds.bottom) / 2) + 14/2;
    ctx.font="14px Arial";
    ctx.fillStyle = '#ffffff';
    var info = T('hud.lives', { n: game.lives }, "Lives: " + game.lives);
    ctx.textAlign = "left";
    if (game.lives <= 1) { ctx.fillStyle = Math.floor(now * 3) % 2 ? '#ff3050' : '#ff9aa8'; }      // last life: it pulses red
    ctx.fillText(info, game.gameBounds.left, textYpos);
    ctx.fillStyle = '#ffffff';
    info = T('hud.score', { s: game.score, w: game.level }, "Score: " + game.score + ", Level: " + game.level);
    ctx.textAlign = "right";
    ctx.fillText(info, game.gameBounds.right, textYpos);

    //  The score to beat stays in sight for the whole run, and turns green once passed.
    var goal = window.NeonDaily && window.NeonDaily.target;
    if (goal && window.NeonI18n) {
        var passed = game.score > goal.score;
        ctx.textAlign = "center";
        ctx.fillStyle = passed ? '#00ff9c' : '#ffdc3c';
        ctx.fillText((passed ? '\u2714 ' : '') + window.NeonI18n.t('target.hud', { t: goal.score }),
            game.gameBounds.left + (game.gameBounds.right - game.gameBounds.left) * 0.4, textYpos);
        if (passed && !this.goalAnnounced) {
            this.goalAnnounced = true;
            if (!game.goalPassed) { game.goalPassed = true; this.banner = { age: 0, text: window.NeonI18n.t('target.passed', { t: goal.score }) }; }
        }
        ctx.fillStyle = '#ffffff';
    }

    //  Message after a bonus ship is hit, where the ship was flying.
    if (this.banner) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (this.config.bonusBannerSeconds - this.banner.age) * 2);
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = (theme && theme.palette.bonus) || '#ffdc3c';
        ctx.fillText(this.banner.text, game.width / 2, game.gameBounds.top - 16, game.gameBounds.right - game.gameBounds.left);
        ctx.restore();
        ctx.textBaseline = "alphabetic";
    }

    ctx.restore();      // end of the shaken scene

    //  The scene darkens while the ship breaks apart, and an impact flashes over everything.
    if (this.dying) {
        ctx.fillStyle = 'rgba(0, 0, 0, ' + Math.min(0.55, this.dying.t * 0.5) + ')';
        ctx.fillRect(0, 0, game.width, game.height);
    }
    if (fx.flash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, fx.flash * 2);
        ctx.fillStyle = fx.flashColor;
        ctx.fillRect(0, 0, game.width, game.height);
        ctx.restore();
    }

    //  If we're in debug mode, draw bounds.
    if(this.config.debugMode) {
        ctx.strokeStyle = '#ff0000';
        ctx.strokeRect(0,0,game.width, game.height);
        ctx.strokeRect(game.gameBounds.left, game.gameBounds.top,
            game.gameBounds.right - game.gameBounds.left,
            game.gameBounds.bottom - game.gameBounds.top);
    }

};

PlayState.prototype.keyDown = function(game, keyCode) {

    if(keyCode == KEY_SPACE) {
        //  Fire!
        this.fireRocket();
    }
    if(keyCode == KEY_UP) {
        this.startTurbo(game);
    }
    if(keyCode == KEY_P || keyCode == KEY_ESC) {
        game.requestPause(true);
    }
};

PlayState.prototype.keyUp = function(game, keyCode) {

};

//  Turbo: a short burst of faster fire. It recharges, so it is a choice of when, not something to hold down.
PlayState.prototype.startTurbo = function(game) {
    if (this.dying || this.turboWait > 0) { return false; }
    this.turbo = this.config.turboSeconds;
    this.turboWait = this.config.turboCooldown;
    game.runStats.turbos = (game.runStats.turbos || 0) + 1;
    return true;
};

PlayState.prototype.fireRocket = function() {
    if (this.dying) { return; }
    var boosted = this.turbo > 0;
    var rate = this.rocketMaxFireRate * (boosted ? this.config.turboFireRate : 1);
    //  If we have no last rocket time, or the last rocket time 
    //  is older than the max rocket rate, we can fire.
    if(this.lastRocketTime === null || ((new Date()).valueOf() - this.lastRocketTime) > (1000 / rate))
    {   
        //  Add a rocket.
        var rocket = new Rocket(this.ship.x, this.ship.y - 12, this.config.rocketVelocity * (boosted ? this.config.turboRocketSpeed : 1));
        rocket.boosted = boosted;
        this.rockets.push(rocket);
        this.lastRocketTime = (new Date()).valueOf();

        //  Play the 'shoot' sound.
        game.sounds.playSound('shoot');
    }
};

function PauseState() {

}

PauseState.prototype.keyDown = function(game, keyCode) {

    //  The same keys resume, and so does Space or a tap on the game.
    if(keyCode == KEY_P || keyCode == KEY_ESC || keyCode == KEY_SPACE) {
        game.requestPause(false);
    }
};

PauseState.prototype.draw = function(game, dt, ctx) {

    //  The frozen run stays in sight, dimmed, so the player sees where they left it.
    var below = game.stateStack[game.stateStack.length - 2];
    if (below && below.draw) { below.draw(game, dt, ctx); } else { ctx.clearRect(0, 0, game.width, game.height); }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.font="30px Arial";
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline="middle";
    ctx.textAlign="center";
    ctx.fillText(T('paused', null, "Paused"), game.width / 2, game.height/2 - 14);
    ctx.font="14px Arial";
    ctx.fillStyle = '#b0b0c0';
    var onTouch = document.body && document.body.classList.contains('touch');
    ctx.fillText(T(onTouch ? 'paused.hint.touch' : 'paused.hint', null, "Esc or P to continue"), game.width / 2, game.height/2 + 18);
    ctx.textBaseline="alphabetic";
    return;
};

/*  
    Level Intro State

    The Level Intro state shows a 'Level X' message and
    a countdown for the level.
*/
function LevelIntroState(level) {
    this.level = level;
    this.countdownMessage = "2";
}

LevelIntroState.prototype.update = function(game, dt) {

    //  Update the countdown.
    if(this.countdown === undefined) {
        this.countdown = game.config.introSeconds; // a short pause before each wave
    }
    this.countdown -= dt;

    if(this.countdown < 2) { 
        this.countdownMessage = "2"; 
    }
    if(this.countdown < 1) { 
        this.countdownMessage = "1"; 
    } 
    if(this.countdown <= 0) {
        //  Move to the next level, popping this state.
        game.moveToState(new PlayState(game.config, this.level));
    }

};

LevelIntroState.prototype.draw = function(game, dt, ctx) {

    //  Clear the background.
    ctx.clearRect(0, 0, game.width, game.height);

    ctx.font="36px Arial";
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline="middle"; 
    ctx.textAlign="center"; 
    ctx.fillText(T('intro.wave', { n: this.level }, "Level " + this.level), game.width / 2, game.height/2);
    ctx.font="24px Arial";
    ctx.fillText(T('intro.ready', { c: this.countdownMessage }, "Ready in " + this.countdownMessage), game.width / 2, game.height/2 + 36);      
    return;
};


/*
 
  Ship

  The ship has a position and that's about it.

*/
function Ship(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 16;
}

/*
    Rocket

    Fired by the ship, they've got a position, velocity and state.

    */
function Rocket(x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
}

/*
    Bomb

    Dropped by invaders, they've got position, velocity.

*/
function Bomb(x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
}
 
/*
    Bonus ship

    Crosses the top of the screen. Worth extra points, and it reveals the topic of the day.
*/
function BonusShip(x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
    this.width = 24;
    this.height = 12;
}

/*
    Invader 

    Invader's have position, type, rank/file and that's about it. 
*/

function Invader(x, y, rank, file, type) {
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.file = file;
    this.type = type;
    this.width = 18;
    this.height = 14;
}

/*
    Game State

    A Game State is simply an update and draw proc.
    When a game is in the state, the update and draw procs are
    called, with a dt value (dt is delta time, i.e. the number)
    of seconds to update or draw).

*/
function GameState(updateProc, drawProc, keyDown, keyUp, enter, leave) {
    this.updateProc = updateProc;
    this.drawProc = drawProc;
    this.keyDown = keyDown;
    this.keyUp = keyUp;
    this.enter = enter;
    this.leave = leave;
}

/*

    Sounds

    The sounds class is used to asynchronously load sounds and allow
    them to be played.

*/
function Sounds() {

    //  The audio context.
    this.audioContext = null;

    //  The actual set of loaded sounds.
    this.sounds = {};
}

Sounds.prototype.init = function() {

    //  Create the audio context, paying attention to webkit browsers.
    context = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new context();
    this.mute = false;
};

Sounds.prototype.loadSound = function(name, url) {

    //  Reference to ourselves for closures.
    var self = this;

    //  Create an entry in the sounds object.
    this.sounds[name] = null;

    //  Create an asynchronous request for the sound.
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'arraybuffer';
    req.onload = function() {
        self.audioContext.decodeAudioData(req.response, function(buffer) {
            self.sounds[name] = {buffer: buffer};
        });
    };
    try {
      req.send();
    } catch(e) {
      console.log("An exception occured getting sound the sound " + name + " this might be " +
         "because the page is running from the file system, not a webserver.");
      console.log(e);
    }
};

Sounds.prototype.playSound = function(name) {

    //  The Neon universe's own sound kit (neon-stage.js) plays it when it is there; the samples are the fallback.
    if (window.NeonStage && window.NeonStage.sfx(name)) {
        return;
    }

    //  If we've not got the sound, don't bother playing it.
    if(this.sounds[name] === undefined || this.sounds[name] === null || this.mute === true) {
        return;
    }

    //  Create a sound source, set the buffer, connect to the speakers and
    //  play the sound.
    var source = this.audioContext.createBufferSource();
    source.buffer = this.sounds[name].buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
};

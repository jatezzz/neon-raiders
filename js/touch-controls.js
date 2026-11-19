/*
    Touch controls and responsive layout for Neon Raiders.

    - The canvas keeps its internal 800x600 resolution and is scaled with CSS to fit
      the screen in portrait or landscape.
    - On touch screens an on-screen pad appears: left, right and fire. Each button
      tracks its own pointer, so you can move and fire at the same time.
    - Dragging on the game area moves the ship to your finger; a tap fires (or starts
      the game on the title and game-over screens).
*/
(function () {
    'use strict';

    var KEY = { LEFT: 37, RIGHT: 39, SPACE: 32, UP: 38 };
    function isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    }

    function TouchControls(game, canvas) {
        this.game = game;
        this.canvas = canvas;
        this.pad = document.getElementById('touchpad');
        this.info = document.getElementById('info');
        this.enabled = isTouchDevice();
        this.dragPointer = null;
        this.dragMoved = false;
        this.dragStartX = 0;

        if (this.enabled) {
            document.body.classList.add('touch');
            this.bindButtons();
            this.bindCanvas();
        }
        this.fit = this.fit.bind(this);
        window.addEventListener('resize', this.fit);
        window.addEventListener('orientationchange', this.fit);
        this.fit();
    }

    // Scale the canvas to the largest 4:3 box that fits next to the pad and the info text.
    TouchControls.prototype.fit = function () {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var padH = (this.enabled && this.pad) ? this.pad.offsetHeight : 0;
        var infoH = (this.info && this.info.offsetParent !== null) ? this.info.offsetHeight : 0;
        var landscape = w > h;
        if (this.enabled && landscape) { padH = 0; }          // landscape: buttons sit at the sides
        var availH = Math.max(120, h - padH - infoH - 8);
        var gw = this.canvas.width, gh = this.canvas.height;
        var scale = Math.min(w / gw, availH / gh);
        if (!this.enabled) { scale = Math.min(scale, 1); }   // never upscale on desktop
        this.canvas.style.width = Math.floor(gw * scale) + 'px';
        this.canvas.style.height = Math.floor(gh * scale) + 'px';
    };

    TouchControls.prototype.press = function (code) { this.game.keyDown(code); };
    TouchControls.prototype.release = function (code) { this.game.keyUp(code); };

    TouchControls.prototype.bindButtons = function () {
        var self = this;
        var buttons = this.pad.querySelectorAll('[data-key]');
        Array.prototype.forEach.call(buttons, function (btn) {
            var code = KEY[btn.getAttribute('data-key')];
            var activePointer = null;
            function down(e) {
                e.preventDefault();
                if (activePointer !== null) { return; }
                activePointer = e.pointerId;
                try { btn.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
                btn.classList.add('active');
                self.press(code);
            }
            function up(e) {
                if (e.pointerId !== activePointer) { return; }
                activePointer = null;
                btn.classList.remove('active');
                self.release(code);
            }
            btn.addEventListener('pointerdown', down);
            btn.addEventListener('pointerup', up);
            btn.addEventListener('pointercancel', up);
            btn.addEventListener('lostpointercapture', up);
            btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        });
    };

    // Convert a screen X position to game coordinates.
    TouchControls.prototype.toGameX = function (clientX) {
        var rect = this.canvas.getBoundingClientRect();
        return (clientX - rect.left) * (this.canvas.width / rect.width);
    };

    TouchControls.prototype.bindCanvas = function () {
        var self = this;
        var canvas = this.canvas;
        canvas.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse') { return; }
            e.preventDefault();
            self.dragPointer = e.pointerId;
            self.dragMoved = false;
            self.dragStartX = e.clientX;
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
        });
        canvas.addEventListener('pointermove', function (e) {
            if (e.pointerId !== self.dragPointer) { return; }
            if (Math.abs(e.clientX - self.dragStartX) > 8) { self.dragMoved = true; }
            var state = self.game.currentState();
            if (self.dragMoved && state && state.ship) {
                state.ship.x = self.toGameX(e.clientX);   // PlayState clamps it to the game bounds
            }
        });
        function end(e) {
            if (e.pointerId !== self.dragPointer) { return; }
            self.dragPointer = null;
            if (!self.dragMoved) {                         // a tap: fire, or start/restart
                self.press(KEY.SPACE);
                self.release(KEY.SPACE);
            }
        }
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
    };

    TouchControls.isTouchDevice = isTouchDevice;
    window.TouchControls = TouchControls;
})();

/*
    Themes for Neon Raiders.

    A theme is a folder under themes/ with a theme.json and optional images. The active theme is
    named in themes/current.json, so switching themes only changes that one small file and each
    theme keeps its own URLs (no stale browser cache mixing two themes).

    Every component keeps a fixed hit box, so a theme changes the look, never the difficulty.
    If anything fails to load (missing file, bad JSON, slow network, oversized image), the game
    keeps the built-in neon look: it never breaks because of a theme.

    theme.json (all fields optional):
    {
      "id": "2026-11-17-cohete", "name": "Rocket launch",
      "texts":   { "title": "Neon Raiders", "subtitle": "Today: rocket launch", "topic": "rocket launch" },
                   (subtitle and topic can also be {"es": "...", "en": "..."})
      "palette": { "ship": "#00f0ff", "enemyA": "#ff00c8", "enemyB": "#a040ff", "enemyC": "#00ff9c",
                   "bomb": "#ffdc3c", "rocket": "#ffffff", "hud": "#ffffff", "explosion": "#ff8c3c",
                   "bonus": "#ffdc3c" },
      "sprites": { "ship": "ship.png", "enemyA": ["a1.png", "a2.png"], "enemyB": [...], "enemyC": [...],
                   "bomb": "bomb.png", "bonus": "bonus.png",
                   "explosion": ["e1.png", "e2.png", "e3.png", "e4.png"] },
      "credits": "Icons: Kenney (CC0)."
    }
*/
(function () {
    'use strict';

    var BASE = 'themes/';
    var MAX_IMAGE_SIDE = 256;
    var LOAD_TIMEOUT_MS = 4000;

    var DEFAULT = {
        id: 'default',
        name: 'Neon',
        texts: { title: 'Neon Raiders', subtitle: '', topic: '' },
        palette: {
            ship: '#00f0ff', enemyA: '#ff00c8', enemyB: '#a040ff', enemyC: '#00ff9c',
            bomb: '#ffdc3c', rocket: '#ffffff', hud: '#ffffff', explosion: '#ff8c3c', bonus: '#ffdc3c'
        },
        sprites: {},
        credits: ''
    };

    function isColor(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v); }
    function isText(v, max) { return typeof v === 'string' && v.length <= max; }
    //  A text, or the text for the player's language when the theme gives {es: '...', en: '...'}.
    function localText(v, max) {
        if (v && typeof v === 'object' && window.NeonI18n) { v = window.NeonI18n.local(v); }
        return isText(v, max) ? v : null;
    }
    function isFile(v) { return typeof v === 'string' && /^[a-zA-Z0-9._-]+\.(png|webp|svg)$/.test(v); }

    // Keep only well-formed fields; anything else falls back to the default.
    function sanitize(raw) {
        var t = JSON.parse(JSON.stringify(DEFAULT));
        if (!raw || typeof raw !== 'object') { return t; }
        if (isText(raw.id, 80)) { t.id = raw.id; }
        if (isText(raw.name, 60)) { t.name = raw.name; }
        if (raw.texts) {
            if (isText(raw.texts.title, 40)) { t.texts.title = raw.texts.title; }
            var subtitle = localText(raw.texts.subtitle, 60), topic = localText(raw.texts.topic, 40);
            if (subtitle !== null) { t.texts.subtitle = subtitle; }
            if (topic !== null) { t.texts.topic = topic; }
        }
        if (raw.palette) {
            Object.keys(t.palette).forEach(function (k) { if (isColor(raw.palette[k])) { t.palette[k] = raw.palette[k]; } });
        }
        if (raw.sprites) {
            ['ship', 'shipLeft', 'shipRight', 'bomb', 'bonus'].forEach(function (k) { if (isFile(raw.sprites[k])) { t.sprites[k] = [raw.sprites[k]]; } });
            ['enemyA', 'enemyB', 'enemyC', 'explosion'].forEach(function (k) {
                var v = raw.sprites[k];
                if (isFile(v)) { v = [v]; }
                if (Array.isArray(v) && v.length >= 1 && v.length <= 8 && v.every(isFile)) { t.sprites[k] = v; }
            });
        }
        if (isText(raw.credits, 300)) { t.credits = raw.credits; }
        return t;
    }

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () {
                if (img.naturalWidth > MAX_IMAGE_SIDE || img.naturalHeight > MAX_IMAGE_SIDE) { reject(new Error('image too large: ' + src)); }
                else { resolve(img); }
            };
            img.onerror = function () { reject(new Error('image failed: ' + src)); };
            img.src = src;
        });
    }

    function withTimeout(promise) {
        return Promise.race([promise, new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error('theme load timeout')); }, LOAD_TIMEOUT_MS);
        })]);
    }

    // Load the active theme. Resolves to a ready theme; never rejects.
    function load() {
        var forced = (window.location.search.match(/[?&]theme=([a-zA-Z0-9_-]+)/) || [])[1];
        var pick = forced ? Promise.resolve({ theme: forced })
            : fetch(BASE + 'current.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
        var job = pick.then(function (cur) {
            if (!cur || !/^[a-zA-Z0-9_-]+$/.test(cur.theme || '')) { throw new Error('bad current.json'); }
            var dir = BASE + cur.theme + '/';
            return fetch(dir + 'theme.json').then(function (r) { return r.json(); }).then(function (raw) {
                var t = sanitize(raw);
                t.images = {};
                var jobs = [];
                Object.keys(t.sprites).forEach(function (k) {
                    jobs.push(Promise.all(t.sprites[k].map(function (f) { return loadImage(dir + f); }))
                        .then(function (imgs) { t.images[k] = imgs; }));
                });
                return Promise.all(jobs).then(function () { return t; });
            });
        });
        return withTimeout(job).catch(function (err) {
            if (window.console) { console.warn('Theme fallback to default:', err.message); }
            var t = sanitize(null); t.images = {}; return t;
        });
    }

    // Draw a component: its sprite frame if the theme has one, otherwise the built-in neon shape.
    function draw(ctx, theme, kind, x, y, w, h, timeSec) {
        var frames = theme.images && theme.images[kind];
        if (frames && frames.length) {
            var frame = frames[Math.floor(timeSec * 2) % frames.length];   // 2 frames per second
            ctx.drawImage(frame, x - w / 2, y - h / 2, w, h);
            return;
        }
        var color = theme.palette[kind] || '#ffffff';
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        var l = x - w / 2, t = y - h / 2;
        if (kind === 'ship') {
            //  A faceted chrome dart, like the cover's ship: bright edges, a darker spine, a glow under the engines.
            var g = ctx.createLinearGradient(l, 0, l + w, 0);
            g.addColorStop(0, color); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, color);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(l + w, t + h); ctx.lineTo(x, t + h * 0.78); ctx.lineTo(l, t + h); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(5,6,15,0.55)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, t + 2); ctx.lineTo(x, t + h * 0.76); ctx.stroke();
            ctx.fillStyle = '#ffdc3c'; ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(timeSec * 12));
            ctx.beginPath(); ctx.ellipse(x, t + h * 0.92, w * 0.12, h * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        } else if (kind === 'enemyA' || kind === 'enemyB' || kind === 'enemyC') {
            //  Faceted drones with two eyes (the cover's design, not the classic arcade aliens):
            //  A diamond, B hexagon, C chevron. They breathe instead of walking.
            var pulse = 1 + 0.06 * Math.sin(timeSec * 4 + x * 0.05);
            var cx = x, cy = y, rx = w / 2 * pulse, ry = h / 2 * pulse;
            ctx.beginPath();
            if (kind === 'enemyA') { ctx.moveTo(cx, cy - ry); ctx.lineTo(cx + rx, cy); ctx.lineTo(cx, cy + ry); ctx.lineTo(cx - rx, cy); }
            else if (kind === 'enemyB') { for (var k6 = 0; k6 < 6; k6++) { var a6 = Math.PI / 6 + k6 * Math.PI / 3; ctx[k6 ? 'lineTo' : 'moveTo'](cx + Math.cos(a6) * rx, cy + Math.sin(a6) * ry); } }
            else { ctx.moveTo(cx - rx, cy - ry); ctx.lineTo(cx, cy - ry * 0.2); ctx.lineTo(cx + rx, cy - ry); ctx.lineTo(cx + rx * 0.55, cy + ry); ctx.lineTo(cx, cy + ry * 0.45); ctx.lineTo(cx - rx * 0.55, cy + ry); }
            ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
            var gl = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
            gl.addColorStop(0, 'rgba(255,255,255,0.45)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,0.3)');
            ctx.fillStyle = gl; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#05060f';
            ctx.fillRect(cx - w * 0.22, cy - 1.5, 3, 3); ctx.fillRect(cx + w * 0.22 - 3, cy - 1.5, 3, 3);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - w * 0.22 + 1, cy - 1, 1, 1); ctx.fillRect(cx + w * 0.22 - 2, cy - 1, 1, 1);
        } else if (kind === 'bonus') {
            //  A small saucer: dome, body and three lights.
            ctx.beginPath(); ctx.ellipse(x, t + h * 0.62, w / 2, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x, t + h * 0.34, w * 0.22, h * 0.34, 0, Math.PI, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = Math.floor(timeSec * 4) % 2 === 0 ? '#000' : '#fff';
            for (var k = -1; k <= 1; k++) { ctx.fillRect(x + k * w * 0.25 - 1, t + h * 0.58, 2, 2); }
        } else {
            ctx.fillRect(l, t, w, h);
        }
        ctx.restore();
    }

    // Built-in explosion: an expanding ring that fades out.
    function drawExplosion(ctx, theme, x, y, age, duration) {
        var frames = theme.images && theme.images.explosion;
        var p = Math.min(1, age / duration);
        if (frames && frames.length) {
            var i = Math.min(frames.length - 1, Math.floor(p * frames.length));
            ctx.drawImage(frames[i], x - 12, y - 12, 24, 24);
            return;
        }
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = theme.palette.explosion;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 3 + p * 12, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    function enemyKind(rank) { return rank < 2 ? 'enemyA' : (rank < 4 ? 'enemyB' : 'enemyC'); }

    window.NeonTheme = { DEFAULT: DEFAULT, load: load, sanitize: sanitize, draw: draw,
                         drawExplosion: drawExplosion, enemyKind: enemyKind };
})();

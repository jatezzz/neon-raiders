/*
    Daily challenge, sharing and anonymous measurement for Neon Raiders.

    - Every calendar day has one challenge, the same for everyone: the same wave formations and the
      same bonus-ship schedule, generated from the date.
    - Best score of the day, attempts and the streak of days played are kept in this browser only
      (localStorage). There are no accounts and no cookies.
    - The game-over screen shares the result as plain text. Every shared link points to the portal,
      whichever copy of the game it was shared from.
    - Events are anonymous counters sent to the portal (no identifier, no cookie). They are skipped
      when the browser sends "Do Not Track" and on local development hosts. See docs/DAILY.md.
*/
(function () {
    'use strict';

    var CONFIG = {
        portal: 'https://games.johnandrestrujillo.com',
        portalHost: 'games.johnandrestrujillo.com',
        playPath: '/play/neon-raiders',
        eventsPath: '/e',
        firstDay: '2026-11-18',          // challenge #1
        buttonsDelayMs: 700,             // game-over buttons ignore taps at first (players are still firing)
        //  Games recommended on the game-over screen; one per day, in turn.
        recommend: [
            { id: 'neon-highway', title: 'Neon Highway', emoji: '🏎️' },
            { id: 'hauberk', title: 'Hauberk', emoji: '🗡️' }
        ]
    };

    var I = window.NeonI18n;
    var embedded = false;
    try { embedded = window.self !== window.top; } catch (err) { embedded = true; }
    var onPortal = window.location.hostname === CONFIG.portalHost;
    var debug = /[?&]debug=true\b/.test(window.location.search);

    // ---------------------------------------------------------------- dates and random numbers

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function dayKey(date) {
        var d = date || new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function toUtcDays(key) {
        var p = key.split('-');
        return Math.round(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) / 86400000);
    }

    //  ?day=YYYY-MM-DD together with ?debug=true plays another day's challenge (for tests).
    var forcedDay = debug ? (window.location.search.match(/[?&]day=(\d{4}-\d{2}-\d{2})\b/) || [])[1] : null;

    function today() { return forcedDay || dayKey(); }
    function challengeNumber(key) { return toUtcDays(key || today()) - toUtcDays(CONFIG.firstDay) + 1; }

    function hash(str) {                       // FNV-1a, 32 bits
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }

    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    //  A random generator for today's challenge. The same tag gives the same sequence to everyone.
    function rng(tag) { return mulberry32(hash(today() + '|' + tag)); }

    // ---------------------------------------------------------------- wave formations

    //  Each pattern says which slots of the rank x file grid hold an enemy.
    var PATTERNS = [
        { name: 'block',    keep: function () { return true; } },
        { name: 'checker',  keep: function (r, f) { return (r + f) % 2 === 0; } },
        { name: 'columns',  keep: function (r, f) { return f % 3 !== 2; } },
        { name: 'wedge',    keep: function (r, f, R, F) { return Math.abs(f - (F - 1) / 2) <= (F - 1) / 2 - r * 0.9; } },
        { name: 'frame',    keep: function (r, f, R, F) { return r === 0 || r === R - 1 || f === 0 || f === F - 1 || (r + f) % 3 === 0; } },
        { name: 'twins',    keep: function (r, f, R, F) { return Math.abs(f - (F - 1) / 2) >= 1.5; } },
        { name: 'stripes',  keep: function (r, f) { return r % 2 === 0 || f % 2 === 0; } },
        { name: 'diamond',  keep: function (r, f, R, F) { return Math.abs(f - (F - 1) / 2) / ((F - 1) / 2) + Math.abs(r - (R - 1) / 2) / ((R - 1) / 2) <= 1.25; } },
        { name: 'zigzag',   keep: function (r, f) { return (f + (r % 2) * 2) % 4 !== 3; } }
    ];
    var MIN_ENEMIES = 24;

    //  The formation of a wave: a pattern picked from the date and the wave number.
    function formation(level, ranks, files) {
        var pattern = PATTERNS[Math.floor(rng('wave' + level)() * PATTERNS.length)];
        var count = 0;
        for (var r = 0; r < ranks; r++) { for (var f = 0; f < files; f++) { if (pattern.keep(r, f, ranks, files)) { count++; } } }
        if (count < MIN_ENEMIES) { pattern = PATTERNS[0]; }
        return { name: pattern.name, keep: function (r, f) { return pattern.keep(r, f, ranks, files); } };
    }

    // ---------------------------------------------------------------- local progress

    function read(key, fallback) {
        try { var v = JSON.parse(window.localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; }
        catch (err) { return fallback; }
    }
    function write(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode: play without progress */ }
    }

    function todayProgress() {
        var p = read('nr.day', null);
        if (!p || p.day !== today()) { p = { day: today(), best: 0, bestWave: 0, attempts: 0 }; }
        return p;
    }

    //  Days in a row with at least one finished game, counting today if already played.
    function currentStreak() {
        var s = read('nr.streak', null);
        if (!s || typeof s.count !== 'number') { return 0; }
        var gap = toUtcDays(today()) - toUtcDays(s.last);
        return gap === 0 || gap === 1 ? s.count : 0;
    }

    function recordRun(result) {
        var p = todayProgress();
        p.attempts += 1;
        var isBest = result.score > p.best;
        if (isBest) { p.best = result.score; p.bestWave = result.wave; }
        var streak = currentStreak();
        if (!forcedDay) {
            var s = read('nr.streak', null);
            if (!s || s.last !== today()) { streak += 1; write('nr.streak', { last: today(), count: streak }); }
            write('nr.day', p);
        }
        return { best: p.best, bestWave: p.bestWave, attempts: p.attempts, isBest: isBest, streak: Math.max(streak, 1) };
    }

    // ---------------------------------------------------------------- links, sharing

    function withUtm(url, source, medium) {
        var from = onPortal ? 'portal' : (window.location.hostname.indexOf('github.io') >= 0 ? 'ghpages' : 'other');
        return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=' + source + '&utm_medium=' + medium +
            '&utm_campaign=d' + today().replace(/-/g, '') + '&utm_content=' + from;
    }

    function shareUrl() { return withUtm(CONFIG.portal + CONFIG.playPath, 'share', 'score'); }

    //  One square per wave: cleared waves, then the wave where the run ended.
    function waveRow(wave) {
        var cleared = Math.max(0, wave - 1), row = '';
        for (var i = 0; i < Math.min(cleared, 9); i++) { row += '🟩'; }
        return row + '💥';
    }

    function shareText(result, summary) {
        var lines = [
            I.t('share.head', { n: challengeNumber(), date: I.shortDate(today()) }),
            '👾 ' + I.t('share.line', { s: I.number(result.score), w: result.wave }) +
                (result.bonus ? ' · 🛸×' + result.bonus : '') +
                (summary.streak > 1 ? ' · 🔥 ' + I.t('share.streak', { n: summary.streak }) : ''),
            waveRow(result.wave),
            I.t('share.dare')
        ];
        return lines.join('\n');
    }

    // ---------------------------------------------------------------- anonymous events

    function trackingAllowed() {
        if (navigator.doNotTrack === '1' || window.doNotTrack === '1') { return false; }
        var h = window.location.hostname;
        return window.location.protocol === 'https:' && h !== 'localhost' && h !== '127.0.0.1';
    }

    var sent = [];      // kept for tests and debugging

    function track(name, props) {
        var q = 'ev=' + encodeURIComponent(name) + '&d=' + today() + '&h=' + encodeURIComponent(window.location.hostname) +
            '&m=' + (embedded ? 'embed' : 'page') + '&l=' + I.lang;
        Object.keys(props || {}).forEach(function (k) { q += '&' + k + '=' + encodeURIComponent(props[k]); });
        sent.push(q);
        if (!trackingAllowed()) { return; }
        var url = CONFIG.portal + CONFIG.eventsPath + '?' + q;
        try {
            if (navigator.sendBeacon) { navigator.sendBeacon(url); } else { (new Image()).src = url; }
        } catch (err) { /* measurement must never break the game */ }
    }

    //  Count arrivals that came from a tagged link (shared result, article, another copy of the game).
    function trackArrival() {
        var search = window.location.search;
        try { if (embedded && window.top.location.search) { search = window.top.location.search; } } catch (err) { /* other origin */ }
        var src = (search.match(/[?&]utm_source=([\w-]+)/) || [])[1];
        if (src) { track('arrive', { src: src, med: (search.match(/[?&]utm_medium=([\w-]+)/) || [])[1] || '' }); }
    }

    // ---------------------------------------------------------------- game-over screen

    var overlay = null, lastShare = null, shownAt = 0;

    function el(id) { return document.getElementById(id); }

    function recommended() {
        return CONFIG.recommend[Math.abs(challengeNumber()) % CONFIG.recommend.length];
    }

    function showFallback(text) {
        var box = el('goFallback');
        box.hidden = false;
        el('goText').value = text;
        el('goWhatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(text);
    }

    function share() {
        if (!lastShare || Date.now() - shownAt < CONFIG.buttonsDelayMs) { return; }
        var text = lastShare.text + '\n' + lastShare.url;
        track('share_tap', {});
        if (navigator.share) {
            navigator.share({ text: text }).then(function () { track('share', { how: 'native' }); })
                .catch(function (err) { if (!err || err.name !== 'AbortError') { showFallback(text); } });
        } else {
            showFallback(text);
        }
    }

    function copy() {
        var text = el('goText').value;
        function done() { el('goCopy').textContent = I.t('over.copied'); track('share', { how: 'copy' }); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () { el('goText').select(); });
        } else {
            el('goText').select();
            try { if (document.execCommand('copy')) { done(); } } catch (err) { /* the text stays selected to copy by hand */ }
        }
    }

    function bind() {
        overlay = el('gameover');
        if (!overlay) { return; }
        el('goShare').addEventListener('click', share);
        el('goCopy').addEventListener('click', copy);
        el('goWhatsapp').addEventListener('click', function () { track('share', { how: 'whatsapp' }); });
        el('goAgain').addEventListener('click', function () {
            if (Date.now() - shownAt < CONFIG.buttonsDelayMs) { return; }
            window.game.keyDown(32); window.game.keyUp(32);
        });
        el('goRec').addEventListener('click', function () { track('rec', { to: recommended().id }); });
        el('goMore').addEventListener('click', function () { track('more', {}); });
    }

    //  Called by the game when a run ends.
    function onGameOver(game) {
        var result = { score: game.score, wave: game.level, kills: game.runStats.kills, bonus: game.runStats.bonus };
        var summary = recordRun(result);
        lastShare = { text: shareText(result, summary), url: shareUrl() };
        track('over', { s: result.score, w: result.wave, b: result.bonus, n: summary.attempts });
        if (!overlay) { return summary; }

        el('goTitle').textContent = I.t('over.title', { n: challengeNumber(), date: I.shortDate(today()) });
        el('goScore').textContent = I.number(result.score);
        el('goMeta').textContent = I.t('over.meta', { w: result.wave, k: result.kills, b: result.bonus });
        el('goRow').textContent = waveRow(result.wave);
        el('goBest').textContent = (summary.isBest ? I.t('over.newbest') : I.t('over.best', { best: I.number(summary.best) })) +
            ' · 🔥 ' + I.t(summary.streak === 1 ? 'over.streak.one' : 'over.streak.many', { n: summary.streak });
        el('goFallback').hidden = true;
        el('goCopy').textContent = I.t('over.copy');

        //  Inside the portal the page around the game already lists the other games.
        var rec = recommended(), links = el('goLinks');
        links.hidden = embedded && onPortal;
        el('goRec').href = withUtm(CONFIG.portal + '/play/' + rec.id, 'game', 'gameover');
        el('goRecEmoji').textContent = rec.emoji;
        el('goRecTitle').textContent = rec.title;
        el('goRecHook').textContent = I.t('rec.' + rec.id);
        el('goMore').href = withUtm(CONFIG.portal + '/play', 'game', 'gameover-more');
        el('goMore').textContent = I.t('over.more', { host: CONFIG.portalHost });

        shownAt = Date.now();
        overlay.hidden = false;
        document.body.classList.add('over');
        return summary;
    }

    function hideOverlay() {
        if (overlay) { overlay.hidden = true; }
        document.body.classList.remove('over');
    }

    //  True while the game-over buttons and the restart key are still locked.
    function locked() { return Date.now() - shownAt < CONFIG.buttonsDelayMs; }

    function onRunStart() {
        hideOverlay();
        track('run', { n: todayProgress().attempts + 1 });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', bind); } else { bind(); }

    window.NeonDaily = {
        CONFIG: CONFIG, today: today, challengeNumber: challengeNumber, rng: rng, formation: formation,
        todayProgress: todayProgress, currentStreak: currentStreak, recordRun: recordRun,
        shareText: shareText, shareUrl: shareUrl, withUtm: withUtm, waveRow: waveRow,
        track: track, trackArrival: trackArrival, sent: sent,
        onRunStart: onRunStart, onGameOver: onGameOver, hideOverlay: hideOverlay, locked: locked,
        embedded: embedded, onPortal: onPortal
    };
})();

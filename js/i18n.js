/*
    Texts for Neon Raiders in Spanish and English.

    Spanish is the default. English is used when the browser language is English, or with ?lang=en.
    The choice made with ?lang= is remembered in this browser.

    NeonI18n.t('key', {n: 3})  -> text with {n} replaced
    NeonI18n.local(value)      -> value itself, or value[lang] when it is {es: '...', en: '...'}
    NeonI18n.apply(root)       -> fills every element that has data-i18n="key"
*/
(function () {
    'use strict';

    var STRINGS = {
        es: {
            'page.title': 'Neon Raiders: reto diario',
            'title.start': 'Pulsa Espacio o toca para empezar',
            'title.daily': 'Reto diario #{n} · {date}',
            'title.shared': 'Reto compartido #{n} · {date}',
            'info.today': 'jugar el reto de hoy',
            'title.status': 'Mejor de hoy: {best} · Racha: {streak}',
            'title.streak': 'Racha: {streak}. Juega hoy para mantenerla.',
            'title.more': 'Más juegos en {host}',
            'hud.lives': 'Vidas: {n}',
            'hud.score': 'Puntos: {s} · Oleada {w}',
            'intro.wave': 'Oleada {n}',
            'intro.ready': 'Empieza en {c}',
            'paused': 'Pausa',
            'bonus.topic': 'Tema de hoy: {t}',
            'bonus.points': '+{p} puntos',
            'over.title': 'Reto #{n} · {date}',
            'over.points': 'puntos',
            'over.meta': 'Oleada {w} · \uD83D\uDC7E {k} · \uD83D\uDEF8 {b}',
            'over.best': 'Mejor de hoy: {best}',
            'over.newbest': '¡Nuevo mejor de hoy!',
            'over.streak.one': 'Racha: 1 día',
            'over.streak.many': 'Racha: {n} días',
            'over.share': 'Compartir resultado',
            'over.again': 'Jugar de nuevo',
            'over.whatsapp': 'Enviar por WhatsApp',
            'over.copy': 'Copiar texto',
            'over.copied': '¡Copiado!',
            'over.try': 'Prueba también',
            'over.more': 'Más juegos en {host}',
            'share.head': 'Neon Raiders · Reto #{n} ({date})',
            'share.line': '{s} pts · oleada {w}',
            'share.streak': 'racha {n}',
            'share.dare': '¿Me superas?',
            'info.desktop': 'Muévete con las flechas, dispara con Espacio y pausa con P. Cada día hay un reto nuevo, igual para todos.',
            'info.touch': 'Arrastra sobre el juego para moverte y toca para disparar, o usa los botones.',
            'info.mute': 'silenciar',
            'info.unmute': 'activar sonido',
            'info.source': 'código en GitHub',
            'info.based': 'basado en',
            'info.portal': 'más juegos',
            'pad.fire': 'FUEGO',
            'rec.neon-highway': 'Carrera synthwave: mejora tu vuelta más rápida.',
            'rec.hauberk': 'Roguelike clásico: cada piso es distinto.'
        },
        en: {
            'page.title': 'Neon Raiders: daily challenge',
            'title.start': 'Press Space or tap to start',
            'title.daily': 'Daily challenge #{n} · {date}',
            'title.shared': 'Shared challenge #{n} · {date}',
            'info.today': "play today's challenge",
            'title.status': 'Best today: {best} · Streak: {streak}',
            'title.streak': 'Streak: {streak}. Play today to keep it.',
            'title.more': 'More games at {host}',
            'hud.lives': 'Lives: {n}',
            'hud.score': 'Score: {s} · Wave {w}',
            'intro.wave': 'Wave {n}',
            'intro.ready': 'Starts in {c}',
            'paused': 'Paused',
            'bonus.topic': 'Topic of the day: {t}',
            'bonus.points': '+{p} points',
            'over.title': 'Challenge #{n} · {date}',
            'over.points': 'points',
            'over.meta': 'Wave {w} · \uD83D\uDC7E {k} · \uD83D\uDEF8 {b}',
            'over.best': 'Best today: {best}',
            'over.newbest': 'New best today!',
            'over.streak.one': 'Streak: 1 day',
            'over.streak.many': 'Streak: {n} days',
            'over.share': 'Share result',
            'over.again': 'Play again',
            'over.whatsapp': 'Send on WhatsApp',
            'over.copy': 'Copy text',
            'over.copied': 'Copied!',
            'over.try': 'Try this next',
            'over.more': 'More games at {host}',
            'share.head': 'Neon Raiders · Challenge #{n} ({date})',
            'share.line': '{s} pts · wave {w}',
            'share.streak': 'streak {n}',
            'share.dare': 'Can you beat me?',
            'info.desktop': 'Move with the arrow keys, fire with Space, pause with P. Every day has a new challenge, the same for everyone.',
            'info.touch': 'Drag on the game to move and tap to fire, or use the buttons.',
            'info.mute': 'mute',
            'info.unmute': 'unmute',
            'info.source': 'source on GitHub',
            'info.based': 'based on',
            'info.portal': 'more games',
            'pad.fire': 'FIRE',
            'rec.neon-highway': 'Synthwave racer: beat your fastest lap.',
            'rec.hauberk': 'Classic roguelike: every floor is new.'
        }
    };

    function pickLang() {
        var forced = (window.location.search.match(/[?&]lang=(es|en)\b/) || [])[1];
        try {
            if (forced) { window.localStorage.setItem('nr.lang', forced); return forced; }
            var saved = window.localStorage.getItem('nr.lang');
            if (saved === 'es' || saved === 'en') { return saved; }
        } catch (err) { if (forced) { return forced; } }
        var nav = (navigator.language || 'es').toLowerCase();
        return nav.indexOf('en') === 0 ? 'en' : 'es';
    }

    var lang = pickLang();

    function t(key, vars) {
        var text = STRINGS[lang][key];
        if (text === undefined) { text = STRINGS.es[key]; }
        if (text === undefined) { return key; }
        return text.replace(/\{(\w+)\}/g, function (m, name) {
            return vars && vars[name] !== undefined ? vars[name] : m;
        });
    }

    //  A theme text can be a plain string or {es: '...', en: '...'}.
    function local(value) {
        if (value && typeof value === 'object') { return value[lang] || value.es || value.en || ''; }
        return value || '';
    }

    function number(n) {
        try { return Number(n).toLocaleString(lang === 'es' ? 'es-EC' : 'en-US'); } catch (err) { return String(n); }
    }

    //  Short date such as "18 nov" or "Nov 18" from a YYYY-MM-DD key.
    function shortDate(dayKey) {
        var p = dayKey.split('-');
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);
        try { return d.toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US', { day: 'numeric', month: 'short' }).replace('.', ''); }
        catch (err) { return dayKey; }
    }

    function apply(root) {
        var nodes = (root || document).querySelectorAll('[data-i18n]');
        Array.prototype.forEach.call(nodes, function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
        document.documentElement.lang = lang;
        document.title = t('page.title');
    }

    window.NeonI18n = { lang: lang, t: t, local: local, number: number, shortDate: shortDate, apply: apply };
})();

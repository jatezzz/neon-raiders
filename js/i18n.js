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
            'paused.hint': 'Esc o P para seguir',
            'paused.hint.touch': 'Toca para seguir',
            'pad.pause': 'Pausa',
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
            'target.title.bot': 'Meta: superar los {t} del bot',
            'target.title.player': 'Meta: superar {t} puntos',
            'target.verified': 'puntaje verificado',
            'target.declared': 'puntaje declarado por quien te retó',
            'target.hud': 'Meta: {t}',
            'target.passed': '¡Superaste los {t}!',
            'over.win': '¡Ganaste por {n}!',
            'over.tie': 'Empate a {t}',
            'over.lose': 'Te faltaron {n}',
            'joke.win.bot.0': 'Humanos 1, máquinas 0.',
            'joke.win.bot.1': 'El bot pide revancha. Que espere.',
            'joke.win.bot.2': 'Ni entrenado me gana.',
            'joke.tie.bot.0': 'Empataste con un bot. No sé qué dice eso de ti.',
            'joke.tie.bot.1': 'Mismo puntaje que la máquina. Sospechoso.',
            'joke.tie.bot.2': 'Empate técnico. Nadie celebra.',
            'joke.lose.bot.0': 'El bot ni siquiera se esforzó.',
            'joke.lose.bot.1': 'La máquina sigue invicta. Por ahora.',
            'joke.lose.bot.2': 'Te ganó un programa de unas pocas líneas.',
            'joke.win.player.0': 'Avísale. Con cariño.',
            'joke.win.player.1': 'Que te devuelva el reto.',
            'joke.win.player.2': 'Eso no se queda así, seguro.',
            'joke.tie.player.0': 'Empate exacto. Eso casi nunca pasa.',
            'joke.tie.player.1': 'Alguien tiene que desempatar.',
            'joke.tie.player.2': 'Mismo puntaje. Qué coincidencia.',
            'joke.lose.player.0': 'Tan cerca. O no tanto.',
            'joke.lose.player.1': 'Una más y ya. Seguro.',
            'joke.lose.player.2': 'No le digas a nadie.',
            'share.win.bot': 'Le gané al bot por {n} 💪 (él hizo {t})',
            'share.tie.bot': 'Empaté a {t} con el bot 🤝',
            'share.lose.bot': 'Me faltaron {n} para los {t} del bot 😅',
            'share.win.player': 'Superé el reto de {t} por {n} 💪',
            'share.tie.player': 'Empaté el reto: {t} 🤝',
            'share.lose.player': 'Me faltaron {n} para el reto de {t} 😅',
            'share.dare.score': 'Te reto a superar mis {s}.',
            'info.desktop': 'Muévete con las flechas, dispara con Espacio, turbo con la flecha arriba y pausa con Esc o P. Cada día hay un reto nuevo, igual para todos.',
            'info.touch': 'Arrastra sobre el juego para moverte y toca para disparar, o usa los botones. El rayo es el turbo.',
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
            'paused.hint': 'Esc or P to continue',
            'paused.hint.touch': 'Tap to continue',
            'pad.pause': 'Pause',
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
            'target.title.bot': "Goal: beat the bot's {t}",
            'target.title.player': 'Goal: beat {t} points',
            'target.verified': 'verified score',
            'target.declared': 'score declared by your challenger',
            'target.hud': 'Goal: {t}',
            'target.passed': 'You passed {t}!',
            'over.win': 'You won by {n}!',
            'over.tie': 'Tied at {t}',
            'over.lose': '{n} short',
            'joke.win.bot.0': 'Humans 1, machines 0.',
            'joke.win.bot.1': 'The bot wants a rematch. Let it wait.',
            'joke.win.bot.2': 'Not even with training.',
            'joke.tie.bot.0': 'You tied with a bot. Not sure what that says about you.',
            'joke.tie.bot.1': 'Same score as the machine. Suspicious.',
            'joke.tie.bot.2': 'A technical draw. Nobody cheers.',
            'joke.lose.bot.0': 'The bot was not even trying.',
            'joke.lose.bot.1': 'The machine is still unbeaten. For now.',
            'joke.lose.bot.2': 'A program a few lines long beat you.',
            'joke.win.player.0': 'Let them know. Gently.',
            'joke.win.player.1': 'Now it is their turn.',
            'joke.win.player.2': 'This will not end here.',
            'joke.tie.player.0': 'An exact tie. That almost never happens.',
            'joke.tie.player.1': 'Somebody has to break it.',
            'joke.tie.player.2': 'Same score. What a coincidence.',
            'joke.lose.player.0': 'So close. Or not really.',
            'joke.lose.player.1': 'One more try. Just one.',
            'joke.lose.player.2': 'Tell no one.',
            'share.win.bot': 'I beat the bot by {n} 💪 (it scored {t})',
            'share.tie.bot': 'I tied the bot at {t} 🤝',
            'share.lose.bot': "I was {n} short of the bot's {t} 😅",
            'share.win.player': 'I beat the {t} challenge by {n} 💪',
            'share.tie.player': 'I tied the challenge: {t} 🤝',
            'share.lose.player': 'I was {n} short of the {t} challenge 😅',
            'share.dare.score': 'I dare you to beat my {s}.',
            'info.desktop': 'Move with the arrow keys, fire with Space, turbo with the up arrow, pause with Esc or P. Every day has a new challenge, the same for everyone.',
            'info.touch': 'Drag on the game to move and tap to fire, or use the buttons. The bolt is the turbo.',
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

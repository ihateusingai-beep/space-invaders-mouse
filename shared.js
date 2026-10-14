/* Space Invaders Mouse — shared storage / audio / profile (Pui Chi) */
(function (global) {
  var LS_NAME = 'si_mouse_name';
  var LS_WHO = 'si_mouse_who';
  var LS_SCORES = 'si_mouse_scores'; // { move:{best, waves}, left:..., right:... }
  var LS_AUTO = 'si_mouse_auto_speak';
  var LOGO = 'https://www.puichi.edu.hk/it-school/php/webcms/files/upload/tinymce//1a__pui_chi_logo_png_1791177564.png';

  var MODES = [
    { id: 'move', title: '左右移', tag: '只移動 · 自動射', emoji: '↔️', skill: '滑鼠左右', speak: '左右移船，自動射' },
    { id: 'left',  title: '左右＋左掣', tag: '移 + 左掣射', emoji: '🖱️', skill: '左掣發射', speak: '左右移，左掣射' },
    { id: 'right', title: '左右＋右掣', tag: '移 + 右掣射', emoji: '👆', skill: '右掣發射', speak: '左右移，右掣射' },
    { id: 'move+',  title: '自由移動',  tag: 'XY移動 · 自動射', emoji: '↗️', skill: '自由移動', speak: '自由移動，自動射', freeMove: true },
    { id: 'left+',  title: '自由＋左掣', tag: 'XY移 + 左掣射', emoji: '🖱️', skill: '左掣發射', speak: '自由移動，左掣射', freeMove: true },
    { id: 'right+', title: '自由＋右掣', tag: 'XY移 + 右掣射', emoji: '👆', skill: '右掣發射', speak: '自由移動，右掣射', freeMove: true }
  ];

  // 4 ships, each with unique stats + 1 unique skill
  var SHIPS = [
    {
      id: 'whale', name: '鯨鯊', emoji: '🐋', color: '#00BCD4', glow: '#00E5FF',
      desc: '均衡型', tag: '新手友善', shipClass: 'balanced',
      hp: 3, shield: 3, fireRate: 1.0, speed: 1.0, bulletType: 'single',
      skill: { id: 'burst', name: '三連射', emoji: '✨', desc: '射出 3 發扇形子彈', cd: 6000, color: '#00E5FF' }
    },
    {
      id: 'swallow', name: '燕子', emoji: '🐦', color: '#FF6B9D', glow: '#FF80AB',
      desc: '速攻型', tag: '高手挑戰', shipClass: 'speed',
      hp: 2, shield: 2, fireRate: 1.6, speed: 1.4, bulletType: 'single',
      skill: { id: 'dash', name: '瞬閃', emoji: '⚡', desc: '0.3s 無敵 + 100px dash', cd: 5000, color: '#FF6B9D' }
    },
    {
      id: 'turtle', name: '烏龜', emoji: '🐢', color: '#4CAF50', glow: '#69F0AE',
      desc: '防禦型', tag: '安全至上', shipClass: 'tank',
      hp: 4, shield: 4, fireRate: 0.7, speed: 0.7, bulletType: 'double',
      skill: { id: 'wall', name: '能量盾牆', emoji: '🛡️', desc: '前方 3s 擋 5 彈', cd: 12000, color: '#69F0AE' }
    },
    {
      id: 'phoenix', name: '鳳凰', emoji: '🔥', color: '#FF8C00', glow: '#FFB74D',
      desc: '燃燒型', tag: '高 combo', shipClass: 'special',
      hp: 3, shield: 3, fireRate: 0.9, speed: 1.0, bulletType: 'flame',
      skill: { id: 'ring', name: '烈焰環', emoji: '💥', desc: '360° 8 發爆發', cd: 10000, color: '#FF8C00' }
    }
  ];

  function shipMeta(id) {
    return SHIPS.find(function (s) { return s.id === id; }) || SHIPS[0];
  }

  function saveShip(s) {
    try { localStorage.setItem('si_mouse_ship', typeof s === 'string' ? s : s.id); } catch (_) {}
  }
  function loadShip() {
    try {
      var id = localStorage.getItem('si_mouse_ship');
      return shipMeta(id || 'whale').id;
    } catch (_) { return 'whale'; }
  }

  var WHO = [
    { id: 'cat', emoji: '🐱', name: '小貓' },
    { id: 'dog', emoji: '🐶', name: '小狗' },
    { id: 'bear', emoji: '🐻', name: '小熊' },
    { id: 'rabbit', emoji: '🐰', name: '小兔' },
    { id: 'panda', emoji: '🐼', name: '熊貓' },
    { id: 'fox', emoji: '🦊', name: '小狐' },
    { id: 'chick', emoji: '🐥', name: '小雞' },
    { id: 'star', emoji: '⭐', name: '星星' }
  ];

  function $(id) { return document.getElementById(id); }

  function loadScores() {
    try { return JSON.parse(localStorage.getItem(LS_SCORES) || '{}') || {}; } catch (_) { return {}; }
  }
  function saveScores(s) { localStorage.setItem(LS_SCORES, JSON.stringify(s)); }

  function bestOf(mode) {
    var s = loadScores()[mode] || {};
    return { best: Number(s.best) || 0, waves: Number(s.waves) || 0, at: s.at || 0 };
  }

  function recordScore(mode, score, waves) {
    score = Number(score) || 0;
    waves = Number(waves) || 0;
    var all = loadScores();
    var prev = all[mode] || { best: 0, waves: 0 };
    var better = score > (prev.best || 0) || (score === prev.best && waves > (prev.waves || 0));
    if (better) {
      all[mode] = {
        best: score,
        waves: waves,
        at: Date.now(),
        name: displayName()
      };
      saveScores(all);
    }
    return { best: Math.max(score, prev.best || 0), waves: Math.max(waves, prev.waves || 0), isNew: better && score > 0 };
  }

  function tierFrom(score, waves) {
    // no time — depth + score
    if (score >= 2000 || waves >= 8) return 'gold';
    if (score >= 800 || waves >= 4) return 'silver';
    if (score >= 200 || waves >= 2) return 'bronze';
    return 'bronze';
  }

  var TIER = {
    bronze: { label: '銅獎', medal: '🥉', color: '#CD7F32' },
    silver: { label: '銀獎', medal: '🥈', color: '#9E9E9E' },
    gold: { label: '金獎', medal: '🥇', color: '#F5B700' }
  };

  function displayName() {
    var n = (localStorage.getItem(LS_NAME) || '').trim();
    if (n) return n;
    try {
      var w = JSON.parse(localStorage.getItem(LS_WHO) || 'null');
      if (w && w.name) return w.name;
    } catch (_) {}
    return '同學';
  }

  function loadWho() {
    try { return JSON.parse(localStorage.getItem(LS_WHO) || 'null'); } catch (_) { return null; }
  }
  function saveWho(w) { localStorage.setItem(LS_WHO, JSON.stringify(w)); }
  function saveName(n) { localStorage.setItem(LS_NAME, (n || '').trim()); }

  function autoSpeak() { return localStorage.getItem(LS_AUTO) === '1'; }
  function setAutoSpeak(on) { localStorage.setItem(LS_AUTO, on ? '1' : '0'); }

  var audioCtx = null;
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function armAudio() {
    window.addEventListener('pointerdown', function () { try { ctx(); } catch (_) {} }, { once: true });
  }
  function tone(f, d, t, v) {
    d = d == null ? 0.1 : d; t = t || 'sine'; v = v == null ? 0.18 : v;
    try {
      var c = ctx(), o = c.createOscillator(), g = c.createGain();
      o.type = t; o.frequency.value = f;
      g.gain.setValueAtTime(v, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + d);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + d);
    } catch (_) {}
  }
  function sfxOk() { tone(523, 0.08); setTimeout(function () { tone(659, 0.08); }, 60); }
  function sfxWin() { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.14, 'triangle', 0.18); }, i * 70); }); }
  function sfxBad() { tone(180, 0.12, 'square', 0.1); }

  function speak(t) {
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t);
      u.lang = 'zh-HK'; u.rate = 0.92;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  function lockSEN() {
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  }

  function modeMeta(id) {
    return MODES.find(function (m) { return m.id === id; }) || MODES[0];
  }

  function gameUrl(mode, ship) {
    var q = new URLSearchParams();
    q.set('mode', mode || 'move');
    if (ship) q.set('ship', ship);
    else q.set('ship', loadShip());
    var n = (localStorage.getItem(LS_NAME) || '').trim();
    if (n) q.set('name', n);
    var w = loadWho();
    if (w && w.id) q.set('who', w.id);
    return './game.html?' + q.toString();
  }

  /** Right-click / two-finger / ctrl-click */
  function bindRight(el, onOk, badMsg) {
    var opened = false, until = 0;
    function go(e) {
      if (opened) return;
      opened = true;
      until = Date.now() + 500;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      onOk();
      setTimeout(function () { opened = false; }, 120);
    }
    el.addEventListener('pointerdown', function (e) { if (e.button === 2 || e.ctrlKey) go(e); }, true);
    el.addEventListener('mousedown', function (e) { if (e.button === 2 || e.ctrlKey) go(e); }, true);
    el.addEventListener('contextmenu', function (e) { go(e); }, true);
    el.addEventListener('auxclick', function (e) { if (e.button === 2) go(e); }, true);
    el.addEventListener('click', function (e) {
      if (opened || Date.now() < until) { e.preventDefault(); return; }
      if (e.ctrlKey || e.metaKey) { go(e); return; }
      if (e.button === 0) { sfxBad(); toast(badMsg || '用右掣／兩指', true); }
    }, true);
  }

  function toast(m, bad) {
    var el = $('toast');
    if (!el) return;
    el.textContent = m;
    el.classList.toggle('bad', !!bad);
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1200);
  }

  function confetti() {
    var box = $('confetti');
    if (!box) return;
    var cols = ['#FF6B9D', '#FFD54F', '#69F0AE', '#4FC3F7', '#B388FF'];
    box.innerHTML = '';
    for (var i = 0; i < 28; i++) {
      var el = document.createElement('i');
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = cols[i % cols.length];
      el.style.animationDuration = (1 + Math.random() * 1.2) + 's';
      box.appendChild(el);
    }
    setTimeout(function () { box.innerHTML = ''; }, 2400);
  }

  global.SIMouse = {
    LOGO, MODES, SHIPS, WHO, TIER, $,
    loadScores, bestOf, recordScore, tierFrom,
    displayName, loadWho, saveWho, saveName, shipMeta, saveShip, loadShip,
    autoSpeak, setAutoSpeak, armAudio, tone, sfxOk, sfxWin, sfxBad, speak,
    lockSEN, modeMeta, gameUrl, bindRight, toast, confetti, ctx
  };
})(window);

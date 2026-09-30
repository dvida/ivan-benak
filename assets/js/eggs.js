/* Easter eggs. Hidden, but not too hard to find:
   1. type  p o e t a  (or click the feather quill three times)  -> a time machine back to his 2003 homepage
   2. type  m a c a                                             -> a kitten strolls by, purrs and recites
   3. click his phone number in any Radio burza ad             -> the old phone rings, "Halo, Ivo ovdje!"
   4. click the red heart in the header five times              -> a rain of hearts and a love poem       */
(function () {
  "use strict";
  var me = document.currentScript;
  var ROOT = me ? me.src.replace(/assets\/js\/eggs\.js.*$/, "") : "";
  var E = window.BENAK_EGGS || { ads: [], love: [], mace: null };
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ---------- sound (Web Audio, made on the spot: no files) ---------- */
  var ac = null;
  function audio() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    return ac;
  }
  function ring(times) {           // an old European phone: 425 Hz, one second on, a pause
    var a = audio();
    if (!a) return;
    for (var i = 0; i < times; i++) {
      var t0 = a.currentTime + i * 2.2;
      [425, 450].forEach(function (f) {
        var o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        o.frequency.value = f; o.type = "square";
        lfo.frequency.value = 20; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(g.gain);   // the bell's trill
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.035, t0 + 0.02);
        g.gain.setValueAtTime(0.035, t0 + 1.0);
        g.gain.linearRampToValueAtTime(0.0001, t0 + 1.05);
        o.connect(g); g.connect(a.destination);
        o.start(t0); lfo.start(t0); o.stop(t0 + 1.1); lfo.stop(t0 + 1.1);
      });
    }
  }
  function purr(sec) {             // brown noise, low-passed, fluttering at ~24 Hz
    var a = audio();
    if (!a) return;
    var n = Math.floor(a.sampleRate * sec), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      var flutter = 0.55 + 0.45 * Math.sin(2 * Math.PI * 24 * i / a.sampleRate);
      var breath = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.45 * i / a.sampleRate);
      d[i] = last * 9 * flutter * (0.35 + 0.65 * breath);
    }
    var src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; lp.type = "lowpass"; lp.frequency.value = 380; g.gain.value = 0.9;
    src.connect(lp); lp.connect(g); g.connect(a.destination);
    src.start();
  }

  /* ---------- a little Windows-95-ish window ---------- */
  function win(title, html, cls) {
    var w = document.createElement("div");
    w.className = "w95 " + (cls || "");
    w.setAttribute("role", "dialog");
    w.innerHTML = '<div class="w95-bar"><span>' + esc(title) + '</span><button type="button" aria-label="Zatvori / Close">&#10005;</button></div>' +
      '<div class="w95-body">' + html + "</div>";
    w.querySelector(".w95-bar button").addEventListener("click", function () { w.remove(); });
    document.body.appendChild(w);
    return w;
  }
  function excerpt(x) {
    return '<div class="w95-cols"><div lang="hr"><b>' + esc(x.th) + "</b><p>" + x.hr.map(esc).join("<br>") + "</p></div>" +
      '<div lang="en"><b>' + esc(x.te) + "</b><p>" + x.en.map(esc).join("<br>") + "</p></div></div>" +
      '<p class="w95-link"><a href="' + ROOT + "pjesme/" + x.s + '.html">Pročitaj cijelu pjesmu · <i>Read the whole poem</i> &rarr;</a></p>';
  }

  /* ---------- 1. time machine to 2003 ---------- */
  function timeMachine() {
    if (document.getElementById("tm2003")) return;
    var t = document.createElement("div");
    t.id = "tm2003";
    var icon = function (img, w, h, label, href) {
      return '<td><a href="' + ROOT + href + '"><img src="' + ROOT + "assets/img/orig/" + img + '" width="' + w + '" height="' + h + '" alt=""></a><br><b>' + label + "</b></td>";
    };
    var yr = new Date().getFullYear();
    t.innerHTML =
      '<div class="tm-banner"><p>&#8987; Ovako je stranica izgledala 2003. godine <i>· This is how it looked in 2003</i></p>' +
      '<button type="button" class="tm-back">&#8617; Natrag u ' + yr + '. <i>· Back to ' + yr + "</i></button></div>" +
      '<div class="tm-marquee"><span>IVAN BENAK POETA</span></div>' +
      '<table class="tm-icons"><tr>' +
      icon("srce.gif", 63, 63, "poeta", "zivotopis.html") + icon("pero.gif", 64, 96, "izdavaštvo", "knjige.html") +
      icon("pjesme.gif", 55, 53, "pjesme", "pjesme/index.html") + icon("benak1.jpg", 100, 73, "home", "index.html") +
      "</tr></table><hr>" +
      '<p class="tm-verse">Ivan Benak mi je ime,<br>pjesnik koji piše rime,<br>ulica se pisat mora,<br>Pejačević slavna Dora,<br>' +
      "ako netko me potraži,<br>moje kuće broj pet važi,<br>još dodajte mjesto moje,<br>znajte slavno Valpovo je,<br>" +
      "a telefon stalno vrijedan:<br>nula trideset i jedan,<br>šesto pedeset i dva,<br>osamsto dvadeset jedan.</p>" +
      '<p class="tm-by">product by franCUZ</p><hr>' +
      '<p class="tm-small">Najbolje pregledavati u Internet Exploreru 5.0 pri razlučivosti 800×600 · free-os.htnet.hr/benak</p>';
    document.body.appendChild(t);
    document.body.classList.add("tm-on");
    var close = function () { t.remove(); document.body.classList.remove("tm-on"); };
    t.querySelector(".tm-back").addEventListener("click", close);
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
  }

  /* ---------- 2. the kitten ---------- */
  var CAT = '<svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">' +
    '<path class="tail" d="M20 50 C 2 44, 4 18, 16 14" fill="none" stroke="#3a3a3a" stroke-width="7" stroke-linecap="round"/>' +
    '<ellipse cx="52" cy="50" rx="32" ry="17" fill="#f4f1ea" stroke="#3a3a3a" stroke-width="2"/>' +
    '<ellipse cx="45" cy="44" rx="12" ry="8" fill="#3a3a3a"/>' +
    '<g class="legs" stroke="#3a3a3a" stroke-width="6" stroke-linecap="round"><line class="l1" x1="34" y1="62" x2="32" y2="76"/><line class="l2" x1="44" y1="62" x2="46" y2="76"/>' +
    '<line class="l1" x1="66" y1="62" x2="64" y2="76"/><line class="l2" x1="76" y1="62" x2="78" y2="76"/></g>' +
    '<circle cx="90" cy="34" r="17" fill="#f4f1ea" stroke="#3a3a3a" stroke-width="2"/>' +
    '<path d="M77 24 L80 8 L90 19 Z M103 24 L100 8 L90 19 Z" fill="#3a3a3a"/>' +
    '<ellipse cx="84" cy="33" rx="2.6" ry="3.4" fill="#2b2118"/><ellipse cx="96" cy="33" rx="2.6" ry="3.4" fill="#2b2118"/>' +
    '<path d="M88 39 L92 39 L90 41.5 Z" fill="#e8959b"/>' +
    '<path d="M86 43 Q90 46 94 43" fill="none" stroke="#2b2118" stroke-width="1.2"/>' +
    '<g stroke="#2b2118" stroke-width=".9"><line x1="80" y1="40" x2="66" y2="37"/><line x1="80" y1="42" x2="66" y2="44"/><line x1="100" y1="40" x2="114" y2="37"/><line x1="100" y1="42" x2="114" y2="44"/></g></svg>';
  function kitten() {
    if (document.querySelector(".kitty")) return;
    var k = document.createElement("div");
    k.className = "kitty walking" + (calm ? " calm" : "");
    k.innerHTML = CAT;
    document.body.appendChild(k);
    var stopAt = Math.max(20, Math.min(window.innerWidth * 0.55, window.innerWidth - 360));
    k.style.left = (calm ? stopAt : -130) + "px";
    requestAnimationFrame(function () { k.style.left = stopAt + "px"; });
    setTimeout(function () {
      k.classList.remove("walking");
      purr(3.2);
      if (E.mace) {
        var b = document.createElement("div");
        b.className = "kitty-say";
        b.innerHTML = "<p>" + E.mace.hr.map(esc).join("<br>") + '</p><p lang="en"><i>' + E.mace.en.map(esc).join("<br>") + "</i></p>" +
          '<a href="' + ROOT + 'pjesme/zaspalo-mace.html">— Zaspalo mače</a>';
        k.appendChild(b);
      }
      setTimeout(function () {
        var s = k.querySelector(".kitty-say");
        if (s) s.remove();
        k.classList.add("walking");
        k.style.left = (window.innerWidth + 140) + "px";
        setTimeout(function () { k.remove(); }, calm ? 10 : 4200);
      }, 7000);
    }, calm ? 50 : 4000);
  }

  /* ---------- 3. the phone ---------- */
  function phone(el) {
    if (document.querySelector(".w95.phone-win")) return;
    ring(2);
    el.classList.add("ringing");
    setTimeout(function () { el.classList.remove("ringing"); }, 3400);
    setTimeout(function () {
      var ad = pickOne(E.ads.length ? E.ads : [{ s: "podaci-o-pjesniku", th: "", te: "", hr: [], en: [] }]);
      win("Radio burza · 031/652-821",
        '<p class="phone-hello">&#9742; Halo, Ivo ovdje! <i lang="en">Hello, Ivo speaking!</i></p>' +
        '<p class="w95-small">Imam nešto za vas… · <i lang="en">I have something for you…</i></p>' + excerpt(ad), "phone-win");
    }, 2300);
  }

  /* ---------- 4. hearts ---------- */
  function hearts() {
    if (!calm) {
      for (var i = 0; i < 28; i++) {
        var h = document.createElement("img");
        h.src = ROOT + "assets/img/orig/srce.gif";
        h.className = "heart-drop";
        h.alt = "";
        var size = 16 + Math.random() * 30;
        h.style.width = size + "px";
        h.style.left = Math.random() * 100 + "vw";
        h.style.animationDuration = (3 + Math.random() * 3.5) + "s";
        h.style.animationDelay = (Math.random() * 1.2) + "s";
        document.body.appendChild(h);
        (function (x) { setTimeout(function () { x.remove(); }, 8000); })(h);
      }
    }
    setTimeout(function () {
      if (!E.love.length || document.querySelector(".w95.love-win")) return;
      win("Ljubavna pjesma · A love poem", excerpt(pickOne(E.love)), "love-win");
    }, calm ? 0 : 1600);
  }

  window.BENAK_KITTEN = kitten;       // also used by the Find-a-poem search (finder.js)

  /* ---------- triggers ---------- */
  var typed = "";
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (!e.key || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-8);
    if (/poeta$/.test(typed)) { typed = ""; timeMachine(); }
    else if (/maca$/.test(typed)) { typed = ""; kitten(); }
  });
  function clicks(el, need, within, fn) {
    if (!el) return;
    var times = [];
    el.addEventListener("click", function () {
      var now = Date.now();
      times = times.filter(function (x) { return now - x < within; });
      times.push(now);
      if (times.length >= need) { times = []; fn(); }
    });
  }
  var imgs = document.querySelectorAll(".masthead > img");
  clicks(imgs[0], 3, 1500, timeMachine);   // the feather
  clicks(imgs[1], 5, 3000, hearts);        // the heart
  document.addEventListener("click", function (e) {
    var p = e.target.closest && e.target.closest(".phone");
    if (p) phone(p);
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("phone")) {
      e.preventDefault();
      phone(e.target);
    }
  });
})();

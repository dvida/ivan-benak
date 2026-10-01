/* Easter eggs. Hidden, but not too hard to find:
   1. type  p o e t a  (or click the feather quill three times)  -> a time machine back to his 2003 homepage
   2. type  m a c a                                             -> a kitten strolls by, purrs and recites
   3. click his phone number in any Radio burza ad             -> the old phone rings, "Molim? Ivica pri telefonu."
   4. click the red heart in the header five times              -> a rain of hearts and a love poem       */
(function () {
  "use strict";
  var me = document.currentScript;
  var ROOT = me ? me.src.replace(/assets\/js\/eggs\.js.*$/, "") : "";
  var DATA = (me && me.getAttribute("data-eggs")) || ROOT + "assets/js/eggs-data.js";

  /* the eggs' texts (radio ads, love poems, the kitten's verse) are only fetched the first time an egg hatches */
  var E = null, waiting = [];
  function withData(fn) {
    if (E) { fn(); return; }
    waiting.push(fn);
    if (waiting.length > 1) return;          // already on its way
    var done = function () {
      E = window.BENAK_EGGS || { ads: [], love: [], mace: null };
      var w = waiting; waiting = [];
      for (var i = 0; i < w.length; i++) w[i]();
    };
    var s = document.createElement("script");
    s.src = DATA;
    s.onload = done;
    s.onerror = done;                          // offline: the eggs still hatch, just without their verses
    document.head.appendChild(s);
  }
  function preload() { typeface(); withData(function () {}); }
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
  // both languages, each in its lang-marked element: site.css shows what the language switch asks for
  function bi(hr, en, sep) {
    return '<span lang="hr">' + hr + '</span><span class="t-sep">' + (sep || " · ") + '</span><span lang="en">' + en + "</span>";
  }
  function langAttr(el, a, hr, en, both) {   // an attribute in two versions, kept in step with the switch by site.js
    el.setAttribute(a, both || hr + " · " + en);
    el.setAttribute("data-" + a + "-hr", hr);
    el.setAttribute("data-" + a + "-en", en);
    if (window.BENAK_LANG) window.BENAK_LANG.attrs(el);
  }

  /* ---------- sound (Web Audio, made on the spot: no files) ---------- */
  var ac = null;
  function audio() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    return ac;
  }
  var bellBuf = null;
  function bell(a) {               // an old rotary-dial phone: a clapper hammering two metal gongs, ~25 strikes a second
    if (bellBuf) return bellBuf;
    var sr = a.sampleRate, on = 1.2, n = Math.floor(sr * (on + 0.6)), buf = a.createBuffer(1, n, sr), d = buf.getChannelData(0);
    var gongs = [1900, 2250], partials = [[1, 1], [2.32, 0.55], [4.25, 0.3], [6.63, 0.15]];   // inharmonic, like a struck bowl
    for (var k = 0; k * 0.04 < on; k++) {
      var s0 = Math.floor(k * 0.04 * sr), f0 = gongs[k % 2], hit = 0.8 + 0.2 * Math.random(), len = Math.floor(sr * 0.5);
      for (var j = 0; j < len && s0 + j < n; j++) {
        var t = j / sr, v = 0;
        for (var p = 0; p < partials.length; p++)
          v += partials[p][1] * Math.exp(-t * (6 + 9 * p)) * Math.sin(2 * Math.PI * f0 * partials[p][0] * t);
        if (j < sr * 0.002) v += (Math.random() * 2 - 1) * 0.6 * (1 - j / (sr * 0.002));   // the clapper's click
        d[s0 + j] += v * hit;
      }
    }
    var sum = 0;
    for (var i = 0; i < n; i++) sum += d[i] * d[i];
    var scale = 0.2 / Math.sqrt(sum / Math.floor(sr * on));   // same loudness whatever the sample rate
    for (i = 0; i < n; i++) d[i] = Math.max(-0.9, Math.min(0.9, d[i] * scale));
    return (bellBuf = buf);
  }
  function ring(times) {           // one long ring, a pause, and again
    var a = audio();
    if (!a) return;
    var b = bell(a);
    for (var i = 0; i < times; i++) {
      var src = a.createBufferSource();
      src.buffer = b; src.connect(a.destination);
      src.start(a.currentTime + i * 2.6);
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
    src.buffer = buf; lp.type = "lowpass"; lp.frequency.value = 380; g.gain.value = 0.45;
    src.connect(lp); lp.connect(g); g.connect(a.destination);
    src.start();
  }

  /* ---------- dialogs: focus moves in, Esc closes the newest one, focus goes back where it was ---------- */
  var stack = [];
  function openDialog(el, label, onClose, noFocus) {     // label: [hr, en]
    var back = document.activeElement;
    el.setAttribute("role", "dialog");
    langAttr(el, "aria-label", label[0], label[1], label[2]);
    el.tabIndex = -1;
    var d = { el: el, close: null };
    d.close = function () {
      var i = stack.indexOf(d);
      if (i < 0) return;
      stack.splice(i, 1);
      var hadFocus = el.contains(document.activeElement);
      if (onClose) onClose(); else el.remove();
      if ((hadFocus || !noFocus) && back && back !== document.body && document.contains(back) && back.focus) back.focus();
    };
    stack.push(d);
    if (!noFocus) el.focus({ preventScroll: true });
    return d;
  }
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && stack.length) { e.preventDefault(); stack[stack.length - 1].close(); }
  });

  /* ---------- a typed note on paper (he wrote on a typewriter, so the eggs' pop-ups look typed) ---------- */
  var typeface = function () {     // the typewriter face, fetched from Google Fonts only when the first egg hatches
    typeface = function () {};
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Special+Elite&display=swap";
    document.head.appendChild(l);
  };
  function win(title, html, cls, head) {   // title: [hr, en, both-mode]; head: the typed heading's HTML (default: both, with " · ")
    typeface();
    var w = document.createElement("div");
    w.className = "paper-note " + (cls || "");
    w.innerHTML = '<div class="paper-note-top"><p class="paper-note-head">' + (head || bi(esc(title[0]), esc(title[1]))) + "</p>" +
      '<button type="button" class="paper-note-x"><span aria-hidden="true">&times;</span> ' + bi("zatvori", "close") + "</button></div>" +
      '<div class="paper-note-body">' + html + "</div>" +
      '<div class="paper-note-foot"><button type="button" class="paper-note-close">' + bi("Zatvori", "Close") + "</button></div>";
    var link = w.querySelector(".paper-note-body .paper-note-link");      // "Read the whole poem" sits beside the second close
    if (link) w.querySelector(".paper-note-foot").appendChild(link);
    langAttr(w.querySelector(".paper-note-x"), "aria-label", "Zatvori", "Close");
    document.body.appendChild(w);
    var d = openDialog(w, title);
    w.querySelector(".paper-note-x").addEventListener("click", d.close);
    w.querySelector(".paper-note-close").addEventListener("click", d.close);
    return w;
  }
  function excerpt(x) {
    return '<div class="paper-note-cols"><div lang="hr"><b>' + esc(x.th) + "</b><p>" + x.hr.map(esc).join("<br>") + "</p></div>" +
      '<div lang="en"><b>' + esc(x.te) + "</b><p>" + x.en.map(esc).join("<br>") + "</p></div></div>" +
      '<p class="paper-note-link"><a href="' + ROOT + "pjesme/" + x.s + '.html">' + bi("Pročitaj cijelu pjesmu", "<i>Read the whole poem</i>") + " &rarr;</a></p>";
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
    // the banner and its button follow the language switch; the page under them is a replica of his Croatian
    // homepage of 2003 and stays as it was (.keep-lang: shown in every mode)
    t.innerHTML =
      '<div class="tm-banner"><p>&#8987; ' + bi("Ovako je stranica izgledala 2003. godine", "<i>This is how it looked in 2003</i>") + "</p>" +
      '<button type="button" class="tm-back">&#8617; ' + bi("Natrag u " + yr + ".", "<i>Back to " + yr + "</i>") + "</button></div>" +
      '<div class="tm-page keep-lang" lang="hr">' +
      '<div class="tm-marquee"><span>IVAN BENAK POETA</span></div>' +
      '<table class="tm-icons"><tr>' +
      icon("srce.gif", 63, 63, "poeta", "zivotopis.html") + icon("pero.gif", 64, 96, "izdavaštvo", "knjige.html") +
      icon("pjesme.gif", 55, 53, "pjesme", "pjesme/index.html") + icon("benak1.jpg", 100, 73, "home", "index.html") +
      "</tr></table><hr>" +
      '<p class="tm-verse">Ivan Benak mi je ime,<br>pjesnik koji piše rime,<br>ulica se pisat mora,<br>Pejačević slavna Dora,<br>' +
      "ako netko me potraži,<br>moje kuće broj pet važi,<br>još dodajte mjesto moje,<br>znajte slavno Valpovo je,<br>" +
      "a telefon stalno vrijedan:<br>nula trideset i jedan,<br>šesto pedeset i dva,<br>osamsto dvadeset jedan.</p>" +
      '<p class="tm-small">(' + bi("Taj broj više nije u upotrebi", "<i>that number is no longer in use</i>") + ")</p>" +
      '<p class="tm-by">product by franCUZ</p><hr>' +
      '<p class="tm-small">Najbolje pregledavati u Internet Exploreru 5.0 pri razlučivosti 800×600 · free-os.htnet.hr/benak</p></div>';
    document.body.appendChild(t);
    document.body.classList.add("tm-on");
    var pg = document.querySelector(".page");
    if (pg) pg.inert = true;                     // modal: Tab stays in 2003
    t.setAttribute("aria-modal", "true");
    var d = openDialog(t, ["Stranica iz 2003.", "The site in 2003"], function () {
      t.remove(); document.body.classList.remove("tm-on");
      if (pg) pg.inert = false;
    });
    t.querySelector(".tm-back").addEventListener("click", d.close);
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
  function kitten(focusIt) {     // focusIt: only when summoned from the keyboard, never from the search box
    if (document.querySelector(".kitty")) return;
    preload();
    var k = document.createElement("div");
    k.className = "kitty walking" + (calm ? " calm" : "");
    k.innerHTML = CAT;
    document.body.appendChild(k);
    var stopAt = Math.max(20, Math.min(window.innerWidth * 0.55, window.innerWidth - 360));
    k.style.left = (calm ? stopAt : -130) + "px";
    requestAnimationFrame(function () { k.style.left = stopAt + "px"; });
    var gone = false;
    var leave = function () {        // the bubble closes and the kitten walks off (also on Esc)
      if (gone) return;
      gone = true;
      var s = k.querySelector(".kitty-say");
      if (s) s.remove();
      k.classList.add("walking");
      k.style.left = (window.innerWidth + 140) + "px";
      setTimeout(function () { k.remove(); }, calm ? 10 : 4200);
    };
    var dk = openDialog(k, ["Mače", "The kitten"], leave, true);   // Esc sends it away even while it walks in
    setTimeout(function () {
      if (gone) return;
      k.classList.remove("walking");
      purr(3.2);
      withData(function () { say(); setTimeout(dk.close, 7000); });
    }, calm ? 50 : 4000);
    function say() {
      if (gone) return;
      if (E.mace) {
        var b = document.createElement("div");
        b.className = "kitty-say";
        b.innerHTML = '<p lang="hr">' + E.mace.hr.map(esc).join("<br>") + '</p><p lang="en"><i>' + E.mace.en.map(esc).join("<br>") + "</i></p>" +
          '<a href="' + ROOT + 'pjesme/zaspalo-mace.html">— <span lang="hr">' + esc(E.mace.th || "Zaspalo mače") + "</span>" +
          '<span lang="en" class="solo">' + esc(E.mace.te || E.mace.th || "Zaspalo mače") + "</span></a>";
        b.tabIndex = -1;
        k.appendChild(b);
        if (focusIt) b.focus({ preventScroll: true });
      }
    }
  }

  /* ---------- 3. the phone ---------- */
  function phone(el) {
    if (document.querySelector(".paper-note.phone-win")) return;
    preload();
    ring(2);
    el.classList.add("ringing");
    setTimeout(function () { el.classList.remove("ringing"); }, 3400);
    setTimeout(function () { withData(function () {
      if (document.querySelector(".paper-note.phone-win")) return;
      var ad = pickOne(E.ads.length ? E.ads : [{ s: "podaci-o-pjesniku", th: "", te: "", hr: [], en: [] }]);
      win(["Radio burza · 031/652-821", "Radio ads · 031/652-821", "Radio burza · 031/652-821"],
        '<p class="phone-hello">&#9742; <span lang="hr">Molim? Ivica pri telefonu.</span> <i lang="en">Hello? Ivica speaking.</i></p>' +
        '<p class="paper-note-small">' + bi("Imam nešto za vas…", "<i>I have something for you…</i>") + "</p>" + excerpt(ad), "phone-win",
        '<span lang="hr">Radio burza</span><span lang="en" class="solo">Radio ads</span> · 031/652-821');
    }); }, 2300);
  }

  /* ---------- 4. hearts ---------- */
  function hearts() {
    preload();
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
    setTimeout(function () { withData(function () {
      if (!E.love.length || document.querySelector(".paper-note.love-win")) return;
      win(["Ljubavna pjesma", "A love poem"], excerpt(pickOne(E.love)), "love-win");
    }); }, calm ? 0 : 1600);
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
    else if (/maca$/.test(typed)) { typed = ""; kitten(true); }
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

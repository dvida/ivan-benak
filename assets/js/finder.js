/* "Pronađi pjesmu / Find a poem": a small bilingual search over hand-made tags, plus a map of meaning.
   Data: window.BENAK_FINDER (built by tools/finder.py). The normaliser/stemmer mirrors the Python one. */
(function () {
  "use strict";
  var F = window.BENAK_FINDER;
  if (!F) return;
  var FOLD = { "č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "d" };
  var STOP = {};
  F.stop.forEach(function (w) { STOP[w] = 1; });
  var CAT = {
    ljubavne: ["#b5382f", "Ljubavne", "Love"], zavicajne: ["#4f7a3a", "Zavičajne", "Homeland"],
    djecje: ["#d98b2b", "Za djecu", "Children"], obiteljske: ["#7a4f8f", "Obiteljske", "Family"],
    humoristicne: ["#b39018", "Humoristične", "Humour"], "radio-burza": ["#3f8a86", "Radio burza", "Radio ads"],
    protestne: ["#5a3d2b", "Protestne", "Protest"], umirovljenicke: ["#6b7a8f", "Umirovljeničke", "Pensioners"],
    razmisljanja: ["#3d5a9e", "Razmišljanja", "Reflections"], duhovne: ["#9a5aa8", "Duhovne", "Spiritual"],
    prigodne: ["#a0937a", "Prigodne", "Occasional"]
  };

  function fold(s) { return s.toLowerCase().replace(/[čćšžđ]/g, function (c) { return FOLD[c]; }); }
  function stem(w) {
    if (w.length <= 3 || w.slice(-2) === "ss") return w;
    for (var i = 0; i < F.suffixes.length; i++) {
      var s = F.suffixes[i];
      if (w.length - s.length >= 3 && w.slice(-s.length) === s) return w.slice(0, -s.length);
    }
    return w;
  }
  function tokens(s) {
    return (fold(s).match(/[a-z]+/g) || []).filter(function (t) { return !STOP[t] && t.length > 1; }).map(stem);
  }
  function near(a, b) {           // same stem, or one a prefix of the other (both ≥ 4 letters)
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    return a.indexOf(b) === 0 || b.indexOf(a) === 0;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  var kidsSet = {};
  F.kids.forEach(function (w) { kidsSet[w] = 1; });

  function search(q) {
    var qt = tokens(q);
    if (!qt.length) return { res: [], tags: [] };
    var hitTags = {}, kids = false;
    qt.forEach(function (t) {
      if (kidsSet[t]) kids = true;
      F.lex.forEach(function (e) {
        for (var i = 0; i < e.w.length; i++) if (near(t, e.w[i])) { hitTags[e.id] = e; break; }
      });
    });
    var res = F.items.map(function (it) {
      var sc = 0, why = {};
      Object.keys(hitTags).forEach(function (id) {
        var e = hitTags[id];
        if (e.k === "m" && it.m[id]) { sc += 2.2 * it.m[id]; why[id] = e; }
        if (e.k === "t" && it.t.indexOf(id) >= 0) { sc += 4; why[id] = e; }
      });
      qt.forEach(function (t) {
        var idf = function (w) { return F.idf[w] || 2; };
        for (var i = 0; i < it.k.length; i++) if (near(t, it.k[i])) { sc += 1.4 * idf(it.k[i]); break; }
        for (var j = 0; j < it.ti.length; j++) if (near(t, it.ti[j])) { sc += 2.5; break; }
        for (var k = 0; k < it.x.length; k++) if (it.x[k] === t) { sc += 0.6 * idf(t); break; }
        if (fold(it.sh + " " + it.se).indexOf(t) >= 0) sc += 1;
      });
      if (kids) sc += it.a === "children" ? 3 : it.a === "all" ? 1.5 : -3;
      if (it.c === "radio-burza" && !hitTags.humor && !hitTags.oglas) sc *= 0.6;   // the ads only when asked for
      if (it.c === "prigodne") sc *= 0.8;
      return { it: it, sc: sc, why: why };
    }).filter(function (r) { return r.sc > 1.5; });
    res.sort(function (a, b) { return b.sc - a.sc; });
    return { res: res, tags: Object.keys(hitTags).map(function (k) { return hitTags[k]; }) };
  }

  /* ---------------- map ---------------- */
  var svg = document.getElementById("pmap");
  var tip = document.getElementById("ptip");
  var W = 1000, H = 720, PAD = 30, dots = {};
  function px(p) { return [PAD + p[0] * (W - 2 * PAD), PAD + p[1] * (H - 2 * PAD)]; }
  function drawMap() {
    if (!svg) return;
    var ns = "http://www.w3.org/2000/svg", g = document.createElementNS(ns, "g");
    F.items.forEach(function (it) {
      var xy = px(it.p), a = document.createElementNS(ns, "a");
      a.setAttribute("href", "pjesme/" + it.s + ".html");
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", xy[0]); c.setAttribute("cy", xy[1]); c.setAttribute("r", 4.2);
      c.setAttribute("fill", (CAT[it.c] || ["#888"])[0]);
      c.setAttribute("class", "dot");
      c.setAttribute("data-c", it.c);
      a.appendChild(c);
      a.addEventListener("mouseenter", function (e) { showTip(it, e); });
      a.addEventListener("focus", function (e) { showTip(it, e); });
      a.addEventListener("mouseleave", hideTip);
      a.addEventListener("blur", hideTip);
      g.appendChild(a);
      dots[it.s] = c;
    });
    svg.appendChild(g);
    var labels = document.createElementNS(ns, "g");   // drawn last, so the themes sit on top of the dots
    labels.setAttribute("class", "regions");
    F.regions.forEach(function (r) {
      var xy = px([r.x, r.y]);
      var t = document.createElementNS(ns, "text");
      t.setAttribute("x", xy[0]); t.setAttribute("y", xy[1]); t.setAttribute("class", "reg");
      t.setAttribute("text-anchor", "middle");
      t.textContent = r.hr;
      var t2 = document.createElementNS(ns, "tspan");
      t2.setAttribute("x", xy[0]); t2.setAttribute("dy", "1.15em"); t2.setAttribute("class", "reg-en");
      t2.textContent = r.en;
      t.appendChild(t2);
      labels.appendChild(t);
    });
    svg.appendChild(labels);
    var leg = document.getElementById("plegend");
    if (leg) leg.innerHTML = Object.keys(CAT).map(function (k) {
      return '<label><input type="checkbox" checked data-cat="' + k + '"> <span class="sw" style="background:' + CAT[k][0] + '"></span>' +
        esc(CAT[k][1]) + ' <i lang="en">' + esc(CAT[k][2]) + "</i></label>";
    }).join("");
    if (leg) leg.addEventListener("change", function (e) {
      var k = e.target.getAttribute("data-cat");
      Object.keys(dots).forEach(function (s) {
        if (dots[s].getAttribute("data-c") === k) dots[s].style.display = e.target.checked ? "" : "none";
      });
    });
  }
  function showTip(it, e) {
    if (!tip) return;
    tip.innerHTML = "<b>" + esc(it.th) + "</b><br><i>" + esc(it.te) + "</i>" +
      (it.sh ? '<div class="tip-s">' + esc(it.sh) + '</div><div class="tip-s" lang="en">' + esc(it.se) + "</div>" : "");
    var box = svg.getBoundingClientRect(), c = e.target.closest ? e.target : null;
    var r = (dots[it.s] || c).getBoundingClientRect();
    tip.style.left = Math.min(box.width - 260, Math.max(0, r.left - box.left + 10)) + "px";
    tip.style.top = (r.top - box.top + 14) + "px";
    tip.hidden = false;
  }
  function hideTip() { if (tip) tip.hidden = true; }
  function highlight(list) {
    var on = {};
    list.forEach(function (r, i) { on[r.it.s] = i < 12 ? 2 : 1; });
    if (svg) svg.classList.toggle("searching", list.length > 0);
    Object.keys(dots).forEach(function (s) {
      var d = dots[s];
      d.classList.toggle("dim", list.length > 0 && !on[s]);
      d.classList.toggle("hit", on[s] === 2);
      d.setAttribute("r", on[s] === 2 ? 7 : on[s] ? 5 : 4.2);
    });
  }

  /* ---------------- results ---------------- */
  var input = document.getElementById("pq"), out = document.getElementById("presults");
  var CATS = /(^|[^a-z])(mac[aeiu]?|macan|macak|mack[aeiu]?|mace|macic|mac[aeu]k|mjau|cat|cats|kitten|kittens|kitty|purr|meow)([^a-z]|$)/;
  var catShown = false;
  function kittenCheck(q) {   // easter egg: any cat word in the search brings the kitten
    var hit = CATS.test(fold(q));
    if (hit && !catShown) {
      catShown = true;
      var go = function (tries) {
        if (window.BENAK_KITTEN) window.BENAK_KITTEN();
        else if (tries < 20) setTimeout(function () { go(tries + 1); }, 150);
      };
      go(0);
    }
    if (!hit) catShown = false;
  }
  function render(q) {
    kittenCheck(q);
    var r = search(q), list = r.res;
    highlight(list);
    if (!q.trim()) { out.innerHTML = ""; return; }
    if (!list.length) {
      out.innerHTML = '<p class="pending">Nisam pronašao pjesmu za te riječi; pokušajte drugim riječima ili odaberite nešto ispod. · ' +
        '<span lang="en">No poem found for those words; try other words or pick one below.</span></p>';
      return;
    }
    var head = r.tags.length ? '<p class="found">Tražim: ' + r.tags.map(function (t) {
      return '<span class="chip-s">' + esc(t.hr) + " · " + esc(t.en) + "</span>";
    }).join(" ") + "</p>" : "";
    out.innerHTML = head + list.slice(0, 12).map(function (x) {
      var it = x.it, c = CAT[it.c] || ["#888", "", ""];
      return '<div class="m presult"><div class="hr" lang="hr">' +
        '<p class="kicker"><span class="sw" style="background:' + c[0] + '"></span>' + esc(c[1]) + '</p>' +
        '<h3><a href="pjesme/' + it.s + '.html">' + esc(it.th) + "</a></h3>" +
        (it.sh ? '<p class="sum">' + esc(it.sh) + "</p>" : "") +
        '<p class="first">' + it.l1.map(esc).join("<br>") + " …</p></div>" +
        '<div class="en" lang="en"><p class="kicker">' + esc(c[2]) + '</p>' +
        '<h3><a href="pjesme/' + it.s + '.html">' + esc(it.te) + "</a></h3>" +
        (it.se ? '<p class="sum">' + esc(it.se) + "</p>" : "") +
        '<p class="first">' + it.l2.map(esc).join("<br>") + " …</p></div></div>";
    }).join("") + (list.length > 12 ? '<p class="more">+ ' + (list.length - 12) + ' pjesama na karti · <span lang="en">more poems lit on the map</span></p>' : "");
  }
  var timer;
  if (input) {
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { render(input.value); }, 180); });
    document.getElementById("pform").addEventListener("submit", function (e) { e.preventDefault(); render(input.value); });
  }
  var chips = document.getElementById("pchips");
  if (chips) {
    chips.innerHTML = F.chips.map(function (c) {
      return '<button type="button" data-q="' + esc(c.q) + '">' + esc(c.hr) + ' <i lang="en">' + esc(c.en) + "</i></button>";
    }).join(" ") + ' <button type="button" id="prandom">Iznenadi me <i lang="en">Surprise me</i></button>';
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.id === "prandom") {
        var pool = F.items.filter(function (it) { return it.c !== "radio-burza" && it.c !== "prigodne"; });
        window.location.href = "pjesme/" + pool[Math.floor(Math.random() * pool.length)].s + ".html";
        return;
      }
      input.value = b.getAttribute("data-q");
      render(input.value);
    });
  }
  drawMap();
  var m = /[?&]q=([^&]+)/.exec(window.location.search);
  if (m && input) { input.value = decodeURIComponent(m[1].replace(/\+/g, " ")); render(input.value); }
})();

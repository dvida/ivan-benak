/* "Pronađi pjesmu / Find a poem": a small bilingual search over hand-made tags, plus a map of meaning.
   Data: window.BENAK_FINDER (built and packed by tools/finder.py, unpacked below). The normaliser/stemmer mirrors the Python one. */
(function () {
  "use strict";
  var F = window.BENAK_FINDER;
  if (!F) return;
  var FOLD = { "č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "d" };
  var STOP = {};
  F.stop.forEach(function (w) { STOP[w] = 1; });
  var SOFT = {};
  (F.soft || []).forEach(function (w) { SOFT[w] = 1; });
  var COMP = (F.comp || []).map(function (c) { return [new RegExp(c[0], "g"), " " + c[1] + " "]; });
  var CAT = {
    ljubavne: ["#b5382f", "Ljubavne", "Love"], zavicajne: ["#4f7a3a", "Zavičajne", "Homeland"],
    djecje: ["#d98b2b", "Za djecu", "Children"], obiteljske: ["#7a4f8f", "Obiteljske", "Family"],
    humoristicne: ["#b39018", "Humoristične", "Humour"], "radio-burza": ["#3f8a86", "Radio burza", "Radio ads"],
    protestne: ["#5a3d2b", "Protestne", "Protest"], umirovljenicke: ["#6b7a8f", "Umirovljeničke", "Pensioners"],
    razmisljanja: ["#3d5a9e", "Razmišljanja", "Reflections"], duhovne: ["#9a5aa8", "Duhovne", "Spiritual"],
    prigodne: ["#a0937a", "Prigodne", "Occasional"]
  };
  // a matched tag that is what a whole category is about lifts that category's poems a little
  var CAT_OF_TAG = {
    humor: "humoristicne", ljubav: "ljubavne", "ljubav-par": "ljubavne", vjera: "duhovne", "vjera-bog": "duhovne",
    gnjev: "protestne", umirovljenici: "umirovljenicke", oglas: "radio-burza", djeca: "djecje",
    slavonija: "zavicajne", domovina: "zavicajne", "zavicaj-sopje": "zavicajne", valpovo: "zavicajne", selo: "zavicajne",
    obitelj: "obiteljske", majka: "obiteljske", otac: "obiteljske", unuci: "obiteljske", supruga: "obiteljske",
    prolaznost: "razmisljanja", "zahvala-posveta": "prigodne"
  };

  function fold(s) {
    s = s.toLowerCase().replace(/[čćšžđ]/g, function (c) { return FOLD[c]; }).replace(/’/g, "'");
    COMP.forEach(function (c) { s = s.replace(c[0], c[1]); });
    return s;
  }
  function stem(w) {
    if (w.length <= 3 || w.slice(-2) === "ss") return w;
    for (var i = 0; i < F.suffixes.length; i++) {
      var s = F.suffixes[i];
      if (w.length - s.length >= 3 && w.slice(-s.length) === s) return s === "y" ? w.slice(0, -1) + "i" : w.slice(0, -s.length);
    }
    return w;
  }
  function rawTokens(s) { return (fold(s).match(/[a-z]+/g) || []).map(function (t) { return [t, stem(t)]; }); }
  function tokens(s, stop) {
    stop = stop || STOP;
    return rawTokens(s).filter(function (t) { return !stop[t[0]] && t[0].length > 1; }).map(function (t) { return t[1]; });
  }
  // a = query stem, b = stem in the index. Same stem; or the query is a prefix of b (only from 5 letters on);
  // or b is a prefix of the query, i.e. an inflection the stemmer missed (b from 4 letters in the lexicon,
  // from 5 in the uncurated keywords and titles; at most 3 extra letters).
  function near(a, b, minB) {
    if (a === b) return true;
    if (a.length >= 5 && b.indexOf(a) === 0) return true;
    return b.length >= (minB || 5) && a.length - b.length <= 3 && a.indexOf(b) === 0;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function set(list) { var o = {}; list.forEach(function (w) { o[w] = 1; }); return o; }
  function slug(s) {          // tools/assemble.py slugify()
    s = s.replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s.slice(0, 70).replace(/-+$/, "") || "pjesma";
  }
  // tools/finder.py pack() ships the data compactly; rebuild the poems, word weights and lexicon the search reads
  function unpack() {
    F.lex.forEach(function (e) {
      e.w = e.w ? e.w.split(" ") : []; e.x = e.x ? e.x.split(" ") : []; e.p = e.p ? e.p.split("|") : [];
    });
    function lines(s) { return s ? s.split("\n") : []; }
    F.items = F.items.map(function (r) {
      var m = {};
      for (var j = 0; j < r[9].length; j += 2) m[F.lex[r[9][j]].id] = r[9][j + 1];
      return {
        s: r[0] || slug(r[2]), c: F.cats[r[1]], th: r[2], te: r[3], sh: r[4], se: r[5], l1: lines(r[6]), l2: lines(r[7]),
        a: F.aud[r[8]], m: m, t: r[10].map(function (j) { return F.lex[j].id; }), p: [r[11] / 1e4, r[12] / 1e4], r: r[13],
        su: r[14]
      };
    });
  }
  // the word index is only needed by the search: built on the first search, not when the page opens
  function unpackIndex() {
    var val = {}, fin = F.fin, nc = F.abc.length - fin, sh = set(F.sthr), se = set(F.sten), i;
    for (i = 0; i < F.abc.length; i++) val[F.abc.charAt(i)] = i;
    F.items.forEach(function (it) {
      it.k = []; it.ti = []; it.x = [];
      it.su = it.su != null ? it.su.split(" ") : Object.keys(set(tokens(it.sh, sh).concat(tokens(it.se, se)))).sort();
    });
    // per idf group, each word followed by its postings (poem index gap * 7 + field mask - 1, base-n digits)
    F.idf = {};
    F.ix.forEach(function (g) {
      var s = g[1], n = s.length, i = 0, w, prev, c, q, v, it;
      while (i < n) {
        for (c = i; i < n && s.charCodeAt(i) >= 97 && s.charCodeAt(i) <= 122; i++);
        w = s.slice(c, i); F.idf[w] = g[0] / 100; prev = -1;
        while (i < n && !(s.charCodeAt(i) >= 97 && s.charCodeAt(i) <= 122)) {
          for (q = 0; (v = val[s.charAt(i)]) >= fin; i++) q = q * nc + v - fin + 1;
          v = q * fin + v; i++;
          prev += Math.floor(v / 7) + 1; v = v % 7 + 1; it = F.items[prev];
          if (v & 1) it.k.push(w);
          if (v & 2) it.ti.push(w);
          if (v & 4) it.x.push(w);
        }
      }
    });
    F.items.forEach(function (it) { it.k.sort(); it.ti.sort(); });
    F.ix = null;
  }
  if (F.fmt === 2) unpack();

  var kidsSet = {};
  F.kids.forEach(function (w) { kidsSet[w] = 1; });
  F.items.forEach(function (it) {
    var tot = 0;
    Object.keys(it.m).forEach(function (m) { tot += it.m[m]; });
    it.mt = tot || 1;
  });

  function search(q) {
    if (F.ix) unpackIndex();
    var raw = rawTokens(q), rs = raw.map(function (t) { return t[1]; });
    var hitTags = {}, used = [], kids = false;
    // 1. phrases, longest first, as whole phrases
    var found = [];
    F.lex.forEach(function (e) {
      (e.p || []).forEach(function (p) {
        var ws = p.split(" ");
        for (var i = 0; i + ws.length <= rs.length; i++) {
          var ok = true;
          for (var j = 0; j < ws.length && ok; j++) ok = rs[i + j] === ws[j];
          if (ok) found.push([e, i, ws.length]);
        }
      });
    });
    found.sort(function (a, b) { return b[2] - a[2]; });
    var taken = [], groups = [];
    found.forEach(function (f) {
      for (var i = f[1]; i < f[1] + f[2]; i++) if (taken[i] && taken[i] > f[2]) return;
      hitTags[f[0].id] = f[0];
      var g = [];
      for (var k = f[1]; k < f[1] + f[2]; k++) {
        used[k] = 1; taken[k] = Math.max(taken[k] || 0, f[2]);
        if (!STOP[raw[k][0]] && raw[k][0].length > 1) g.push(raw[k][1]);
      }
      if (g.length > 1 && !groups.some(function (x) { return x.join() === g.join(); })) groups.push(g);
    });
    // 2. single words (not already part of a phrase); 'song' only counts when it is the whole query
    var qt = [], content = raw.filter(function (t) { return !STOP[t[0]] && t[0].length > 1 && !SOFT[t[0]]; }).length;
    raw.forEach(function (t, i) {
      if (STOP[t[0]] || t[0].length < 2 || (content && SOFT[t[0]])) return;
      if (kidsSet[t[1]]) kids = true;
      if (used[i]) return;        // a matched phrase is one idea: 'growing up' is not about growing
      qt.push(t[1]);
      F.lex.forEach(function (e) {
        if (e.x.indexOf(t[1]) >= 0) { hitTags[e.id] = e; return; }
        for (var k = 0; k < e.w.length; k++) if (near(t[1], e.w[k], 4)) { hitTags[e.id] = e; break; }
      });
    });
    if (!qt.length && !groups.length && !Object.keys(hitTags).length) return { res: [], tags: [] };
    var idf = function (w) { return F.idf[w] || 2; };
    function tokScore(it, t) {      // one query word against a poem's keywords, title, text and summary
      var sc = 0, i;
      for (i = 0; i < it.k.length; i++) if (near(t, it.k[i])) { sc += 1.4 * idf(it.k[i]); break; }
      for (i = 0; i < it.ti.length; i++) if (near(t, it.ti[i])) { sc += 2.5; break; }
      for (i = 0; i < it.x.length; i++) if (it.x[i] === t) { sc += 0.6 * idf(t); break; }
      for (i = 0; i < it.su.length; i++) if (near(t, it.su[i])) { sc += 1; break; }
      return sc;
    }
    var res = F.items.map(function (it) {
      var sc = 0, why = {}, catHit = false;
      Object.keys(hitTags).forEach(function (id) {
        var e = hitTags[id];
        // the tag's share of the poem breaks ties: a poem that is mostly sorrow before one with a touch of it
        if (e.k === "m" && it.m[id]) { sc += 2.2 * it.m[id] + 2 * it.m[id] / it.mt; why[id] = e; }
        if (e.k === "t" && it.t.indexOf(id) >= 0) { sc += 4 + 1.5 / it.t.length; why[id] = e; }
        if (CAT_OF_TAG[id] === it.c) catHit = true;
      });
      if (catHit) sc += 2;
      qt.forEach(function (t) { sc += tokScore(it, t); });
      groups.forEach(function (g) {   // the words of a matched phrase count only when the poem has them all
        var p = g.map(function (t) { return tokScore(it, t); });
        if (p.every(function (x) { return x > 0; })) p.forEach(function (x) { sc += x; });
      });
      if (kids) sc += it.a === "children" ? 3 : it.a === "all" ? 1.5 : -3;
      if (it.c === "radio-burza" && !hitTags.oglas) sc *= 0.6;   // the ads only when asked for
      if (it.c === "prigodne") sc *= 0.8;
      return { it: it, sc: sc, why: why };
    });
    res.sort(function (a, b) { return b.sc - a.sc || (a.it.th < b.it.th ? -1 : 1); });
    // only real matches: an absolute floor, and nothing far below the best one
    var top = res.length ? res[0].sc : 0, floor = Math.max(3, Math.min(top * 0.25, 4));
    res = res.filter(function (r) { return r.sc >= floor; });
    return { res: res, tags: Object.keys(hitTags).map(function (k) { return hitTags[k]; }) };
  }

  /* ---------------- map ---------------- */
  var svg = document.getElementById("pmap");
  var tip = document.getElementById("ptip");
  var W = 1000, H = 720, PAD = 30, dots = {}, lit = null;
  var ns = "http://www.w3.org/2000/svg";
  function px(p) { return [PAD + p[0] * (W - 2 * PAD), PAD + p[1] * (H - 2 * PAD)]; }
  function kScale() {        // dots keep a usable size when the map is drawn small (phones)
    var w = svg ? svg.getBoundingClientRect().width : W;
    return w ? Math.max(1, Math.min(2.2, 640 / w)) : 1;
  }
  var K = 1;
  function radius(s) { var st = lit && lit[s]; return K * (st === 2 ? 7 : st ? 5 : 4.2); }
  function drawMap() {
    if (!svg) return;
    svg.setAttribute("role", "group");     // not "img": the poems inside must stay reachable
    K = kScale();
    var g = document.createElementNS(ns, "g");
    g.setAttribute("class", "dots");
    F.items.forEach(function (it) {
      var xy = px(it.p), a = document.createElementNS(ns, "a");
      a.setAttribute("href", "pjesme/" + it.s + ".html");
      a.setAttribute("tabindex", "-1");     // keyboard: the region labels below lead to lists of these links
      a.setAttribute("aria-label", it.th + " / " + it.te);
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", xy[0]); c.setAttribute("cy", xy[1]); c.setAttribute("r", radius(it.s));
      c.setAttribute("fill", (CAT[it.c] || ["#888"])[0]);
      c.setAttribute("class", "dot");
      c.setAttribute("data-c", it.c);
      a.appendChild(c);
      a.addEventListener("mouseenter", function () { if (!touchy) showTip(it); });
      a.addEventListener("focus", function () { showTip(it); });
      a.addEventListener("mouseleave", function () { if (!touchy) hideTip(); });
      a.addEventListener("blur", function () { if (!touchy) hideTip(); });
      g.appendChild(a);
      dots[it.s] = c;
    });
    svg.appendChild(g);
    var labels = document.createElementNS(ns, "g");   // drawn last, so the themes sit on top of the dots
    labels.setAttribute("class", "regions");
    F.regions.forEach(function (r, ri) {
      var xy = px([r.x, r.y]);
      var b = document.createElementNS(ns, "g");
      b.setAttribute("class", "reg-b");
      b.setAttribute("role", "button");
      b.setAttribute("tabindex", "0");
      b.setAttribute("aria-expanded", "false");
      b.setAttribute("aria-controls", "pregion");
      b.setAttribute("aria-label", r.hr + " / " + r.en + ": " + pjesme(r.n) + " / " + r.n + " poems");
      b.setAttribute("data-r", ri);
      var t = document.createElementNS(ns, "text");
      t.setAttribute("x", xy[0]); t.setAttribute("y", xy[1]); t.setAttribute("class", "reg");
      t.setAttribute("text-anchor", "middle");
      t.textContent = r.hr;
      var t2 = document.createElementNS(ns, "tspan");
      t2.setAttribute("x", xy[0]); t2.setAttribute("dy", "1.15em"); t2.setAttribute("class", "reg-en");
      t2.textContent = r.en;
      t.appendChild(t2);
      b.appendChild(t);
      labels.appendChild(b);
    });
    svg.appendChild(labels);
    regLabels = labels;
    layoutLabels();
    labels.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".reg-b");
      if (b) { e.stopPropagation(); toggleRegion(+b.getAttribute("data-r"), b, false); }
    });
    labels.addEventListener("keydown", function (e) {
      var b = e.target.closest && e.target.closest(".reg-b");
      if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleRegion(+b.getAttribute("data-r"), b, true); }
    });
    // touch: a tap selects the nearest poem within a finger's width and shows its card with a link
    svg.addEventListener("pointerdown", function (e) { touchy = e.pointerType === "touch" || e.pointerType === "pen"; });
    svg.addEventListener("click", function (e) {
      if (!touchy) return;
      e.preventDefault();
      var box = svg.getBoundingClientRect(), u = W / box.width;
      var x = (e.clientX - box.left) * u, y = (e.clientY - box.top) * u, best = null, bd = Math.pow(24 * u, 2);
      F.items.forEach(function (it) {
        if (dots[it.s].style.display === "none") return;
        var xy = px(it.p), d = Math.pow(xy[0] - x, 2) + Math.pow(xy[1] - y, 2);
        if (d < bd) { bd = d; best = it; }
      });
      if (best) showTip(best, true); else hideTip();
    });
    var leg = document.getElementById("plegend");
    if (leg) leg.innerHTML = Object.keys(CAT).map(function (k) {
      return '<label><input type="checkbox" checked data-cat="' + k + '"> <span class="sw" style="background:' + CAT[k][0] + '"></span>' +
        esc(CAT[k][1]) + ' <i lang="en">' + esc(CAT[k][2]) + "</i></label>";
    }).join("");
    if (leg) leg.addEventListener("change", function (e) {
      var k = e.target.getAttribute("data-cat");
      Object.keys(dots).forEach(function (s) {
        if (dots[s].getAttribute("data-c") === k) dots[s].parentNode.style.display = dots[s].style.display = e.target.checked ? "" : "none";
      });
    });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var k = kScale();
        if (Math.abs(k - K) > 0.05) { K = k; Object.keys(dots).forEach(function (s) { dots[s].setAttribute("r", radius(s)); }); }
        layoutLabels();
      }, 200);
    });
  }
  var touchy = false, regLabels = null;
  // keep every region label inside the map and clear of the others, measured as drawn (the font grows on phones)
  function layoutLabels() {
    if (!regLabels) return;
    var bs = Array.prototype.slice.call(regLabels.childNodes), pos = F.regions.map(function (r) { return px([r.x, r.y]); });
    function place(i) {
      var t = bs[i].firstChild;
      t.setAttribute("x", pos[i][0]); t.setAttribute("y", pos[i][1]); t.firstElementChild.setAttribute("x", pos[i][0]);
    }
    bs.forEach(function (b, i) { place(i); });
    for (var it = 0; it < 300; it++) {
      var bx = bs.map(function (b) { return b.getBBox(); }), moved = false;
      bx.forEach(function (a, i) {
        if (!a.width) return;
        var dx = a.x < 4 ? 4 - a.x : a.x + a.width > W - 4 ? W - 4 - a.x - a.width : 0;
        var dy = a.y < 4 ? 4 - a.y : a.y + a.height > H - 4 ? H - 4 - a.y - a.height : 0;
        if (dx || dy) { pos[i][0] += dx; pos[i][1] += dy; moved = true; }
      });
      for (var i = 0; i < bx.length; i++) for (var j = i + 1; j < bx.length; j++) {
        var a = bx[i], b = bx[j];
        if (a.x < b.x + b.width + 6 && b.x < a.x + a.width + 6 && a.y < b.y + b.height + 3 && b.y < a.y + a.height + 3) {
          var up = a.y + a.height / 2 <= b.y + b.height / 2 ? i : j, dn = up === i ? j : i;
          pos[up][1] -= 3; pos[dn][1] += 3; moved = true;
        }
      }
      bs.forEach(function (b, i) { place(i); });
      if (!moved) break;
    }
  }
  function showTip(it, tap) {
    if (!tip) return;
    tip.innerHTML = "<b>" + esc(it.th) + "</b><br><i>" + esc(it.te) + "</i>" +
      (it.sh ? '<div class="tip-s">' + esc(it.sh) + '</div><div class="tip-s" lang="en">' + esc(it.se) + "</div>" : "") +
      (tap ? '<a class="tip-go" href="pjesme/' + it.s + '.html">Otvori pjesmu · <span lang="en">Open the poem</span> »</a>' : "");
    tip.classList.toggle("tap", !!tap);
    var box = svg.getBoundingClientRect();
    var r = dots[it.s].getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(box.width - 260, r.left - box.left + 10)) + "px";
    tip.style.top = (r.top - box.top + 14) + "px";
    tip.hidden = false;
  }
  function hideTip() { if (tip) tip.hidden = true; }
  document.addEventListener("click", function (e) {
    if (tip && !tip.hidden && touchy && !svg.contains(e.target) && !tip.contains(e.target)) hideTip();
  });
  function highlight(list, shown) {
    lit = list.length ? {} : null;
    list.forEach(function (r, i) { lit[r.it.s] = i < shown ? 2 : 1; });
    if (svg) svg.classList.toggle("searching", list.length > 0);
    Object.keys(dots).forEach(function (s) {
      var d = dots[s];
      d.classList.toggle("dim", !!lit && !lit[s]);
      d.classList.toggle("hit", !!lit && lit[s] === 2);
      d.setAttribute("r", radius(s));
    });
  }

  /* region lists: the keyboard and screen-reader way into the map */
  var panel = null, openR = -1, Q = /^[„“”"'«»(\s]+/;
  function toggleRegion(ri, btn, byKey) {
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "pregion";
      panel.className = "pregion";
      panel.hidden = true;
      var wrap = svg.parentNode;
      wrap.parentNode.insertBefore(panel, wrap.nextSibling);
      panel.addEventListener("click", function (e) {
        if (e.target.closest(".pregion-x")) closeRegion(true);
      });
      panel.addEventListener("keydown", function (e) { if (e.key === "Escape") closeRegion(true); });
    }
    var was = openR;
    hideTip();
    closeRegion(false);
    if (was === ri) { if (byKey) btn.focus(); return; }
    openR = ri;
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("on");
    var r = F.regions[ri];
    var its = F.items.filter(function (it) { return it.r === ri; })
      .sort(function (a, b) { return a.th.replace(Q, "").localeCompare(b.th.replace(Q, ""), "hr"); });
    panel.innerHTML = '<p class="pregion-h"><b>' + esc(r.hr) + '</b> · <i lang="en">' + esc(r.en) + '</i> — ' +
      pjesme(its.length) + ' · <span lang="en">' + its.length + ' poems</span> ' +
      '<button type="button" class="pregion-x">Zatvori · <span lang="en">Close</span></button></p><ul>' +
      its.map(function (it) {
        return '<li><span class="sw" style="background:' + (CAT[it.c] || ["#888"])[0] + '"></span><a href="pjesme/' + it.s + '.html">' +
          esc(it.th) + '</a> <i lang="en">' + esc(it.te) + "</i></li>";
      }).join("") + "</ul>";
    panel.hidden = false;
    if (!input || !input.value.trim()) highlight(its.map(function (it) { return { it: it }; }), 0);
    var first = panel.querySelector("li a");
    if (first && byKey) first.focus();      // keyboard: straight into the list; Esc comes back
  }
  function closeRegion(refocus) {
    if (!panel || openR < 0) return;
    var btn = svg.querySelector('.reg-b[data-r="' + openR + '"]');
    if (btn) { btn.setAttribute("aria-expanded", "false"); btn.classList.remove("on"); }
    openR = -1;
    panel.hidden = true;
    if (!input || !input.value.trim()) highlight([], 0);
    if (refocus && btn) btn.focus();
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
  function form(n) {          // Croatian: 1, 21, 31 pjesma; 2-4, 22-24 pjesme; 5-20, 25-30 pjesama
    var d = n % 10, h = n % 100;
    return d === 1 && h !== 11 ? 0 : d >= 2 && d <= 4 && (h < 12 || h > 14) ? 1 : 2;
  }
  function pjesme(n) { return n + " " + ["pjesma", "pjesme", "pjesama"][form(n)]; }
  function plural(n) { return ["Pronađena je ", "Pronađene su ", "Pronađeno je "][form(n)] + pjesme(n); }
  var PAGE = 12, list = [], shown = 0, status = null;
  if (out) {
    status = document.createElement("p");      // one polite announcement per search, not the whole list
    status.className = "pcount";
    status.setAttribute("role", "status");
    out.parentNode.insertBefore(status, out);
    out.removeAttribute("aria-live");
  }
  function card(x) {
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
  }
  function moreButton() {
    var left = list.length - shown, n = Math.min(PAGE, left);
    return left > 0 ? '<p class="pmore-p"><button type="button" class="pmore">Prikaži još ' + n +
      ' · <span lang="en">Show ' + n + " more</span></button> <span class=\"pleft\">(još " + left + " · <span lang=\"en\">" +
      left + " left</span>)</span></p>" : "";
  }
  function showMore() {
    var old = out.querySelector(".pmore-p");
    if (old) old.parentNode.removeChild(old);
    var from = shown;
    shown = Math.min(list.length, shown + PAGE);
    out.insertAdjacentHTML("beforeend", list.slice(from, shown).map(card).join("") + moreButton());
    highlight(list, shown);
    var cards = out.querySelectorAll(".presult");
    var a = cards[from] && cards[from].querySelector("h3 a");
    if (a) a.focus();
  }
  function render(q) {
    kittenCheck(q);
    closeRegion(false);
    var r = search(q);
    list = r.res;
    shown = Math.min(PAGE, list.length);
    highlight(list, shown);
    if (!q.trim()) { out.innerHTML = ""; status.textContent = ""; return; }
    if (!list.length) {
      status.textContent = "";
      out.innerHTML = '<p class="pending">Nisam pronašao pjesmu za te riječi; pokušajte drugim riječima ili odaberite nešto ispod. · ' +
        '<span lang="en">No poem found for those words; try other words or pick one below.</span></p>';
      return;
    }
    status.innerHTML = esc(plural(list.length)) + ' · <span lang="en">' + list.length + (list.length === 1 ? " poem" : " poems") +
      " found</span>";
    var head = r.tags.length ? '<p class="found">Tražim: ' + r.tags.map(function (t) {
      return '<span class="chip-s">' + esc(t.hr) + " · " + esc(t.en) + "</span>";
    }).join(" ") + "</p>" : "";
    out.innerHTML = head + list.slice(0, shown).map(card).join("") + moreButton();
  }
  if (out) out.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".pmore")) showMore();
  });
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

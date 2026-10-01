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
  // every UI string in both languages, each in its lang-marked element; site.css shows the one(s) the switch asks for
  function bi(hr, en, sep) {
    return '<span lang="hr">' + hr + '</span><span class="t-sep">' + (sep || " · ") + '</span><span lang="en">' + en + "</span>";
  }
  function mode() { return window.BENAK_LANG ? window.BENAK_LANG.mode() : "both"; }
  function langAttr(el, a, hr, en, both) {    // an attribute with two versions: site.js (BENAK_LANG) keeps it in step
    el.setAttribute(a, both || hr + " / " + en);
    el.setAttribute("data-" + a + "-hr", hr);
    el.setAttribute("data-" + a + "-en", en);
    if (window.BENAK_LANG) window.BENAK_LANG.attrs(el);
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
  F.items.forEach(function (it, n) {
    var tot = 0;
    Object.keys(it.m).forEach(function (m) { tot += it.m[m]; });
    it.mt = tot || 1;
    it.g = F.sg ? F.sg.charAt(n) : ".";     // its sub-group in the zoomed view of its category ("." = none)
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
  var K = 1, ZR = 1;        // ZR: zoomed in, dots shrink in map units but grow a little on screen (see setView)
  function radius(s) { var st = lit && lit[s]; return K * ZR * (st === 2 ? 7 : st ? 5 : 4.2); }
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
      langAttr(a, "aria-label", it.th, it.te);
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
      if (r.c && F.zoom && F.zoom[r.c]) {     // a region named after a category zooms in on that category
        b.setAttribute("data-z", r.c);
        langAttr(b, "aria-label", r.hr + ": približi skupinu " + CAT[r.c][1], r.en + ": zoom in on " + CAT[r.c][2],
          r.hr + " / " + r.en + ": približi skupinu / zoom in on " + CAT[r.c][1] + " / " + CAT[r.c][2]);
      } else {
        b.setAttribute("aria-expanded", "false");
        b.setAttribute("aria-controls", "pregion");
        langAttr(b, "aria-label", r.hr + ": " + pjesme(r.n), r.en + ": " + r.n + " poems",
          r.hr + " / " + r.en + ": " + pjesme(r.n) + " / " + r.n + " poems");
      }
      b.setAttribute("data-r", ri);
      var t = document.createElementNS(ns, "text");
      t.setAttribute("x", xy[0]); t.setAttribute("y", xy[1]); t.setAttribute("class", "reg");
      t.setAttribute("text-anchor", "middle");
      var t1 = document.createElementNS(ns, "tspan");       // the Croatian name, and the English under it
      t1.setAttribute("lang", "hr"); t1.setAttribute("class", "reg-hr");
      t1.textContent = r.hr;
      t.appendChild(t1);
      var t2 = document.createElementNS(ns, "tspan");
      t2.setAttribute("x", xy[0]); t2.setAttribute("dy", "1.15em"); t2.setAttribute("class", "reg-en"); t2.setAttribute("lang", "en");
      t2.textContent = r.en;
      t.appendChild(t2);
      b.appendChild(t);
      labels.appendChild(b);
    });
    svg.appendChild(labels);
    regLabels = labels;
    layoutLabels();
    function regionGo(b, byKey) {
      var z = b.getAttribute("data-z");
      if (z) zoomTo(z, { push: true, byKey: byKey });
      else toggleRegion(+b.getAttribute("data-r"), b, byKey);
    }
    labels.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".reg-b");
      if (b) { e.stopPropagation(); regionGo(b, false); }
    });
    labels.addEventListener("keydown", function (e) {
      var b = e.target.closest && e.target.closest(".reg-b");
      if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); regionGo(b, true); }
    });
    // touch: a tap selects the nearest poem within a finger's width and shows its card with a link
    svg.addEventListener("pointerdown", function (e) { touchy = e.pointerType === "touch" || e.pointerType === "pen"; });
    svg.addEventListener("click", function (e) {
      if (!touchy || (e.target.closest && e.target.closest(".co, .sub-b"))) return;   // callout links and sub-labels act themselves
      e.preventDefault();
      var box = svg.getBoundingClientRect(), u = view.w / box.width;
      var x = view.x + (e.clientX - box.left) * u, y = view.y + (e.clientY - box.top) * u, best = null, bd = Math.pow(24 * u, 2);
      F.items.forEach(function (it) {
        if (dots[it.s].style.display === "none" || (zoomCat && it.c !== zoomCat)) return;
        var xy = px(it.p), d = Math.pow(xy[0] - x, 2) + Math.pow(xy[1] - y, 2);
        if (d < bd) { bd = d; best = it; }
      });
      if (best) showTip(best, true); else hideTip();
    });
    var leg = document.getElementById("plegend");
    // each category: a check box (show or hide its dots) and its name, a button that zooms the map in on it
    if (leg) leg.innerHTML = Object.keys(CAT).map(function (k) {
      return '<span class="pleg"><label class="pcb"><input type="checkbox" checked data-cat="' + k + '"></label>' +
        '<button type="button" class="pzb" data-zoom="' + k + '" aria-pressed="false"><span class="sw" style="background:' + CAT[k][0] + '"></span>' +
        '<span lang="hr">' + esc(CAT[k][1]) + '</span> <i lang="en">' + esc(CAT[k][2]) + "</i></button></span>";
    }).join("");
    if (leg) Array.prototype.forEach.call(leg.querySelectorAll(".pleg"), function (el) {
      var cb = el.querySelector("input"), k = cb.getAttribute("data-cat");
      langAttr(cb, "aria-label", "Prikaži na karti: " + CAT[k][1], "Show on the map: " + CAT[k][2]);
      langAttr(el.lastChild, "aria-label", "Približi na karti: " + CAT[k][1], "Zoom the map in on: " + CAT[k][2]);
      langAttr(el.lastChild, "title", "Približi na karti", "Zoom the map in");
    });
    if (leg) leg.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".pzb");
      if (!b) return;
      var k = b.getAttribute("data-zoom");
      if (k === zoomCat) zoomOut({ byKey: e.detail === 0 });
      else zoomTo(k, { push: true, byKey: e.detail === 0, scroll: true });
    });
    if (leg) leg.addEventListener("change", function (e) {
      var k = e.target.getAttribute("data-cat");
      Object.keys(dots).forEach(function (s) {
        if (dots[s].getAttribute("data-c") === k) dots[s].parentNode.style.display = dots[s].style.display = e.target.checked ? "" : "none";
      });
      if (!e.target.checked && k === zoomCat) zoomOut({});
    });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var k = kScale();
        if (Math.abs(k - K) > 0.05) { K = k; Object.keys(dots).forEach(function (s) { dots[s].setAttribute("r", radius(s)); }); }
        layoutLabels();
        if (zoomCat) zoomTo(zoomCat, { instant: true, keep: true });    // the label columns depend on the map's width
      }, 200);
    });
    document.addEventListener("benak-lang", function () {   // one name or two per label: measure again
      layoutLabels();
      if (zoomCat) zoomTo(zoomCat, { instant: true, keep: true });
    });
  }
  var touchy = false, regLabels = null;
  // keep every region label inside the map and clear of the others, measured as drawn (the font grows on phones)
  function layoutLabels() {
    if (!regLabels) return;
    var bs = Array.prototype.slice.call(regLabels.childNodes), pos = F.regions.map(function (r) { return px([r.x, r.y]); });
    var en2 = mode() === "both";     // the English name sits under the Croatian only when both are shown
    function place(i) {
      var t = bs[i].firstChild;
      t.setAttribute("x", pos[i][0]); t.setAttribute("y", pos[i][1]);
      t.lastChild.setAttribute("x", pos[i][0]); t.lastChild.setAttribute("dy", en2 ? "1.15em" : "0");
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
    tip.innerHTML = '<b lang="hr">' + esc(it.th) + '</b><br class="t-sep"><i lang="en">' + esc(it.te) + "</i>" +
      (it.sh ? '<div class="tip-s" lang="hr">' + esc(it.sh) + '</div><div class="tip-s" lang="en">' + esc(it.se) + "</div>" : "") +
      (tap ? '<a class="tip-go" href="pjesme/' + it.s + '.html">' + bi("Otvori pjesmu", "Open the poem") + " »</a>" : "");
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
    dimCallouts();
  }
  function dimCallouts() {      // zoomed in and searching: the callouts of poems the search left out step back
    if (coG) Array.prototype.forEach.call(coG.querySelectorAll("[data-s]"), function (g) {
      g.classList.toggle("dim", !!lit && !lit[g.getAttribute("data-s")]);
    });
  }

  /* region lists: the keyboard and screen-reader way into the map */
  var panel = null, openR = null, openBtn = null, Q = /^[„“”"'«»(\s]+/;
  function toggleRegion(ri, btn, byKey) {
    openList("r" + ri, btn, byKey, F.regions[ri], F.items.filter(function (it) { return it.r === ri; }));
  }
  // the panel under the map listing the poems of a region (or, zoomed in, of a sub-group); r = its {hr, en} name
  function openList(key, btn, byKey, r, its) {
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
    if (was === key) { if (byKey) btn.focus(); return; }
    openR = key; openBtn = btn;
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("on");
    its = its.slice().sort(function (a, b) { return a.th.replace(Q, "").localeCompare(b.th.replace(Q, ""), "hr"); });
    panel.innerHTML = '<p class="pregion-h">' + bi("<b>" + esc(r.hr) + "</b>", "<i>" + esc(r.en) + "</i>") + " — " +
      bi(pjesme(its.length), its.length + " poems") + " " +
      '<button type="button" class="pregion-x">' + bi("Zatvori", "Close") + "</button></p><ul>" +
      its.map(function (it) {      // both: the Croatian title is the link, the English beside it; English only: the English is the link
        var h = 'href="pjesme/' + it.s + '.html"';
        return '<li><span class="sw" style="background:' + (CAT[it.c] || ["#888"])[0] + '"></span><a ' + h + ' lang="hr">' +
          esc(it.th) + '</a> <i lang="en" class="t-sep">' + esc(it.te) + '</i><a ' + h + ' lang="en" class="solo">' + esc(it.te) + "</a></li>";
      }).join("") + "</ul>";
    panel.hidden = false;
    if (!input || !input.value.trim()) highlight(its.map(function (it) { return { it: it }; }), 0);
    var first = panel.querySelector("li a");
    if (first && byKey) first.focus();      // keyboard: straight into the list; Esc comes back
  }
  function closeRegion(refocus) {
    if (!panel || openR === null) return;
    var btn = openBtn;
    if (btn) { btn.setAttribute("aria-expanded", "false"); btn.classList.remove("on"); }
    openR = null; openBtn = null;
    panel.hidden = true;
    if (!input || !input.value.trim()) highlight([], 0);
    if (refocus && btn) btn.focus();
  }

  /* ---------------- zooming in on a category ----------------
     The way in: a category's name under the map, or a region label named after a category. tools/finder.py
     (category_zoom) ships for each category the box its dots fill (F.zoom[c].v), its sub-groups (F.zoom[c].g, each
     poem's group in F.sg) and the family's picks (F.zoom[c].pk, from data/map_picks.json). Zoomed in: only that
     category's poems are shown (the others are hidden, and come back with the whole map), sub-labels name the groups (each opens the list of its poems), and a few poems get callouts
     (the picks always, the rest drawn at random on every zoom). The address keeps the zoom (#karta-ljubavne). */
  var view = { x: 0, y: 0, w: W, h: H }, zoomCat = null, anim = 0, coPicks = [], zbar = null, zinfo = null, subG = null, coG = null;
  var TOP = 42;           // px kept free at the top of the zoomed map for the "Whole map" bar
  var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function el(tag, at) {
    var e = document.createElementNS(ns, tag);
    Object.keys(at || {}).forEach(function (k) { e.setAttribute(k, at[k]); });
    return e;
  }
  function zdata(c) { return F.zoom && F.zoom[c]; }
  function screenW() { return (svg && svg.getBoundingClientRect().width) || W; }
  function isCompact() { return screenW() < 560; }       // phones: numbered dots, the titles listed under the map
  function setView(v) {
    view = { x: v.x, y: v.y, w: v.w, h: v.h };
    svg.setAttribute("viewBox", [v.x, v.y, v.w, v.h].map(function (n) { return Math.round(n * 100) / 100; }).join(" "));
    ZR = Math.pow(v.w / W, 0.65);       // zoomed 3x, a dot is 1.5x larger on screen: bigger, still apart
    Object.keys(dots).forEach(function (s) { dots[s].setAttribute("r", radius(s)); });
  }
  function boxOf(c) {
    var v = zdata(c).v, a = px([v[0] / 1e4, v[1] / 1e4]), b = px([v[2] / 1e4, v[3] / 1e4]);
    return { x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
  }
  function inBox(it, b) { var p = px(it.p); return p[0] >= b.x0 - 1 && p[0] <= b.x1 + 1 && p[1] >= b.y0 - 1 && p[1] <= b.y1 + 1; }
  // the viewBox for a category: its box with some air, the bar's strip on top and, on wide screens, a column for
  // the callout titles on each side (u = map units per screen pixel)
  function calloutCount() { var S = screenW(); return isCompact() ? 5 : S >= 760 ? 8 : S >= 620 ? 7 : 6; }
  function titleWidths(list) {     // px: each callout title's width in the language(s) shown, as site.css draws it
    var g = el("g", { style: "--u: 1", visibility: "hidden" }), t = el("text", { "class": "co-t" });
    g.appendChild(t);
    svg.appendChild(g);
    var ws = list.map(function (it) {
      var mx = 0;
      titleTspans(t, it, 0, 1).forEach(function (sp) { mx = Math.max(mx, sp.getComputedTextLength()); });
      while (t.firstChild) t.removeChild(t.firstChild);
      return mx;
    });
    svg.removeChild(g);
    return ws;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  // the viewBox for a category: its box with some air, the bar's strip on top and, on wide screens, room for the
  // callout titles on each side (titles may also tuck in beside the dots); u = map units per screen pixel
  function targetView(c) {
    if (zbar && !zbar.hidden && zbar.offsetHeight) TOP = zbar.offsetHeight + 8;    // the bar may take two lines on a phone
    var b = boxOf(c), S = screenW(), cmp = isCompact();
    var g = cmp ? 0 : 0.8 * clamp(Math.max.apply(null, titleWidths(coPicks.slice(0, calloutCount())).concat(0)), 110, 210) + 14;
    var cw = b.x1 - b.x0, ch = b.y1 - b.y0, pad = 10 + 0.03 * Math.max(cw, ch);
    var w = Math.max((cw + 2 * pad) / (1 - 2 * g / S), (ch + 2 * pad) / (H / W - TOP / S), cmp ? 200 : 280);
    w = Math.min(w, W);         // a category spread over the whole map: no zoom, but only its poems, sub-labels, callouts
    var h = w * H / W, u = w / S;
    var x = (b.x0 + b.x1) / 2 - w / 2, y = (b.y0 + b.y1) / 2 - h / 2 - TOP * u / 2;
    return { x: x, y: y, w: w, h: h, u: u, box: b };
  }
  function animateView(t, instant, done) {
    cancelAnimationFrame(anim);
    if (instant || (reduced && reduced.matches)) { svg.classList.remove("zooming"); setView(t); done(); return; }
    var f = view, t0 = null, D = 650, fw = Math.log(f.w), tw = Math.log(t.w);
    var fx = f.x + f.w / 2, fy = f.y + f.h / 2, tx = t.x + t.w / 2, ty = t.y + t.h / 2;
    svg.classList.add("zooming");
    function step(now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / D), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2;
      var w = Math.exp(fw + (tw - fw) * e), h = w * H / W;
      setView({ x: fx + (tx - fx) * e - w / 2, y: fy + (ty - fy) * e - h / 2, w: w, h: h });
      if (k < 1) anim = requestAnimationFrame(step);
      else { svg.classList.remove("zooming"); setView(t); done(); }
    }
    anim = requestAnimationFrame(step);
  }
  // the poems with a callout: the family's picks first, then random others of the category, preferring those with
  // an English title and a summary, and those far from the ones already chosen (so the titles spread over the view)
  function pickCallouts(c) {
    var z = zdata(c), b = boxOf(c), pool = [];
    coPicks = (z.pk || []).map(function (n) { return F.items[n]; }).filter(function (it) { return it && inBox(it, b); });
    F.items.forEach(function (it) { if (it.c === c && inBox(it, b) && coPicks.indexOf(it) < 0) pool.push(it); });
    while (coPicks.length < 8 && pool.length) {
      var tot = 0, ws = pool.map(function (it) {
        var p = px(it.p), d = 1e9;
        coPicks.forEach(function (o) { var q = px(o.p); d = Math.min(d, Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2))); });
        var w = (it.te && it.se ? 3 : 1) * (coPicks.length ? Math.pow(Math.min(d, 220) / 220, 2) + 0.01 : 1);
        tot += w;
        return w;
      });
      var r = Math.random() * tot, i = 0;
      while (i < pool.length - 1 && (r -= ws[i]) > 0) i++;
      coPicks.push(pool.splice(i, 1)[0]);
    }
  }
  function legendBtn(c) { return document.querySelector('#plegend .pzb[data-zoom="' + c + '"]'); }
  function ensureZoomUI() {
    if (zbar) return;
    var wrap = svg.parentNode;
    zbar = document.createElement("div");       // over the map's top edge, first in the keyboard order of the map
    zbar.className = "pzoom-bar";
    zbar.hidden = true;
    wrap.insertBefore(zbar, wrap.firstChild);
    zbar.addEventListener("click", function (e) { if (e.target.closest(".pz-back")) zoomOut({}); });
    zinfo = document.createElement("div");      // under the map: (phones) the highlighted titles, other picks, the whole list
    zinfo.className = "pzoom-info";
    zinfo.hidden = true;
    zinfo.innerHTML = '<div class="pz-listwrap"></div><p class="pz-links"></p>';
    wrap.parentNode.insertBefore(zinfo, wrap.nextSibling);
    zinfo.addEventListener("click", function (e) {
      if (!e.target.closest(".pz-more") || !zoomCat) return;
      pickCallouts(zoomCat);
      drawOverlay(zoomCat, targetView(zoomCat));
    });
  }
  function zoomTo(c, o) {
    o = o || {};
    if (!svg || !zdata(c)) return;
    ensureZoomUI();
    var keep = o.keep && c === zoomCat;      // a new size or language: same view, same callouts
    if (!keep) { closeRegion(false); hideTip(); pickCallouts(c); }
    zoomCat = c;
    var cb = document.querySelector('#plegend input[data-cat="' + c + '"]');
    if (cb && !cb.checked) {      // a hidden category is shown again when zoomed in on
      cb.checked = true;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    }
    svg.classList.add("zoomed");
    Object.keys(dots).forEach(function (s) { dots[s].classList.toggle("off", dots[s].getAttribute("data-c") !== c); });
    Array.prototype.forEach.call(document.querySelectorAll("#plegend .pzb"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-zoom") === c ? "true" : "false");
    });
    var n = F.items.filter(function (it) { return it.c === c; }).length;
    zbar.innerHTML = '<button type="button" class="pz-back">&larr; ' + bi("Cijela karta", "Whole map") + '</button>' +
      '<span class="pz-name"><span class="sw" style="background:' + CAT[c][0] + '"></span>' + bi(esc(CAT[c][1]), esc(CAT[c][2])) +
      ' <small>(' + bi(pjesme(n), n + (n === 1 ? " poem" : " poems")) + ")</small></span>";
    langAttr(zbar.firstChild, "title", "Natrag na cijelu kartu (Esc)", "Back to the whole map (Esc)");
    zinfo.lastChild.innerHTML = '<button type="button" class="pz-more">' + bi("Pokaži druge pjesme", "Show other poems") + "</button> " +
      '<a href="pjesme/' + c + '.html">' + bi("Sve pjesme ove skupine (" + n + ")", "All poems in this category (" + n + ")") + " &raquo;</a>";
    zbar.hidden = zinfo.hidden = false;
    if (o.push) setHash(c);
    if (o.byKey) zbar.firstChild.focus({ preventScroll: true });   // keyboard: on into the zoomed map (the old focus may vanish)
    if (o.scroll && svg.parentNode.scrollIntoView) {
      var r = svg.parentNode.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) svg.parentNode.scrollIntoView({ block: "nearest", behavior: reduced && reduced.matches ? "auto" : "smooth" });
    }
    var t = targetView(c);
    if (!keep) clearOverlay();
    animateView(t, o.instant || keep, function () { drawOverlay(c, t); });
  }
  function zoomOut(o) {
    o = o || {};
    if (!zoomCat) return;
    var c = zoomCat, a = document.activeElement, inside = svg.contains(a) || (zbar && zbar.contains(a));
    zoomCat = null;
    closeRegion(false);
    hideTip();
    clearOverlay();
    if (o.hash !== false) leaveHash();
    zbar.hidden = zinfo.hidden = true;
    Object.keys(dots).forEach(function (s) { dots[s].classList.remove("off"); });
    var lb = legendBtn(c);
    if (lb) lb.setAttribute("aria-pressed", "false");
    if (inside && lb) lb.focus({ preventScroll: true });     // the focused callout or button is gone: back to the category's name
    animateView({ x: 0, y: 0, w: W, h: H }, o.instant, function () {
      if (zoomCat) return;
      svg.classList.remove("zoomed");
      svg.style.removeProperty("--u");
      layoutLabels();
    });
  }
  function setHash(c) {
    var h = "#karta-" + c;
    if (window.location.hash === h) return;
    try { history.pushState({ bz: c, base: !/^#karta-/.test(window.location.hash) }, "", h); } catch (e) { window.location.hash = h; }
  }
  function leaveHash() {       // zooming out with the button or Esc: the address goes back to the whole map
    if (!/^#karta-/.test(window.location.hash)) return;
    var st = history.state;
    if (st && st.bz && st.base) { history.back(); return; }
    try { history.replaceState(null, "", "#karta"); } catch (e) { /* the address keeps the zoom */ }
  }
  function applyHash(instant) {
    var m = /^#karta-([a-z-]+)$/.exec(window.location.hash), c = m && zdata(m[1]) ? m[1] : null;
    if (c && c !== zoomCat) zoomTo(c, { instant: instant });
    else if (!c && zoomCat) zoomOut({ hash: false });
  }
  function clearOverlay() {
    [subG, coG].forEach(function (g) { if (g && g.parentNode) g.parentNode.removeChild(g); });
    subG = coG = null;
    Object.keys(dots).forEach(function (s) { dots[s].classList.remove("co-dot", "co-on"); });
    if (zinfo) zinfo.firstChild.innerHTML = "";
  }
  function drawOverlay(c, t) {
    clearOverlay();
    if (c !== zoomCat) return;
    svg.style.setProperty("--u", t.u);       // site.css sizes the texts by it, so they keep their size on screen
    svg.classList.toggle("compact", isCompact());
    drawSubs(c, t.u);
    drawCallouts(c, t);
    dimCallouts();
  }
  // sub-labels: one per group, at its centre, nudged apart; each opens the list of its poems under the map
  function drawSubs(c, u) {
    var z = zdata(c);
    subG = el("g", { "class": "subs" });
    z.g.forEach(function (g, gi) {
      var its = F.items.filter(function (it) { return it.c === c && it.g === String(gi); });
      var xy = px([g[0] / 1e4, g[1] / 1e4]);
      var b = el("g", { "class": "sub-b", role: "button", tabindex: "0", "aria-expanded": "false", "aria-controls": "pregion" });
      langAttr(b, "aria-label", g[2] + ": " + pjesme(its.length), g[3] + ": " + its.length + (its.length === 1 ? " poem" : " poems"));
      var t = el("text", { x: xy[0], y: xy[1], "class": "sub", "text-anchor": "middle" });
      [["hr", g[2]], [null, "\u00a0·\u00a0"], ["en", g[3]]].forEach(function (p) {
        var s = el("tspan", p[0] ? { lang: p[0] } : { "class": "t-sep" });
        s.textContent = p[1];
        t.appendChild(s);
      });
      b.appendChild(t);
      subG.appendChild(b);
      var open = function (byKey) {
        openList("s" + c + gi, b, byKey, { hr: CAT[c][1] + " · " + g[2], en: CAT[c][2] + " · " + g[3] }, its);
      };
      b.addEventListener("click", function (e) { e.stopPropagation(); open(false); });
      b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(true); } });
    });
    svg.appendChild(subG);
    var bs = Array.prototype.slice.call(subG.childNodes);
    for (var k = 0; k < 60; k++) {       // nudge overlapping sub-labels apart, vertically
      var bx = bs.map(function (b) { return b.getBBox(); }), moved = false;
      for (var i = 0; i < bx.length; i++) for (var j = i + 1; j < bx.length; j++) {
        var a = bx[i], d = bx[j];
        if (a.x < d.x + d.width + 4 * u && d.x < a.x + a.width + 4 * u && a.y < d.y + d.height && d.y < a.y + a.height) {
          var up = a.y <= d.y ? i : j, dn = up === i ? j : i, tu = bs[up].firstChild, td = bs[dn].firstChild;
          tu.setAttribute("y", +tu.getAttribute("y") - 2 * u);
          td.setAttribute("y", +td.getAttribute("y") + 2 * u);
          moved = true;
        }
      }
      if (!moved) break;
    }
  }
  function titleTspans(t, it, x, u) {    // the title in the visitor's language(s): Croatian, English, or both stacked
    var both = mode() === "both", h = el("tspan", { lang: "hr", "class": "co-hr" }), e = el("tspan", { lang: "en", "class": "co-en", x: x, dy: both ? 16 * u : 0 });
    h.textContent = it.th;
    e.textContent = it.te || it.th;
    t.appendChild(h);
    t.appendChild(e);
    return [h, e];
  }
  function fit(span, maxW) {      // shorten a title that does not fit its column, with an ellipsis (the link says it whole)
    var s = span.textContent, len = span.getComputedTextLength();
    if (!len || len <= maxW) return;
    var n = Math.max(4, Math.floor(s.length * maxW / len) - 1);
    do { span.textContent = s.slice(0, n).replace(/[\s,.:;!?–-]+$/, "") + "…"; n--; } while (n > 4 && span.getComputedTextLength() > maxW);
  }
  function drawCallouts(c, t) {
    var u = t.u, both = mode() === "both", compact = isCompact();
    coG = el("g", { "class": "callouts" });
    svg.appendChild(coG);
    var n = calloutCount();
    var rowH = (both ? 34 : 19) * u, gap = 7 * u, top = view.y + (TOP + 4) * u, bottom = view.y + view.h - 6 * u;
    if (!compact) n = Math.min(n, 2 * Math.floor((bottom - top + gap) / (rowH + gap)));
    var list = coPicks.slice(0, n);
    list.forEach(function (it) { dots[it.s].classList.add("co-dot"); });
    if (compact) { drawBadges(list, u); return; }
    coG.setAttribute("role", "list");
    langAttr(coG, "aria-label", "Istaknute pjesme: " + CAT[c][1], "Highlighted poems: " + CAT[c][2]);
    // what a title must not cover: the category's dots, the sub-labels, the titles already placed
    var obst = [], bx = t.box, colGap = K * ZR * 7 + 10 * u, minW = 90 * u, capW = 210 * u, x0 = view.x + 6 * u, x1 = view.x + view.w - 6 * u, midV = view.x + view.w / 2;
    F.items.forEach(function (it) {
      if (it.c !== c || dots[it.s].style.display === "none") return;
      var p = px(it.p), r = radius(it.s) + 2 * u;
      obst.push({ x0: p[0] - r, x1: p[0] + r, y0: p[1] - r, y1: p[1] + r });
    });
    if (subG) Array.prototype.forEach.call(subG.childNodes, function (n) {
      var q = n.getBBox();
      obst.push({ x0: q.x, x1: q.x + q.width, y0: q.y, y1: q.y + q.height });
    });
    // where a title of width w goes in its row (top y), on one side of its dot: the free gaps of the row from the
    // dot outwards, each costing its leader's length plus what the title loses if the gap is too narrow
    function slot(side, it, y, w) {
      var p = px(it.p), r = radius(it.s), y0 = y - 2 * u, y1 = y + rowH + 2 * u, k = side === "end" ? -1 : 1, best = null;
      var band = obst.filter(function (o) { return o.y1 > y0 && o.y0 < y1; });
      var a0 = p[0] + k * (r + 10 * u), cs = [a0], col = k < 0 ? bx.x0 - colGap : bx.x1 + colGap;
      function free(a) {        // the width free outwards from a (0 if something lies on a)
        if (band.some(function (o) { return o.x0 - 4 * u < a && o.x1 + 4 * u > a; })) return 0;
        var lim = k < 0 ? x0 : x1;
        band.forEach(function (o) {
          if (k < 0 && o.x1 + 4 * u <= a) lim = Math.max(lim, o.x1 + 4 * u);
          if (k > 0 && o.x0 - 4 * u >= a) lim = Math.min(lim, o.x0 - 4 * u);
        });
        return Math.max(0, (lim - a) * k);
      }
      // the column just outside the category's box, where the titles line up, costs a little less than a gap
      if ((col - a0) * k >= 0 && free(col) >= 0.8 * w) best = { a: col, avail: free(col), cost: 0.7 * Math.abs(col - p[0]) };
      band.forEach(function (o) { var a = k < 0 ? o.x0 - 6 * u : o.x1 + 6 * u; if ((a - a0) * k > 0) cs.push(a); });
      cs.forEach(function (a) {
        var avail = free(a);
        if (avail < Math.min(minW, w)) return;
        var cost = Math.abs(a - p[0]) + 1.5 * Math.max(0, w - avail);
        if (!best || cost < best.cost) best = { a: a, avail: avail, cost: cost };
      });
      if (!best) {        // no free gap: at the edge of the view, over whatever is there
        var a = k < 0 ? x0 + Math.min(w, capW) : x1 - Math.min(w, capW);
        best = { a: a, avail: Math.min(w, capW), cost: 1e9 };
      }
      return best;
    }
    // two columns, left and right: each title on the side that costs less (its dot's own side of the view a
    // little preferred); each column is sorted by height
    var tw = titleWidths(list).map(function (w) { return Math.min(capW, w * u + 4 * u); }), L = [], R = [];
    list.forEach(function (it, i) {
      var p = px(it.p), y = p[1] - rowH / 2, nat = p[0] < midV ? "end" : "start", oth = nat === "end" ? "start" : "end";
      var side = slot(nat, it, y, tw[i]).cost <= slot(oth, it, y, tw[i]).cost + 40 * u ? nat : oth;
      (side === "end" ? L : R).push(it);
    });
    var cap = Math.max(1, Math.floor((bottom - top + gap) / (rowH + gap)));
    while (L.length > cap) R.push(L.pop());
    while (R.length > cap) L.push(R.pop());
    [[L, "end"], [R, "start"]].forEach(function (col) {
      var its = col[0].sort(function (a, d) { return a.p[1] - d.p[1]; });
      var ys = its.map(function (it) { return px(it.p)[1] - rowH / 2; }), i;
      for (i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i ? ys[i - 1] + rowH + gap : top);
      for (i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i < ys.length - 1 ? ys[i + 1] - rowH - gap : bottom - rowH);
      for (i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i ? ys[i - 1] + rowH + gap : top);
      its.forEach(function (it, k) {
        var p = px(it.p), y = ys[k], r = radius(it.s), ly = y + (both ? rowH / 2 : rowH / 2 + 1 * u);
        var sl = slot(col[1], it, y, tw[list.indexOf(it)]), x = sl.a, maxW = Math.min(capW, sl.avail);
        var li = el("g", { role: "listitem", "data-s": it.s }), a = el("a", { href: "pjesme/" + it.s + ".html", "class": "co" });
        langAttr(a, "aria-label", it.th, it.te || it.th);
        var ex = col[1] === "end" ? x + 4 * u : x - 4 * u, dx = ex - p[0], dy = ly - p[1], dl = Math.sqrt(dx * dx + dy * dy) || 1;
        var line = el("line", { "class": "co-line", x1: p[0] + dx / dl * (r + 1.5 * u), y1: p[1] + dy / dl * (r + 1.5 * u), x2: ex, y2: ly });
        var tx = el("text", { x: x, y: y + 13 * u, "class": "co-t", "text-anchor": col[1] });
        var sp = titleTspans(tx, it, x, u);
        a.appendChild(tx);
        li.appendChild(line);
        li.appendChild(a);
        coG.appendChild(li);
        sp.forEach(function (s) { fit(s, maxW); });
        var q = tx.getBBox(), hh = Math.max(q.height + 4 * u, 26 * u);    // the whole title is the link (SVG text is hit on its glyphs only)
        a.insertBefore(el("rect", { "class": "co-hit", x: q.x - 3 * u, y: q.y + q.height / 2 - hh / 2, width: q.width + 6 * u, height: hh }), tx);
        obst.push({ x0: q.x - 4 * u, x1: q.x + q.width + 4 * u, y0: q.y, y1: q.y + q.height });
        a.addEventListener("mouseenter", function () { dots[it.s].classList.add("co-on"); });
        a.addEventListener("mouseleave", function () { dots[it.s].classList.remove("co-on"); });
        a.addEventListener("focus", function () { dots[it.s].classList.add("co-on"); });
        a.addEventListener("blur", function () { dots[it.s].classList.remove("co-on"); });
      });
    });
  }
  // phones: a numbered marker beside each highlighted dot, and the titles as a numbered list under the map
  function drawBadges(list, u) {
    coG.setAttribute("aria-hidden", "true");
    var R = 9 * u, placed = list.map(function (it) { return px(it.p); }), marks = [];
    var subs = subG ? Array.prototype.map.call(subG.childNodes, function (n) { return n.getBBox(); }) : [];
    list.forEach(function (it, i) {
      var p = px(it.p), best = null, bs = -1;
      for (var k = 0; k < 16; k++) {      // up-right first, then around the dot (and a little farther): the freest spot
        var ang = [-45, -135, 45, 135, -90, 0, 90, 180][k % 8] * Math.PI / 180, rr = (k < 8 ? 17 : 27) * u;
        var q = [p[0] + Math.cos(ang) * rr, p[1] + Math.sin(ang) * rr], d = 1e9;
        marks.forEach(function (m) { d = Math.min(d, Math.sqrt(Math.pow(m[0] - q[0], 2) + Math.pow(m[1] - q[1], 2)) / 2.2); });
        placed.forEach(function (m, j) { if (j !== i) d = Math.min(d, Math.sqrt(Math.pow(m[0] - q[0], 2) + Math.pow(m[1] - q[1], 2))); });
        subs.forEach(function (b) {       // keep the sub-labels readable
          if (q[0] > b.x - R && q[0] < b.x + b.width + R && q[1] > b.y - R && q[1] < b.y + b.height + R) d = Math.min(d, R / 2);
        });
        if (q[0] < view.x + R || q[0] > view.x + view.w - R || q[1] < view.y + (TOP + 2) * u + R || q[1] > view.y + view.h - R) d = -1;
        if (d > bs) { bs = d; best = q; }
        if (d >= 2.4 * R) break;
      }
      marks.push(best);
      var r = radius(it.s), dx = best[0] - p[0], dy = best[1] - p[1], dl = Math.sqrt(dx * dx + dy * dy) || 1;
      coG.appendChild(el("line", { "class": "co-line", x1: p[0] + dx / dl * r, y1: p[1] + dy / dl * r, x2: best[0] - dx / dl * R, y2: best[1] - dy / dl * R }));
      coG.appendChild(el("circle", { "class": "co-badge", cx: best[0], cy: best[1], r: R }));
      var t = el("text", { "class": "co-num", x: best[0], y: best[1] + 4 * u, "text-anchor": "middle" });
      t.textContent = i + 1;
      coG.appendChild(t);
    });
    zinfo.firstChild.innerHTML = '<p class="pz-h" id="pz-h">' + bi("Istaknute pjesme", "Highlighted poems") + "</p>" +
      '<ol class="pz-list" aria-labelledby="pz-h">' + list.map(function (it, i) {
        return '<li><a href="pjesme/' + it.s + '.html"><span class="pz-n" aria-hidden="true">' + (i + 1) + "</span><span>" +
          bi(esc(it.th), "<i>" + esc(it.te || it.th) + "</i>") + "</span></a></li>";
      }).join("") + "</ol>";
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !zoomCat || e.defaultPrevented) return;
    if ((panel && panel.contains(e.target)) || e.target === input) return;    // Esc closes the list, or clears the search, first
    zoomOut({});
  });
  window.addEventListener("popstate", function () { applyHash(false); });
  window.addEventListener("hashchange", function () { applyHash(false); });

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
    return left > 0 ? '<p class="pmore-p"><button type="button" class="pmore">' + bi("Prikaži još " + n, "Show " + n + " more") +
      '</button> <span class="pleft">(' + bi("još " + left, left + " left") + ")</span></p>" : "";
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
      out.innerHTML = '<p class="pending">' + bi("Nisam pronašao pjesmu za te riječi; pokušajte drugim riječima ili odaberite nešto ispod.",
        "No poem found for those words; try other words or pick one below.") + "</p>";
      return;
    }
    status.innerHTML = bi(esc(plural(list.length)), list.length + (list.length === 1 ? " poem" : " poems") + " found");
    var head = r.tags.length ? '<p class="found"><span lang="hr">Tražim:</span><span lang="en" class="solo">Looking for:</span> ' +
      r.tags.map(function (t) {
        return '<span class="chip-s">' + bi(esc(t.hr), esc(t.en)) + "</span>";
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
      return '<button type="button" data-q="' + esc(c.q) + '"><span lang="hr">' + esc(c.hr) + '</span> <i lang="en">' + esc(c.en) + "</i></button>";
    }).join(" ") + ' <button type="button" id="prandom"><span lang="hr">Iznenadi me</span> <i lang="en">Surprise me</i></button>';
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
  if (svg && /^#karta-/.test(window.location.hash)) {     // a shared address of a zoomed map
    applyHash(true);
    var kt = document.getElementById("karta");
    if (zoomCat && kt) kt.scrollIntoView();
    window.addEventListener("load", function () { if (zoomCat) zoomTo(zoomCat, { instant: true, keep: true }); });   // fonts in: measure again
  }
  var m = /[?&]q=([^&]+)/.exec(window.location.search);
  if (m && input) { input.value = decodeURIComponent(m[1].replace(/\+/g, " ")); render(input.value); }
})();

/* Visitor counter in the footer: a typed tally of visitors by country, and by county inside Croatia.
   The numbers come from a small Cloudflare Worker (counter/ in the source repo). Each visitor is counted once a day;
   no cookies are set and nothing is stored in the browser. Visitors who ask not to be tracked (Do Not Track /
   Global Privacy Control) still see the tally but are not counted. Off the live site the tally is only read. */
(function () {
  var box = document.querySelector(".brojac[data-url]");
  if (!box || !window.fetch) return;
  var url = box.getAttribute("data-url").replace(/\/$/, "");
  var live = /(^|\.)ivanbenak\.eu$/.test(location.hostname);
  var optout = navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;

  var COUNTIES = {
    "01": ["Zagrebačka", "Zagreb County"], "02": ["Krapinsko-zagorska", "Krapina-Zagorje"],
    "03": ["Sisačko-moslavačka", "Sisak-Moslavina"], "04": ["Karlovačka", "Karlovac"],
    "05": ["Varaždinska", "Varaždin"], "06": ["Koprivničko-križevačka", "Koprivnica-Križevci"],
    "07": ["Bjelovarsko-bilogorska", "Bjelovar-Bilogora"], "08": ["Primorsko-goranska", "Primorje-Gorski Kotar"],
    "09": ["Ličko-senjska", "Lika-Senj"], "10": ["Virovitičko-podravska", "Virovitica-Podravina"],
    "11": ["Požeško-slavonska", "Požega-Slavonia"], "12": ["Brodsko-posavska", "Brod-Posavina"],
    "13": ["Zadarska", "Zadar"], "14": ["Osječko-baranjska", "Osijek-Baranja"],
    "15": ["Šibensko-kninska", "Šibenik-Knin"], "16": ["Vukovarsko-srijemska", "Vukovar-Srijem"],
    "17": ["Splitsko-dalmatinska", "Split-Dalmatia"], "18": ["Istarska", "Istria"],
    "19": ["Dubrovačko-neretvanska", "Dubrovnik-Neretva"], "20": ["Međimurska", "Međimurje"],
    "21": ["Grad Zagreb", "City of Zagreb"]
  };
  var names = {};
  try {
    names.hr = new Intl.DisplayNames(["hr"], { type: "region" });
    names.en = new Intl.DisplayNames(["en"], { type: "region" });
  } catch (e) {}
  function country(cc) {
    if (cc === "??") return ["nepoznato", "unknown"];
    try { return [names.hr.of(cc), names.en.of(cc)]; } catch (e) { return [cc, cc]; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function bi(hr, en) { return '<span lang="hr">' + hr + '</span><span class="t-sep"> · </span><span lang="en">' + en + "</span>"; }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function plural(n, one, few, many) {     // Croatian forms for 1 / 2–4 / 5+ (11–14 take the last)
    var d = n % 10, t = n % 100;
    return d === 1 && t !== 11 ? one : d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }
  function date(iso) {
    var p = iso.split("-").map(Number);
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return [p[2] + ". " + p[1] + ". " + p[0] + ".", months[p[1] - 1] + " " + p[2] + ", " + p[0]];
  }
  function row(label, n, cls) {
    return '<li class="' + (cls || "") + '"><span class="brojac-name">' + label + '</span><span class="brojac-dots" aria-hidden="true"></span><span class="brojac-n">' + num(n) + "</span></li>";
  }

  function render(t) {
    if (!t || !t.total) return;
    var ccs = Object.keys(t.countries).sort(function (a, b) { return t.countries[b] - t.countries[a] || (a < b ? -1 : 1); });
    var known = ccs.filter(function (c) { return c !== "??"; }).length;
    var rows = ccs.map(function (cc) {
      var nm = country(cc), out = row(bi(esc(nm[0]), esc(nm[1])), t.countries[cc], cc === "HR" ? "brojac-hr" : "");
      if (cc === "HR") {
        var regs = Object.keys(t.hr || {}).sort(function (a, b) { return t.hr[b] - t.hr[a]; });
        if (regs.length) out += '<li class="brojac-sub"><div class="brojac-map" data-top="' + regs[0] + '"></div></li>';
      }
      return out;
    }).join("");
    var since = t.since ? date(t.since) : null;
    box.innerHTML =
      '<details><summary>' +
        bi(num(t.total) + " " + plural(t.total, "posjet", "posjeta", "posjeta") + " iz " + known + " " + plural(known, "zemlje", "zemlje", "zemalja"),
           num(t.total) + " visit" + (t.total === 1 ? "" : "s") + " from " + known + " countr" + (known === 1 ? "y" : "ies")) +
      "</summary>" +
      '<div class="brojac-sheet">' +
        '<p class="brojac-head">' + bi("Evidencija posjeta", "Visit log") +
          (since ? '<small>' + bi("od " + since[0], "since " + since[1]) + "</small>" : "") + "</p>" +
        '<ul class="brojac-list">' + rows + "</ul>" +
      "</div></details>";
    box.querySelector("details").addEventListener("toggle", function () {
      if (!this.open) return;
      if (!document.getElementById("type-face")) {
        var l = document.createElement("link");
        l.id = "type-face"; l.rel = "stylesheet";
        l.href = "https://fonts.googleapis.com/css2?family=Special+Elite&display=swap";
        document.head.appendChild(l);
      }
      loadMap(function () { drawMap(t.hr); });
    });
    if (window.BENAK_LANG && window.BENAK_LANG.attrs) window.BENAK_LANG.attrs(box);
    box.hidden = false;
  }

  /* Croatia: a small map of the counties, darker where more visits came from (outlines in brojac-hr.js, loaded on first open) */
  function loadMap(done) {
    if (window.BENAK_HR_MAP) return done();
    var src = box.getAttribute("data-map");
    if (!src || document.getElementById("brojac-hr-js")) return;
    var sc = document.createElement("script");
    sc.id = "brojac-hr-js"; sc.src = src; sc.onload = done;
    document.head.appendChild(sc);
  }
  function drawMap(hr) {
    var el = box.querySelector(".brojac-map"), M = window.BENAK_HR_MAP;
    if (!el || !M || el.firstChild) return;
    var max = 0, k;
    for (k in hr) max = Math.max(max, hr[k]);
    var paths = "", label = [[], []];
    Object.keys(M.counties).forEach(function (c) {
      var n = hr[c] || 0, a = n ? 0.1 + 0.72 * Math.log(n + 1) / Math.log(max + 1) : 0;
      paths += '<path d="' + M.counties[c] + '" data-c="' + c + '" tabindex="0" style="fill:rgba(92,58,26,' + a.toFixed(2) + ')"></path>';
    });
    Object.keys(hr).sort(function (a, b) { return hr[b] - hr[a]; }).slice(0, 3).forEach(function (c) {
      var nm = COUNTIES[c] || [c, c];
      label[0].push(nm[0] + " " + hr[c]); label[1].push(nm[1] + " " + hr[c]);
    });
    var v = M.valpovo;
    el.innerHTML =
      '<svg viewBox="0 0 ' + M.w + " " + M.h + '" role="img" aria-label="' + esc(label[0].join(", ")) + '" data-aria-label-hr="Posjeti po županijama: ' +
        esc(label[0].join(", ")) + '" data-aria-label-en="Visits by county: ' + esc(label[1].join(", ")) + '">' + paths +
        '<circle class="brojac-valpovo" cx="' + v[0] + '" cy="' + v[1] + '" r="3.2"></circle>' +
        '<text class="brojac-valpovo-t" x="' + (v[0] - 6) + '" y="' + (v[1] - 7) + '" text-anchor="end">Valpovo</text></svg>' +
      '<p class="brojac-cap"></p><p class="brojac-osm">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></p>';
    var cap = el.querySelector(".brojac-cap"), cur = null;
    function show(c) {
      if (cur) cur.classList.remove("on");
      cur = el.querySelector('path[data-c="' + c + '"]');
      if (cur) { cur.classList.add("on"); cur.parentNode.insertBefore(cur, el.querySelector(".brojac-valpovo")); }
      var nm = COUNTIES[c] || [c, c], n = hr[c] || 0;
      cap.innerHTML = '<span class="brojac-name">' + bi(esc(nm[0]), esc(nm[1])) + '</span><span class="brojac-dots" aria-hidden="true"></span><span class="brojac-n">' + num(n) + "</span>";
    }
    el.querySelector("svg").addEventListener("mouseover", function (e) { if (e.target.hasAttribute("data-c")) show(e.target.getAttribute("data-c")); });
    el.querySelector("svg").addEventListener("focusin", function (e) { if (e.target.hasAttribute("data-c")) show(e.target.getAttribute("data-c")); });
    el.querySelector("svg").addEventListener("click", function (e) { if (e.target.hasAttribute("data-c")) show(e.target.getAttribute("data-c")); });
    show(el.getAttribute("data-top"));
    if (window.BENAK_LANG) window.BENAK_LANG.attrs(el);
  }

  function go() {
    var count = live && !optout;
    fetch(url + (count ? "/zapis" : "/stanje"), { method: count ? "POST" : "GET", mode: "cors", credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(render)
      .catch(function () {});
  }
  if (document.readyState === "complete") setTimeout(go, 400);
  else window.addEventListener("load", function () { setTimeout(go, 400); });
})();

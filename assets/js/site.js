/* Ivan Benak — small progressive enhancements. The site works without this file. */
(function () {
  "use strict";

  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  /* ---- menu toggle on phones ---- */
  var nt = document.querySelector(".nav-toggle");
  if (nt) nt.addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    nt.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* ---- site-wide language switch: HR / HR+EN / EN (remembered per browser) ---- */
  function setLang(mode) {
    document.body.classList.remove("show-hr", "show-en", "show-both");
    document.body.classList.add("show-" + mode);
    var btns = document.querySelectorAll(".langsw button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", btns[i].getAttribute("data-lang") === mode ? "true" : "false");
    }
    document.documentElement.lang = mode === "en" ? "en" : "hr";
    store.set("benak-lang", mode);
  }
  var sw = document.querySelector(".langsw");
  if (sw) {
    sw.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-lang]");
      if (b) setLang(b.getAttribute("data-lang"));
    });
    // default: both languages side by side on wide screens, Croatian first on phones
    setLang(store.get("benak-lang") || (window.matchMedia("(max-width: 760px)").matches ? "hr" : "both"));
  }

  /* ---- tap a stanza to light up its twin (touch screens have no hover) ---- */
  document.addEventListener("click", function (e) {
    var s = e.target.closest(".m.stanza");
    if (!s || e.target.closest("a")) return;
    var lit = document.querySelectorAll(".m.stanza.lit");
    for (var i = 0; i < lit.length; i++) if (lit[i] !== s) lit[i].classList.remove("lit");
    s.classList.toggle("lit");
  });

  /* ---- quote of the day ---- */
  var box = document.getElementById("qotd");
  var Q = window.BENAK_QUOTES || [];
  if (box && Q.length) {
    var MHR = ["siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza",
               "rujna", "listopada", "studenoga", "prosinca"];
    var MEN = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"];
    var root = box.getAttribute("data-root") || "";
    var esc = function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    };
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var godina = function (n) {        // 1 godinu, 2–4 godine, 5+ godina (11–14 always godina)
      var d = n % 10, h = n % 100;
      if (h >= 11 && h <= 14) return "godina";
      return d === 1 ? "godinu" : (d >= 2 && d <= 4) ? "godine" : "godina";
    };
    var d = new Date();
    var m = /[?&]dan=(\d{4})-(\d{2})-(\d{2})/.exec(window.location.search);
    var h = /^#d-(\d{2})-(\d{2})$/.exec(window.location.hash);
    if (m) d = new Date(+m[1], +m[2] - 1, +m[3]);
    else if (h) {
      var yy = new Date().getFullYear();
      if (h[1] === "02" && h[2] === "29" && new Date(yy, 1, 29).getMonth() !== 1) yy = 2028;   // next leap year
      d = new Date(yy, +h[1] - 1, +h[2]);
    }
    var byDay = {};
    for (var i = 0; i < Q.length; i++) if (Q[i].day) byDay[Q[i].day] = Q[i];
    var show = function (date) {
      var key = pad(date.getMonth() + 1) + "-" + pad(date.getDate());
      var q = byDay[key];
      if (!q) {   // no calendar: rotate through the list
        var day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2000, 0, 1)) / 864e5);
        q = Q[(day * 37) % Q.length];
      }
      var href = root + "pjesme/" + q.slug + ".html";
      var bday = q.special === "birthday";
      box.classList.toggle("bday", bday);
      var ban = box.querySelector(".bday-banner");
      if (bday && !ban) {
        ban = document.createElement("div");
        ban.className = "bday-banner";
        box.insertBefore(ban, box.firstChild);
      }
      if (ban) {
        var age = date.getFullYear() - 1933;
        ban.hidden = !bday;
        ban.innerHTML = '<span class="bunting" aria-hidden="true"></span>' +
          '<p class="bday-title">Sretan rođendan, Ivo! <i lang="en">Happy birthday, Ivo!</i></p>' +
          '<p class="bday-sub">Danas bi navršio ' + age + " " + godina(age) + ' · <span lang="en">Today he would have turned ' + age + "</span></p>";
      }
      box.querySelector(".hr blockquote").innerHTML = q.hr.map(esc).join("<br>");
      box.querySelector(".en blockquote").innerHTML = q.en.map(esc).join("<br>");
      box.querySelector(".hr .src").innerHTML = "— iz pjesme <a href=\"" + href + "\">" + esc(q.title_hr) + "</a>" +
        (q.sig_hr ? '<span class="qsig">' + esc(q.sig_hr) + "</span>" : "");
      box.querySelector(".en .src").innerHTML = "— from <a href=\"" + href + "\">" + esc(q.title_en) + "</a>" +
        (q.sig_en ? '<span class="qsig">' + esc(q.sig_en) + "</span>" : "");
      var lab = document.getElementById("qday");
      if (lab) lab.textContent = "· " + date.getDate() + ". " + MHR[date.getMonth()] + " · " + MEN[date.getMonth()] + " " + date.getDate() +
        (q.occ_hr ? " · " + q.occ_hr + (q.occ_en && q.occ_en !== q.occ_hr ? " / " + q.occ_en : "") : "");
      var all = document.getElementById("qall");
      if (all) all.setAttribute("href", root + "misao-dana.html#d-" + key);
      var lit = document.querySelectorAll(".calday.today");
      for (var j = 0; j < lit.length; j++) lit[j].classList.remove("today");
      var row = document.getElementById("d-" + key);
      if (row) row.classList.add("today");
      return key;
    };
    var cur = new Date(d.getTime());

    /* ---- wall calendar (misao-dana.html) ---- */
    var grid = document.getElementById("wcal-grid");
    var MHRN = ["Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj", "Srpanj", "Kolovoz",
                "Rujan", "Listopad", "Studeni", "Prosinac"];
    var view = { y: cur.getFullYear(), m: cur.getMonth() };
    function drawMonth() {
      if (!grid) return;
      var first = new Date(view.y, view.m, 1), days = new Date(view.y, view.m + 1, 0).getDate();
      var lead = (first.getDay() + 6) % 7, today = new Date(), html = "";
      for (var i = 0; i < lead; i++) html += '<span class="wcal-empty"></span>';
      for (var dd = 1; dd <= days; dd++) {
        var key = pad(view.m + 1) + "-" + pad(dd), q = byDay[key] || {};
        var written = q.occ_hr && /današnji dan/.test(q.occ_hr), occ = q.occ_hr && !written;
        var cls = "wcal-day" + (occ ? " occ" : "") + (written ? " pen" : "") +
          ((view.y === today.getFullYear() && view.m === today.getMonth() && dd === today.getDate()) ? " now" : "") +
          ((view.y === cur.getFullYear() && view.m === cur.getMonth() && dd === cur.getDate()) ? " sel" : "") +
          ((lead + dd - 1) % 7 === 6 ? " sun" : "");
        var tip = q.occ_hr ? q.occ_hr + (q.occ_en ? " · " + q.occ_en : "") : (q.title_hr || "");
        html += '<button type="button" class="' + cls + '" data-d="' + dd + '" title="' + esc(tip) + '">' + dd +
          (q.special === "birthday" ? '<i class="cake">&#9829;</i>' : occ ? '<i class="mark"></i>' : written ? '<i class="pen">&#10002;</i>' : "") + "</button>";
      }
      grid.innerHTML = html;
      document.getElementById("wcal-mhr").textContent = MHRN[view.m];
      document.getElementById("wcal-men").textContent = MEN[view.m];
      document.getElementById("wcal-year").textContent = view.y;
      var mb = document.querySelectorAll("#wcal-months button");
      for (var k = 0; k < mb.length; k++) mb[k].classList.toggle("on", +mb[k].getAttribute("data-m") === view.m);
    }
    function pick(date) {
      cur = new Date(date.getTime());
      var key = show(cur);
      view = { y: cur.getFullYear(), m: cur.getMonth() };
      drawMonth();
      if (grid && window.history && history.replaceState) history.replaceState(null, "", "#d-" + key);
    }
    if (grid) {
      grid.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-d]");
        if (b) pick(new Date(view.y, view.m, +b.getAttribute("data-d")));
      });
      var mv = function (n) { view.m += n; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } drawMonth(); };
      document.getElementById("wcal-prev").addEventListener("click", function () { mv(-1); });
      document.getElementById("wcal-next").addEventListener("click", function () { mv(1); });
      document.getElementById("wcal-months").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-m]");
        if (b) { view.m = +b.getAttribute("data-m"); drawMonth(); }
      });
    }
    pick(cur);
    var step = function (n) { var t = new Date(cur.getTime()); t.setDate(t.getDate() + n); pick(t); };
    var bind = function (id, fn) { var b = document.getElementById(id); if (b) b.addEventListener("click", fn); };
    bind("qprev", function () { step(-1); });
    bind("qnext", function () { step(1); });
    bind("qtoday", function () { pick(new Date()); });
    window.addEventListener("hashchange", function () {   // links like misao-dana.html#d-09-21
      var hh = /^#d-(\d{2})-(\d{2})$/.exec(window.location.hash);
      if (hh) pick(new Date(cur.getFullYear(), +hh[1] - 1, +hh[2]));
    });
  }

  /* ---- YouTube: load the player only when asked ---- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button.yt");
    if (!b || b.classList.contains("on")) return;
    var id = b.getAttribute("data-id");
    var f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1";
    f.title = b.getAttribute("aria-label") || "YouTube";
    f.allow = "autoplay; encrypted-media; picture-in-picture";
    f.allowFullscreen = true;
    b.classList.add("on");
    b.appendChild(f);
  });
})();

"use strict";

/*
 * love-movies — "Our Cinema", a tiny film club of two.
 *
 * A curated shelf (romance / cozy / artful picks), mood filters, a shuffle
 * "tonight's pick" with a share link (?m=title-slug), and a local watch log
 * (localStorage `mena-movies`). No external requests, no API keys.
 */

(function () {
  var MOODS = ["all", "romantic", "cozy", "funny", "deep", "animated"];

  var SHELF = [
    { title: "Your Name", year: 2016, moods: ["romantic", "deep", "animated"], note: "Two strangers, one sky, a little bit of magic." },
    { title: "Spirited Away", year: 2001, moods: ["cozy", "animated", "deep"], note: "Brave girl, strange bathhouse, white flowers floating." },
    { title: "Howl's Moving Castle", year: 2004, moods: ["romantic", "cozy", "animated"], note: "A dress that never gets old and a war that does." },
    { title: "Whisper of the Heart", year: 1995, moods: ["cozy", "romantic", "animated"], note: "The gentlest push to chase a dream." },
    { title: "Princess Mononoke", year: 1997, moods: ["deep", "animated"], note: "Nature and progress, neither the villain." },
    { title: "About Time", year: 2013, moods: ["romantic", "funny", "deep"], note: "A love letter to ordinary days." },
    { title: "La La Land", year: 2016, moods: ["romantic", "deep"], note: "Jazz, dreams, and a city full of lights." },
    { title: "Amélie", year: 2001, moods: ["romantic", "funny", "cozy"], note: "Paris, pranks, and a green-and-red heart." },
    { title: "The Lunchbox", year: 2013, moods: ["romantic", "deep", "cozy"], note: "Wrong lunch, right letter." },
    { title: "Before Sunrise", year: 1995, moods: ["romantic", "deep"], note: "One night, one city, endless talking." },
    { title: "Pride & Prejudice", year: 2005, moods: ["romantic", "cozy"], note: "Rain, letters, and a very slow yes." },
    { title: "The Grand Budapest Hotel", year: 2014, moods: ["funny", "cozy"], note: "Pastel symmetry and a stolen painting." },
    { title: "Moonrise Kingdom", year: 2012, moods: ["funny", "cozy", "romantic"], note: "Two kids run away to their own island." },
    { title: "Little Miss Sunshine", year: 2006, moods: ["funny", "deep"], note: "A family, a van, and one wild pageant." },
    { title: "Soul", year: 2020, moods: ["deep", "animated", "cozy"], note: "What makes a day worth living." },
    { title: "Coco", year: 2017, moods: ["deep", "animated", "cozy"], note: "Family, music, and remembering." },
    { title: "Up", year: 2009, moods: ["funny", "deep", "animated"], note: "Balloons, grief, and a new friendship." },
    { title: "Wall-E", year: 2008, moods: ["romantic", "deep", "animated"], note: "A love story with almost no words." },
    { title: "The Farewell", year: 2019, moods: ["deep", "cozy", "funny"], note: "A family says goodbye as a group." },
    { title: "Eat Pray Love", year: 2010, moods: ["deep", "romantic", "cozy"], note: "Pizza, prayer, and finding yourself." },
    { title: "Julie & Julia", year: 2009, moods: ["cozy", "funny"], note: "Butter, blogs, and a kitchen of two eras." },
    { title: "Chef", year: 2014, moods: ["cozy", "funny"], note: "A food truck and a father-son road trip." },
    { title: "Paddington", year: 2014, moods: ["cozy", "funny"], note: "Marmalade solves almost everything." },
    { title: "The Secret Life of Walter Mitty", year: 2013, moods: ["deep", "cozy"], note: "Step out of the daydream and into the world." },
    { title: "Crazy Rich Asians", year: 2018, moods: ["romantic", "funny"], note: "Glamour, family, and one big yes." },
    { title: "Notting Hill", year: 1999, moods: ["romantic", "funny", "cozy"], note: "Just a girl, standing in front of a boy." },
    { title: "The Map of Tiny Perfect Things", year: 2021, moods: ["romantic", "deep", "funny"], note: "Two kids stuck in a loop, choosing the good moments." },
    { title: "Suzume", year: 2022, moods: ["romantic", "deep", "animated"], note: "Empty chairs, open doors, growing up." },
    { title: "Kiki's Delivery Service", year: 1989, moods: ["cozy", "animated", "deep"], note: "A young witch learns to keep going." },
    { title: "Totoro", year: 1988, moods: ["cozy", "animated"], note: "Rainy bus stops and gentle giants." },
    { title: "The Princess Bride", year: 1987, moods: ["funny", "romantic", "cozy"], note: "True love, mostly inconceivable." },
    { title: "Forrest Gump", year: 1994, moods: ["deep", "romantic", "funny"], note: "Life is like a box of chocolates." }
  ];

  var LS = "mena-movies";
  var state = {
    watched: [],          // [{title, at}] newest first
    mood: "all",
    pick: null            // index into SHELF
  };

  function $(id) { return document.getElementById(id); }

  function load() {
    try {
      var raw = window.localStorage.getItem(LS);
      if (!raw) return;
      var p = JSON.parse(raw);
      state.watched = Array.isArray(p.watched) ? p.watched.slice(0, 20) : [];
      if (p.mood && MOODS.indexOf(p.mood) >= 0) state.mood = p.mood;
      if (typeof p.pick === "number" && p.pick >= 0 && p.pick < SHELF.length) state.pick = p.pick;
    } catch (e) { /* fresh */ }
  }

  function save() {
    try {
      window.localStorage.setItem(LS, JSON.stringify({
        watched: state.watched,
        mood: state.mood,
        pick: state.pick
      }));
    } catch (e) { /* ignore */ }
  }

  function slug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function findBySlug(s) {
    for (var i = 0; i < SHELF.length; i++) {
      if (slug(SHELF[i].title) === s) return i;
    }
    return -1;
  }

  function watchedTitles() {
    return state.watched.map(function (e) { return e.title; });
  }

  function isWatched(title) {
    return watchedTitles().indexOf(title) >= 0;
  }

  function fmtDate(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function pool() {
    if (state.mood === "all") return SHELF.map(function (_, i) { return i; });
    var out = [];
    SHELF.forEach(function (m, i) {
      if (m.moods.indexOf(state.mood) >= 0) out.push(i);
    });
    return out;
  }

  function renderMoods() {
    var box = $("moods");
    box.textContent = "";
    MOODS.forEach(function (mood) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mood-chip";
      btn.textContent = mood;
      btn.setAttribute("aria-pressed", state.mood === mood ? "true" : "false");
      btn.addEventListener("click", function () {
        state.mood = mood;
        state.pick = null;
        save();
        renderMoods();
        renderPick();
        renderShelf();
        renderStats();
        $("action-note").textContent = "Mood set to \u201c" + mood + "\u201d \u2014 shuffle away \u2665";
      });
      box.appendChild(btn);
    });
  }

  function renderPick() {
    var title = $("pick-title");
    var meta = $("pick-meta");
    var note = $("pick-note");
    if (state.pick === null || state.pick === undefined) {
      title.textContent = "\u2014";
      meta.textContent = "";
      note.textContent = "Press shuffle and let the shelf decide.";
      $("watched").disabled = true;
      return;
    }
    var m = SHELF[state.pick];
    title.textContent = m.title + " (" + m.year + ")";
    meta.textContent = m.moods.join(" \u00b7 ");
    note.textContent = "\u201c" + m.note + "\u201d";
    $("watched").disabled = isWatched(m.title);
    if (isWatched(m.title)) {
      $("watched").textContent = "Already seen \u2713";
    } else {
      $("watched").textContent = "We watched it";
    }
  }

  function renderStats() {
    $("watched-count").textContent = String(state.watched.length);
    $("pool-count").textContent = String(pool().length);
    $("last-watch").textContent = state.watched.length ? fmtDate(state.watched[0].at) : "never";
  }

  function renderLog() {
    var list = $("watch-log");
    list.textContent = "";
    if (!state.watched.length) {
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Nothing yet \u2014 tonight could be the first.";
      list.appendChild(empty);
      return;
    }
    state.watched.forEach(function (entry) {
      var li = document.createElement("li");
      var title = document.createElement("span");
      title.textContent = entry.title;
      var date = document.createElement("span");
      date.className = "log-date";
      date.textContent = fmtDate(entry.at);
      li.appendChild(title);
      li.appendChild(date);
      list.appendChild(li);
    });
  }

  function renderShelf() {
    var list = $("shelf");
    list.textContent = "";
    SHELF.forEach(function (m) {
      var li = document.createElement("li");
      li.textContent = m.title + " (" + m.year + ")";
      if (isWatched(m.title)) li.className = "seen";
      var tag = document.createElement("span");
      tag.className = "mood-tag";
      tag.textContent = m.moods.join("/");
      li.appendChild(tag);
      list.appendChild(li);
    });
  }

  function shuffle() {
    var indices = pool();
    if (!indices.length) return;
    var pick;
    if (indices.length === 1) {
      pick = indices[0];
    } else {
      do {
        pick = indices[Math.floor(Math.random() * indices.length)];
      } while (pick === state.pick && indices.length > 1);
    }
    state.pick = pick;
    save();
    renderPick();
    $("action-note").textContent = "Tonight: " + SHELF[pick].title + " \u2665";
  }

  function markWatched() {
    if (state.pick === null || state.pick === undefined) {
      $("action-note").textContent = "Shuffle a pick first \u2665";
      return;
    }
    var m = SHELF[state.pick];
    if (isWatched(m.title)) return;
    state.watched.unshift({ title: m.title, at: Date.now() });
    if (state.watched.length > 20) state.watched = state.watched.slice(0, 20);
    save();
    renderLog();
    renderStats();
    renderShelf();
    renderPick();
    $("action-note").textContent = m.title + " logged \u2014 movie night recorded \u2665";
  }

  function share() {
    if (state.pick === null || state.pick === undefined) {
      $("action-note").textContent = "Shuffle a pick first, then send it \u2665";
      return;
    }
    var m = SHELF[state.pick];
    var url;
    try {
      url = window.location.origin + window.location.pathname + "?m=" + slug(m.title);
    } catch (e) {
      url = "?m=" + slug(m.title);
    }
    function copied() {
      $("action-note").textContent = "Pick copied \u2014 send it and press play \u2665";
    }
    function fallback() {
      $("action-note").textContent = "Copy this by hand: " + url;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(copied, fallback);
      } else {
        fallback();
      }
    } catch (e) {
      fallback();
    }
  }

  function readArrival() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return false; }
    var m = params.get("m");
    if (!m) return false;
    var idx = findBySlug(m.toLowerCase());
    if (idx < 0) return false;
    state.pick = idx;
    return true;
  }

  function boot() {
    load();
    var arrived = readArrival();
    renderMoods();
    renderPick();
    renderStats();
    renderLog();
    renderShelf();

    $("shuffle").addEventListener("click", shuffle);
    $("watched").addEventListener("click", markWatched);
    $("share-pick").addEventListener("click", share);

    if (arrived) {
      var note = $("arrive-note");
      note.textContent = "Ammar picked this for you \u2665 \u2014 " + SHELF[state.pick].title;
      note.hidden = false;
      $("action-note").textContent = "A pick arrived, just for you.";
    }

    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      try { navigator.serviceWorker.register("sw.js"); } catch (e) { /* ignore */ }
    }
  }

  boot();
})();

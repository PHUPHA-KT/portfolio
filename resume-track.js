// Resume track switch: ?track=ai (default) | ?track=dev.
// Runs in <head> so the right variant renders on first paint and prints correctly.
(function () {
  var TRACKS = { ai: 'AI & Automation', dev: 'Software Developer' };
  var param = new URLSearchParams(location.search).get('track');
  var track = TRACKS[param] ? param : 'ai';
  var root = document.documentElement;
  root.setAttribute('data-track', track);

  document.addEventListener('DOMContentLoaded', function () {
    // The title becomes the default PDF filename when printing.
    document.title = document.title.replace(/\|.*$/, '| ' + TRACKS[track]);

    document.querySelectorAll('[data-track-link]').forEach(function (a) {
      if (a.getAttribute('data-track-link') === track) a.setAttribute('aria-current', 'page');
    });
    // Language switch keeps the chosen track.
    document.querySelectorAll('[data-keep-track]').forEach(function (a) {
      a.href = a.getAttribute('href').split('?')[0] + '?track=' + track;
    });
  });
})();

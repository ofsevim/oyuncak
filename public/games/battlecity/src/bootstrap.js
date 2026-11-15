$(function () {
  var FPS = 50;
  var FRAME_MS = 1000 / FPS;
  var lastFrameTime = 0;
  var accumulator = 0;

  var CANVAS_ID = 'canvas';
  var ctx = createCanvasContext();
  ctx.font = "16px prstart"

  var eventManager = new EventManager();
  var keyboard = new Keyboard(eventManager);
  var sceneManager = new SceneManager(eventManager);
  sceneManager.toLoadingScene();

  requestAnimationFrame(frameLoop);

  function frameLoop(timestamp) {
    if (window.oyuncakPaused || document.hidden) {
      lastFrameTime = timestamp;
      accumulator = 0;
      requestAnimationFrame(frameLoop);
      return;
    }
    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    var elapsed = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    accumulator = Math.min(accumulator + elapsed, FRAME_MS * 4);

    while (accumulator >= FRAME_MS) {
      gameLoop();
      accumulator -= FRAME_MS;
    }

    requestAnimationFrame(frameLoop);
  }

  function gameLoop() {
    keyboard.fireEvents();
    sceneManager.update();
    sceneManager.draw(ctx);
  }

  function createCanvasContext() {
    $('<canvas id="' + CANVAS_ID + '" width="' + Globals.CANVAS_WIDTH + '" height="' + Globals.CANVAS_HEIGHT + '"></canvas>').prependTo('#main');
    var canvas = document.getElementById(CANVAS_ID);
    return canvas.getContext('2d');
  };

  var trustedOrigin = window.location.origin;

  /* ── postMessage bridge: React mobil kontrollerinden gelen tuş olayları ── */
  window.addEventListener('message', function(e) {
    if (e.origin !== trustedOrigin || e.source !== parent) return;
    var data = e.data;
    if (data && data.type === 'oyuncak:activity' && typeof data.paused === 'boolean' && typeof data.muted === 'boolean') {
      window.oyuncakPaused = data.paused;
      window.oyuncakMuted = data.muted;
      if (data.paused || data.muted) SoundManager.stopAll();
      return;
    }
    if (!data || (data.type !== 'keydown' && data.type !== 'keyup')) return;
    if (data.keyCode !== 13 && data.keyCode !== 32 && data.keyCode !== 37 && data.keyCode !== 38 && data.keyCode !== 39 && data.keyCode !== 40) return;
    var ev = $.Event(data.type);
    ev.which = data.keyCode;
    ev.keyCode = data.keyCode;
    $(document).trigger(ev);
  });

  /* ── Skor köprüsü: aktif oyuncunun skorunu izle ve oyun sonunda parent'a bildir ──
     Oyun kaynak dosyalarına dokunmadan Player/SceneManager prototiplerini sarmalar. */
  (function () {
    var latestScore = 0;

    if (window.Player && Player.prototype && !Player.prototype.__scoreBridge) {
      Player.prototype.__scoreBridge = true;
      var origNotify = Player.prototype.notify;
      Player.prototype.notify = function (event) {
        origNotify.call(this, event);
        /* Yalnızca aktif (abone) oyuncu bildirim alır → skor her zaman güncel oyunu yansıtır */
        if (typeof this.getScore === 'function') latestScore = this.getScore();
      };
    }

    function reportScore() {
      try { parent.postMessage({ type: 'battlecity:gameover', score: latestScore }, trustedOrigin); }
      catch (err) { /* sessiz */ }
    }

    if (window.SceneManager && SceneManager.prototype && !SceneManager.prototype.__scoreBridge) {
      SceneManager.prototype.__scoreBridge = true;
      var origGameOver = SceneManager.prototype.toGameOverScene;
      SceneManager.prototype.toGameOverScene = function () {
        reportScore();
        return origGameOver.apply(this, arguments);
      };
    }
  })();
});

(() => {
  const player = document.querySelector('.reel-player');
  const video = player.querySelector('video');
  const picture = player.querySelector('.reel-picture');
  const overlay = player.querySelector('.tap-area');
  const controls = player.querySelector('.mobile-controls');
  const seek = player.querySelector('#reel-seek');
  const play = player.querySelector('.reel-play');
  const mute = player.querySelector('.reel-mute');
  const full = player.querySelector('.reel-fullscreen');
  const time = player.querySelector('.reel-time');
  const feedback = player.querySelector('.seek-feedback');
  const indicator = player.querySelector('.playback-indicator');
  const quality = window.reelQuality;
  const mobile = quality.mobile;
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 3.5v17l13-8.5z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5 4h5v16H5zm9 0h5v16h-5z"/></svg>';
  player.addEventListener('contextmenu', event => event.preventDefault());
  let selectedQuality = quality.initial, objectURL, loading = false;
  function waitForMetadata() {
    return new Promise((resolve,reject) => {
      let timer;
      const cleanup = () => {clearTimeout(timer); video.removeEventListener('loadedmetadata',ready); video.removeEventListener('error',failed)};
      const ready = () => {cleanup(); resolve()};
      const failed = () => {cleanup(); reject(new Error('unsupported'))};
      video.addEventListener('loadedmetadata',ready); video.addEventListener('error',failed);
      timer = setTimeout(failed,15000);
    });
  }
  async function loadQuality(key) {
    let lastError;
    for (const candidate of key === 'original' ? ['original','compatible'] : [key]) {
      try {
        if (candidate === 'original' && typeof video.canPlayType === 'function' && !video.canPlayType('video/mp4; codecs="hvc1.1.6.L120.B0"')) throw new Error('unsupported');
        const nextURL = await quality.prepare(candidate);
        video.src = nextURL; const ready = waitForMetadata(); video.load(); await ready;
        return {url:nextURL, fallback:candidate === 'compatible'};
      } catch (error) { lastError = error; }
    }
    throw lastError;
  }
  const qualityMessage = fallback => fallback ? '1080p: версия для этого браузера.' : '';
  window.addEventListener('reel-quality-change', async event => {
    const next = event.detail;
    if (next === selectedQuality || loading) return;
    if (!objectURL) { selectedQuality = next; quality.setStatus(''); return; }
    loading = true; quality.setBusy(true); quality.setStatus('Загружаем выбранное качество…');
    let previousSource, previousTime, wasPlaying;
    try {
      previousSource = video.currentSrc || video.src || 'showreel-720.mp4';
      previousTime = video.currentTime || 0; wasPlaying = !video.paused;
      video.pause(); const result = await loadQuality(next);
      video.currentTime = Math.min(previousTime, Math.max(0,video.duration-.05));
      selectedQuality = next; objectURL = result.url;
      quality.setStatus(qualityMessage(result.fallback));
      if (wasPlaying) { try { await video.play(); } catch { quality.setStatus('Нажмите кнопку воспроизведения, чтобы продолжить.'); } }
    } catch {
      if (previousSource) { video.src = previousSource; const restored = waitForMetadata(); video.load(); try { await restored; video.currentTime = Math.min(previousTime, Math.max(0,video.duration-.05)); if (wasPlaying) await video.play(); } catch {} }
      quality.select.value = selectedQuality;
      quality.setStatus('Не удалось открыть качество. Возможно, формат оригинала не поддерживается этим браузером.');
    } finally {loading = false; quality.setBusy(false);}
  });
  video.pause(); video.controls = false; video.preload = 'none';
  video.querySelector('source').remove(); video.load();
  controls.hidden = false; player.classList.add('touch-player');
  let scrubbing = false, lastTap = null, feedbackTimer, tapTimer, hideTimer, indicatorTimer, touchStart, lastMouseTap = null, mouseTimer, playbackStarted = false;
  const inFullscreen = () => document.fullscreenElement === player;
  function setControlsVisible(visible) {
    clearTimeout(hideTimer);
    if (!mobile && video.paused) visible = true;
    player.classList.toggle('controls-hidden', !visible && inFullscreen());
    controls.inert = mobile && !visible && inFullscreen();
    if (visible && inFullscreen() && (mobile || !video.paused)) hideTimer = setTimeout(() => { if (!scrubbing && document.activeElement !== quality.select) setControlsVisible(false); }, 3000);
  }
  document.addEventListener('fullscreenchange', () => {
    clearTimeout(tapTimer); lastTap = null;
    setControlsVisible(!inFullscreen());
  });
  controls.addEventListener('pointerdown', () => { if (inFullscreen()) { clearTimeout(hideTimer); } });
  controls.addEventListener('pointerup', () => { if (inFullscreen()) setControlsVisible(true); });
  quality.select.addEventListener('focus', () => clearTimeout(hideTimer));
  quality.select.addEventListener('blur', () => { if (inFullscreen()) setControlsVisible(true); });
  const format = n => Number.isFinite(n) ? `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}` : '0:00';
  const notice = message => { feedback.textContent = message; feedback.classList.add('visible'); clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => feedback.classList.remove('visible'), 1100); };
  function update() {
    const duration = video.duration;
    player.classList.toggle('mobile-paused', mobile && video.paused);
    if (!scrubbing) seek.value = Number.isFinite(duration) && duration > 0 ? Math.round(video.currentTime / duration * 1000) : 0;
    seek.disabled = !Number.isFinite(duration) || duration <= 0;
    time.textContent = `${format(video.currentTime)} / ${format(duration)}`;
    play.innerHTML = video.paused ? playIcon : pauseIcon;
    play.setAttribute('aria-label', video.paused ? 'Воспроизвести' : 'Пауза');
    mute.textContent = video.muted ? 'Без звука' : 'Звук';
    mute.setAttribute('aria-label', video.muted ? 'Включить звук' : 'Выключить звук');
  }
  async function start() {
    if (loading) return;
    if (!objectURL) {
      loading = true; play.disabled = true; quality.setBusy(true); time.textContent = 'Загрузка видео…'; quality.setStatus('Загружаем видео…');
      try {
        const result = await loadQuality(selectedQuality); objectURL = result.url;
        quality.setStatus(qualityMessage(result.fallback));
        try { await video.play(); } catch { notice('Видео готово — нажмите воспроизведение'); }
      } catch {
        quality.setStatus('Не удалось открыть видео. Попробуйте другое качество.'); notice('Попробуйте другое качество');
      } finally { loading = false; play.disabled = false; quality.setBusy(false); update(); }
    } else if (video.paused) { try { await video.play(); } catch { notice('Нажмите воспроизведение ещё раз'); } }
    else video.pause();
  }
  play.addEventListener('click', start);
  if (!mobile) {
    player.classList.add('is-paused');
    controls.addEventListener('pointerenter', () => player.classList.remove('hide-after-play'));
    controls.addEventListener('pointerleave', () => player.classList.remove('hide-after-play'));
    controls.addEventListener('focusin', () => player.classList.remove('hide-after-play'));
    video.addEventListener('pause', () => {
      clearTimeout(indicatorTimer); indicator.innerHTML = playIcon;
      player.classList.remove('flash-pause','hide-after-play'); player.classList.add('is-paused');
      setControlsVisible(true);
    });
    video.addEventListener('ended', () => {
      clearTimeout(indicatorTimer); indicator.innerHTML = playIcon;
      player.classList.remove('flash-pause','hide-after-play'); player.classList.add('is-paused');
      setControlsVisible(true);
    });
  }
  video.addEventListener('play', () => {
    playbackStarted = true;
    if (!mobile) {
      clearTimeout(indicatorTimer); indicator.innerHTML = pauseIcon;
      player.classList.remove('is-paused'); player.classList.add('flash-pause','hide-after-play');
      if (inFullscreen()) setControlsVisible(false);
      indicatorTimer = setTimeout(() => player.classList.remove('flash-pause'), 600);
    }
  });
  if (!mobile) document.addEventListener('keydown', event => {
    if (document.querySelector('#modal')?.open) return;
    if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !playbackStarted || loading) return;
    const target = event.target;
    if (target?.isContentEditable || target?.closest?.('input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]')) return;
    const rect = player.getBoundingClientRect();
    if (!inFullscreen() && (rect.bottom <= 0 || rect.top >= window.innerHeight)) return;
    event.preventDefault();
    start();
  });
  mute.addEventListener('click', () => {video.muted = !video.muted; update();});
  quality.volume.addEventListener('input', () => { video.volume = Number(quality.volume.value); video.muted = video.volume === 0; update(); });
  seek.addEventListener('pointerdown', () => {scrubbing = true;});
  seek.addEventListener('input', () => { if (Number.isFinite(video.duration)) { video.currentTime = Number(seek.value) / 1000 * video.duration; time.textContent = `${format(video.currentTime)} / ${format(video.duration)}`; }});
  seek.addEventListener('change', () => {scrubbing = false; update(); if (inFullscreen()) setControlsVisible(true);});
  seek.addEventListener('pointercancel', () => {scrubbing = false; update(); if (inFullscreen()) setControlsVisible(true);});
  ['loadedmetadata','durationchange','timeupdate','play','pause','ended','volumechange'].forEach(event => video.addEventListener(event, update));
  overlay.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') touchStart = {x:event.clientX, y:event.clientY}; });
  overlay.addEventListener('pointerup', event => {
    if (event.pointerType === 'mouse') {
      const now = Date.now();
      if (lastMouseTap !== null && now - lastMouseTap < 350) {
        clearTimeout(mouseTimer); lastMouseTap = null; toggleFullscreen();
      } else {
        lastMouseTap = now;
        mouseTimer = setTimeout(() => { lastMouseTap = null; start(); },350);
      }
      return;
    }
    if (event.pointerType !== 'touch') return;
    if (!touchStart || Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 12) {touchStart = null; return;}
    touchStart = null;
    const rect = picture.getBoundingClientRect();
    const side = event.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    const now = Date.now();
    if (lastTap && lastTap.side === side && now - lastTap.time < 350) {
      clearTimeout(tapTimer);
      lastTap = null;
      if (!Number.isFinite(video.duration)) {notice('Сначала запустите видео'); return;}
      const offset = side === 'left' ? -5 : 5;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + offset));
      notice(offset < 0 ? '−5 сек.' : '+5 сек.'); update();
    } else {
      clearTimeout(tapTimer);
      lastTap = {side, time:now};
      tapTimer = setTimeout(() => {
        lastTap = null;
        if (inFullscreen()) setControlsVisible(player.classList.contains('controls-hidden'));
        else start();
      }, 350);
    }
  });
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (player.requestFullscreen) await player.requestFullscreen();
      else if (video.webkitEnterFullscreen && objectURL) video.webkitEnterFullscreen();
      else notice('Сначала запустите видео');
    } catch { if (video.webkitEnterFullscreen && objectURL) video.webkitEnterFullscreen(); else notice('Полный экран недоступен'); }
  }
  full.addEventListener('click', toggleFullscreen);
  update();
})();

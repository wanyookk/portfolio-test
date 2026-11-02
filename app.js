const board = document.querySelector('#board');
const modal = document.querySelector('#modal');
const content = document.querySelector('#modal-content');
let filter = 'all';
function clearWork() {
  const video = content.querySelector('video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  content.replaceChildren();
}

function showWork(w) {
  clearWork();
  const showreel = document.querySelector('.showreel-video');
  if (showreel && !showreel.paused) showreel.pause();
  const label = document.createElement('span');
  let videoToPlay = null;
  let videoStatus = null;
  label.textContent = w.type === 'photo' ? 'ФОТО' : 'ВИДЕО';
  content.append(label);
  if (w.src) {
    const media = document.createElement(w.type === 'photo' ? 'img' : 'video');
    if (w.type === 'video') {
      media.controls = true;
      media.setAttribute('controlsList', 'nodownload');
      media.addEventListener('contextmenu', event => event.preventDefault());
      media.playsInline = true;
      media.setAttribute('playsinline', '');
      media.preload = 'metadata';
      if (w.cover) media.poster = w.cover;
    } else { media.src = w.src; media.alt = w.title; }
    content.append(media);
    if (w.type === 'video') {
      const status = document.createElement('p');
      status.className = 'work-loading';
      status.textContent = 'Загружаем видео…';
      status.setAttribute('role', 'status');
      content.append(status);
      media.addEventListener('playing', () => {
        status.remove();
        media.removeAttribute('poster');
      }, {once: true});
      media.addEventListener('error', () => {
        if (modal.open && content.querySelector('video') === media) {
          status.textContent = 'Не удалось загрузить видео. Попробуйте открыть работу ещё раз.';
          if (!status.isConnected) content.append(status);
        }
      });
      media.src = w.src;
      videoToPlay = media;
      videoStatus = status;
    }
  } else {
    const blank = document.createElement('div'); blank.className = 'modal-blank';
    blank.textContent = 'РАБОТА ПОЯВИТСЯ ЗДЕСЬ'; content.append(blank);
  }
  const title = document.createElement('h3'); title.textContent = w.title;
  const p = document.createElement('p'); p.textContent = w.description;
  content.append(title, p);
  modal.showModal();
  if (videoToPlay) {
    const playback = videoToPlay.play();
    if (playback) playback.catch(() => {
      if (!modal.open || content.querySelector('video') !== videoToPlay) return;
      videoStatus.textContent = 'Нажмите кнопку воспроизведения, чтобы запустить видео.';
      if (!videoStatus.isConnected) content.append(videoStatus);
    });
  }
}

function render() {
  board.replaceChildren();
  const visible = works.filter(w => filter === 'all' || w.type === filter);
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'works-empty'; empty.textContent = 'Фотографии скоро появятся.';
    board.append(empty); return;
  }
  visible.forEach(w => {
    const card = document.createElement('button'); card.className = 'work-card';
    card.type = 'button'; card.setAttribute('aria-label', 'Открыть: ' + w.title);
    if (w.cover) { card.classList.add('has-cover'); card.style.backgroundImage = `linear-gradient(180deg,rgba(22,0,0,.35),transparent 35%,rgba(22,0,0,.88)),url("${w.cover}")`; }
    const top = document.createElement('span'); top.className = 'card-top'; top.textContent = w.type === 'photo' ? 'ФОТО' : 'ВИДЕО';
    const arrow = document.createElement('b'); arrow.innerHTML = '<svg class="icon-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 13L13 3M5 3h8v8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'; top.append(arrow);
    const center = document.createElement('span'); center.className = 'card-center';
    if (w.type === 'photo') center.textContent = '◇';
    else center.innerHTML = '<svg class="card-play-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3.5v17l13-8.5z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
    const bottom = document.createElement('span'); bottom.className = 'card-bottom'; bottom.textContent = w.title;
    card.append(top, center, bottom); card.addEventListener('click', () => showWork(w)); board.append(card);
  });
}
render();
document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === b));
  render();
}));
document.querySelector('.close').onclick = () => modal.close();
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
modal.addEventListener('close', clearWork);

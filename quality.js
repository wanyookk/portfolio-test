(() => {
  const player = document.querySelector('.reel-player');
  const mobile = matchMedia('(pointer: coarse)').matches;
  const initial = 'original';
  const makeSelector = () => {
    const label = document.createElement('label');
    label.className = 'quality-label';
    label.append(' ');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Качество видео');
    [['low','480p'],['medium','720p'],['original','1080p']].forEach(([value,text]) => {
      const option = document.createElement('option'); option.value=value; option.textContent=text; select.append(option);
    });
    select.value = initial; label.append(select);
    return {label,select};
  };
  const option = makeSelector();
  const volume = document.createElement('input'); volume.type='range'; volume.min='0'; volume.max='1'; volume.step='0.05'; volume.value='1'; volume.className='reel-volume'; volume.setAttribute('aria-label','Громкость');
  player.querySelector('.control-row').insertBefore(volume, player.querySelector('.reel-fullscreen'));
  player.querySelector('.control-row').insertBefore(option.label, player.querySelector('.reel-fullscreen'));
  const status = document.createElement('span'); status.className='quality-status'; status.setAttribute('role','status');
  player.querySelector('.mobile-controls').append(status);
  const files = {low:['showreel-low.mp4'],medium:['showreel-720.mp4'],compatible:['showreel-1080-compatible.mp4'],original:['showreel-original-1.bin','showreel-original-2.bin','showreel-original-3.bin']};
  const cache = new Map();
  async function prepare(value) {
    if (cache.has(value)) return cache.get(value);
    const parts = [];
    for (const file of files[value]) {
      const response = await fetch(file, {credentials:'same-origin'});
      if (!response.ok) throw new Error('download');
      parts.push(await response.blob());
    }
    const result = URL.createObjectURL(new Blob(parts, {type:'video/mp4'}));
    cache.set(value,result); return result;
  }
  option.select.addEventListener('change',()=>window.dispatchEvent(new CustomEvent('reel-quality-change',{detail:option.select.value})));
  window.reelQuality = {prepare, mobile, initial, volume, select:option.select, status, setBusy(value){option.select.disabled=value}, setStatus(text){status.textContent=text}};
})();

(() => {
  'use strict';

  const canvas = document.querySelector('#game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const stage = document.querySelector('#game-stage');
  const scoreEl = document.querySelector('#score-display');
  const bestEl = document.querySelector('#best-score');
  const hudBestEl = document.querySelector('#hud-best');
  const menuOverlay = document.querySelector('#menu-overlay');
  const pauseOverlay = document.querySelector('#pause-overlay');
  const gameoverOverlay = document.querySelector('#gameover-overlay');
  const instructionsOverlay = document.querySelector('#instructions-overlay');
  const pauseButton = document.querySelector('#pause-button');
  const muteButton = document.querySelector('#mute-button');
  const finalScoreEl = document.querySelector('#final-score');
  const finalBestEl = document.querySelector('#final-best');
  const bitterReveal = document.querySelector('#bitter-reveal');
  const bitterQuestionEl = document.querySelector('#bitter-question');
  const bitterAsideEl = document.querySelector('#bitter-aside');
  const instructionsButton = document.querySelector('#instructions-button');
  const closeInstructionsButton = document.querySelector('#close-instructions');
  const jumpButton = document.querySelector('#touch-jump');
  const duckButton = document.querySelector('#touch-duck');

  const STORAGE_SCORE = 'offline-dino-runner-best-v1';
  const STORAGE_MUTE = 'offline-dino-runner-muted-v1';
  const BITTER_QUESTIONS = [
    'Kayo pa ba?', 'Kayo ba talaga?', 'Mahal ka ba?', 'Miss ka pa ba niya?', 'Ikaw pa rin ba?',
    'May chance pa ba?', 'Bakit siya, hindi ikaw?', 'Pinili ka ba?', 'Naghihintay ka pa rin?', 'Worth it pa ba?',
    'Ikaw lang ba ang lumalaban?', 'Masaya ka ba talaga?', 'Naalala ka pa kaya?', 'May iba na ba?', 'Bakit hindi ikaw?',
    'Hanggang kaibigan lang ba?', 'Umaasa ka pa rin?', 'Sana all pinipili.', 'Bakit siya ang masaya?', 'Tayo pa ba sa panaginip?'
  ];
  const BITTER_ASIDES = [
    'Another run? Another chance?', 'At least the cactus showed up.', 'The cactus had better timing.', 'Even the bird knew when to leave.',
    'You dodged everything except the red flags.', 'Some things are easier to outrun.', 'Healing takes longer than this run.'
  ];
  const AUDIO_TYPES = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'audio/mp4' };
  const MUSIC_TRACKS = [
    { title: 'Download - 2026-11-13T115037.544', src: 'music/Download - 2026-11-13T115037.544.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'Download - 2026-11-13T115107.067', src: 'music/Download - 2026-11-13T115107.067.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'Download - 2026-11-13T115226.291', src: 'music/Download - 2026-11-13T115226.291.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'Download - 2026-11-13T115314.152', src: 'music/Download - 2026-11-13T115314.152.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'Download - 2026-11-13T115343.312', src: 'music/Download - 2026-11-13T115343.312.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'hanggang dito nalang', src: 'music/hanggang dito nalang.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'kung ayaw', src: 'music/kung ayaw.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'totoong tayo', src: 'music/totoong tayo.mp4', type: AUDIO_TYPES['.mp4'] },
    { title: 'wiimyftroml', src: 'music/wiimyftroml.mp4', type: AUDIO_TYPES['.mp4'] }
  ];
  const COLORS = {
    day: { sky: '#fff8e7', far: '#f4e4c9', near: '#eed9b6', ground: '#a67c52', detail: '#d6b68d', ink: '#526e4f', cactus: '#557b4f', bird: '#b66c46', cloud: '#fffdf7' },
    night: { sky: '#252a35', far: '#343746', near: '#43434a', ground: '#bcaa91', detail: '#605d5b', ink: '#f3d6a4', cactus: '#a0b488', bird: '#edab7c', cloud: '#515661' }
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const hexMix = (a, b, t) => {
    const parse = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
    const ca = parse(a), cb = parse(b);
    return `rgb(${mix(ca[0], cb[0], t)},${mix(ca[1], cb[1], t)},${mix(ca[2], cb[2], t)})`;
  };

  let state = 'menu';
  let muted = readStored(STORAGE_MUTE, 'false') === 'true';
  let best = Number(readStored(STORAGE_SCORE, '0')) || 0;
  let score = 0;
  let distance = 0;
  let speed = 300;
  let spawnTimer = 1.15;
  let lastFrame = 0;
  let worldWidth = 900;
  let worldHeight = 300;
  let dpr = 1;
  let audio = null;
  let musicPlayer = null;
  let musicGeneration = 0;
  let activeMusicIndex = -1;
  let lastMusicIndex = -1;
  let ducking = false;
  let jumpHeld = false;
  let night = 0;
  // Keep interpolated colors separate so the source palette remains valid hex.
  let currentTheme = { ...COLORS.day };
  let bitterRevealTimer = 0;
  let lastBitterQuestion = '';
  let displayedScore = 0;
  let instructionsOpen = false;
  const obstacles = [];
  const clouds = [
    { x: 100, y: .24, scale: .8 }, { x: 375, y: .39, scale: .55 },
    { x: 660, y: .2, scale: .7 }, { x: 840, y: .48, scale: .45 }
  ];
  const stars = Array.from({ length: 38 }, (_, i) => ({
    x: ((i * 173 + 41) % 997) / 997,
    y: .08 + ((i * 67 + 19) % 161) / 250,
    size: i % 5 === 0 ? 2.2 : 1.2
  }));
  const dino = { x: 75, y: 0, vy: 0, width: 38, height: 48, grounded: true, anim: 0 };
  dino.crashed = false;
  const particles = Array.from({ length: 15 }, (_, i) => ({
    x: ((i * 67 + 23) % 101) / 100,
    y: .12 + ((i * 43 + 8) % 69) / 100,
    size: i % 4 === 0 ? 3 : 2,
    phase: i * 1.7
  }));

  function readStored(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Storage may be disabled in private browsing. */ }
  }
  function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(5, '0'); }
  function updateBestDisplays(isRecord = false) {
    bestEl.textContent = formatScore(best);
    hudBestEl.textContent = formatScore(best);
    if (isRecord) {
      bestEl.parentElement.classList.remove('is-new-record');
      void bestEl.parentElement.offsetWidth;
      bestEl.parentElement.classList.add('is-new-record');
      window.setTimeout(() => bestEl.parentElement.classList.remove('is-new-record'), 1500);
    }
  }
  function setOverlay(element, visible) {
    element.classList.toggle('is-hidden', !visible);
    element.setAttribute('aria-hidden', String(!visible));
  }
  function openInstructions() {
    if (state !== 'menu') return;
    instructionsOpen = true;
    setOverlay(instructionsOverlay, true);
    closeInstructionsButton.focus();
  }
  function closeInstructions() {
    instructionsOpen = false;
    setOverlay(instructionsOverlay, false);
    instructionsButton.focus();
  }
  function chooseDifferent(options, previous) {
    const available = options.filter(item => item !== previous);
    return available[Math.floor(Math.random() * available.length)];
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    worldWidth = rect.width;
    worldHeight = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = clamp(worldWidth / 350, 1.8, 3.15);
    dino.width = unit * 32;
    dino.height = unit * 24;
    dino.x = Math.max(18, worldWidth * .075);
    clouds.forEach((cloud, index) => { cloud.x = worldWidth * (.12 + index * .23); });
    if (dino.grounded) dino.y = groundY() - dino.height;
    render();
  }
  function groundY() { return worldHeight - Math.max(31, worldHeight * .13); }

  function initAudio() {
    if (muted) return null;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!audio) audio = new AudioContext();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch { return null; }
  }
  function tone(frequency, duration, type = 'square', volume = .045, slide = 0) {
    const ac = initAudio();
    if (!ac) return;
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain);
    gain.connect(ac.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function stopGameOverMusic() {
    musicGeneration += 1;
    if (!musicPlayer) return;
    musicPlayer.pause();
    const resetPosition = () => {
      try { musicPlayer.currentTime = 0; } catch { /* Metadata may not be ready yet. */ }
    };
    resetPosition();
    if (musicPlayer.readyState === 0) musicPlayer.addEventListener('loadedmetadata', resetPosition, { once: true });
    activeMusicIndex = -1;
  }

  function shuffledTrackIndices() {
    const indices = MUSIC_TRACKS.map((_, index) => index);
    if (indices.length > 1 && lastMusicIndex >= 0) indices.splice(indices.indexOf(lastMusicIndex), 1);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  function playGameOverMusic() {
    stopGameOverMusic();
    if (muted || MUSIC_TRACKS.length === 0 || state !== 'gameover') return;
    if (!musicPlayer) {
      try {
        musicPlayer = new Audio();
        musicPlayer.preload = 'none';
        musicPlayer.volume = .55;
      } catch {
        return;
      }
    }

    const generation = musicGeneration;
    const candidates = shuffledTrackIndices();
    const tryNext = () => {
      if (generation !== musicGeneration || state !== 'gameover' || muted) return;
      const index = candidates.shift();
      if (index === undefined) {
        console.warn('No music tracks could be played. Check the files in the music folder.');
        activeMusicIndex = -1;
        return;
      }
      const track = MUSIC_TRACKS[index];
      activeMusicIndex = index;
      lastMusicIndex = index;
      musicPlayer.onerror = () => {
        if (generation !== musicGeneration || activeMusicIndex !== index) return;
        console.warn(`Could not load music track: ${track.title}`);
        tryNext();
      };
      const source = document.createElement('source');
      source.src = track.src;
      source.type = track.type;
      musicPlayer.replaceChildren(source);
      musicPlayer.load();
      const playAttempt = musicPlayer.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(error => {
          if (generation !== musicGeneration || activeMusicIndex !== index || error.name === 'AbortError') return;
          if (error.name === 'NotAllowedError') {
            console.warn('The browser blocked background music playback.');
            return;
          }
          console.warn(`Could not play music track: ${track.title}`);
          tryNext();
        });
      }
    };
    tryNext();
  }

  function updateMuteButton() {
    muteButton.textContent = muted ? '×' : '♪';
    muteButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    muteButton.title = muted ? 'Unmute sound' : 'Mute sound';
  }
  function startGame() {
    stopGameOverMusic();
    window.clearTimeout(bitterRevealTimer);
    bitterReveal.classList.remove('is-revealed');
    stage.classList.remove('crash-shake', 'crash-gray');
    initAudio();
    state = 'running';
    score = 0;
    distance = 0;
    speed = 300;
    spawnTimer = .85;
    obstacles.length = 0;
    night = 0;
    dino.height = 48;
    const unit = clamp(worldWidth / 350, 1.8, 3.15);
    dino.width = unit * 32;
    dino.height = unit * 24;
    dino.crashed = false;
    dino.y = groundY() - dino.height;
    dino.vy = 0;
    dino.grounded = true;
    ducking = false;
    scoreEl.textContent = formatScore(score);
    displayedScore = score;
    setOverlay(menuOverlay, false);
    setOverlay(pauseOverlay, false);
    setOverlay(gameoverOverlay, false);
    pauseButton.disabled = false;
    pauseButton.textContent = 'Ⅱ';
    pauseButton.setAttribute('aria-label', 'Pause game');
    tone(520, .09, 'square', .035, 180);
    lastFrame = performance.now();
  }
  function endGame() {
    if (state !== 'running') return;
    state = 'gameover';
    ducking = false;
    score = Math.floor(distance / 8);
    const isRecord = score > best;
    if (isRecord) {
      best = score;
      writeStored(STORAGE_SCORE, String(best));
    }
    dino.crashed = true;
    updateBestDisplays(isRecord);
    finalScoreEl.textContent = formatScore(score);
    finalBestEl.textContent = formatScore(best);
    const question = chooseDifferent(BITTER_QUESTIONS, lastBitterQuestion);
    lastBitterQuestion = question;
    bitterQuestionEl.textContent = `“${question}”`;
    bitterAsideEl.textContent = chooseDifferent(BITTER_ASIDES, bitterAsideEl.textContent);
    bitterReveal.classList.remove('is-revealed');
    setOverlay(gameoverOverlay, true);
    playGameOverMusic();
    pauseButton.disabled = true;
    stage.classList.remove('crash-shake', 'crash-gray');
    void stage.offsetWidth;
    stage.classList.add('crash-shake', 'crash-gray');
    bitterRevealTimer = window.setTimeout(() => bitterReveal.classList.add('is-revealed'), 900);
    tone(210, .32, 'sawtooth', .055, -115);
    window.setTimeout(() => tone(135, .42, 'triangle', .035, -45), 180);
  }
  function togglePause() {
    if (state === 'running') {
      state = 'paused';
      ducking = false;
      setOverlay(pauseOverlay, true);
      pauseButton.textContent = '▶';
      pauseButton.setAttribute('aria-label', 'Resume game');
    } else if (state === 'paused') {
      state = 'running';
      setOverlay(pauseOverlay, false);
      pauseButton.textContent = 'Ⅱ';
      pauseButton.setAttribute('aria-label', 'Pause game');
      lastFrame = performance.now();
    }
  }
  function jump() {
    if (state !== 'running' || !dino.grounded || ducking) return;
    dino.vy = -Math.max(530, worldHeight * 1.85);
    dino.grounded = false;
    tone(430, .1, 'square', .035, 240);
  }

  function spawnObstacle() {
    const size = clamp(worldWidth / 350, 1.8, 3.15);
    const canFly = score > 180;
    const bird = canFly && Math.random() < Math.min(.36, .12 + score / 1800);
    if (bird) {
      const birdScale = clamp(worldWidth / 550, .85, 1.55);
      const height = 28 * birdScale;
      const clearance = (Math.random() < .5 ? 10 : 19) * size;
      obstacles.push({ type: 'bird', x: worldWidth + 16, y: groundY() - clearance - height, width: 48 * birdScale, height, flap: Math.random() * 5 });
    } else {
      const count = Math.random() < .27 ? 2 : 1;
      const height = size * (17 + Math.random() * 5);
      obstacles.push({ type: 'cactus', x: worldWidth + 16, y: groundY() - height, width: size * (count === 2 ? 25 : 14), height, count });
    }
    const minimumGap = Math.max(.78, 1.28 - score / 4200);
    spawnTimer = minimumGap + Math.random() * .65;
  }

  function update(dt) {
    if (state === 'menu') {
      distance += 26 * dt;
      dino.anim += dt * 2.4;
      for (const cloud of clouds) {
        cloud.x -= 11 * dt;
        if (cloud.x < -80) cloud.x = worldWidth + 60;
      }
      for (const particle of particles) {
        particle.x -= dt * .018;
        if (particle.x < -.02) particle.x = 1.02;
      }
      return;
    }
    if (state !== 'running') return;
    distance += speed * dt;
    score = Math.floor(distance / 8);
    speed = Math.min(520, 300 + score * .72);
    if (score !== displayedScore) {
      displayedScore = score;
      scoreEl.textContent = formatScore(score);
      if (score % 25 === 0) {
        scoreEl.classList.remove('score-tick');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('score-tick');
        window.setTimeout(() => scoreEl.classList.remove('score-tick'), 240);
      }
    }

    const cycle = (score % 1200) / 1200;
    const targetNight = cycle < .12 ? 0 : cycle < .36 ? (cycle - .12) / .24 : cycle < .62 ? 1 : cycle < .86 ? 1 - (cycle - .62) / .24 : 0;
    night += (targetNight - night) * Math.min(1, dt * .65);
    for (const cloud of clouds) {
      cloud.x -= speed * dt * .12;
      if (cloud.x < -100) cloud.x = worldWidth + 60;
    }
    for (const particle of particles) {
      particle.x -= dt * (.025 + speed / 26000);
      if (particle.x < -.02) particle.x = 1.02;
    }

    dino.vy += Math.max(1450, worldHeight * 5.05) * dt;
    dino.y += dino.vy * dt;
    const floor = groundY() - dino.height;
    if (dino.y >= floor) {
      dino.y = floor;
      dino.vy = 0;
      dino.grounded = true;
    }
    dino.anim += dt * speed / 20;
    spawnTimer -= dt;
    if (spawnTimer <= 0) spawnObstacle();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      obstacle.x -= speed * dt;
      obstacle.flap += dt * 12;
      if (obstacle.x + obstacle.width < -20) obstacles.splice(i, 1);
      else if (collides(obstacle)) { endGame(); break; }
    }
  }

  function collides(obstacle) {
    const unit = dino.height / 24;
    const dinoHeight = ducking && dino.grounded ? dino.height * .62 : dino.height;
    const dinoTop = ducking && dino.grounded ? groundY() - dinoHeight : dino.y;
    const ax = dino.x + unit * 6, ay = dinoTop + unit * 2;
    const aw = ducking && dino.grounded ? unit * 25 : unit * 23;
    const ah = dinoHeight - unit * 4;
    const bx = obstacle.x + 3, by = obstacle.y + 3;
    const bw = obstacle.width - 6, bh = obstacle.height - 4;
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function drawDino(color) {
    const unit = dino.height / 24;
    const duck = ducking && dino.grounded;
    const height = duck ? dino.height * .62 : dino.height;
    const y = duck ? groundY() - height : dino.y;
    const runPose = dino.grounded && state === 'running';
    const step = Math.floor(dino.anim) % 2;
    const bob = runPose ? Math.sin(dino.anim * 2) * unit * .35 : state === 'menu' ? Math.sin(dino.anim * 1.5) * unit * .4 : 0;
    const darkInk = night > .5 ? '#343746' : '#394c3d';
    const belly = night > .5 ? '#d6bd93' : '#dfbb82';
    const tooth = night > .5 ? '#252a35' : '#fff8e7';
    const eye = night > .5 ? '#252a35' : '#252525';
    ctx.save();
    ctx.translate(dino.x, y + bob);
    if (dino.crashed) {
      ctx.translate(unit * 12, height * .35);
      ctx.rotate(.22);
      ctx.translate(-unit * 12, -height * .35);
    }
    ctx.fillStyle = color;

    if (duck) {
      // Low, streamlined pose: long tail, crouched body, and the same oversized T-Rex head.
      ctx.fillRect(0, unit * 8, unit * 7, unit * 3);
      ctx.fillRect(unit * 3, unit * 6, unit * 7, unit * 6);
      ctx.fillRect(unit * 8, unit * 4, unit * 12, unit * 8);
      ctx.fillRect(unit * 17, unit * 2, unit * 9, unit * 7);
      ctx.fillRect(unit * 24, unit * 4, unit * 7, unit * 4);
      ctx.fillRect(unit * 21, unit * 8, unit * 9, unit * 3);
      ctx.fillStyle = belly;
      ctx.fillRect(unit * 12, unit * 9, unit * 8, unit * 2);
      ctx.fillStyle = color;
      ctx.fillRect(unit * 17, unit * 10, unit * 3, unit * 2);
      ctx.fillRect(unit * 19, unit * 11, unit * 3, unit);
      ctx.fillRect(unit * 12, unit * 11, unit * 2, unit * 3);
      ctx.fillRect(unit * 12, unit * 13, unit * 5, unit);
      ctx.fillRect(unit * 21, unit * 11, unit * 2, unit * 3);
      ctx.fillRect(unit * 21, unit * 13, unit * 5, unit);
    } else {
      // Tail and broad torso establish the classic side-on T-Rex silhouette.
      const tailWag = state === 'menu' ? Math.sin(dino.anim * 1.7) * .65 : 0;
      ctx.fillRect(0, unit * (12 + tailWag), unit * 4, unit * 3);
      ctx.fillRect(unit * 3, unit * (10 + tailWag * .5), unit * 6, unit * 6);
      ctx.fillRect(unit * 7, unit * 7, unit * 13, unit * 13);
      ctx.fillRect(unit * 10, unit * 5, unit * 9, unit * 15);
      ctx.fillRect(unit * 15, unit * 6, unit * 6, unit * 9);
      // Neck, oversized skull, projecting snout, and a hinged lower jaw.
      ctx.fillRect(unit * 17, unit * 4, unit * 7, unit * 10);
      ctx.fillRect(unit * 18, unit, unit * 10, unit * 8);
      ctx.fillRect(unit * 24, unit * 3, unit * 7, unit * 5);
      ctx.fillRect(unit * 21, unit * 8, unit * 10, unit * 3);
      ctx.fillRect(unit * 27, unit * 5, unit * 4, unit * 2);
      // Warm belly plates, cheek, nostril, and readable eye.
      ctx.fillStyle = belly;
      ctx.fillRect(unit * 11, unit * 14, unit * 8, unit * 2);
      ctx.fillRect(unit * 18, unit * 9, unit * 4, unit * 3);
      ctx.fillStyle = darkInk;
      ctx.fillRect(unit * 25, unit * 2, unit * 2, unit);
      ctx.fillStyle = '#fffdf7';
      ctx.fillRect(unit * 23, unit * 2, unit * 3, unit * 3);
      ctx.fillStyle = eye;
      ctx.fillRect(unit * 25, unit * 3, unit * 1.5, unit * 2);
      ctx.fillStyle = darkInk;
      ctx.fillRect(unit * 29, unit * 5, unit, unit);
      // Tiny teeth along the open lower jaw.
      ctx.fillStyle = tooth;
      ctx.fillRect(unit * 23, unit * 8, unit * 1.5, unit * 2);
      ctx.fillRect(unit * 27, unit * 8, unit * 1.5, unit * 2);
      ctx.fillRect(unit * 29, unit * 8, unit, unit * 1.5);
      // Little bent arms and claws.
      ctx.fillStyle = color;
      ctx.fillRect(unit * 19, unit * 12, unit * 3, unit * 2);
      ctx.fillRect(unit * 21, unit * 13, unit * 2, unit * 2);
      ctx.fillRect(unit * 22, unit * 14, unit, unit);
      // Two powerful legs alternate while running and tuck naturally in a jump.
      const airborne = !dino.grounded;
      if (airborne) {
        ctx.fillRect(unit * 9, unit * 18, unit * 5, unit * 3);
        ctx.fillRect(unit * 11, unit * 20, unit * 5, unit * 2);
        ctx.fillRect(unit * 16, unit * 18, unit * 5, unit * 3);
        ctx.fillRect(unit * 19, unit * 20, unit * 5, unit * 2);
      } else if (runPose && step === 0) {
        ctx.fillRect(unit * 9, unit * 17, unit * 5, unit * 5);
        ctx.fillRect(unit * 5, unit * 21, unit * 10, unit * 2);
        ctx.fillRect(unit * 16, unit * 17, unit * 5, unit * 4);
        ctx.fillRect(unit * 18, unit * 20, unit * 8, unit * 2);
      } else {
        ctx.fillRect(unit * 9, unit * 17, unit * 5, unit * 4);
        ctx.fillRect(unit * 10, unit * 20, unit * 8, unit * 2);
        ctx.fillRect(unit * 16, unit * 17, unit * 5, unit * 5);
        ctx.fillRect(unit * 15, unit * 21, unit * 9, unit * 2);
      }
    }
    ctx.restore();
  }

  function drawCactus(obstacle, color) {
    const px = clamp(worldWidth / 350, 1.8, 3.15);
    ctx.fillStyle = color;
    const baseY = groundY();
    const h = obstacle.height;
    const trunkW = px * 4;
    const firstX = obstacle.x + (obstacle.count === 2 ? px * 2 : px * 4);
    ctx.fillRect(firstX, baseY - h, trunkW, h);
    ctx.fillRect(firstX - px * 3, baseY - h * .64, px * 3, px * 7);
    ctx.fillRect(firstX - px * 3, baseY - h * .64, px * 6, px * 3);
    ctx.fillRect(firstX + trunkW, baseY - h * .78, px * 3, px * 7);
    ctx.fillRect(firstX + trunkW - px * 2, baseY - h * .78, px * 6, px * 3);
    ctx.fillStyle = night > .5 ? '#d4e1b8' : '#9db78b';
    ctx.fillRect(firstX + px, baseY - h + px * 2, px, Math.max(px, h - px * 5));
    ctx.fillStyle = color;
    if (obstacle.count > 1) {
      const x2 = obstacle.x + obstacle.width - trunkW - px * 3;
      ctx.fillRect(x2, baseY - h * .76, trunkW, h * .76);
      ctx.fillRect(x2 - px * 3, baseY - h * .5, px * 3, px * 6);
      ctx.fillRect(x2 - px * 3, baseY - h * .5, px * 6, px * 3);
    }
  }

  function drawBird(obstacle, color) {
    const flap = Math.sin(obstacle.flap) > 0 ? -1 : 1;
    const unit = obstacle.height / 28;
    ctx.fillStyle = color;
    ctx.fillRect(obstacle.x + unit * 9, obstacle.y + unit * 10, unit * 25, unit * 9);
    ctx.fillRect(obstacle.x + unit * 27, obstacle.y + unit * 7, unit * 13, unit * 8);
    ctx.fillRect(obstacle.x + unit * 39, obstacle.y + unit * 10, unit * 7, unit * 4);
    ctx.fillRect(obstacle.x + unit * 8, obstacle.y + unit * (flap < 0 ? 2 : 16), unit * 21, unit * 7);
    ctx.fillRect(obstacle.x + unit * 2, obstacle.y + unit * (flap < 0 ? 7 : 12), unit * 12, unit * 5);
    ctx.fillRect(obstacle.x + unit * 16, obstacle.y + unit * 19, unit * 4, unit * 7);
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(obstacle.x + unit * 34, obstacle.y + unit * 8, unit * 3, unit * 3);
    ctx.fillStyle = night > .5 ? '#252a35' : '#252525';
    ctx.fillRect(obstacle.x + unit * 35, obstacle.y + unit * 9, unit * 1.5, unit * 1.5);
  }

  function drawBackground(day, dark) {
    for (const key in day) currentTheme[key] = hexMix(day[key], dark[key], night);
    ctx.fillStyle = currentTheme.sky;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    if (night > .15) {
      ctx.globalAlpha = night * .85;
      ctx.fillStyle = '#e8e5c4';
      ctx.beginPath();
      ctx.arc(worldWidth * .79, worldHeight * .19, Math.max(10, worldHeight * .045), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = currentTheme.sky;
      ctx.beginPath();
      ctx.arc(worldWidth * .805, worldHeight * .17, Math.max(10, worldHeight * .045), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      for (const star of stars) ctx.fillRect(star.x * worldWidth, star.y * worldHeight, star.size, star.size);
      ctx.globalAlpha = 1;
    }

    for (const cloud of clouds) {
      const x = cloud.x, y = cloud.y * worldHeight, unit = cloud.scale * Math.max(3, worldWidth / 300);
      ctx.fillStyle = currentTheme.cloud;
      ctx.fillRect(x, y + unit * 2, unit * 12, unit * 3);
      ctx.fillRect(x + unit * 2, y, unit * 4, unit * 4);
      ctx.fillRect(x + unit * 6, y + unit, unit * 4, unit * 4);
    }

    ctx.fillStyle = night > .5 ? '#f4a261' : '#a67c52';
    ctx.globalAlpha = night > .5 ? .38 : .23;
    for (const particle of particles) {
      const bob = Math.sin(distance * .012 + particle.phase) * 3;
      ctx.fillRect(particle.x * worldWidth, particle.y * worldHeight + bob, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;

    const floor = groundY();
    ctx.fillStyle = currentTheme.far;
    const farShift = (distance * .018) % 210;
    for (let x = -210 - farShift; x < worldWidth + 210; x += 210) {
      ctx.beginPath();
      ctx.moveTo(x, floor);
      ctx.lineTo(x + 54, floor - worldHeight * .1);
      ctx.lineTo(x + 118, floor);
      ctx.lineTo(x + 165, floor - worldHeight * .145);
      ctx.lineTo(x + 210, floor);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = currentTheme.near;
    ctx.fillRect(0, floor + 4, worldWidth, worldHeight - floor - 4);
    ctx.fillStyle = currentTheme.ground;
    ctx.fillRect(0, floor, worldWidth, 2);
    ctx.fillStyle = currentTheme.detail;
    const offset = distance % 48;
    for (let x = -48 - offset; x < worldWidth + 48; x += 48) {
      ctx.fillRect(x, floor + 10, 13, 2);
      ctx.fillRect(x + 25, floor + 19, 5, 2);
    }
  }

  function render() {
    if (!ctx || !worldWidth || !worldHeight) return;
    drawBackground(COLORS.day, COLORS.night);
    for (const obstacle of obstacles) {
      if (obstacle.type === 'bird') drawBird(obstacle, currentTheme.bird);
      else drawCactus(obstacle, currentTheme.cactus);
    }
    drawDino(currentTheme.ink);
  }

  function frame(timestamp) {
    const dt = Math.min(.04, Math.max(0, (timestamp - (lastFrame || timestamp)) / 1000));
    lastFrame = timestamp;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function onKeyDown(event) {
    if (event.code === 'Space' && event.target.closest?.('button')) return;
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (instructionsOpen) {
      if (event.code === 'Escape') closeInstructions();
      return;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') { togglePause(); return; }
    if (event.code === 'Space' && (state === 'menu' || state === 'gameover')) { startGame(); return; }
    if ((event.code === 'Space' || event.code === 'ArrowUp') && state === 'running') {
      jumpHeld = true;
      jump();
    }
    if (event.code === 'ArrowDown' && state === 'running') ducking = true;
  }
  function onKeyUp(event) {
    if (event.code === 'ArrowDown') ducking = false;
    if (event.code === 'Space' || event.code === 'ArrowUp') jumpHeld = false;
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { if (state === 'running') togglePause(); });
  window.addEventListener('resize', resizeCanvas);
  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas);
  document.querySelector('#play-button').addEventListener('click', startGame);
  instructionsButton.addEventListener('click', openInstructions);
  closeInstructionsButton.addEventListener('click', closeInstructions);
  instructionsOverlay.addEventListener('pointerdown', event => {
    if (event.target === instructionsOverlay) closeInstructions();
  });
  document.querySelector('#restart-button').addEventListener('click', startGame);
  document.querySelector('#resume-button').addEventListener('click', togglePause);
  pauseButton.addEventListener('click', togglePause);
  muteButton.addEventListener('click', () => {
    muted = !muted;
    writeStored(STORAGE_MUTE, String(muted));
    updateMuteButton();
    if (muted && musicPlayer) {
      musicPlayer.pause();
      musicGeneration += 1;
    } else if (!muted && state === 'gameover') {
      playGameOverMusic();
    }
    if (!muted) tone(620, .08, 'square', .03, 100);
  });

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    if (state === 'running') { jumpHeld = true; jump(); }
  });
  window.addEventListener('pointerup', () => { jumpHeld = false; });
  jumpButton.addEventListener('pointerdown', event => {
    event.preventDefault();
    jumpButton.classList.add('is-pressed');
    if (state === 'menu' || state === 'gameover') startGame();
    else jump();
  });
  for (const eventName of ['pointerup', 'pointercancel', 'pointerleave']) {
    jumpButton.addEventListener(eventName, () => jumpButton.classList.remove('is-pressed'));
  }
  duckButton.addEventListener('pointerdown', event => { event.preventDefault(); ducking = true; duckButton.classList.add('is-pressed'); });
  for (const eventName of ['pointerup', 'pointercancel', 'pointerleave']) {
    duckButton.addEventListener(eventName, () => { ducking = false; duckButton.classList.remove('is-pressed'); });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') togglePause(); });

  updateBestDisplays();
  updateMuteButton();
  resizeCanvas();
  requestAnimationFrame(frame);
})();

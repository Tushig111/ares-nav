export function createSpaceAudioEngine() {
  let ctx = null;
  let masterGain = null;
  let lowpassFilter = null;
  let analyser = null;
  let freqData = null;
  let isPlaying = false;
  let isInitialized = false;
  let userVolume = 0.65;
  let lastTickTime = 0;
  const dronePairs = [];

  const CHORD_PROGRESSIONS = [
    [73.42, 110.00, 164.81, 174.61, 220.00, 261.63], // Dm9
    [58.27, 116.54, 146.83, 174.61, 220.00, 293.66], // BbMaj9
    [73.42, 98.00,  146.83, 174.61, 220.00, 261.63], // Gm9/D
    [55.00, 110.00, 164.81, 196.00, 220.00, 293.66]  // A7sus4
  ];
  let chordIndex = 0;

  function createSpaceReverbIR(audioCtx, duration = 3.6, decay = 2.8) {
    const rate = audioCtx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = audioCtx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * env * 0.45;
      }
    }
    return impulse;
  }

  function initAudio() {
    if (isInitialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(userVolume * 0.44, ctx.currentTime);

    lowpassFilter = ctx.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.setValueAtTime(520, ctx.currentTime);
    lowpassFilter.Q.setValueAtTime(2.2, ctx.currentTime);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.0 / 14.0, ctx.currentTime);
    lfoGain.gain.setValueAtTime(280.0, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(lowpassFilter.frequency);
    lfo.start();

    const delayLeft = ctx.createDelay(2.0);
    const delayRight = ctx.createDelay(2.0);
    delayLeft.delayTime.setValueAtTime(0.45, ctx.currentTime);
    delayRight.delayTime.setValueAtTime(0.60, ctx.currentTime);

    const fbLeft = ctx.createGain();
    const fbRight = ctx.createGain();
    fbLeft.gain.setValueAtTime(0.38, ctx.currentTime);
    fbRight.gain.setValueAtTime(0.38, ctx.currentTime);

    delayLeft.connect(fbLeft);
    fbLeft.connect(delayRight);
    delayRight.connect(fbRight);
    fbRight.connect(delayLeft);

    const merger = ctx.createChannelMerger(2);
    delayLeft.connect(merger, 0, 0);
    delayRight.connect(merger, 0, 1);

    const convolver = ctx.createConvolver();
    convolver.buffer = createSpaceReverbIR(ctx, 3.4, 2.6);
    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.38, ctx.currentTime);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.45, ctx.currentTime);
    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.75, ctx.currentTime);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    freqData = new Uint8Array(analyser.frequencyBinCount);

    masterGain.connect(lowpassFilter);
    lowpassFilter.connect(dryGain);
    lowpassFilter.connect(delayLeft);
    lowpassFilter.connect(delayRight);
    lowpassFilter.connect(convolver);
    convolver.connect(reverbGain);
    merger.connect(wetGain);

    dryGain.connect(analyser);
    wetGain.connect(analyser);
    reverbGain.connect(analyser);
    analyser.connect(ctx.destination);

    const baseGains = [0.16, 0.14, 0.11, 0.11, 0.065, 0.055];
    CHORD_PROGRESSIONS[0].forEach((f, idx) => {
      const oscSaw = ctx.createOscillator();
      const oscTri = ctx.createOscillator();
      const voiceGain = ctx.createGain();

      oscSaw.type = 'sawtooth';
      oscSaw.frequency.setValueAtTime(f, ctx.currentTime);
      oscSaw.detune.setValueAtTime(-6, ctx.currentTime);

      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(f, ctx.currentTime);
      oscTri.detune.setValueAtTime(6, ctx.currentTime);

      voiceGain.gain.setValueAtTime(baseGains[idx], ctx.currentTime);
      oscSaw.connect(voiceGain);
      oscTri.connect(voiceGain);
      voiceGain.connect(masterGain);

      oscSaw.start();
      oscTri.start();
      dronePairs.push({ oscSaw, oscTri });
    });

    setInterval(() => {
      if (!isPlaying || !ctx || ctx.state !== 'running') return;
      chordIndex = (chordIndex + 1) % CHORD_PROGRESSIONS.length;
      const nextChord = CHORD_PROGRESSIONS[chordIndex];
      const now = ctx.currentTime;
      dronePairs.forEach((pair, idx) => {
        pair.oscSaw.frequency.exponentialRampToValueAtTime(nextChord[idx], now + 3.2);
        pair.oscTri.frequency.exponentialRampToValueAtTime(nextChord[idx], now + 3.2);
      });
    }, 8500);

    const arpNotes = [293.66, 329.63, 349.23, 440.00, 523.25, 587.33, 659.25, 880.00];
    setInterval(() => {
      if (!isPlaying || !ctx || ctx.state !== 'running') return;
      const note = arpNotes[Math.floor(Math.random() * arpNotes.length)];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.035);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.85);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 1.9);
    }, 2100);

    isInitialized = true;
    isPlaying = true;
    syncAudioUI();
  }

  function togglePlay() {
    if (!isInitialized) {
      initAudio();
      playClickSFX('mode');
      return;
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
      isPlaying = true;
    } else if (isPlaying) {
      masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
      isPlaying = false;
    } else {
      masterGain.gain.setTargetAtTime(userVolume * 0.44, ctx.currentTime, 0.12);
      isPlaying = true;
    }
    syncAudioUI();
  }

  function setVolume(val) {
    userVolume = Math.max(0, Math.min(1, parseFloat(val)));
    if (isInitialized && isPlaying && masterGain) {
      masterGain.gain.setTargetAtTime(userVolume * 0.44, ctx.currentTime, 0.05);
    }
  }

  function playClickSFX(type = 'tap') {
    if (!isInitialized) return;
    if (!ctx || !isPlaying || userVolume <= 0.01) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    if (type === 'tick') {
      const ms = performance.now();
      if (ms - lastTickTime < 55) return;
      lastTickTime = ms;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2150, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.012);
      g.gain.setValueAtTime(userVolume * 0.035, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.015);
    } else if (type === 'mode') {
      [587.33, 880.00].forEach((freq, idx) => {
        const t = now + idx * 0.055;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(userVolume * 0.08, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.19);
      });
    } else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.026);
      g.gain.setValueAtTime(userVolume * 0.075, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    }
  }

  // Chladni Cymatic Plate Harmonic Resonance + Sparkle Cascade
  function triggerMorphSound(n = 3, m = 7) {
    if (!isInitialized) return;
    if (!ctx || !isPlaying) return;
    const now = ctx.currentTime;

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110.0, now);
    subOsc.frequency.exponentialRampToValueAtTime(42.0, now + 1.15);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(userVolume * 0.26, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.30);

    // Chladni Eigenfrequency Harmonic Series proportional to (n, m)
    const baseEigen = 220.0 + n * 36.0 + m * 22.0;
    const ratios = [1.0, 1.25, 1.5, 2.0, 2.5];
    ratios.forEach((r, i) => {
      const t = now + i * 0.06;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseEigen * r, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(userVolume * 0.048, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  function playQuindarTone(isIntro = true) {
    if (!isInitialized) return;
    if (!ctx || !isPlaying) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isIntro ? 2525 : 2475, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(userVolume * 0.075, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  function playGeigerPulse() {
    if (!isInitialized || !ctx || !isPlaying) return;
    const now = ctx.currentTime;
    for (let k = 0; k < 3; k++) {
      const t = now + k * 0.09;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 - k * 18, t);
      g.gain.setValueAtTime(userVolume * 0.14, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.065);
    }
  }

  function syncAudioUI() {
    const btn = document.getElementById('audio-btn');
    const lbl = document.getElementById('audio-label');
    const group = document.getElementById('audio-pill-group');
    if (btn && lbl && group) {
      btn.classList.toggle('audio-active', isPlaying);
      group.classList.toggle('audio-playing', isPlaying);
      lbl.textContent = isPlaying ? 'Audio: On' : 'Audio: Mute';
    }
  }

  function updateVisualizer(elapsed) {
    for (let i = 0; i < 5; i++) {
      const bar = document.getElementById(`wb-${i}`);
      if (!bar) continue;
      if (!isPlaying || !analyser) {
        bar.style.height = '3px';
      } else {
        analyser.getByteFrequencyData(freqData);
        const v = freqData[i + 1] || 0;
        const pulse = Math.sin(elapsed * 4.5 + i * 1.1) * 2.5 + 3.5;
        const h = Math.max(3, Math.min(10, (v / 255) * 8 + pulse));
        bar.style.height = `${h.toFixed(1)}px`;
      }
    }
  }

  return {
    initAudio,
    togglePlay,
    setVolume,
    playClickSFX,
    triggerMorphSound,
    playQuindarTone,
    playGeigerPulse,
    updateVisualizer,
    get isInitialized() { return isInitialized; }
  };
}

export function createSoundPlayer(isEnabled, getVolume = () => 0.65) {
  const outputGain = 8;
  let audioContext = null;
  let audioMaster = null;

  function volume() {
    return Math.min(Math.max(Number(getVolume()) || 0, 0), 1) * outputGain;
  }

  function initialize() {
    if (audioContext || (!window.AudioContext && !window.webkitAudioContext)) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass({ latencyHint: 'interactive' });
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    audioMaster = audioContext.createGain();
    audioMaster.gain.value = volume();
    audioMaster.connect(compressor).connect(audioContext.destination);
  }

  async function resume() {
    if (!isEnabled() || (!window.AudioContext && !window.webkitAudioContext)) return false;
    initialize();
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch {
        return false;
      }
    }
    return audioContext.state === 'running';
  }

  return {
    warm() {
      void resume();
    },

    setVolume() {
      if (!audioMaster || !audioContext) return;
      audioMaster.gain.setTargetAtTime(volume(), audioContext.currentTime, 0.015);
    },

    async play(type) {
      if (!await resume()) return;
      try {
        audioMaster.gain.setTargetAtTime(volume(), audioContext.currentTime, 0.015);
        const now = audioContext.currentTime + 0.001;

        function tone(frequency, start, duration, volume = 0.035, wave = 'sine') {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.frequency.setValueAtTime(frequency, now + start);
          oscillator.type = wave;
          gain.gain.setValueAtTime(0.0001, now + start);
          gain.gain.linearRampToValueAtTime(volume, now + start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
          oscillator.connect(gain).connect(audioMaster);
          oscillator.start(now + start);
          oscillator.stop(now + start + duration + 0.02);
        }

        function waterDrop() {
          const drop = audioContext.createOscillator();
          const dropGain = audioContext.createGain();
          drop.type = 'sine';
          drop.frequency.setValueAtTime(980, now);
          dropGain.gain.setValueAtTime(0.0001, now);
          dropGain.gain.linearRampToValueAtTime(0.028, now + 0.003);
          dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
          drop.connect(dropGain).connect(audioMaster);
          drop.start(now);
          drop.stop(now + 0.052);
        }

        function softExplosion() {
          const burst = audioContext.createOscillator();
          const burstGain = audioContext.createGain();
          burst.type = 'triangle';
          burst.frequency.setValueAtTime(920, now);
          burst.frequency.exponentialRampToValueAtTime(620, now + 0.028);
          burstGain.gain.setValueAtTime(0.0001, now);
          burstGain.gain.linearRampToValueAtTime(0.014, now + 0.002);
          burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.034);
          burst.connect(burstGain).connect(audioMaster);
          burst.start(now);
          burst.stop(now + 0.04);

          const impact = audioContext.createOscillator();
          const impactGain = audioContext.createGain();
          impact.type = 'sine';
          impact.frequency.setValueAtTime(430, now);
          impact.frequency.exponentialRampToValueAtTime(280, now + 0.04);
          impactGain.gain.setValueAtTime(0.0001, now);
          impactGain.gain.linearRampToValueAtTime(0.012, now + 0.003);
          impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.052);
          impact.connect(impactGain).connect(audioMaster);
          impact.start(now);
          impact.stop(now + 0.058);
        }

        if (type === 'open') waterDrop();
        if (type === 'flag') tone(980, 0, 0.06, 0.024, 'sine');
        if (type === 'win') {
          tone(660, 0, 0.08, 0.025, 'triangle');
          tone(880, 0.08, 0.1, 0.025, 'triangle');
          tone(1175, 0.17, 0.14, 0.023, 'sine');
        }
        if (type === 'lose') softExplosion();
      } catch {
        // Audio can disappear while a tab is suspended or an output device changes.
      }
    },
  };
}

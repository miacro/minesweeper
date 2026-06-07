export function createSoundPlayer(isEnabled) {
  let audioContext = null;
  let audioMaster = null;

  function initialize() {
    if (audioContext || (!window.AudioContext && !window.webkitAudioContext)) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass({ latencyHint: 'interactive' });
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    audioMaster = audioContext.createGain();
    audioMaster.gain.value = 0.65;
    audioMaster.connect(compressor).connect(audioContext.destination);
  }

  function resume() {
    if (!isEnabled() || (!window.AudioContext && !window.webkitAudioContext)) return false;
    initialize();
    if (audioContext.state === 'suspended') audioContext.resume();
    return true;
  }

  return {
    warm() {
      resume();
    },

    play(type) {
      if (!resume()) return;
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

      if (type === 'open') tone(740, 0, 0.08, 0.026, 'triangle');
      if (type === 'flag') tone(980, 0, 0.06, 0.024, 'sine');
      if (type === 'win') {
        tone(660, 0, 0.08, 0.025, 'triangle');
        tone(880, 0.08, 0.1, 0.025, 'triangle');
        tone(1175, 0.17, 0.14, 0.023, 'sine');
      }
      if (type === 'lose') {
        tone(260, 0, 0.12, 0.028, 'triangle');
        tone(190, 0.1, 0.18, 0.026, 'sine');
        tone(130, 0.24, 0.26, 0.024, 'sine');
      }
    },
  };
}

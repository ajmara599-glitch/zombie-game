import { TimeOfDay, WeatherType, ZoneId } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientInterval: number | null = null;
  private musicInterval: number | null = null;
  private rainNoiseNode: AudioNode | null = null;
  private rainGainNode: GainNode | null = null;

  private currentZone: ZoneId = 'museum';
  private currentTime: TimeOfDay = 'day';
  private currentWeather: WeatherType = 'clear';
  private musicStep: number = 0;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.startSoundscapeLoops();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.rainGainNode && this.ctx) {
      this.rainGainNode.gain.setTargetAtTime(muted ? 0 : this.getWeatherNoiseVolume(), this.ctx.currentTime, 0.2);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public updateEnvironment(zone: ZoneId, time: TimeOfDay, weather: WeatherType) {
    this.currentZone = zone;
    this.currentTime = time;
    this.currentWeather = weather;

    if (this.ctx && this.rainGainNode && !this.isMuted) {
      this.rainGainNode.gain.setTargetAtTime(
        this.getWeatherNoiseVolume(),
        this.ctx.currentTime,
        0.5
      );
    }
  }

  private getWeatherNoiseVolume(): number {
    if (this.isMuted) return 0;
    if (this.currentWeather === 'rain_storm') return 0.06;
    if (this.currentWeather === 'ash_wind') return 0.035;
    if (this.currentWeather === 'bio_fog') return 0.02;
    return 0.008;
  }

  private startSoundscapeLoops() {
    if (!this.ctx) return;

    // Continuous filtered noise for wind / rain
    if (!this.rainNoiseNode) {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.7;

      const gain = this.ctx.createGain();
      gain.gain.value = this.getWeatherNoiseVolume();

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();

      this.rainNoiseNode = noise;
      this.rainGainNode = gain;
    }

    // Atmospheric musical arpeggio & chords loop
    if (!this.musicInterval) {
      this.musicInterval = window.setInterval(() => {
        if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
        this.playAtmosphericMusicNote();
      }, 1800);
    }

    // Dynamic environmental ambient cues (time of day + zone specific)
    if (!this.ambientInterval) {
      this.ambientInterval = window.setInterval(() => {
        if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
        this.playDynamicAmbientCue();
      }, 3600);
    }
  }

  private playAtmosphericMusicNote() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Zone-specific Genshin-inspired pentatonic / minor scales
    const scales: Record<ZoneId, number[]> = {
      museum: [220, 261.63, 293.66, 329.63, 392.0, 440, 523.25], // A minor pentatonic (noble/ancient)
      school: [196, 233.08, 261.63, 293.66, 349.23, 392.0, 466.16], // G minor (nostalgic/tense)
      laboratory: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 370.0], // E Dorian/Phrygian sci-fi
    };

    const scale = scales[this.currentZone] || scales.museum;
    const freq = scale[this.musicStep % scale.length];
    this.musicStep++;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.currentZone === 'laboratory' ? 'triangle' : 'sine';
    subOsc.type = 'sine';

    // Night lowers pitch by an octave occasionally for dark atmosphere
    const timeMult = this.currentTime === 'night' ? 0.75 : 1.0;
    osc.frequency.setValueAtTime(freq * timeMult, now);
    subOsc.frequency.setValueAtTime(freq * 0.5 * timeMult, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.032, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.4);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 2.5);
    subOsc.stop(now + 2.5);
  }

  private playDynamicAmbientCue() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Time of Day specific ambient sound
    if (this.currentTime === 'night' || this.currentTime === 'sunset') {
      // Nocturnal cricket chirp or eerie owl/wind harmonic
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3800, now);
      osc.frequency.setValueAtTime(3950, now + 0.06);
      osc.frequency.setValueAtTime(3800, now + 0.12);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.012, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      // Morning/Day gentle harmonic breeze chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.18);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.012, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    }

    // 2. Location specific ambient sound
    if (this.currentZone === 'laboratory') {
      // Bubbling cryo-pod / Geiger scanner pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.65);
      gain.gain.setValueAtTime(0.001, now + 0.4);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + 0.4);
      osc.stop(now + 0.82);
    } else if (this.currentZone === 'school') {
      // Distant school bell resonance
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now + 0.5);
      gain.gain.setValueAtTime(0.001, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.018, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + 0.5);
      osc.stop(now + 1.45);
    }

    // 3. Weather thunder rumble during rain_storm
    if (this.currentWeather === 'rain_storm' && Math.random() < 0.45) {
      this.playThunderRumble();
    }
  }

  public playThunderRumble() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.2);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.35);
  }

  // Synthesized guttural Zombie Voice Groan / Roar ("голоса озвучки зомби")
  public playZombieVoice(variant: 'groan' | 'attack' | 'death' | 'boss' = 'groan') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const formantFilter = this.ctx.createBiquadFilter();
    const mainGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    lfo.type = 'sine';

    const basePitch =
      variant === 'boss'
        ? 58
        : variant === 'attack'
        ? 115
        : variant === 'death'
        ? 90
        : 75 + Math.random() * 25;

    const duration = variant === 'boss' ? 0.95 : variant === 'groan' ? 0.75 : 0.45;

    osc1.frequency.setValueAtTime(basePitch, now);
    osc1.frequency.linearRampToValueAtTime(basePitch * 1.18, now + duration * 0.35);
    osc1.frequency.exponentialRampToValueAtTime(basePitch * 0.65, now + duration);

    osc2.frequency.setValueAtTime(basePitch * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(basePitch * 0.9, now + duration);

    // Vocal throat rasp modulation
    lfo.frequency.setValueAtTime(26, now);
    lfoGain.gain.setValueAtTime(18, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    // Throat vowel formant filter ("Urrrgh / Graaaah")
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(320, now);
    formantFilter.frequency.linearRampToValueAtTime(580, now + duration * 0.4);
    formantFilter.frequency.linearRampToValueAtTime(240, now + duration);
    formantFilter.Q.value = 3.5;

    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(0.09, now + 0.08);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(formantFilter);
    osc2.connect(formantFilter);
    formantFilter.connect(mainGain);
    mainGain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    osc1.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
    lfo.stop(now + duration + 0.02);
  }

  public playWeaponSound(type: string) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'bullet') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    } else if (type === 'plasma') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.25);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    } else if (type === 'cryo') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.22);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    } else {
      // Throwable heavy object / flask whoosh
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playSkillBurstSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [261.6, 329.6, 392.0, 523.25].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.06 + 0.45);
      gain.gain.setValueAtTime(0.08, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.48);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.5);
    });
  }

  public playPickupSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.09);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playVehicleEngineSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.25);
    osc.frequency.linearRampToValueAtTime(82, now + 0.5);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.56);
  }

  // Speaks AI Survival Assistant text out loud using Gemini TTS WAV or browser Russian TTS
  public speakAssistantText(text: string, audioBase64?: string | null) {
    if (this.isMuted) return;
    this.init();

    // Subtle sci-fi AI comm chime
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.setValueAtTime(1318.5, now + 0.07);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    if (audioBase64) {
      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
      audio.volume = 0.9;
      audio.play().catch(() => {
        this.speakWithBrowserSynthesis(text);
      });
      return;
    }

    this.speakWithBrowserSynthesis(text);
  }

  private speakWithBrowserSynthesis(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 1.06;
      utterance.pitch = 1.12;
      const voices = window.speechSynthesis.getVoices();
      const ruVoice = voices.find((v) => v.lang.toLowerCase().includes('ru'));
      if (ruVoice) {
        utterance.voice = ruVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore synthesis errors
    }
  }
}

export const soundEngine = new SoundEngine();

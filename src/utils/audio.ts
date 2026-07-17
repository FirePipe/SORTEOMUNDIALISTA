// Professional Audio Synthesizer using Web Audio API

class AudioEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Suspense tick during number rolling - more radiant chime
  playTick(pitch: number = 220) {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      // Layer 1: Principal Tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.05);
      
      // Layer 2: Shimmering Harmonic
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(pitch * 2.01, now);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc2.start();
      osc.stop(now + 0.1);
      osc2.stop(now + 0.1);
    } catch (e) {
      console.warn('Audio play tick error:', e);
    }
  }

  // Whoosh sound for rerolling or state changes
  playWhoosh() {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio play whoosh error:', e);
    }
  }

  // New: Atmospheric confirm sound
  playConfirm() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      const frequencies = [440, 880, 1320]; // A4, A5, E6 harmonized
      frequencies.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 / (i + 1), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    } catch (e) {
      console.warn('Audio play confirm error:', e);
    }
  }

  // New: Continuous rolling sound effect - atmospheric and radiant
  playRolling() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      // Low base hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
      
      // High sparkling shimmer
      const spark = ctx.createOscillator();
      spark.type = 'triangle';
      spark.frequency.setValueAtTime(880, now);
      spark.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      
      osc.connect(gain);
      spark.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      spark.start(now);
      osc.stop(now + 0.1);
      spark.stop(now + 0.1);
    } catch (e) {
      // Ignore
    }
  }

  // New: "Bing" sound for final selection - radiant major chord
  playBing() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = i * 0.04;
        
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now + delay);
        osc.frequency.exponentialRampToValueAtTime(f * 0.98, now + delay + 0.8);
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.12 / (i + 1), now + delay + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 1.2);
      });
    } catch (e) {
      // Ignore
    }
  }

  // New: Subtle hover or UI interaction sound
  playSoftClick() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio play soft click error:', e);
    }
  }

  // Festive golden chime/fanfare sequence - Emotive and Lush
  playSuccessFanfare() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Celestial Major Progression
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        
        // Add a bit of shimmering vibrato
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.setValueAtTime(6 + idx, now + delay);
        vibratoGain.gain.setValueAtTime(4, now + delay);
        
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        vibrato.start(now + delay);
        osc.start(now + delay);
        
        vibrato.stop(now + delay + 1.5);
        osc.stop(now + delay + 1.5);
      });
    } catch (e) {
      console.warn('Audio play fanfare error:', e);
    }
  }

  playSuccess() {
    this.playSuccessFanfare();
  }
}

export const audio = new AudioEngine();

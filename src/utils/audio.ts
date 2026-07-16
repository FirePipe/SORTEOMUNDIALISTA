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

  // Suspense tick during number rolling
  playTick(pitch: number = 220) {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
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

  // Festive golden chime/fanfare sequence upon confirming numbers
  playSuccessFanfare() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Beautiful major chord sweep: C4, E4, G4, C5
      const notes = [261.63, 329.63, 392.00, 523.25];
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        
        // Add a bit of vibrato/shimmer
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.setValueAtTime(8, now + delay);
        vibratoGain.gain.setValueAtTime(3, now + delay);
        
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        vibrato.start(now + delay);
        osc.start(now + delay);
        
        vibrato.stop(now + delay + 0.8);
        osc.stop(now + delay + 0.8);
      });
    } catch (e) {
      console.warn('Audio play fanfare error:', e);
    }
  }
}

export const audio = new AudioEngine();

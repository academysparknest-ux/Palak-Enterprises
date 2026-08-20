/**
 * Web Audio API synthesized notification sound chime.
 * Requires no external audio files, has zero network latency,
 * works completely offline, and safely handles browser autoplay policies.
 */

class NotificationSoundPlayer {
  private audioCtx: AudioContext | null = null;
  private lastPlayedCode: string = '';
  private lastPlayedTime: number = 0;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {
        // Will resume on next user gesture
      });
    }

    return this.audioCtx;
  }

  /**
   * Plays a pleasant dual-tone chime: High bell chime (D5 -> A5)
   * Debounces to avoid double sounds for the same order code.
   */
  public playNewOrderChime(orderCode?: string): void {
    const now = Date.now();

    // Deduplicate sounds for the same order within a 4-second window
    if (orderCode && orderCode === this.lastPlayedCode && now - this.lastPlayedTime < 4000) {
      return;
    }

    if (orderCode) {
      this.lastPlayedCode = orderCode;
    }
    this.lastPlayedTime = now;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Envelope: quick attack, smooth exponential decay
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const nowCtx = ctx.currentTime;
      // Tone 1: 587.33 Hz (D5)
      playTone(587.33, nowCtx, 0.25, 0.15);
      // Tone 2: 880.00 Hz (A5) - brighter confirmation pitch
      playTone(880.0, nowCtx + 0.12, 0.45, 0.2);
    } catch (err) {
      // Browser autoplay restriction or disabled audio output — safely ignore
      console.debug('[Audio] Notification chime notice:', err);
    }
  }
}

export const notificationSound = new NotificationSoundPlayer();

// Auto-unlock AudioContext on first user interaction in browser
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    notificationSound['getAudioContext']?.();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

const SWING_DEGREES = 24;

export class Metronome {
  #timer = null;
  #next = 0;
  #beat = 0;
  #tick = 0;
  #gBeat = 0;
  #queue = [];
  #last = null;

  #audioContext = null;
  #volumeContext = null;

  #settings = { bpm: 100, beats: 4, subdivision: 1, volume: 0.7 };

  running = false;

  start() {
    this.#initAudio();
    const d = 60 / this.#settings.bpm;

    this.#next = this.#audioContext.currentTime + d / 2; // half-beat lead-in so the arm swings out from centre
    this.#beat = 0;
    this.#tick = 0;
    this.#gBeat = 0;
    this.#queue = [];
    this.#last = { t: this.#next - d, g: -1 };
    this.running = true;

    this.#pump();
  }

  stop() {
    clearTimeout(this.#timer);
    this.#beat = 0;
    this.#tick = 0;
    this.#gBeat = 0;
    this.running = false;
    this.#queue = [];
  }

  /* ---------- Audio ---------- */
  #initAudio() {
    if (!this.#audioContext) {
      this.#audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();

      this.#volumeContext = this.#audioContext.createGain();
      this.#volumeContext.connect(this.#audioContext.destination);
    }
    this.#volumeContext.gain.value = this.#settings.volume;

    if (this.#volumeContext.state === "suspended") this.#volumeContext.resume();
  }

  #click(t, accent, sub) {
    const o = this.#audioContext.createOscillator(),
      g = this.#audioContext.createGain();
    o.type = "triangle";
    o.frequency.value = sub ? 900 : accent ? 1760 : 1175;
    const peak = sub ? 0.35 : 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(this.#volumeContext);
    o.start(t);
    o.stop(t + 0.08);
  }

  /* Look-ahead scheduler: keeps timing steady even if the UI thread stalls */
  #pump() {
    while (this.#next < this.#audioContext.currentTime + 0.12) {
      const main = this.#tick === 0;

      this.#click(this.#next, main && this.#beat === 0, !main);
      this.#queue.push({ t: this.#next, b: this.#beat, main, g: this.#gBeat });

      this.#next =
        this.#next + 60 / this.#settings.bpm / this.#settings.subdivision;
      this.#tick = this.#tick + 1;

      if (this.#tick >= this.#settings.subdivision) {
        this.#tick = 0;
        this.#beat = (this.#beat + 1) % this.#settings.beats;
        this.#gBeat = this.#gBeat + 1;
      }
    }
    this.#timer = setTimeout(() => this.#pump(), 25);
  }
  /* --- end of Audio --- */

  setBpm(bpm) {
    this.#settings.bpm = bpm;
  }
  getBpm() {
    return this.#settings.bpm;
  }

  setBeats(beats) {
    this.#settings.beats = beats;
  }
  getBeats() {
    return this.#settings.beats;
  }

  getFrameData(callback) {
    if (this.running) {
      const now =
        this.#audioContext.currentTime -
        (this.#audioContext.outputLatency || 0);
      while (this.#queue.length && this.#queue[0].t <= now) {
        const e = this.#queue.shift();
        if (e.main) {
          this.#last = e;
        }
      }
      const n = this.#queue.find((e) => e.main);
      const d = n ? n.t - this.#last.t : 60 / this.#settings.bpm;
      const ph = Math.min(1, Math.max(0, (now - this.#last.t) / d));

      callback({
        beat: this.#last.b,
        rotate: (
          SWING_DEGREES * Math.cos(Math.PI * (this.#last.g + ph))
        ).toFixed(2),
      });
    }
  }

  setSubdivision(subdivision) {
    this.#settings.subdivision = subdivision;
  }

  setVolume(volume) {
    this.#settings.volume = volume;
    if (this.#volumeContext) this.#volumeContext.gain.value = volume;
  }
}

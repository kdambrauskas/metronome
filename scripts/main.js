import { Metronome } from "./metronome.js";

(() => {
  const metronome = new Metronome();

  const $ = (id) => document.getElementById(id);

  const MIN = 30,
    MAX = 240;

  const NAMES = [
    [40, "Grave"],
    [60, "Largo"],
    [66, "Larghetto"],
    [76, "Adagio"],
    [108, "Andante"],
    [120, "Moderato"],
    [156, "Allegro"],
    [176, "Vivace"],
    [200, "Presto"],
    [1e9, "Prestissimo"],
  ];

  const inp = $("bpm"),
    slider = $("slider"),
    arm = $("arm"),
    weight = $("weight"),
    dots = $("dots"),
    go = $("go");

  /* ---------- Tempo ---------- */
  function setBpm(v) {
    v = Math.max(MIN, Math.min(MAX, Math.round(+v) || metronome.getBpm()));
    metronome.setBpm(v);
    inp.value = v;
    slider.value = v;
    $("name").textContent = NAMES.find((n) => v < n[0])[1];
    const d = 170 - (110 * (v - MIN)) / (MAX - MIN);
    weight.setAttribute("transform", `translate(0 ${-d.toFixed(1)})`);
  }

  function start() {
    metronome.start();

    arm.classList.remove("idle");
    go.textContent = "Stop";
    go.setAttribute("aria-pressed", "true");
  }

  function stop() {
    metronome.stop();

    arm.classList.add("idle");
    arm.style.transform = "rotate(0deg)";
    mark(-1);
    go.textContent = "Start";
    go.setAttribute("aria-pressed", "false");
  }

  const toggle = () => (metronome.running ? stop() : start());

  /* ---------- Visuals ---------- */
  function buildDots(length) {
    dots.innerHTML = Array.from(
      { length },
      (_, i) => `<i class="${i ? "" : "one"}"></i>`,
    ).join("");
  }

  function mark(b) {
    [...dots.children].forEach((d, i) => d.classList.toggle("on", i === b));
  }

  function frameLoop() {
    metronome.getFrameData((data) => {
      const { beat, rotate } = data;

      mark(beat);
      arm.style.transform = `rotate(${rotate}deg)`;
    });

    requestAnimationFrame(frameLoop);
  }

  /* ---------- Controls ---------- */
  function hold(btn, fn) {
    let to, iv;
    const end = () => {
      clearTimeout(to);
      clearInterval(iv);
    };
    btn.addEventListener("pointerdown", () => {
      fn();
      to = setTimeout(() => {
        iv = setInterval(fn, 70);
      }, 400);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
      btn.addEventListener(ev, end),
    );
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fn();
      }
    });
  }

  hold($("dec"), () => setBpm(metronome.getBpm() - 1));
  hold($("inc"), () => setBpm(metronome.getBpm() + 1));

  inp.addEventListener("change", () => setBpm(inp.value));
  inp.addEventListener("focus", () => inp.select());
  slider.addEventListener("input", () => setBpm(slider.value));
  go.addEventListener("click", toggle);

  let taps = [];
  $("tap").addEventListener("click", () => {
    const n = performance.now();
    if (taps.length && n - taps[taps.length - 1] > 2000) taps = [];
    taps = [...taps, n].slice(-7);
    if (taps.length > 1)
      setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  });

  function setBeats(v) {
    const beats = Math.max(1, Math.min(12, v));
    metronome.setBeats(beats);
    $("bval").textContent = beats;
    buildDots(beats);
  }

  $("bdec").addEventListener("click", () => setBeats(metronome.getBeats() - 1));
  $("binc").addEventListener("click", () => setBeats(metronome.getBeats() + 1));

  $("seg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;

    metronome.setSubdivision(parseInt(b.dataset.sub));

    [...$("seg").children].forEach((x) =>
      x.setAttribute("aria-pressed", x === b),
    );
  });

  $("vol").addEventListener("input", (e) => {
    metronome.setVolume(parseFloat(e.target.value));
  });

  window.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (e.code === "Space" && !/^(INPUT|BUTTON|SELECT)$/.test(tag)) {
      e.preventDefault();
      toggle();
    } else if (
      (e.key === "ArrowUp" || e.key === "ArrowDown") &&
      !/^(INPUT|SELECT)$/.test(tag)
    ) {
      e.preventDefault();
      setBpm(
        metronome.getBpm() +
          (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1),
      );
    }
  });

  setBpm(metronome.getBpm());
  buildDots(metronome.getBeats());
  frameLoop();
})();

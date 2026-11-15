// Presentation quality adapts to the device; geographic data stays unchanged.
export function nextPixelRatio(current, averageMs, ceiling) {
  if (averageMs > 28) return Math.max(.75, Math.round((current - .2) * 100) / 100);
  if (averageMs < 19) return Math.min(ceiling, Math.round((current + .1) * 100) / 100);
  return current;
}
export function createRenderBudget(renderer) {
  const status = document.createElement('output');
  status.id = 'render-status';
  status.title = 'Measured presentation rate. Auto adjusts resolution to keep navigation responsive.';
  status.textContent = 'SYSTEM INITIALIZING';
  const label = document.createElement('label');
  label.className = 'render-quality';
  label.innerHTML = '<span>Render</span><select aria-label="Rendering quality"><option value="auto">Auto</option><option value="smooth">Smooth</option><option value="detail">Detail</option></select>';
  const select = label.querySelector('select');
  document.querySelector('.status-pill').prepend(label, status);
  let ratio = 1, ceiling = 1, previous = 0, started = 0, frames = 0, total = 0, lastChange = 0, mode = 'orbital';
  function resize() {
    // A pixel budget also protects large external/Retina displays.
    ceiling = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2000000 / (innerWidth * innerHeight)));
    ceiling = Math.max(.75, ceiling);
    ratio = select.value === 'smooth' ? .75 : select.value === 'detail' ? Math.min(devicePixelRatio || 1, 2) : Math.min(ratio || ceiling, ceiling);
    renderer.setPixelRatio(ratio);
    status.dataset.pixelRatio = ratio.toFixed(2);
  }
  function reset() { previous = started = frames = total = 0; }
  select.addEventListener('change', () => { ratio = select.value === 'auto' ? ceiling : ratio; resize(); reset(); });
  return {
    resize, reset,
    frame(time, view) {
      if (view !== mode) { mode = view; reset(); lastChange = time; }
      if (previous) { const interval = time - previous; if (interval > 0 && interval < 500) { total += interval; frames++; } }
      previous = time;
      if (!started) started = time;
      if (time - started < 1500 || !frames) return;
      const average = total / frames;
      const fps = Math.round(1000 / average);
      status.textContent = select.value === 'auto' ? (ratio < .9 ? 'ADAPTIVE · PERFORMANCE' : 'ADAPTIVE · BALANCED') : select.value.toUpperCase();
      status.title = `Measured ${fps} FPS · ${average.toFixed(1)} ms/frame · resolution ${ratio.toFixed(2)}×`;
      status.dataset.frameMs = average.toFixed(1);
      status.dataset.fps = String(fps);
      const telemetry = document.getElementById('brand-telemetry');
      if (telemetry) telemetry.textContent = 'SURFACE OPERATIONS';
      if (select.value === 'auto' && time - lastChange > (average < 19 ? 8000 : 2500)) {
        const next = nextPixelRatio(ratio, average, ceiling);
        if (next !== ratio) { ratio = next; renderer.setPixelRatio(ratio); status.dataset.pixelRatio = ratio.toFixed(2); }
        lastChange = time;
      }
      started = time; frames = total = 0;
    },
    submitted(info, updateMs, submitMs) { status.dataset.updateMs = updateMs.toFixed(1); status.dataset.submitMs = submitMs.toFixed(1); status.dataset.drawCalls = String(info.calls); status.dataset.triangles = String(info.triangles); }
  };
}

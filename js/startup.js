// This classic script also runs from file://, where ES module loading cannot work.
(() => {
  const scriptURL = document.currentScript.src;
  const status = document.getElementById('launch-status-tag');
  const buttons = document.querySelectorAll('#launch-overlay button');
  const report = message => {
    status.textContent = message;
    status.style.whiteSpace = 'normal';
    status.style.lineHeight = '1.6';
    status.setAttribute('role', 'alert');
  };
  if (location.protocol === 'file:') {
    report('Open “Start ARES.command” in this extracted folder to launch the app. Keep its Terminal window open, then choose Start with Audio in the browser. Or run: python3 -m http.server 8000 and open http://localhost:8000/.');
    buttons.forEach(button => { button.disabled = true; });
    return;
  }
  buttons.forEach(button => { button.disabled = true; });
  report('Loading the Mars explorer…');
  import(new URL('./app.js?v=final1', scriptURL).href).then(() => {
    buttons.forEach(button => { button.disabled = false; });
    status.textContent = 'PARTICLE GLOBE READY · CHOOSE AUDIO MODE';
  }).catch(error => {
    console.error('ARES startup failed:', error);
    report('The app could not load. Check your internet connection (Three.js loads from a CDN), then refresh. Use localhost or GitHub Pages, rather than opening index.html directly.');
  });
})();

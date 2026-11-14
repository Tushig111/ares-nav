// Static controls use named actions; generated waypoint controls stay with scene state.
export function bindControls() {
  const actions = {
    'dismiss-launch-overlay': (element) => window.dismissLaunchOverlay(true),
    'dismiss-launch-overlay-2': (element) => window.dismissLaunchOverlay(false),
    'toggle-nasa-feed-modal': (element) => window.toggleNasaFeedModal(false),
    'apply-custom-nasa-feeds': (element) => window.applyCustomNasaFeeds(),
    'reset-nasa-feeds': (element) => window.resetNasaFeeds(),
    'scrub-eva-route': (element) => window.scrubEvaRoute(element.value),
    'toggle-add-waypoint': (element) => window.toggleAddWaypoint(),
    'close-nasa-recon-card': (element) => window.closeNasaReconCard(),
    'cycle-recon-photo-view': (element) => window.cycleReconPhotoView(),
    'zoom-to-active-waypoint': (element) => window.zoomToActiveWaypoint(),
    'toggle-zen': (element) => window.toggleZen(),
    'set-mode': (element) => window.setMode('orbital'),
    'set-mode-2': (element) => window.setMode('hybrid'),
    'set-mode-3': (element) => window.setMode('particles'),
    'cycle-astronaut-p-o-v': (element) => window.cycleAstronautPOV(),
    'cycle-site': (element) => window.cycleSite(-1),
    'select-site': (element) => window.selectSite(element.value),
    'cycle-site-2': (element) => window.cycleSite(1),
    'toggle-nasa-feed-modal-2': (element) => window.toggleNasaFeedModal(true),
    'toggle-storm': (element) => window.toggleStorm(),
    'toggle-space-audio': (element) => window.toggleSpaceAudio(),
    'set-space-audio-volume': (element) => window.setSpaceAudioVolume(element.value),
    'step-zoom': (element) => window.stepZoom(-1),
    'step-zoom-2': (element) => window.stepZoom(1),
    'set-sol-time': (element) => window.setSolTime(element.value),
    'set-astronaut-speed': (element) => window.setAstronautSpeed(element.value),
    'optimize-safe-path': (element) => window.optimizeSafePath(),
    'toggle-uhf-viewshed': (element) => window.toggleUhfViewshed(),
    'open-nasa-recon-for-selected-wp': (element) => window.openNasaReconForSelectedWp(),
    'export-eva-manifest': (element) => window.exportEvaManifest('json'),
    'export-eva-manifest-2': (element) => window.exportEvaManifest('md'),
    'reset-site-route': (element) => window.resetSiteRoute(),
    'set-relief': (element) => window.setRelief(element.value),
    'toggle-suit-demo-showcase': (element) => window.toggleSuitDemoShowcase(),
    'trigger-manual-chladni-pulse': (element) => window.triggerManualChladniPulse(),
    'set-weather-preset': (element) => window.setWeatherPreset('clear'),
    'set-weather-preset-2': (element) => window.setWeatherPreset('vortex'),
    'set-weather-preset-3': (element) => window.setWeatherPreset('haze'),
    'set-weather-preset-4': (element) => window.setWeatherPreset('storm'),
    'toggle-drawer': (element) => window.toggleDrawer('layers'),
    'toggle-drawer-2': (element) => window.toggleDrawer('weather'),
    'toggle-drawer-3': (element) => window.toggleDrawer('route'),
    'toggle-drawer-4': (element) => window.toggleDrawer('science'),
    'toggle-drawer-5': (element) => window.toggleDrawer('profile'),
    'toggle-place-demo': (element) => window.togglePlaceDemo(),
    'toggle-auto-spin': (element) => window.toggleAutoSpin(),
    'toggle-nadir-view': (element) => window.toggleNadirView(),
  };
  for (const eventName of ['click', 'input', 'change']) {
    document.querySelectorAll(`[data-${eventName}-action]`).forEach((element) => {
      const name = element.getAttribute(`data-${eventName}-action`);
      element.addEventListener(eventName, () => actions[name](element));
    });
  }
}

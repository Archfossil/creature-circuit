import './styles.css';
import { App } from './ui/app';
import { unlockAudio } from './ui/sound';

unlockAudio();

// Offline support for the production build (installable PWA).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* optional */ }));
}

// Prevent iOS double-tap zoom & pinch-zoom of the page (the map handles its own pinch).
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

const boot = document.getElementById('boot');
// Let the boot screen paint before the (synchronous) world generation runs.
requestAnimationFrame(() => setTimeout(() => {
  try {
    (window as unknown as { app: App }).app = new App(document.getElementById('app')!);
  } catch (err) {
    console.error(err);
    if (boot) boot.innerHTML = '<p>WebGL is required to play Creature Circuit. Please try a modern browser.</p>';
    return;
  }
  boot?.classList.add('done');
  setTimeout(() => boot?.remove(), 600);
}, 30));

document.addEventListener('click', () => { if (document.body.classList.contains('gl-lost')) location.reload(); });

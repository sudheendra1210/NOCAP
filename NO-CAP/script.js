// ===== CHANGE THIS when the date is final (IST = +05:30) =====
const EVENT_DATE = new Date("2027-02-15T18:00:00+05:30");
// =============================================================

// ---- countdown ----
const el = {};
document.querySelectorAll("#timer [data-u]").forEach(n => el[n.dataset.u] = n);
const pad = n => String(n).padStart(2, "0");
function tick() {
  const now = new Date();
  if (EVENT_DATE - now <= 0) { Object.values(el).forEach(n => n.textContent = "00"); return; }
  let months = (EVENT_DATE.getFullYear() - now.getFullYear()) * 12 + (EVENT_DATE.getMonth() - now.getMonth());
  let anchor = new Date(now); anchor.setMonth(now.getMonth() + months);
  if (anchor > EVENT_DATE) { months--; anchor = new Date(now); anchor.setMonth(now.getMonth() + months); }
  let rest = EVENT_DATE - anchor;
  const d = Math.floor(rest / 864e5); rest %= 864e5;
  const h = Math.floor(rest / 36e5); rest %= 36e5;
  const i = Math.floor(rest / 6e4); rest %= 6e4;
  const s = Math.floor(rest / 1e3);
  el.m.textContent = pad(months); el.d.textContent = pad(d);
  el.h.textContent = pad(h); el.i.textContent = pad(i); el.s.textContent = pad(s);
}
tick(); setInterval(tick, 1000);

// ---- 3D dancer ----
const MODEL_URL = "assets/dancer.glb";
const box = document.getElementById("gl");
function fallback() {
  const im = document.createElement("img");
  im.className = "fallback"; im.alt = "NO CAP"; im.src = document.querySelector(".brand img").src;
  box.appendChild(im);
}
try {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 11);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd27a, 1.0); rim.position.set(-5, 2, -4); scene.add(rim);

  const pivot = new THREE.Group(); scene.add(pivot);
  new THREE.GLTFLoader().load(MODEL_URL, gltf => {
    const m = gltf.scene;
    const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    m.position.sub(c);                       // centre on origin so it spins in place
    const s = 4.4 / sz.y; pivot.scale.setScalar(s);
    pivot.add(m);
  }, undefined, fallback);

  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  const t0 = performance.now();
  (function loop() {
    const t = (performance.now() - t0) / 1000;
    pivot.rotation.y = reduce ? 0.6 : t * 0.9;
    pivot.position.y = reduce ? 0 : Math.sin(t * 2) * 0.12;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
} catch (e) { fallback(); }

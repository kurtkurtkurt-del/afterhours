/* ---------- The walnut tuning knob (who is playing screen) ----------
   Source of knob.js. The model, the walnut shader and the brass parts come
   from the "Walnut Knob" design in Claude Design, unchanged. What changed
   for the site: the camera looks at the knob from a little below and to
   the right of its face (so the fluted wall and the brass collar show),
   the page's white shows through, and the knob is turned by dragging around its
   centre (mouse or finger) or with the arrow keys when it has focus.

   Build (bundles and minifies three.js into one file):
     python3 tools-knob.py

   The element sends a "knobturn" event with detail { angle } in radians,
   counter-clockwise positive, so other content can follow the knob, and a
   "knobgrab" event when a person takes hold of it. radio.js turns it by
   itself through host.knob.turnTo(angle) / host.knob.angle. */

import * as THREE from "./vendor/three-0.184.0/three.module.js";

const host = document.getElementById("knob");
if (host) start(host);

function start(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;   // PCF honours shadow.radius; PCFSoft ignores it
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // Studio environment for reflections (softboxes in a dark room). Mirrored
  // from the design so the key softbox sits at the top left of the face.
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0d0b09, side: THREE.BackSide })));
    const box = (w, h, pos, rgb) => {
      const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      m.color.setRGB(...rgb);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(...pos); p.lookAt(0, 0, 0); env.add(p);
    };
    box(3.2, 2.2, [-2.2, 4.2, -2.2], [7, 6.6, 6.0]);  // key softbox
    box(0.7, 3.6, [4.2, 1.4, 0.6], [3.2, 2.5, 1.7]);   // warm strip
    box(3.0, 0.8, [0.4, 1.8, 4.5], [2.2, 2.2, 2.4]);   // rim
    box(6, 6, [0, -5.5, 0], [0.12, 0.08, 0.05]);       // floor bounce
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.02).texture;
    pmrem.dispose();
  }

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.22));
  // Fill from the viewer's side (lower right), so the wall facing the
  // camera shows its flutes instead of going black
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.55);
  fill.position.set(5, 2.5, 4);
  scene.add(fill);

  // Key light from the top left of the face: the shadow falls bottom right
  const key = new THREE.DirectionalLight(0xfff0dc, 1.5);
  key.position.set(-0.10, 0.22, -0.12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.01; key.shadow.camera.far = 1;
  key.shadow.camera.left = -0.06; key.shadow.camera.right = 0.06;
  key.shadow.camera.top = 0.06; key.shadow.camera.bottom = -0.06;
  key.shadow.bias = -0.00004; key.shadow.normalBias = 0.0002; key.shadow.radius = 5;
  scene.add(key);

  // The page itself is the panel: only the shadow is drawn on it
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Contact shadow: the dark ring where the collar sits on the panel. The
  // light's shadow alone left the knob looking pasted on.
  {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    grad.addColorStop(0.00, "rgba(0,0,0,0.55)");
    grad.addColorStop(0.62, "rgba(0,0,0,0.30)");
    grad.addColorStop(0.80, "rgba(0,0,0,0.08)");
    grad.addColorStop(1.00, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const ao = new THREE.Mesh(
      new THREE.PlaneGeometry(0.056, 0.056),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
    );
    ao.rotation.x = -Math.PI / 2;
    ao.position.y = 0.00003;
    scene.add(ao);
  }

  // ---------- Knob body: revolved profile with carved flutes ----------
  const prof = [];
  const push = (r, y) => prof.push([r, y]);
  const Y0 = 0.0016;
  for (let i = 0; i <= 4; i++) push(0.0184 * i / 4, Y0);
  for (let i = 1; i <= 8; i++) { const a = -Math.PI / 2 + (Math.PI / 2) * i / 8; push(0.0184 + 0.0006 * Math.cos(a), Y0 + 0.0006 + 0.0006 * Math.sin(a)); }
  const wallTop = 0.0098, wallBot = Y0 + 0.0006;
  for (let i = 1; i <= 36; i++) { const t = i / 36; push(0.0190 - 0.0003 * t, wallBot + (wallTop - wallBot) * t); }
  for (let i = 1; i <= 28; i++) { const a = (Math.PI / 2) * i / 28; push(0.0160 + 0.0027 * Math.cos(a), wallTop + 0.0028 * Math.sin(a)); }
  const yTopEdge = wallTop + 0.0028, k = 0.0012 / (0.016 * 0.016);
  for (let i = 1; i <= 32; i++) { const r = 0.016 * (1 - i / 32); push(r, yTopEdge + k * (0.016 * 0.016 - r * r)); }

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const FLUTES = 44, SEG = FLUTES * 14, P = prof.length;
  const pos = new Float32Array(P * SEG * 3), col = new Float32Array(P * SEG * 3);
  const rand = (i) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
  for (let j = 0; j < SEG; j++) {
    const th = (j / SEG) * Math.PI * 2;
    const u = (th * FLUTES / (Math.PI * 2)) % 1;
    const g = Math.pow(Math.sin(Math.PI * u), 0.75);          // 0 at ridge, 1 at groove centre
    const flute = Math.floor(th * FLUTES / (Math.PI * 2));
    // wear concentrated on one arc (where the hand usually sits) but present all round
    const arc = 0.55 + 0.45 * Math.max(0, Math.cos(th - 2.1));
    for (let i = 0; i < P; i++) {
      const [r, y] = prof[i];
      const m = smooth(Y0 + 0.0009, Y0 + 0.0022, y) * (1 - smooth(0.0092, 0.0112, y));
      const wearZone = smooth(0.0060, 0.0100, y) * (1 - smooth(0.0112, 0.0124, y));
      const rr = r - 0.00055 * g * m - 0.00006 * wearZone * arc;
      const idx = (j * P + i) * 3;
      pos[idx] = rr * Math.cos(th); pos[idx + 1] = y; pos[idx + 2] = -rr * Math.sin(th);
      const wear = Math.min(1, wearZone * arc * (0.35 + 0.65 * (1 - g)) * (0.8 + 0.4 * rand(flute + i * 0.01)));
      const grime = g * m * (1 - wearZone) * 0.28 + (1 - smooth(Y0, Y0 + 0.002, y)) * 0.15;
      col[idx] = 1 - grime; col[idx + 1] = wear; col[idx + 2] = 0;
    }
  }
  const idxArr = [];
  for (let j = 0; j < SEG; j++) {
    const jn = (j + 1) % SEG;
    for (let i = 0; i < P - 1; i++) {
      const a = j * P + i, b = jn * P + i, c = jn * P + i + 1, d = j * P + i + 1;
      idxArr.push(a, b, d, b, c, d);
    }
  }
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  bodyGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  bodyGeo.setIndex(idxArr);
  bodyGeo.computeVertexNormals();

  // ---------- Walnut: solid procedural wood ----------
  const walnut = new THREE.MeshPhysicalMaterial({
    name: "walnut", color: 0xffffff, vertexColors: true,
    roughness: 0.46, clearcoat: 0.28, clearcoatRoughness: 0.42, specularIntensity: 0.55
  });
  walnut.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vOP; varying vec3 vON;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvOP = position; vON = normal;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
varying vec3 vOP; varying vec3 vON;
float wh(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float wn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(wh(i),wh(i+vec3(1,0,0)),f.x),mix(wh(i+vec3(0,1,0)),wh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(wh(i+vec3(0,0,1)),wh(i+vec3(1,0,1)),f.x),mix(wh(i+vec3(0,1,1)),wh(i+vec3(1,1,1)),f.x),f.y),f.z); }
float wf(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*wn(p); p*=2.03; a*=0.5; } return s; }
float gPore; float gWear;
vec3 woodColor(vec3 pm, vec3 n){
  // tree axis runs along x (grain across the face); pith far below/behind
  float warp = wf(pm*vec3(0.03,0.12,0.12));
  float d = length(pm.yz - vec2(-62.0, 30.0)) + 3.0*warp + 0.6*wf(pm*vec3(0.08,0.5,0.5));
  float ring = fract(d*1.05);
  float late = smoothstep(0.35,0.95,ring)*(1.0-smoothstep(0.95,1.0,ring));
  float streak = wf(pm*vec3(0.18,3.2,3.2));
  float pore = smoothstep(0.58,0.78,wn(pm*vec3(0.35,9.0,9.0)))*(0.5+0.5*late);
  gPore = pore;
  vec3 light = vec3(0.150,0.066,0.030);
  vec3 dark  = vec3(0.060,0.025,0.011);
  vec3 c = mix(light, dark, late*0.55);
  c *= 0.82 + 0.36*streak;
  c *= 0.9 + 0.2*wn(pm*vec3(0.6,14.0,14.0));
  c *= 0.86 + 0.28*wf(pm*vec3(0.015,0.08,0.08));
  c = mix(c, c*0.45, pore*0.55);
  // end grain on the sides facing along the tree axis
  float side = 1.0 - abs(n.y);
  float eg = pow(abs(n.x), 1.6)*side;
  float egPores = smoothstep(0.55,0.85,wn(pm*4.5));
  c *= mix(1.0, 0.55 - 0.12*egPores, eg);
  return c;
}`)
      .replace("#include <color_fragment>", `
vec3 wc = woodColor(vOP*1000.0, normalize(vON));
gWear = vColor.g;
wc = mix(wc, wc*1.45 + vec3(0.018,0.008,0.002), gWear*0.7);
diffuseColor.rgb *= wc * vColor.r;`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor*(1.0 + 0.35*gPore - 0.4*gWear), 0.05, 1.0);`)
      .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>
material.clearcoat *= (1.0 - 0.5*gWear);`);
  };
  walnut.customProgramCacheKey = () => "walnut-v1";

  // ---------- Brass ----------
  const brass = new THREE.MeshStandardMaterial({ name: "brass", color: 0xb49a6c, metalness: 1, roughness: 0.42 });
  const brassInlay = new THREE.MeshStandardMaterial({ name: "brass_inlay", color: 0xd8c49a, metalness: 0.15, roughness: 0.5 });
  const inlaySeam = new THREE.MeshStandardMaterial({ name: "inlay_seam", color: 0x1a0f08, roughness: 0.8 });

  const collarProf = [];
  collarProf.push(new THREE.Vector2(0.0176, 0.0019), new THREE.Vector2(0.0176, 0.0), new THREE.Vector2(0.0199, 0.0));
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + Math.PI * 0.85 * i / 12; collarProf.push(new THREE.Vector2(0.0193 + 0.0008 * Math.cos(a), 0.00095 + 0.00095 * Math.sin(a))); }
  collarProf.push(new THREE.Vector2(0.0176, 0.0019));
  const collar = new THREE.Mesh(new THREE.LatheGeometry(collarProf, 256), brass);

  const body = new THREE.Mesh(bodyGeo, walnut);

  // Indicator line inlaid radially in the dome
  const knob = new THREE.Group();
  knob.add(body);
  const r0 = 0.0072, r1 = 0.0148, rm = (r0 + r1) / 2;
  const domeY = r => yTopEdge + k * (0.016 * 0.016 - r * r);
  const slope = Math.atan(-2 * k * rm);
  const mkBar = (w, len, h, mat, dy) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, w), mat);
    m.position.set(rm, domeY(rm) - h / 2 + dy, 0); m.rotation.z = slope; return m;
  };
  knob.add(mkBar(0.00098, r1 - r0 + 0.0003, 0.0006, inlaySeam, 0.00002));
  knob.add(mkBar(0.0007, r1 - r0, 0.0006, brassInlay, 0.00005));

  const model = new THREE.Group();
  model.add(collar, knob);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(model);

  // ---------- Camera: a little below and to the right of the face ----------
  // The panel is a wall: screen up is world -z, screen right is +x, and the
  // knob's axis (+y) points out at the viewer. The camera leans towards +x
  // (right) and +z (down), about 38 degrees off the axis.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.002, 1);
  camera.up.set(0, 0, -1);
  const view = new THREE.Vector3(0.42, 0.79, 0.45).normalize().multiplyScalar(0.118);
  camera.position.copy(view);
  camera.lookAt(0, 0.005, 0);

  // ---------- Size ----------
  let dirty = true;
  const fit = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  fit();
  new ResizeObserver(fit).observe(host);

  // ---------- Turning ----------
  // The indicator starts at about eleven o'clock
  let angle = 2.0;          // where the knob is heading (rad, counter-clockwise)
  knob.rotation.y = angle;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setAngle = (a) => {
    angle = a;
    const deg = Math.round(((a * 180 / Math.PI) % 360 + 360) % 360);
    host.setAttribute("aria-valuenow", String(deg));
    host.setAttribute("aria-valuetext", deg + " degrees");
    host.dispatchEvent(new CustomEvent("knobturn", { detail: { angle: a } }));
    dirty = true;
  };

  // The pointer's angle round the knob's centre, counter-clockwise positive
  const pointerAngle = (e) => {
    const r = host.getBoundingClientRect();
    return Math.atan2(-(e.clientY - (r.top + r.height / 2)), e.clientX - (r.left + r.width / 2));
  };
  let dragId = null, last = 0;
  host.addEventListener("pointerdown", (e) => {
    host.dispatchEvent(new CustomEvent("knobgrab"));
    dragId = e.pointerId;
    last = pointerAngle(e);
    try { host.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    host.classList.add("turning");
    e.preventDefault();
  });
  host.addEventListener("pointermove", (e) => {
    if (e.pointerId !== dragId) return;
    const now = pointerAngle(e);
    let d = now - last;
    if (d > Math.PI) d -= Math.PI * 2;      // across the ±180° seam
    if (d < -Math.PI) d += Math.PI * 2;
    last = now;
    setAngle(angle + d);
  });
  const end = (e) => {
    if (e.pointerId !== dragId) return;
    dragId = null;
    host.classList.remove("turning");
  };
  host.addEventListener("pointerup", end);
  host.addEventListener("pointercancel", end);

  host.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") setAngle(angle + 0.12);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") setAngle(angle - 0.12);
    else return;
    host.dispatchEvent(new CustomEvent("knobgrab"));
    e.preventDefault();
    e.stopPropagation();
  });

  // ---------- Drawing ----------
  // Only while this screen or a neighbour is in front (so the knob is
  // already drawn while the screens slide), and only when something moved.
  // A timer rather than rAF for the same reason as globe.js: the preview
  // panel never fires rAF.
  const onScreen = () => ["2", "3", "4"].includes(document.body.dataset.screen);
  let wasOn = false;
  (function tick() {
    const on = onScreen();
    if (on) {
      const gap = angle - knob.rotation.y;
      if (Math.abs(gap) > 0.0005) {
        knob.rotation.y += reduced ? gap : gap * 0.35;
        dirty = true;
      } else if (gap !== 0) {
        knob.rotation.y = angle;
        dirty = true;
      }
      if (dirty || !wasOn) { renderer.render(scene, camera); dirty = false; }
    }
    wasOn = on;
    setTimeout(tick, on ? 16 : 250);
  })();
  // For radio.js: turning without a hand on it
  host.knob = {
    get angle() { return angle; },
    turnTo: (a) => setAngle(a),
  };
  host.classList.add("ready");
  host.dispatchEvent(new CustomEvent("knobready"));
}

import * as THREE from 'three';
import { MarsQuadtreeGlobe, inheritedUV, FADE_MS } from '../js/mars-quadtree-globe.js';

export function runZoomTransitionTests() {
  const results = [];
  const assert = (value, message = 'Assertion failed') => { if (!value) throw new Error(message); };
  const close = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
  function harness(singleRoot = true) {
    let time = 0, uploadCalls = 0; const images = [];
    const camera = new THREE.PerspectiveCamera(42, 1, .01, 1600);
    const renderer = { domElement: { clientHeight: 800 }, capabilities: { getMaxAnisotropy: () => 4 }, initTexture: () => { uploadCalls++; }, getContext: () => ({ isContextLost: () => false }) };
    const q = new MarsQuadtreeGlobe({ parent: new THREE.Group(), camera, renderer, now: () => time,
      createImage: () => { const image = { src: '', width: 256, height: 256 }; images.push(image); return image; } });
    const root = q.roots[0]; if (singleRoot) q.roots = [root];
    camera.position.copy(root.center).normalize().multiplyScalar(7); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    return { q, root, renderer, camera, images, get uploadCalls() { return uploadCalls; },
      frame(ms = 50) { time += ms; q.update(1); }, finish(count = Infinity) { let n = 0; for (const image of images) if (image.onload && n++ < count) image.onload(); },
      warm() { this.frame(); this.finish(); this.frame(); this.frame(FADE_MS); assert(root.ready && root.opacity === 1); assert(root.children?.length === 4); } };
  }
  const test = (name, fn) => { let h; try { h = harness(); fn(h); results.push({ name, passed: true }); } catch (error) { results.push({ name, passed: false, error: error.message }); } finally { h?.q.dispose(); } };
  test('Hidden surface-mode ancestor pauses globe requests and uploads', h => {
    const hidden = new THREE.Group(); hidden.visible = false; hidden.add(h.q.parent);
    h.frame(); assert(h.q.active === 0 && !h.q.group.visible);
  });
  test('Automatic source stays color through L6 and changes only at L7', ({ q }) => {
    for (let z = 1; z <= 6; z++) assert(q.sourceLayer(z) === 'optical');
    for (let z = 7; z <= 11; z++) assert(q.sourceLayer(z) === 'ctx');
    q.autoCTX = false; assert(q.sourceLayer(7) === 'optical');
  });
  test('Children immediately inherit correct north/south UV sub-rectangles', h => {
    h.warm(); const { root } = h;
    for (const child of root.children) {
      assert(child.uniforms.inheritedMap.value === root.target.texture);
      close(child.uniforms.inheritedUV.value.z, .5); close(child.uniforms.inheritedUV.value.w, .5);
      close(child.uniforms.inheritedUV.value.x, child.col % 2 * .5);
      close(child.uniforms.inheritedUV.value.y, child.row % 2 === 0 ? .5 : 0);
    }
    const uv = inheritedUV({ z: 4, row: 1, col: 3 }, { z: 1, row: 0, col: 0 });
    close(uv.x, 3/8); close(uv.y, 6/8); close(uv.z, 1/8);
  });
  test('Image decode alone does not mark a child WebGL-ready', h => {
    h.warm(); h.finish(); assert(h.q.cache.size === 5);
    assert([...h.q.cache.values()].filter(e => e.uploaded).length === 1);
    assert(h.root.children.every(c => !c.ready)); assert(h.root.mesh.visible);
    h.frame(16); assert(h.root.children.filter(c => c.ready).length === 2);
    assert(h.root.mesh.visible && !h.root.transition);
  });
  test('Parent remains visible until all four siblings upload and fade for 220ms', h => {
    h.warm(); h.finish(); h.frame(16); h.frame(16);
    assert(h.root.transition?.direction === 'split'); assert(h.root.children.every(c => c.ready && c.opacity === 0));
    h.frame(110); assert(h.root.mesh.visible); h.root.children.forEach(c => close(c.opacity, .5));
    h.frame(110); assert(!h.root.mesh.visible && h.root.split); assert(h.root.children.every(c => c.ready && c.opacity >= .99));
  });
  test('CTX families retain their underlay after the blend for transparent no-data coverage', h => {
    h.q.layer = 'ctx'; h.warm(); h.finish(); h.frame(16); h.frame(16); h.frame(220);
    assert(h.root.split && h.root.mesh.visible); assert(h.root.children.every(c => c.ready && c.opacity >= .99));
  });
  test('One missing sibling preserves complete parent color coverage', h => {
    h.warm(); h.finish(3); h.frame(16); h.frame(16); h.frame(1000);
    assert(h.root.mesh.visible && !h.root.split && !h.root.transition);
    assert(h.root.children.every(c => c.opacity === 0)); assert(h.q.covered(h.root));
  });
  test('Rapid zoom reversal retains coverage during merge', h => {
    h.warm(); h.finish(); h.frame(16); h.frame(16); h.frame(110);
    h.camera.position.setLength(30); h.camera.lookAt(0,0,0); h.q.invalidate(); h.frame(110);
    assert(h.root.mesh.visible); h.frame(110); assert(h.root.mesh.visible); h.frame(110);
    assert(h.root.mesh.visible && !h.root.split); assert(h.root.children.every(c => !c.mesh.visible));
  });
  test('Request scheduler admits twelve requests, with no two-split gate', ({ q }) => {
    q.queue.clear(); q.pins.clear();
    for (let col=0; col<20; col++) { const key=q.key('optical',5,0,col); q.pins.add(key); q.queue.set(key,{key,layer:'optical',z:5,row:0,col,priority:col}); }
    q.pump(); assert(q.active === 12); assert(q.maxTextures === 220); assert(!('refining' in q));
  });
  test('Study-site slot shares the twelve-request ceiling', ({ q }) => {
    q.queue.clear();q.pins.clear();q.externalSlots=1;
    for (let col=0; col<20; col++) { const key=q.key('optical',5,0,col);q.pins.add(key);q.queue.set(key,{key,layer:'optical',z:5,row:0,col,priority:col}); }
    q.pump(); assert(q.active === 11);
  });
  test('Texture admission never exceeds 220 including in-flight loads', ({ q }) => {
    let evicted=0;
    for(let i=0;i<219;i++){const key=`held/${i}`;q.cache.set(key,{used:1,texture:{dispose(){evicted++;}}});q.pins.add(key);}
    for(let i=0;i<4;i++){const key=`optical/5/0/${i}`;q.pins.add(key);q.queue.set(key,{key,layer:'optical',z:5,row:0,col:i,priority:i});}
    q.pump();assert(q.cache.size+q.active===220);assert(q.active===1);assert(evicted===0);
  });
  test('LRU eviction protects visible and transitioning imagery', ({ q }) => {
    const disposed=[];
    for(const [key,used] of [['old',1],['new',3],['visible',0],['fading',0]])q.cache.set(key,{used,texture:{dispose(){disposed.push(key);}}});
    q.pins.add('visible');q.reservations.set('transition',['fading']);q.evict(2);
    assert(disposed.join(',')==='old,new');assert(q.cache.has('visible')&&q.cache.has('fading'));
  });
  return results;
}

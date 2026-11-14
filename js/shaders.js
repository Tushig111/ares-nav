// Fetch relative to this module so project sites also work under a repository path.
async function loadShader(name) {
  const response = await fetch(new URL(`../shaders/${name}`, import.meta.url));
  if (!response.ok) throw new Error(`Could not load shader: ${name} (${response.status})`);
  return response.text();
}

export const [
  GLSL_PARTICLE_VERTEX_SHADER,
  GLSL_PARTICLE_FRAGMENT_SHADER,
  GLSL_SPARKLE_VERTEX_SHADER,
  GLSL_SPARKLE_FRAGMENT_SHADER,
  GLSL_TERRAIN_VERTEX_SHADER,
  GLSL_TERRAIN_FRAGMENT_SHADER,
] = await Promise.all([
  loadShader('particle.vert.glsl'),
  loadShader('particle.frag.glsl'),
  loadShader('sparkle.vert.glsl'),
  loadShader('sparkle.frag.glsl'),
  loadShader('terrain.vert.glsl'),
  loadShader('terrain.frag.glsl'),
]);

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0016 },
    uGlitch: { value: 0 },
    uFlash: { value: 0 },
    uGrain: { value: 0.04 },
    uSaturation: { value: 1.12 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uGlitch;
    uniform float uFlash;
    uniform float uGrain;
    uniform float uSaturation;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float dist = length(centered);
      vec2 dir = centered / max(dist, 0.0001);

      if (uGlitch > 0.001) {
        float slice = floor(uv.y * 46.0);
        float n = hash(vec2(slice, floor(uTime * 22.0)));
        float gate = step(0.74, n) * uGlitch;
        uv.x += (n - 0.5) * 0.16 * gate;
        uv.y += (hash(vec2(slice + 3.0, floor(uTime * 18.0))) - 0.5) * 0.012 * gate;
      }

      float ab = (0.0011 + uAberration) * (0.35 + dist * 2.4);
      float r = texture2D(tDiffuse, uv + dir * ab).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir * ab).b;
      vec3 col = vec3(r, g, b);

      if (uGlitch > 0.001) {
        float band = smoothstep(0.2, 0.0, abs(fract(uv.y * 8.0 + uTime * 3.0) - 0.5));
        col.r += band * uGlitch * 0.22;
        col.b += band * uGlitch * 0.16;
      }

      col *= 1.0 - 0.035 * smoothstep(0.5, 1.0, sin(uv.y * 1100.0));
      float grain = hash(uv * uResolution + uTime * 60.0) - 0.5;
      col += grain * uGrain;

      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, uSaturation);
      col = max(col, vec3(0.0));

      float vig = smoothstep(1.05, 0.28, dist);
      col *= 0.6 + 0.4 * vig;
      col += vec3(0.025, 0.0, 0.04) * (1.0 - vig);

      col = mix(col, vec3(1.0), clamp(uFlash, 0.0, 1.0));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4,
  });

  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1.6));

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.12, 0.45, 2.1);
  composer.addPass(bloom);

  composer.addPass(new OutputPass());

  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uResolution.value.set(size.x, size.y);
  composer.addPass(grade);

  function setSize(width, height, pixelRatio) {
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    grade.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  }

  return { composer, bloom, grade, setSize };
}

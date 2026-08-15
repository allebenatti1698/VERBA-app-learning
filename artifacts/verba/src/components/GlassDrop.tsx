import { useEffect, useRef } from "react";

const W = 200;   // larghezza CSS del canvas
const H = 210;   // altezza CSS
const EMPTY = 170;   // livello liquido a vuoto (coord. CSS interne)
const FULL = 40;     // livello a pieno: oltre la punta, così si riempie tutto

interface GlassDropProps {
  /** 0..1 — frazione di risposte corrette */
  fill: number;
  /** true solo a 100%: il liquido vira al verde */
  perfect?: boolean;
}

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
out vec4 outC;
uniform vec2 uRes;
uniform float uT, uLevel, uPerf, uVital, uDpr, uStill;

float smin(float a, float b, float k){
  float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
  return mix(b, a, h) - k * h * (1. - h);
}
float sdC(vec2 p, vec2 c, float r){ return length(p - c) - r; }

/* Goccia: catena di cerchi fusi con smooth minimum */
float sdDrop(vec2 p){
  float d = sdC(p, vec2(100.,  44.),  6.);
  d = smin(d, sdC(p, vec2(100.,  58.), 15.), 9.);
  d = smin(d, sdC(p, vec2(100.,  76.), 25.), 9.);
  d = smin(d, sdC(p, vec2(100.,  98.), 37.), 9.);
  d = smin(d, sdC(p, vec2(100., 118.), 47.), 9.);
  d = smin(d, sdC(p, vec2(100., 130.), 52.), 9.);
  return d;
}
float surfY(float x){
  float w = uStill;
  return uLevel + sin(x * .055 + uT * 1.8) * 2.2 * w + sin(x * .115 - uT * 1.25) * 1.0 * w;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x / uDpr, uRes.y - gl_FragCoord.y / uDpr);
  vec3 col = vec3(0.);
  float a = 0.;

  float vit = .62 + .38 * uVital;
  vec3 SH = mix(vec3(.66,.58,.90) * vit, vec3(.62,.98,.85), uPerf);
  vec3 DP = mix(vec3(.16,.12,.30) * (.7 + .3 * uVital), vec3(.03,.42,.30), uPerf);
  vec3 HL = mix(vec3(.60,.52,.86), vec3(.20,.83,.60), uPerf);

  /* alone sotto la goccia */
  float halo = exp(-pow(distance(p, vec2(100., 196.)) / 62., 2.)) * (.02 + .18 * uVital);
  col += HL * halo; a = max(a, halo * 1.5);

  /* liquido: sotto il pelo dell'acqua e dentro il vetro */
  float pool = max(surfY(p.x) - p.y, sdDrop(p) + 3.0);
  if (pool < 0.) {
    vec2 n = -normalize(vec2(dFdx(pool), dFdy(pool)) + 1e-6);
    float th = clamp(-pool / 26., 0., 1.);
    vec3 c = mix(SH, DP, pow(th, .72));
    vec3 L = normalize(vec3(-.42, -.72, .55));
    vec3 N = normalize(vec3(n, .80));
    c += vec3(1., 1., .97) * pow(max(dot(reflect(-L, N), vec3(0., 0., 1.)), 0.), 34.) * .85;
    c += mix(SH, vec3(1.), .6) * pow(1. - clamp(N.z, 0., 1.), 2.4) * .42;
    col = c; a = 1.;
  } else {
    float e = smoothstep(1.6, 0., pool);
    if (e > 0.) { col = mix(col, SH, e); a = max(a, e); }
  }

  /* vetro */
  float dd = sdDrop(p);
  float band = smoothstep(2.9, 0., abs(dd));
  col += vec3(.84,.90,.96) * band * .60; a = max(a, band * .78);
  if (dd < 0.) {
    vec2 dn = normalize(vec2(dFdx(dd), dFdy(dd)) + 1e-6);
    vec3 N = normalize(vec3(-dn, .9));
    float fr = pow(1. - clamp(N.z, 0., 1.), 2.0);
    float sp = pow(max(dot(reflect(-normalize(vec3(-.5,-.7,.5)), N), vec3(0.,0.,1.)), 0.), 52.);
    col += vec3(.85,.92,1.) * fr * .17;
    col += vec3(1.) * sp * .55;
    col += vec3(.10,.11,.14) * (1. - clamp(-dd / 50., 0., 1.)) * .45;
    a = max(a, .12 + fr * .5 + sp * .6);
  }

  outC = vec4(col, clamp(a, 0., 1.));
}`;

export default function GlassDrop({ fill, perfect = false }: GlassDropProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;

    const gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) {
      // Nessun WebGL2: il componente resta invisibile, la schermata non cambia.
      cv.style.display = "none";
      return;
    }

    const reduce = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error("GlassDrop shader:", gl!.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VS);
    const fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { cv.style.display = "none"; return; }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("GlassDrop link:", gl.getProgramInfoLog(prog));
      cv.style.display = "none";
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      t: gl.getUniformLocation(prog, "uT"),
      level: gl.getUniformLocation(prog, "uLevel"),
      perf: gl.getUniformLocation(prog, "uPerf"),
      vital: gl.getUniformLocation(prog, "uVital"),
      dpr: gl.getUniformLocation(prog, "uDpr"),
      still: gl.getUniformLocation(prog, "uStill"),
    };
    gl.uniform2f(u.res, W, H);
    gl.uniform1f(u.dpr, dpr);
    gl.uniform1f(u.still, reduce ? 0 : 1);
    gl.viewport(0, 0, cv.width, cv.height);

    const target = EMPTY - (EMPTY - FULL) * Math.max(0, Math.min(1, fill));
    let level = reduce ? target : EMPTY;
    let raf = 0;
    const t0 = performance.now();

    function frame(now: number) {
      const t = (now - t0) / 1000;
      if (!reduce) level += (target - level) * 0.055;
      gl!.uniform1f(u.t, t);
      gl!.uniform1f(u.level, level);
      gl!.uniform1f(u.perf, perfect ? 1 : 0);
      gl!.uniform1f(u.vital, Math.max(0, Math.min(1, fill)));
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [fill, perfect]);

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 18 }}>
      <canvas
        ref={ref}
        style={{ width: W, height: H, display: "block" }}
        aria-hidden="true"
      />
    </div>
  );
}

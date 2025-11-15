import { GLRenderer } from "gl-lite";

const canvas = document.getElementById("main") as HTMLCanvasElement;
const renderer = new GLRenderer({ canvas });

const program = renderer.program<{ time: number }>({
  frag: /* glsl */ `
    precision mediump float;
    uniform float time;
    void main() {
      float x = sin(time * 6.28) * 0.5 + 0.5;
      gl_FragColor = vec4(x, 0.0, 0.0, 1.0);
    }
  `,
  uniforms: {
    time: (props) => props.time,
  },
});

const start = performance.now();
function animate() {
  program.draw({ time: (performance.now() - start) / 1000 });
  requestAnimationFrame(animate);
}
animate();

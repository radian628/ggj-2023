function lerp(a: number, b: number, x: number) {
  return a * x + b * (1 - x);
}

function bulge(x: number) {
  return 12 * (0.02 + Math.sin(Math.PI * x)) + 1;
}

export function Logo() {
  return (
    <canvas
      class="logo"
      width="1024"
      height="1024"
      ref={(c) => {
        const ctx = c.getContext("2d");

        ctx?.scale(c.width / 512, c.height / 512);

        type Cursor = {
          x: number;
          y: number;
          t: number;
          s: number;
          d: number;
          dir: number;
        };

        const startsize = 90;

        const startangle = Math.PI / 5;

        let cursors: Cursor[] = [
          { x: 150, y: 90, t: 0, s: startsize, d: startangle, dir: 1 },
        ];

        let time = 0;
        const lifespan = 200;
        const lifetimes = 8;

        function loop() {
          if (!(ctx instanceof CanvasRenderingContext2D)) return;

          if (time == 0) {
            ctx.strokeStyle = "white";
          }

          for (let i = 0; i < bulge(time / lifespan / lifetimes); i++) {
            time++;
            for (const cursor of cursors) {
              cursor.t += 1;
              const { x, y, t, s, d, dir } = cursor;
              const continuousSizeFactor = 1 - (0.5 * t) / lifespan;

              ctx.beginPath();
              const radius = s * 0.2 * continuousSizeFactor;
              ctx.lineCap = "butt";
              ctx.lineWidth = radius;
              ctx.moveTo(x, y);
              ctx.lineTo(x + radius * 1, y + radius * 2.5);
              ctx.stroke();

              cursor.d += 1 / lifespan;
              cursor.d = lerp(
                dir == 1 ? startangle : Math.PI / 2 + 0.2,
                cursor.d,
                (t / lifespan) ** 7
              );
              const angle = d;

              const squashFactorY =
                (s / startsize) ** 0.4 +
                Math.max(time / lifespan / lifetimes - 0.5, 0) * 12;
              const squashFactorX =
                (s / startsize) ** 0.5 +
                (1 - Math.abs(x - 256) / 256) * (1 - s / startsize) * 0.5;

              cursor.y += Math.sin(angle) * s * (3 / lifespan) * squashFactorY;
              cursor.x += Math.cos(angle) * s * (3 / lifespan) * squashFactorX;

              if (t == Math.floor(lifespan / 2)) {
                cursors.push({
                  x,
                  y,
                  t: Math.ceil(lifespan / 2) + 1,
                  s: s,
                  d: d + (Math.PI / 2) * dir,
                  dir: -dir,
                });
              } else if (t == lifespan) {
                cursors.push({
                  x,
                  y,
                  t: 0,
                  s: s / 2,
                  d,
                  dir: dir,
                });
              }
            }
            cursors = cursors.filter((c) => c.t <= lifespan);
          }

          if (time > lifespan * lifetimes) return;
          requestAnimationFrame(loop);
        }

        loop();
      }}
    ></canvas>
  );
}

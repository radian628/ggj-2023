import * as esbuild from "esbuild";

const ctx = await esbuild.context({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "build/bundle.js",
});

await ctx.watch();

import { copyFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const SYSTEM_ID = "vieja-escuela";
const BASE = `/systems/${SYSTEM_ID}/`;
const FOUNDRY_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000";

/**
 * Dev-server glue: Foundry asks for the built `vieja-escuela.mjs`/`.css` named in system.json.
 * Serve the TS source instead (CSS is injected by Vite from the TS import) and push template
 * changes to the client so open sheets re-render without a reload.
 */
function foundryDev(): Plugin {
  return {
    name: "vieja-escuela:foundry-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === `${BASE}${SYSTEM_ID}.mjs`) req.url = `${BASE}src/${SYSTEM_ID}.ts`;
        else if (req.url === `${BASE}${SYSTEM_ID}.css`) {
          res.setHeader("Content-Type", "text/css");
          res.end("");
          return;
        }
        next();
      });
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".hbs")) {
        const path = file.slice(file.indexOf("/public/") + "/public/".length);
        server.ws.send({
          type: "custom",
          event: `${SYSTEM_ID}:template`,
          data: { path: `${BASE.slice(1)}${path}` },
        });
        return [];
      }
    },
  };
}

/** Ship the LICENSE (referenced by system.json) with the build. */
function copyLicense(): Plugin {
  return {
    name: "vieja-escuela:copy-license",
    apply: "build",
    closeBundle() {
      copyFileSync("LICENSE", "dist/LICENSE");
    },
  };
}

export default defineConfig({
  base: BASE,
  publicDir: "public",
  plugins: [foundryDev(), copyLicense()],
  server: {
    port: 30001,
    proxy: {
      // Order matters: the socket rule must come before the catch-all.
      "/socket.io": { target: FOUNDRY_URL.replace(/^http/, "ws"), ws: true },
      // Everything that isn't this system's files is served by the real Foundry server.
      [`^(?!${BASE})`]: FOUNDRY_URL,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false, // keep dist/packs produced by `npm run pack`
    sourcemap: true,
    minify: false,
    lib: {
      entry: `src/${SYSTEM_ID}.ts`,
      formats: ["es"],
      fileName: () => `${SYSTEM_ID}.mjs`,
      cssFileName: SYSTEM_ID,
    },
  },
});

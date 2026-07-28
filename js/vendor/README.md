# Vendored Three.js

- `three-r180-stack.min.js` is the primary local runtime. It contains Three.js `0.180.0`,
  EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, ShaderPass, SMAAPass, OutputPass
  and HDRLoader in one browser IIFE.
- `three.min.js` is the previous r160 emergency fallback.

To rebuild the r180 bundle from the repository root:

```powershell
New-Item -ItemType Directory -Force .tmp/three-build | Out-Null
Push-Location .tmp/three-build
npm init -y
npm install three@0.180.0 esbuild@0.25.8 --no-audit --no-fund
Copy-Item ../../scripts/three-r180-stack-entry.mjs ./entry.mjs
./node_modules/.bin/esbuild ./entry.mjs `
  --bundle --minify --format=iife --target=es2018 `
  --outfile=../../js/vendor/three-r180-stack.min.js --legal-comments=eof
Pop-Location
```

Three.js is MIT licensed; the generated bundle retains its license notice.

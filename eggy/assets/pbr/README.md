# PBR texture assets

The textures in this directory are 1K JPG PBR maps downloaded from [Poly Haven](https://polyhaven.com/) on 2026-07-12.
Poly Haven publishes these assets under **CC0**: https://polyhaven.com/license

Assets used:
- `leafy_grass` — https://polyhaven.com/a/leafy_grass
- `grey_plaster` — https://polyhaven.com/a/grey_plaster
- `clay_roof_tiles_02` — https://polyhaven.com/a/clay_roof_tiles_02
- `rectangular_paving` — https://polyhaven.com/a/rectangular_paving
- `marble_01` — https://polyhaven.com/a/marble_01

For each asset, the game includes the 1K JPG diffuse, OpenGL normal, and roughness maps. Files are kept locally so the game does not depend on Poly Haven's API or CDN at runtime.

The generated `*_arm.jpg` files use the glTF ORM channel convention expected by
Three.js materials:

- R: ambient occlusion
- G: roughness
- B: metalness

Current world-scale UV references are 3.0 m for wall plaster, 2.0 m for roof and
trim, 2.2 m for paving, and 2.07 m for grass/ground.

Stockfish.js 19 — single-threaded lite WASM build
=================================================

Files:
  stockfish-19-lite-single.js
  stockfish-19-lite-single.wasm

Source:  https://github.com/nmrugg/stockfish.js
Upstream: https://github.com/official-stockfish/Stockfish
License: GNU General Public License v3 (see Copying.txt)

The WASM build is single-threaded, so it works without SharedArrayBuffer,
COOP/COEP headers or any special GitHub Pages configuration.

The web application passes the absolute .wasm URL to this worker through the
URL hash. Stockfish.js reads it from self.location.hash, so both the worker
script and the WASM binary follow import.meta.env.BASE_URL.

Keep both files together in this directory.

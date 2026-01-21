// engine_worker.js
// This runs inside a Worker thread spawned by background.js
// It allows us to terminate the calculation instantly if the board changes.

importScripts('wukong.js');

const engine = new Engine();

self.onmessage = function(e) {
    const { fen, depth } = e.data;

    if (!fen) return;

    try {
        engine.setBoard(fen);
        
        // Search
        // We can use a synchronous search here because the entire worker
        // will be killed if we need to stop it.
        const bestMoveValues = engine.search(depth || 8);
        const bestMoveString = engine.moveToString(bestMoveValues);

        self.postMessage({
            bestMove: bestMoveString,
            fen: fen
        });
    } catch (err) {
        self.postMessage({ error: err.message });
    }
};
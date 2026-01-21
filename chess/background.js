// background.js
// This runs in the extension's background process.

importScripts('wukong.js');

let engine = null;

// Force activation
self.addEventListener('install', (event) => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

try {
    // Initialize Engine Synchronously (Fallback since Worker is not supported in this context)
    engine = new Engine();
    console.log("Background: Engine initialized (Sync Mode).");
} catch (e) {
    console.error("Background: Failed to initialize engine.", e);
}

// Listen for clicks on the extension icon (action)
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DEBUG_BOX' }).catch(err => {
            console.log("Could not send toggle message:", err);
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // --- BOOK MOVE (FETCH) ---
    // We prioritize checking this handler so we can fire off the fetch immediately.
    if (request.type === 'FETCH_BOOK_MOVE') {
        const { fen } = request;
        
        fetch(`https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}`)
            .then(res => {
                if (!res.ok) throw new Error(`API ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.moves && data.moves.length > 0) {
                    sendResponse({ bookMove: data.moves[0].uci });
                } else {
                    sendResponse({ bookMove: null });
                }
            })
            .catch(err => {
                console.error("Book fetch error:", err);
                sendResponse({ error: err.message });
            });
            
        return true; // Keep channel open
    }

    // --- ENGINE ANALYSIS ---
    if (request.type === 'ANALYZE_BOARD') {
        if (!engine) {
            sendResponse({ error: "Engine not ready" });
            return;
        }

        const { fen, depth } = request;
        const safeDepth = depth || 8; 

        try {
            engine.setBoard(fen);
            const bestMoveValues = engine.search(safeDepth);
            const bestMoveString = engine.moveToString(bestMoveValues);
            
            sendResponse({ 
                type: 'analysis_result',
                bestMove: bestMoveString,
                fen: fen 
            });
        } catch (err) {
            console.error("Analysis error:", err);
            sendResponse({ error: err.message });
        }

        return true; 
    }
});
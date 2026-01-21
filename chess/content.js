let currentEngineDepth = 4; 

const fenBox = document.createElement("div");
fenBox.id = "fen-debug-box"; 
fenBox.style.position = "fixed";
fenBox.style.bottom = "20px";
fenBox.style.right = "20px";
fenBox.style.width = "320px";        
fenBox.style.height = "260px";       
fenBox.style.padding = "0";          
fenBox.style.background = "#262421"; 

fenBox.style.color = "#c0c0c0";      

fenBox.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
fenBox.style.fontSize = "13px";
fenBox.style.zIndex = "2147483647"; 
fenBox.style.border = "1px solid #403d39"; 

fenBox.style.borderTop = "4px solid #81b64c"; 

fenBox.style.borderRadius = "8px";
fenBox.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
fenBox.style.display = "none"; 

fenBox.style.flexDirection = "column";
fenBox.style.transition = "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
document.body.appendChild(fenBox);

const header = document.createElement("div");
header.style.display = "flex";
header.style.justifyContent = "space-between";
header.style.alignItems = "center";
header.style.padding = "10px 15px";
header.style.background = "#1f1e1b"; 

header.style.borderBottom = "1px solid #383531";
header.style.borderRadius = "6px 6px 0 0";
header.style.cursor = "move";
header.style.userSelect = "none";

const titleContainer = document.createElement("div");
titleContainer.style.display = "flex";
titleContainer.style.alignItems = "center";
titleContainer.style.gap = "8px";

const iconSpan = document.createElement("span");
iconSpan.innerText = "♞"; 

iconSpan.style.fontSize = "16px";
iconSpan.style.color = "#81b64c"; 

const title = document.createElement("span");
title.innerText = "Engine Analysis";
title.style.fontWeight = "600";
title.style.color = "#e2e2e2";

titleContainer.appendChild(iconSpan);
titleContainer.appendChild(title);

const toggleBtn = document.createElement("div");
toggleBtn.innerHTML = "&#8722;"; 

toggleBtn.style.cursor = "pointer";
toggleBtn.style.color = "#999";
toggleBtn.style.fontSize = "18px";
toggleBtn.style.fontWeight = "bold";
toggleBtn.style.padding = "0 5px";
toggleBtn.style.lineHeight = "1";
toggleBtn.title = "Minimize";
toggleBtn.onmouseover = () => toggleBtn.style.color = "#fff";
toggleBtn.onmouseout = () => toggleBtn.style.color = "#999";

header.appendChild(titleContainer);
header.appendChild(toggleBtn);
fenBox.appendChild(header);

const controlsDiv = document.createElement("div");
controlsDiv.style.padding = "12px 15px";
controlsDiv.style.borderBottom = "1px solid #383531";
controlsDiv.style.display = "flex";
controlsDiv.style.alignItems = "center";
controlsDiv.style.gap = "12px";
controlsDiv.style.background = "#262421";

const depthLabel = document.createElement("span");
depthLabel.innerText = `Depth: ${currentEngineDepth}`;
depthLabel.style.minWidth = "65px";
depthLabel.style.fontWeight = "500";
depthLabel.style.color = "#9ca3af";

const depthSlider = document.createElement("input");
depthSlider.type = "range";
depthSlider.min = "1";
depthSlider.max = "12"; 

depthSlider.value = currentEngineDepth;
depthSlider.style.flex = "1";
depthSlider.style.cursor = "pointer";
depthSlider.style.accentColor = "#81b64c"; 

depthSlider.oninput = (e) => {
    currentEngineDepth = parseInt(e.target.value);
    depthLabel.innerText = `Depth: ${currentEngineDepth}`;

    window.chessState.fen = ""; 
    safeExtractFEN(); 
};

controlsDiv.appendChild(depthLabel);
controlsDiv.appendChild(depthSlider);
fenBox.appendChild(controlsDiv);

const logContent = document.createElement("div");
logContent.style.flex = "1";
logContent.style.padding = "10px 15px";
logContent.style.overflowY = "auto";
logContent.style.whiteSpace = "pre-wrap";
logContent.style.fontFamily = "'Consolas', 'Monaco', monospace"; 
logContent.style.fontSize = "12px";
logContent.style.lineHeight = "1.5";
logContent.style.color = "#a8a29e";
logContent.style.scrollbarWidth = "thin";
logContent.style.scrollbarColor = "#444 transparent";
fenBox.appendChild(logContent);

let isMinimized = false;
toggleBtn.onclick = (e) => {
    e.stopPropagation();
    isMinimized = !isMinimized;
    if (isMinimized) {
        fenBox.style.height = "45px"; 

        toggleBtn.innerHTML = "+";
        logContent.style.display = "none";
        controlsDiv.style.display = "none";
        fenBox.style.overflow = "hidden";
        fenBox.style.resize = "none";
    } else {
        fenBox.style.height = "260px";
        toggleBtn.innerHTML = "&#8722;";
        logContent.style.display = "block";
        controlsDiv.style.display = "flex";
    }
};

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

header.onmousedown = (e) => {
    if (e.target === toggleBtn) return;
    isDragging = true;
    const rect = fenBox.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    fenBox.style.right = 'auto';
    fenBox.style.bottom = 'auto';
    fenBox.style.left = rect.left + 'px';
    fenBox.style.top = rect.top + 'px';
    header.style.cursor = "grabbing";
};

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        fenBox.style.left = (e.clientX - dragOffsetX) + 'px';
        fenBox.style.top = (e.clientY - dragOffsetY) + 'px';
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    header.style.cursor = "move";
});

function logToBox(msg) {
    const time = new Date().toLocaleTimeString().split(' ')[0];

    let color = "#a8a29e"; 

    if (msg.includes("Engine:")) color = "#81b64c"; 

    if (msg.includes("Book:")) color = "#60a5fa";   

    if (msg.includes("Turn:")) color = "#e2e2e2";   

    if (msg.includes("Error")) color = "#ef4444";   

    const line = document.createElement("div");
    line.style.borderBottom = "1px solid #333";
    line.style.padding = "2px 0";

    const timeSpan = document.createElement("span");
    timeSpan.innerText = `[${time}] `;
    timeSpan.style.color = "#555";
    timeSpan.style.fontSize = "11px";

    const msgSpan = document.createElement("span");
    msgSpan.innerText = msg;
    msgSpan.style.color = color;

    line.appendChild(timeSpan);
    line.appendChild(msgSpan);

    logContent.appendChild(line);
    logContent.scrollTop = logContent.scrollHeight; 
}

logToBox("Analysis Ready. Good luck!");

const espLayer = document.createElement("div");
espLayer.id = "esp-overlay-layer";
espLayer.style.position = "fixed";
espLayer.style.top = "0";
espLayer.style.left = "0";
espLayer.style.width = "100vw";
espLayer.style.height = "100vh";
espLayer.style.pointerEvents = "none"; 
espLayer.style.zIndex = "2147483646"; 
document.body.appendChild(espLayer);

const arrowLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
arrowLayer.style.position = "absolute";
arrowLayer.style.top = "0";
arrowLayer.style.left = "0";
arrowLayer.style.width = "100%";
arrowLayer.style.height = "100%";
arrowLayer.style.pointerEvents = "none";
espLayer.appendChild(arrowLayer);

const roleMap = { 'p': 'pawn', 'n': 'knight', 'b': 'bishop', 'r': 'rook', 'q': 'queen', 'k': 'king' };
const nameToChar = { 'pawn': 'p', 'knight': 'n', 'bishop': 'b', 'rook': 'r', 'queen': 'q', 'king': 'k' };

window.chessState = {
    fen: "",
    orientation: "white",
    squareSize: 0,
    boardRect: { top: 0, left: 0, width: 0, height: 0 },
    squares: {},
    lastBoard: null,         

    lastActiveColor: null    

};

function sendMessageSafe(message, callback) {
    if (chrome.runtime && !!chrome.runtime.getManifest()) {
        try {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (callback) callback(response);
            });
        } catch (e) {
            handleInvalidatedContext();
        }
    } else {
        handleInvalidatedContext();
    }
}

function handleInvalidatedContext() {
    if (observer) observer.disconnect();

    const titleEl = header.querySelector('span:nth-child(2)'); 

    if (titleEl) {
        titleEl.innerText = "Disconnected (Refresh)";
        titleEl.style.color = "#ef4444";
    }
    logToBox("Extension updated. Please refresh.");
}

try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'TOGGLE_DEBUG_BOX') {
            if (fenBox.style.display === 'none') {
                fenBox.style.display = 'flex';
            } else {
                fenBox.style.display = 'none';
            }
        }
    });
} catch (e) { console.log("Listener attach failed", e); }

function cloneBoard(board) {
    return board.map(row => [...row]);
}

function extractFEN() {
    if (!chrome.runtime || !chrome.runtime.getManifest()) {
        handleInvalidatedContext();
        return;
    }

    let board = Array(8).fill(null).map(() => Array(8).fill(null));
    let visiblePieces = [];
    let detectedActiveColor = 'w';
    let boardFound = false;

    const cgBoard = document.querySelector('.main-board cg-board') || document.querySelector('cg-board');

    if (cgBoard) {
        const cgContainer = cgBoard.closest('cg-container'); 
        const boundsElement = cgContainer || cgBoard;
        const boardRect = boundsElement.getBoundingClientRect();

        if (boardRect.width > 0 && boardRect.height > 0) {
            const pieces = cgBoard.querySelectorAll('piece');

            if (pieces.length > 0) {
                boardFound = true;
                const squareSize = boardRect.width / 8; 

                let piecesData = [];
                pieces.forEach(p => {
                    const classes = p.className;
                    const style = p.style.transform;

                    const colorMatch = classes.match(/(white|black)/);
                    const roleMatch = classes.match(/(pawn|knight|bishop|rook|queen|king)/);
                    const transMatch = style.match(/translate\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)/);

                    if (colorMatch && roleMatch && transMatch) {
                        const color = colorMatch[1] === 'white' ? 'w' : 'b';
                        const role = nameToChar[roleMatch[1]];
                        const char = color === 'w' ? role.toUpperCase() : role;

                        piecesData.push({
                            element: p,
                            char: char,
                            x: parseFloat(transMatch[1]),
                            y: parseFloat(transMatch[2]),
                            color: color
                        });
                    }
                });

                if (piecesData.length > 0) {
                    let orientation = 'white';
                    const cgWrap = cgBoard.closest('.cg-wrap');

                    if (cgWrap && cgWrap.classList.contains('orientation-black')) {
                        orientation = 'black';
                    } else if (cgWrap && cgWrap.classList.contains('orientation-white')) {
                        orientation = 'white';
                    } else {
                        const topRowPieces = piecesData.filter(p => Math.abs(p.y) < squareSize / 2);
                        const blackCount = topRowPieces.filter(p => p.color === 'b').length;
                        const whiteCount = topRowPieces.filter(p => p.color === 'w').length;
                        if (whiteCount > blackCount) orientation = 'black';
                    }

                    window.chessState.orientation = orientation;
                    window.chessState.squareSize = squareSize;
                    window.chessState.squares = {}; 

                    piecesData.forEach(p => {
                        const vCol = Math.round(p.x / squareSize);
                        const vRow = Math.round(p.y / squareSize);

                        if (vCol >= 0 && vCol < 8 && vRow >= 0 && vRow < 8) {
                            let file, rank;
                            if (orientation === 'white') {
                                file = vCol;
                                rank = 7 - vRow;
                            } else {
                                file = 7 - vCol;
                                rank = vRow;
                            }

                            board[rank][file] = p.char;
                            visiblePieces.push({
                                element: p.element,
                                file: file,
                                rank: rank,
                                rect: p.element.getBoundingClientRect(),
                                type: p.char
                            });
                        }
                    });

                    const fileNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                    for (let r = 0; r < 8; r++) {
                        for (let f = 0; f < 8; f++) {
                            const sqName = `${fileNames[f]}${r + 1}`;
                            let px, py;
                            if (orientation === 'white') {
                                 px = (f * squareSize);
                                 py = ((7 - r) * squareSize);
                            } else {
                                 px = ((7 - f) * squareSize);
                                 py = (r * squareSize);
                            }
                            window.chessState.squares[sqName] = {
                                centerX: boardRect.left + px + squareSize/2,
                                centerY: boardRect.top + py + squareSize/2
                            };
                        }
                    }
                }
            }
        }
    }

    if (!boardFound) {
        const pieces = document.querySelectorAll('div[class*="piece"]');
        if (pieces.length > 0) {
            let whiteKingFound = false;
            let blackKingFound = false;

            pieces.forEach(piece => {
                const classes = piece.className;
                const pieceMatch = classes.match(/\b([wb])([pnbrqk])\b/i);
                const posMatch = classes.match(/(?:square-|sq-|pos-)(\d{2})/);

                if (pieceMatch && posMatch) {
                    const colorCode = pieceMatch[1].toLowerCase();
                    const roleCode = pieceMatch[2].toLowerCase();
                    const char = colorCode === 'w' ? roleCode.toUpperCase() : roleCode.toLowerCase();
                    const coords = posMatch[1]; 
                    const file = parseInt(coords[0]) - 1; 
                    const rank = parseInt(coords[1]) - 1; 

                    if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
                        board[rank][file] = char;
                        visiblePieces.push({
                            element: piece,
                            file: file,
                            rank: rank,
                            rect: piece.getBoundingClientRect(),
                            type: char
                        });
                        if (char === 'K') whiteKingFound = true;
                        if (char === 'k') blackKingFound = true;
                    }
                }
            });

            if (whiteKingFound && blackKingFound) {
                boardFound = true;
                calculateBoardGeometry(visiblePieces);
            }
        }
    }

    if (!boardFound) return;

    detectedActiveColor = detectSideToMove(board);

    window.chessState.lastBoard = cloneBoard(board);
    window.chessState.lastActiveColor = detectedActiveColor;

    let castlingRights = "";
    if (board[0][4] === 'K') { 
        if (board[0][7] === 'R') castlingRights += "K"; 
        if (board[0][0] === 'R') castlingRights += "Q"; 
    }
    if (board[7][4] === 'k') { 
        if (board[7][7] === 'r') castlingRights += "k"; 
        if (board[7][0] === 'r') castlingRights += "q"; 
    }
    if (castlingRights === "") castlingRights = "-";

    let fenRows = [];
    for (let r = 7; r >= 0; r--) {
        let empty = 0;
        let rowStr = "";
        for (let c = 0; c < 8; c++) {
            if (board[r][c]) {
                if (empty > 0) { rowStr += empty; empty = 0; }
                rowStr += board[r][c];
            } else { empty++; }
        }
        if (empty > 0) rowStr += empty;
        fenRows.push(rowStr);
    }

    const finalFen = `${fenRows.join("/")} ${detectedActiveColor} ${castlingRights} - 0 1`; 

    if (window.chessState.fen === finalFen) return;

    window.chessState.fen = finalFen;
    clearVisuals();
    drawDebugGrid(); 

    visiblePieces.forEach(p => {
        const label = document.createElement("div");
        label.className = "esp-label";
        const typeChar = p.type.toLowerCase();
        const colorPrefix = p.type === p.type.toUpperCase() ? 'w' : 'b';
        label.innerText = `${colorPrefix}${roleMap[typeChar]}`;
        label.style.position = "absolute";
        label.style.left = (p.rect.left + p.rect.width / 2) + "px";
        label.style.top = (p.rect.top + p.rect.height / 2) + "px";
        label.style.transform = "translate(-50%, -50%)";

        label.style.color = colorPrefix === 'w' ? "#fff" : "#000";
        label.style.textShadow = "0 0 3px #fff, 0 0 5px #000";
        label.style.fontWeight = "bold";
        label.style.fontSize = "12px";
        label.style.fontFamily = "sans-serif";
        label.style.pointerEvents = "none";
        espLayer.appendChild(label);
    });

    const myColorChar = window.chessState.orientation === 'white' ? 'w' : 'b';
    if (detectedActiveColor === myColorChar) {
        logToBox(`Turn: Us (${detectedActiveColor}). Thinking...`);

        sendMessageSafe({
            type: 'FETCH_BOOK_MOVE',
            fen: finalFen
        }, (response) => {
            if (response && response.bookMove) {
                logToBox(`Book: ${response.bookMove}`);
                drawBookMoveArrow(response.bookMove);
            }
        });

        setTimeout(() => {
            try {
                sendMessageSafe({
                    type: 'ANALYZE_BOARD',
                    fen: finalFen,
                    depth: currentEngineDepth
                }, (response) => {
                    if (response && response.bestMove) {
                        if (response.fen === window.chessState.fen) {
                            logToBox(`Engine: ${response.bestMove}`);
                            drawBestMoveArrow(response.bestMove);
                        }
                    }
                });
            } catch (e) {
                logToBox(`Send Error: ${e.message}`);
            }
        }, 50);
    } else {
        logToBox(`Turn: Opponent (${detectedActiveColor}). Waiting.`);
    }
}

function detectSideToMove(board) {
    const whiteHome = board[0].join(''); 
    const blackHome = board[7].join(''); 
    const whitePawns = board[1].join('');
    const blackPawns = board[6].join('');

    if (whiteHome === "RNBQKBNR" && blackHome === "rnbqkbnr" &&
        whitePawns === "PPPPPPPP" && blackPawns === "pppppppp") {
        return 'w';
    }

    if (window.chessState.lastBoard) {
        const lb = window.chessState.lastBoard;
        let diffs = [];

        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                if (board[r][c] !== lb[r][c]) {
                    diffs.push({
                        r, c, 
                        newP: board[r][c] 
                    });
                }
            }
        }

        if (diffs.length > 0) {
            const dests = diffs.filter(d => d.newP !== null);

            if (dests.length > 0) {
                const whiteDest = dests.some(d => d.newP === d.newP.toUpperCase());
                const blackDest = dests.some(d => d.newP === d.newP.toLowerCase());
                if (whiteDest && !blackDest) return 'b'; 
                if (blackDest && !whiteDest) return 'w';
            }
        } else {
            if (window.chessState.lastActiveColor) return window.chessState.lastActiveColor;
        }
    }

    const highlights = Array.from(document.querySelectorAll('div[class*="highlight"], div[class*="last-move"], square[class*="last-move"]'));
    const sqSize = window.chessState.squareSize;

    if (sqSize && highlights.length > 0) {
        const validHighlights = highlights.filter(el => {
            const r = el.getBoundingClientRect();
            return r.width >= sqSize * 0.8 && r.width <= sqSize * 1.2;
        });

        const highlightedCoords = [];
        validHighlights.forEach(el => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width/2;
            const centerY = rect.top + rect.height/2;

            for (const [sqName, sqData] of Object.entries(window.chessState.squares)) {
                 if (Math.abs(sqData.centerX - centerX) < sqSize * 0.4 && 
                     Math.abs(sqData.centerY - centerY) < sqSize * 0.4) {
                     const fileStr = sqName[0];
                     const rankStr = sqName[1];
                     const file = fileStr.charCodeAt(0) - 97; 
                     const rank = parseInt(rankStr) - 1; 
                     highlightedCoords.push({file, rank});
                     break;
                 }
            }
        });

        if (highlightedCoords.length === 2) {
            let pieceFound = null;
            highlightedCoords.forEach(c => {
                 const p = board[c.rank][c.file];
                 if (p) pieceFound = p;
            });

            if (pieceFound) {
                const isWhitePiece = pieceFound === pieceFound.toUpperCase();
                if (isWhitePiece) return 'b';
                else return 'w';
            }
        }
    }

    if (window.chessState.lastActiveColor) return window.chessState.lastActiveColor;
    return window.chessState.orientation === 'white' ? 'w' : 'b';
}

function clearVisuals() {
    while (arrowLayer.lastChild) arrowLayer.removeChild(arrowLayer.lastChild);
    const oldLabels = espLayer.querySelectorAll('.esp-label');
    oldLabels.forEach(el => el.remove());
    const oldGrid = espLayer.querySelectorAll('.debug-square');
    oldGrid.forEach(el => el.remove());
}

function drawDebugGrid() {
    if (!window.chessState.squareSize) return;
    const squares = window.chessState.squares;
    const size = window.chessState.squareSize;

    for (const sq in squares) {
        const coords = squares[sq];
        const box = document.createElement("div");
        box.className = "debug-square";
        box.style.position = "absolute";
        box.style.left = (coords.centerX - size/2) + "px";
        box.style.top = (coords.centerY - size/2) + "px";
        box.style.width = size + "px";
        box.style.height = size + "px";
        box.style.border = "1px solid rgba(255, 255, 255, 0.1)"; 

        box.style.pointerEvents = "none";
        box.style.boxSizing = "border-box";
        espLayer.appendChild(box);
    }
}

function drawBestMoveArrow(moveString) {
    if (!moveString || moveString.length < 4) return;
    const fromSq = moveString.substring(0, 2);
    const toSq = moveString.substring(2, 4);
    const start = window.chessState.squares[fromSq];
    const end = window.chessState.squares[toSq];
    if (!start || !end) return;

    if (!document.getElementById("esp-arrowhead")) {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "esp-arrowhead");
        marker.setAttribute("markerWidth", "6"); 
        marker.setAttribute("markerHeight", "6");
        marker.setAttribute("refX", "6");
        marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", "0 0, 6 3, 0 6");
        polygon.setAttribute("fill", "#81b64c"); 

        marker.appendChild(polygon);
        defs.appendChild(marker);
        arrowLayer.appendChild(defs);
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.centerX);
    line.setAttribute("y1", start.centerY);
    line.setAttribute("x2", end.centerX);
    line.setAttribute("y2", end.centerY);
    line.setAttribute("stroke", "#81b64c"); 

    line.setAttribute("stroke-width", "8");
    line.setAttribute("stroke-opacity", "0.85");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("marker-end", "url(#esp-arrowhead)");
    arrowLayer.appendChild(line);
}

function drawBookMoveArrow(moveString) {
    if (!moveString || moveString.length < 4) return;
    const fromSq = moveString.substring(0, 2);
    const toSq = moveString.substring(2, 4);
    const start = window.chessState.squares[fromSq];
    const end = window.chessState.squares[toSq];
    if (!start || !end) return;

    if (!document.getElementById("esp-arrowhead-blue")) {
        const defs = arrowLayer.querySelector("defs") || document.createElementNS("http://www.w3.org/2000/svg", "defs");
        if (!arrowLayer.contains(defs)) arrowLayer.appendChild(defs);

        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "esp-arrowhead-blue");
        marker.setAttribute("markerWidth", "6"); 
        marker.setAttribute("markerHeight", "6");
        marker.setAttribute("refX", "6");
        marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", "0 0, 6 3, 0 6");
        polygon.setAttribute("fill", "#60a5fa"); 

        marker.appendChild(polygon);
        defs.appendChild(marker);
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.centerX);
    line.setAttribute("y1", start.centerY);
    line.setAttribute("x2", end.centerX);
    line.setAttribute("y2", end.centerY);
    line.setAttribute("stroke", "#60a5fa");
    line.setAttribute("stroke-width", "8");
    line.setAttribute("stroke-opacity", "0.8");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("marker-end", "url(#esp-arrowhead-blue)");
    arrowLayer.appendChild(line);
}

function calculateBoardGeometry(pieces) {
    const coordinatesSvg = document.querySelector('svg.coordinates');
    if (coordinatesSvg) {
        const rect = coordinatesSvg.getBoundingClientRect();
        if (rect.width > 0) {
            window.chessState.boardRect = rect;
            const avgSize = rect.width / 8;
            window.chessState.squareSize = avgSize;

            let orientation = 'white';
            const texts = Array.from(coordinatesSvg.querySelectorAll('text'));
            const label1 = texts.find(el => el.textContent.trim() === '1');

            if (label1) {
                const y = parseFloat(label1.getAttribute('y'));
                if (!isNaN(y) && y < 50) {
                    orientation = 'black';
                }
            }
            window.chessState.orientation = orientation;

            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            window.chessState.squares = {};
            const boardLeft = rect.left;
            const boardTop = rect.top;

            for (let r = 0; r < 8; r++) { 
                for (let f = 0; f < 8; f++) { 
                    const sqName = `${files[f]}${r + 1}`;
                    let sqX, sqY;
                    if (orientation === 'white') {
                        sqX = boardLeft + (f * avgSize);
                        sqY = boardTop + ((7 - r) * avgSize);
                    } else {
                        sqX = boardLeft + ((7 - f) * avgSize);
                        sqY = boardTop + (r * avgSize);
                    }
                    window.chessState.squares[sqName] = {
                        centerX: sqX + avgSize / 2,
                        centerY: sqY + avgSize / 2
                    };
                }
            }
            return; 
        }
    }

    if (pieces.length < 2) return; 

    const totalWidth = pieces.reduce((sum, p) => sum + p.rect.width, 0);
    const avgSize = totalWidth / pieces.length;
    window.chessState.squareSize = avgSize;

    const rank0Pieces = pieces.filter(p => p.rank === 0);
    const rank7Pieces = pieces.filter(p => p.rank === 7);

    let orientation = 'white'; 
    if (rank0Pieces.length > 0 && rank7Pieces.length > 0) {
        if (rank0Pieces[0].rect.y > rank7Pieces[0].rect.y) orientation = 'white';
        else orientation = 'black';
    }
    window.chessState.orientation = orientation;

    const anchor = pieces[0];
    const ax = anchor.rect.left;
    const ay = anchor.rect.top;
    const af = anchor.file; 
    const ar = anchor.rank;

    let boardLeft, boardTop;
    if (orientation === 'white') {
        boardLeft = ax - (af * avgSize);
        boardTop = ay - ((7 - ar) * avgSize);
    } else {
        boardLeft = ax - ((7 - af) * avgSize);
        boardTop = ay - (ar * avgSize);
    }

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    window.chessState.squares = {};

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const sqName = `${files[f]}${r + 1}`;
            let sqX, sqY;
            if (orientation === 'white') {
                sqX = boardLeft + (f * avgSize);
                sqY = boardTop + ((7 - r) * avgSize);
            } else {
                sqX = boardLeft + ((7 - f) * avgSize);
                sqY = boardTop + (r * avgSize);
            }
            window.chessState.squares[sqName] = {
                centerX: sqX + avgSize / 2,
                centerY: sqY + avgSize / 2
            };
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const safeExtractFEN = debounce(extractFEN, 40); 

const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    for (const mutation of mutations) {
        if (mutation.target === fenBox || fenBox.contains(mutation.target) ||
            mutation.target === espLayer || espLayer.contains(mutation.target)) continue;

        if (mutation.target.classList && 
           (mutation.target.classList.contains("time") || 
            mutation.target.classList.contains("clock"))) continue;

        shouldUpdate = true;
    }
    if (shouldUpdate) safeExtractFEN();
});

observer.observe(document.body, { childList: true, subtree: true, attributes: true });

window.addEventListener('resize', () => {
    window.chessState.fen = ""; 
    extractFEN();
});

setTimeout(extractFEN, 2000);
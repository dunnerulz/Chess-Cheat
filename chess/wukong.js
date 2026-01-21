/************************************************\
 ================================================
 
                      WUKONG
              javascript chess engine
           
                        by
                        
                 Code Monkey King
      (Evaluations Tuned with PeSTO Tables)
      (Enhanced with Mobility & King Safety)
      (Enhanced with Rook Open/Semi-Open Files)
      (Enhanced with Pawn Structure Penalties)
      (Endgame Mop-up & Tarrasch Rule Added)
      (Rule of the Square & Search Extensions)
                 
            (Optimized with Typed Arrays)
 
 ===============================================
\************************************************/

// chess engine object
var Engine = function(boardSize, lightSquare, darkSquare, selectColor) {

  'use strict'; // Helps browser optimization

  /****************************\
   ============================
   
         GLOBAL CONSTANTS

   ============================              
  \****************************/
  
  // chess engine version
  const version = '2.1-endgame-fix';
  const elo = '2150'; // Estimated boost

  // sides to move  
  const white = 0;
  const black = 1;
  
  // map "optimized" color to side to move 
  const mapColor = [0, 0, 0, 0, 0, 0, 0, 0, 1];
  
  // piece types
  const KING = 1;
  const PAWN = 2;
  const KNIGHT = 3;
  const BISHOP = 4;
  const ROOK = 5;
  const QUEEN = 6;

  // piece encoding  
  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const p = 7, n = 8, b = 9, r = 10, q = 11, k = 12;
  
  // map "optimized" piece codes to engine's piece codes
  const mapFromOptimized = [0, K, P, N, B, R, Q, 0, 0, k, p, n, b, r, q];
  
  // map board piece to "optimized" piece codes
  const mapToOptimized = [0, 2, 3, 4, 5, 6, 1, 10, 11, 12, 13, 14, 9];
  
  // empty square & offboard square
  const e = 0, o = 13;

  // --- NEW: Evaluation Constants (Centralized) ---
  
  // 1. Structure Bonuses
  const bishopPairBonus = 30; // Bonus for having 2 Bishops

  // 2. Mobility Weights (how many centipawns per available move)
  const mobilityWeight = [
    0, // Empty
    0, // King (handled by safety)
    0, // Pawn (handled by strategy)
    4, // Knight
    3, // Bishop
    2, // Rook
    1  // Queen
  ];

  // 3. King Safety Weights
  const shieldPenalty = 20;   // Penalty for missing pawn shield
  
  // 4. Rook File Bonuses
  const rookOpenBonus = 25;     // No pawns on the file
  const rookSemiOpenBonus = 10; // Only enemy pawns on the file

  // 5. Pawn Structure Penalties
  const doubledPawnPenalty = 10;
  const isolatedPawnPenalty = 20;

  // --- NEW: Advanced Evaluation Constants ---
  
  // 1. Backward Pawns
  const backwardPawnPenalty = 15;
  
  // 2. Knight Outposts
  const knightOutpostBonus = 30;
  
  // 3. Rooks on 7th Rank
  const rook7thBonus = 20;
  
  // 4. Connected Rooks
  const connectedRookBonus = 15;
  
  // 5. King Tropism (Safety)
  // Scaled by distance (Closer = Higher Score)
  // Indexed by piece type (K=1, P=2, N=3, B=4, R=5, Q=6)
  const tropismWeights = [0, 0, 0, 2, 1, 2, 4];

  // ---------------------------------
  
  // square encoding
  const a8 = 0,    b8 = 1,    c8 = 2,   d8 = 3,   e8 = 4,   f8 = 5,   g8 = 6,   h8 = 7;
  const a7 = 16,   b7 = 17,   c7 = 18,  d7 = 19,  e7 = 20,  f7 = 21,  g7 = 22,  h7 = 23;
  const a6 = 32,   b6 = 33,   c6 = 34,  d6 = 35,  e6 = 36,  f6 = 37,  g6 = 39,  h6 = 40;
  const a5 = 48,   b5 = 49,   c5 = 50,  d5 = 51,  e5 = 52,  f5 = 53,  g5 = 54,  h5 = 55;
  const a4 = 64,   b4 = 65,   c4 = 66,  d4 = 67,  e4 = 68,  f4 = 69,  g4 = 70,  h4 = 71;
  const a3 = 80,   b3 = 81,   c3 = 82,  d3 = 83,  e3 = 84,  f3 = 85,  g3 = 86,  h3 = 87;
  const a2 = 96,   b2 = 97,   c2 = 98,  d2 = 99,  e2 = 100, f2 = 101, g2 = 102, h2 = 103;
  const a1 = 112,  b1 = 113,  c1 = 114, d1 = 115, e1 = 116, f1 = 117, g1 = 118, h1 = 119;
  
  // offboard empassant square
  const noEnpassant = 120;
  
  // array to convert board square indices to coordinates
  const coordinates = [
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'i8', 'j8', 'k8', 'l8', 'm8', 'n8', 'o8', 'p8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'i7', 'j7', 'k7', 'l7', 'm7', 'n7', 'o7', 'p7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', 'i6', 'j6', 'k6', 'l6', 'm6', 'n6', 'o6', 'p6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'i5', 'j5', 'k5', 'l5', 'm5', 'n5', 'o5', 'p5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'i4', 'j4', 'k4', 'l4', 'm4', 'n4', 'o4', 'p4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'i3', 'j3', 'k3', 'l3', 'm3', 'n3', 'o3', 'p3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'i2', 'j2', 'k2', 'l2', 'm2', 'n2', 'o2', 'p2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'i1', 'j1', 'k1', 'l1', 'm1', 'n1', 'o1', 'p1'
  ];


  /****************************\
   ============================
   
         BOARD DEFINITIONS

   ============================              
  \****************************/
  
  // starting position
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 ';
  
  // 0x88 chess board representation (Optimized: Int32Array)
  var board = new Int32Array([
    r, n, b, q, k, b, n, r,  o, o, o, o, o, o, o, o,
    p, p, p, p, p, p, p, p,  o, o, o, o, o, o, o, o,
    e, e, e, e, e, e, e, e,  o, o, o, o, o, o, o, o,
    e, e, e, e, e, e, e, e,  o, o, o, o, o, o, o, o,
    e, e, e, e, e, e, e, e,  o, o, o, o, o, o, o, o,
    e, e, e, e, e, e, e, e,  o, o, o, o, o, o, o, o,
    P, P, P, P, P, P, P, P,  o, o, o, o, o, o, o, o,
    R, N, B, Q, K, B, N, R,  o, o, o, o, o, o, o, o
  ]);
  
  // chess board state variables
  var side = white;
  var enpassant = noEnpassant;
  var castle = 15;
  var fifty = 0;
  var hashKey = 0;
  var kingSquare = new Int32Array([e1, e8]); // Optimized
  
  // piece list
  var pieceList = {
    // piece counts
    [P]: 0, [N]: 0, [B]: 0, [R]: 0, [Q]: 0, [K]: 0,
    [p]: 0, [n]: 0, [b]: 0, [r]: 0, [q]: 0, [k]: 0,
    
    // list of pieces with associated squares (Optimized)
    pieces: new Int32Array(13 * 10)
  };
  
  // board move stack
  var moveStack = [];
  
  // plies
  var searchPly = 0;
  var gamePly = 0;
  

  /****************************\
   ============================
   
      RANDOM NUMBER GENERATOR

   ============================              
  \****************************/
  
  // fixed random seed
  var randomState = 1804289383;

  // generate 32-bit pseudo legal numbers
  function random() {
    var number = randomState;
    
    // 32-bit XOR shift
    number ^= number << 13;
    number ^= number >> 17;
    number ^= number << 5;
    randomState = number;

    return number;
  }


  /****************************\
   ============================
   
           ZOBRIST KEYS

   ============================              
  \****************************/ 
 
  // random keys (Optimized)
  var pieceKeys = new Int32Array(13 * 128);
  var castleKeys = new Int32Array(16);
  var sideKey;
  
  // init random hash keys
  function initRandomKeys() {
    for (var index = 0; index < 13 * 128; index++) pieceKeys[index] = random();
    for (var index = 0; index < 16; index++) castleKeys[index] = random();
    sideKey = random();
  }
  
  // generate hash key
  function generateHashKey() {
    var finalKey = 0;
    
    // hash board position
    for (var square = 0; square < 128; square++) {
      if ((square & 0x88) == 0)	{
        var piece = board[square];
        if (piece != e) finalKey ^= pieceKeys[(piece * 128) + square];
      }		
    }
    
    // hash board state variables
    if (side == white) finalKey ^= sideKey;
    if (enpassant != noEnpassant) finalKey ^= pieceKeys[enpassant];
    finalKey ^= castleKeys[castle];
    
    return finalKey;
  }


  /****************************\
   ============================
   
           BOARD METHODS

   ============================              
  \****************************/
  
  // reset board
  function resetBoard() {
    // reset board position
    for (var rank = 0; rank < 8; rank++) {
      for (var file = 0; file < 16; file++) {
        var square = rank * 16 + file;
        if ((square & 0x88) == 0) board[square] = e;
      }
    }
    
    // reset board state variables
    side = -1;
    enpassant = noEnpassant;
    castle = 0;
    fifty = 0;
    hashKey = 0;
    kingSquare[0] = 0; kingSquare[1] = 0;
    moveStack = [];
    
    // reset plies
    searchPly = 0;
    gamePly = 0;
    
    // reset repetition table
    for (var index = 0; index < repetitionTable.length; index++) repetitionTable[index] = 0;
  }
  
  // init piece list
  function initPieceList() {
    // reset piece counts
    for (var piece = P; piece <= k; piece++)
      pieceList[piece] = 0;
    
    // reset piece list
    for (var index = 0; index < pieceList.pieces.length; index++)
      pieceList.pieces[index] = 0;
    
    // associate pieces with squares and count material
    for (var square = 0; square < 128; square++) {
      if ((square & 0x88) == 0) {
        var piece = board[square];
        
        if (piece) {
          pieceList.pieces[piece * 10 + pieceList[piece]] = square;
          pieceList[piece]++;
        }
      }
    }
  }
  
  // validate move
  function moveFromString(moveString) {
    let moveList = [];
    generateMoves(moveList);

    // parse move string
    var sourceSquare = (moveString[0].charCodeAt() - 'a'.charCodeAt()) +(8 - (moveString[1].charCodeAt() - '0'.charCodeAt())) * 16;
    var targetSquare = (moveString[2].charCodeAt() - 'a'.charCodeAt()) + (8 - (moveString[3].charCodeAt() - '0'.charCodeAt())) * 16;

    // validate
    for(var count = 0; count < moveList.length; count++) {
      var move = moveList[count].move;
      var promotedPiece = 0;

      if(getMoveSource(move) == sourceSquare && getMoveTarget(move) == targetSquare) {
        promotedPiece = getMovePromoted(move);

        if(promotedPiece) {
          if((promotedPiece == N || promotedPiece == n) && moveString[4] == 'n') return move;
          else if((promotedPiece == B || promotedPiece == b) && moveString[4] == 'b') return move;
          else if((promotedPiece == R || promotedPiece == r) && moveString[4] == 'r') return move;
          else if((promotedPiece == Q || promotedPiece == q) && moveString[4] == 'q') return move;
          continue;
        }

        // legal move
        return move;
      }
    }

    // illegal move
    return 0;
  }

  
  /****************************\
   ============================
   
           MOVE OFFSETS

   ============================              
  \****************************/
  
  // piece move offsets
  var knightOffsets = [33, 31, 18, 14, -33, -31, -18, -14];
  var bishopOffsets = [15, 17, -15, -17];
  var rookOffsets = [16, -16, 1, -1];
  var kingOffsets = [16, -16, 1, -1, 15, 17, -15, -17];
  
  const pieceOffsets = [
    [],
    kingOffsets,
    [],
    knightOffsets,
    bishopOffsets,
    rookOffsets,
    kingOffsets // Queen
  ];


  /****************************\
   ============================
   
             ATTACKS

   ============================              
  \****************************/
  
  // square attacked
  function isSquareAttacked(square, color) {
    for (let pieceType = QUEEN; pieceType >= KING; pieceType--) {
      let piece = pieceType | (color << 3);
      
      // pawn attacks
      if (pieceType == PAWN) {
        let direction = 16 * (1 - 2 * color);
        for (let lr = -1; lr <= 1; lr += 2) {
          let targetSquare = square + direction + lr;
          if (!(targetSquare & 0x88) && board[targetSquare] == mapFromOptimized[piece]) return true;
        }
      }
      
      // piece attacks
      else {
        let slider = pieceType & 0x04;
        let directions = pieceOffsets[pieceType];
        for (let d = 0; d < directions.length; d++) {
          let targetSquare = square;
          do {
            targetSquare += directions[d];
            if (targetSquare & 0x88) break;
            let targetPiece = board[targetSquare];
            if (targetPiece != e) {
              if (targetPiece == mapFromOptimized[piece]) return true;
              break;
            }
          } while (slider);
        }
      }
    }

    return false;
  }


  /****************************\
   ============================
   
          MOVE ENCODING
 
   ============================              
  \****************************/
  
  // encode move
  function encodeMove(source, target, piece, capture, pawn, enpassant, castling) {
    return (source) |
           (target << 7) |
           (piece << 14) |
           (capture << 18) |
           (pawn << 19) |
           (enpassant << 20) |
           (castling << 21)
  }

  // decode move
  function getMoveSource(move) { return move & 0x7f }
  function getMoveTarget(move) { return (move >> 7) & 0x7f }
  function getMovePromoted(move) { return (move >> 14) & 0xf }
  function getMoveCapture(move) { return (move >> 18) & 0x1 }
  function getMovePawn(move) { return (move >> 19) & 0x1 }
  function getMoveEnpassant(move) { return (move >> 20) & 0x1 }
  function getMoveCastling(move) { return (move >> 21) & 0x1 }
  
  
  /****************************\
   ============================
   
          MOVE GENERATOR
 
   ============================              
  \****************************/
  
  // ranks
  const pawnStartingRank = [0x60, 0x10];
  const pawnPromotingRank = [0x00, 0x70];
  
  // castling side bits
  const castlingSide = [
    [1, 2],
    [4, 8]
  ];
  
  // castling rights
  const castlingRights = new Int32Array([
     7, 15, 15, 15,  3, 15, 15, 11,  o, o, o, o, o, o, o, o,
    15, 15, 15, 15, 15, 15, 15, 15,  o, o, o, o, o, o, o, o,
    15, 15, 15, 15, 15, 15, 15, 15,  o, o, o, o, o, o, o, o,
    15, 15, 15, 15, 15, 15, 15, 15,  o, o, o, o, o, o, o, o,
    15, 15, 15, 15, 15, 15, 15, 15,  o, o, o, o, o, o, o, o,
    15, 15, 15, 15, 15, 15, 15, 15,  o, o, o, o, o, o, o, o,
    15, 15, 15, 15, 15, 15, 15, 15,  o, o, o, o, o, o, o, o,
    13, 15, 15, 15, 12, 15, 15, 14,  o, o, o, o, o, o, o, o
  ]);

  // populate move list
  function addMove(moveList, move) {
    let moveScore = 0;
    
    if (getMoveCapture(move)) {
      moveScore = mvvLva[board[getMoveSource(move)] * 13 + board[getMoveTarget(move)]];
      moveScore += 10000;
    } else {
      if (killerMoves[searchPly] == move) moveScore = 9000;
      else if (killerMoves[maxPly + searchPly] == move) moveScore = 8000;
      else moveScore = historyMoves[board[getMoveSource(move)] * 128 + getMoveTarget(move)];
    }

    moveList.push({
      move: move,
      score: moveScore
    });
  }

  // generate moves
  function generateMoves(moveList) {
    for (let piece = P; piece <= k; piece++) {
      for (let pieceIndex = 0; pieceIndex < pieceList[piece]; pieceIndex++) {
        let sourceSquare = pieceList.pieces[piece * 10 + pieceIndex];
        let optimizedPiece = mapToOptimized[board[sourceSquare]];
        let pieceType = optimizedPiece & 0x07;
        
        if (mapColor[(optimizedPiece & 0x08)] == side) {
          // pawns
          if (pieceType == PAWN) {
            let direction = -16 * (1 - 2 * side);
            let targetSquare = sourceSquare + direction;
            
            // quiet moves
            if ((targetSquare & 0x88) == 0 && board[targetSquare] == e) {   
              if ((targetSquare & 0xF0) == pawnPromotingRank[side]) {
                for (let promotedPiece = QUEEN; promotedPiece >= KNIGHT; promotedPiece--)
                  addMove(moveList, encodeMove(sourceSquare, targetSquare, mapFromOptimized[promotedPiece | (side << 3)], 0, 0, 0, 0));
              } else {
                addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 0, 0, 0, 0));
                let doubleTarget = sourceSquare + direction * 2;
                
                if ((sourceSquare & 0xF0) == pawnStartingRank[side] && board[doubleTarget] == e)
                  addMove(moveList, encodeMove(sourceSquare, doubleTarget, 0, 0, 1, 0, 0));
              }
            }
            
            // captures
            for (let lr = -1; lr <= 1; lr += 2) {
              targetSquare = sourceSquare + direction + lr;
              if (targetSquare & 0x88) continue;
              let targetPiece = mapToOptimized[board[targetSquare]];
              
              if (targetPiece != e && mapColor[targetPiece & 0x08] != side) {
                if ((targetSquare & 0xF0) == pawnPromotingRank[side]) {
                  for (let promotedPiece = QUEEN; promotedPiece >= KNIGHT; promotedPiece--)
                    addMove(moveList, encodeMove(sourceSquare, targetSquare, mapFromOptimized[promotedPiece | (side << 3)], 1, 0, 0, 0));
                } else addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 1, 0, 0, 0));
              }
              
              if (targetSquare == enpassant)
                addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 1, 0, 1, 0));
            }
          }

          // castling
          else if (pieceType == KING) {
            let ks = kingSquare[side];
            
            // king side
            if (castle & castlingSide[side][0]) {
              if (board[ks + 1] == e && board[ks + 2] == e) {
                if (isSquareAttacked(ks, 1 - side) == 0 && isSquareAttacked(ks + 1, 1 - side) == 0)
                    addMove(moveList, encodeMove(ks, ks + 2, 0, 0, 0, 0, 1));
              }
            }
            
            // queen side
            if (castle & castlingSide[side][1]) {
              if (board[ks - 1] == e && board[ks - 2] == e && board[ks - 3] == e) {
                if (isSquareAttacked(ks, 1 - side) == 0 &&
                    isSquareAttacked(ks - 1, 1 - side) == 0)
                    addMove(moveList, encodeMove(ks, ks - 2, 0, 0, 0, 0, 1));
              }
            }
          }

          // pieces
          if (pieceType != PAWN) {
            let slider = pieceType & 0x04;
            let directions = pieceOffsets[pieceType];
            
            for (let d = 0; d < directions.length; d++) {
              let targetSquare = sourceSquare;
              
              do {
                targetSquare += directions[d];
                if (targetSquare & 0x88) break;
                let targetPiece = mapToOptimized[board[targetSquare]];
                if (targetPiece != e) {
                  if (mapColor[targetPiece & 0x08] != side)
                    addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 1, 0, 0, 0));
                  
                  break;
                }
                
                addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 0, 0, 0, 0));
              } while (slider);
            }
          }
        }
      }
    }
  }
  
  // generate captures
  function generateCaptures(moveList) {
    for (let piece = P; piece <= k; piece++) {
      for (let pieceIndex = 0; pieceIndex < pieceList[piece]; pieceIndex++) {
        let sourceSquare = pieceList.pieces[piece * 10 + pieceIndex];
        let optimizedPiece = mapToOptimized[board[sourceSquare]];
        let pieceType = optimizedPiece & 0x07;
        
        if (mapColor[(optimizedPiece & 0x08)] == side) {
          // pawns
          if (pieceType == PAWN) {
            let direction = -16 * (1 - 2 * side);
            let targetSquare = sourceSquare + direction;
            
            // captures
            for (let lr = -1; lr <= 1; lr += 2) {
              targetSquare = sourceSquare + direction + lr;
              if (targetSquare & 0x88) continue;
              let targetPiece = mapToOptimized[board[targetSquare]];
              
              if (targetPiece != e && mapColor[targetPiece & 0x08] != side) {
                if ((targetSquare & 0xF0) == pawnPromotingRank[side]) {
                  for (let promotedPiece = QUEEN; promotedPiece >= KNIGHT; promotedPiece--)
                    addMove(moveList, encodeMove(sourceSquare, targetSquare, mapFromOptimized[promotedPiece | (side << 3)], 1, 0, 0, 0));
                } else addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 1, 0, 0, 0));
              }
              
              if (targetSquare == enpassant)
                addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 1, 0, 1, 0));
            }
          }

          // pieces
          if (pieceType != PAWN) {
            let slider = pieceType & 0x04;
            let directions = pieceOffsets[pieceType];
            
            for (let d = 0; d < directions.length; d++) {
              let targetSquare = sourceSquare;
              
              do {
                targetSquare += directions[d];
                if (targetSquare & 0x88) break;
                let targetPiece = mapToOptimized[board[targetSquare]];
                if (targetPiece != e) {
                  if (mapColor[targetPiece & 0x08] != side)
                    addMove(moveList, encodeMove(sourceSquare, targetSquare, 0, 1, 0, 0, 0));
                  
                  break;
                }

              } while (slider);
            }
          }
        }
      }
    }
  }
  
  // generate only legal moves
  function generateLegalMoves() {
    let legalMoves = [];
    let moveList = [];
    
    clearSearch();
    generateMoves(moveList);

    for (let count = 0; count < moveList.length; count++) {
      if (makeMove(moveList[count].move) == 0) continue;
      legalMoves.push(moveList[count]);
      takeBack();
    }
    
    return legalMoves;
  }

  // move piece on board
  function moveCurrentPiece(piece, sourceSquare, targetSquare) {
    board[targetSquare] = board[sourceSquare];
    board[sourceSquare] = e;
    hashKey ^= pieceKeys[piece * 128 + sourceSquare];
    hashKey ^= pieceKeys[piece * 128 + targetSquare];
    
    for (let pieceIndex = 0; pieceIndex < pieceList[piece]; pieceIndex++) {
      if (pieceList.pieces[piece * 10 + pieceIndex] == sourceSquare) {
        pieceList.pieces[piece * 10 + pieceIndex] = targetSquare;
        break;
      }
    }
  }
  
  // remove piece from board
  function removePiece(piece, square) {
    for (let pieceIndex = 0; pieceIndex < pieceList[piece]; pieceIndex++) {
      if (pieceList.pieces[piece * 10 + pieceIndex] == square) {
        var capturedIndex = pieceIndex;
        break;
      }
    }
    
    pieceList[piece]--;
    pieceList.pieces[piece * 10 + capturedIndex] = pieceList.pieces[piece * 10 + pieceList[piece]];    
  }
  
  // add piece to board
  function addPiece(piece, square) {
    board[square] = piece;
    hashKey ^= pieceKeys[piece * 128 + square];
    pieceList.pieces[piece * 10 + pieceList[piece]] = square;    
    pieceList[piece]++;
  }

  // make move
  function makeMove(move) {
    // update plies
    searchPly++;
    gamePly++;
    
    // update repetition table
    repetitionTable[gamePly] = hashKey;
    
    // parse move
    let sourceSquare = getMoveSource(move);
    let targetSquare = getMoveTarget(move);
    let promotedPiece = getMovePromoted(move);
    let capturedPiece = board[targetSquare];
    
    // moveStack board state variables
    moveStack.push({
      move: move,
      capturedPiece: 0,
      side: side,
      enpassant: enpassant,
      castle: castle,
      fifty: fifty,
      hash: hashKey,
    });
    
    // move piece
    moveCurrentPiece(board[sourceSquare], sourceSquare, targetSquare);
    
    // update 50 move rule
    fifty++;

    // handle capture
    if (getMoveCapture(move)) {
      if (capturedPiece) {
        moveStack[moveStack.length - 1].capturedPiece = capturedPiece;
        hashKey ^= pieceKeys[capturedPiece * 128 + targetSquare];
        removePiece(capturedPiece, targetSquare); 
      }
      fifty = 0;
    } else if (board[targetSquare] == P || board[targetSquare] == p)
      fifty = 0;
    
    // update enpassant square
    if (enpassant != noEnpassant) hashKey ^= pieceKeys[enpassant];
    enpassant = noEnpassant;
    
    // handle special moves
    if (getMovePawn(move)) {
      if (side == white) {
        enpassant = targetSquare + 16;
        hashKey ^= pieceKeys[targetSquare + 16];
      } else {
        enpassant = targetSquare - 16;
        hashKey ^= pieceKeys[targetSquare - 16];
      }
    } else if (getMoveEnpassant(move)) {
      if (side == white) {
        board[targetSquare + 16] = e;
        hashKey ^= pieceKeys[p * 128 + targetSquare + 16];
        removePiece(p, targetSquare + 16);
      } else {
        board[targetSquare - 16] = e;
        hashKey ^= pieceKeys[(P * 128) + (targetSquare - 16)];
        removePiece(P, targetSquare - 16);
      }
    } else if (getMoveCastling(move)) {
      switch(targetSquare) {
        case g1: moveCurrentPiece(R, h1, f1); break;
        case c1: moveCurrentPiece(R, a1, d1); break;
        case g8: moveCurrentPiece(r, h8, f8); break;
        case c8: moveCurrentPiece(r, a8, d8); break;
      }
    }
    
    // handle promotions
    if (promotedPiece) {
      if (side == white) {
        hashKey ^= pieceKeys[P * 128 + targetSquare];
        removePiece(P, targetSquare);
      } else {
        hashKey ^= pieceKeys[p * 128 + targetSquare];
        removePiece(p, targetSquare);
      }

      addPiece(promotedPiece, targetSquare);      
    }
    
    // update king square
    if (board[targetSquare] == K || board[targetSquare] == k) kingSquare[side] = targetSquare;
    
    // update castling rights
    hashKey ^= castleKeys[castle];
    castle &= castlingRights[sourceSquare];
    castle &= castlingRights[targetSquare];
    hashKey ^= castleKeys[castle];
    
    // switch side to move
    side ^= 1;
    hashKey ^= sideKey;

    // return illegal move if king is left in check 
    if (isSquareAttacked(kingSquare[side ^ 1], side)) {
      takeBack();
      return 0;
    } else return 1;
  }
  
  // take move back
  function takeBack() {
    // update plies
    searchPly--;
    gamePly--;
    
    // parse move
    let moveIndex = moveStack.length - 1;
    let move = moveStack[moveIndex].move;    
    let sourceSquare = getMoveSource(move);
    let targetSquare = getMoveTarget(move);
    
    // move piece
    moveCurrentPiece(board[targetSquare], targetSquare, sourceSquare);
    
    // restore captured piece
    if (getMoveCapture(move)) {
      //board[targetSquare] = moveStack[moveIndex].capturedPiece;
      addPiece(moveStack[moveIndex].capturedPiece, targetSquare);
    }
    
    // handle special moves
    if (getMoveEnpassant(move)) {
      if (side == white) addPiece(P, targetSquare - 16);
      else addPiece(p, targetSquare + 16);
    } else if (getMoveCastling(move)) {
      switch(targetSquare) {
        case g1: moveCurrentPiece(R, f1, h1); break;
        case c1: moveCurrentPiece(R, d1, a1); break;
        case g8: moveCurrentPiece(r, f8, h8); break;
        case c8: moveCurrentPiece(r, d8, a8); break;
      }
    } else if (getMovePromoted(move)) {
      (side == white) ? addPiece(p, sourceSquare): addPiece(P, sourceSquare);
      removePiece(getMovePromoted(move), sourceSquare);
    }

    // update king square
    if (board[sourceSquare] == K || board[sourceSquare] == k) kingSquare[side ^ 1] = sourceSquare;
    
    // switch side to move
    side = moveStack[moveIndex].side;
    
    // restore board state variables
    enpassant = moveStack[moveIndex].enpassant;
    castle = moveStack[moveIndex].castle;
    hashKey = moveStack[moveIndex].hash;
    fifty = moveStack[moveIndex].fifty;

    moveStack.pop();
  }

  // make null move
  function makeNullMove() {
    // backup current board state
    moveStack.push({
      move: 0,
      capturedPiece: 0,
      side: side,
      enpassant: enpassant,
      castle: castle,
      fifty: fifty,
      hash: hashKey
    });
    
    if (enpassant != noEnpassant) hashKey ^= pieceKeys[enpassant];
    enpassant = noEnpassant;
    
    fifty = 0;
    side ^= 1;
    hashKey ^= sideKey;
  }
  
  // take null move
  function takeNullMove() {
    // restore board state
    side = moveStack[moveStack.length - 1].side;
    enpassant = moveStack[moveStack.length - 1].enpassant;
    castle = moveStack[moveStack.length - 1].castle;
    fifty = moveStack[moveStack.length - 1].fifty;
    hashKey = moveStack[moveStack.length - 1].hash;
    moveStack.pop();
  }


  /****************************\
   ============================
   
              PERFT

   ============================              
  \****************************/

  // visited nodes count
  var nodes = 0;
  
  // perft driver
  function perftDriver(depth) {
    if  (depth == 0) { nodes++; return; }
    
    let moveList = [];
    generateMoves(moveList);
    
    for (var count = 0; count < moveList.length; count++) {      
      if (!makeMove(moveList[count].move)) continue;
      perftDriver(depth - 1);
      takeBack();
    }
  }

  // perft test
  function perftTest(depth) {
    nodes = 0;
    console.log('   Performance test:\n');
    var resultString = '';
    let startTime = Date.now();
    
    let moveList = [];
    generateMoves(moveList);
    
    for (var count = 0; count < moveList.length; count++) {      
      if (!makeMove(moveList[count].move)) continue;
      let cumNodes = nodes;
      perftDriver(depth - 1);
      takeBack();
      let oldNodes = nodes - cumNodes;
      console.log(  '   move' +
                    ' ' + (count + 1) + ((count < 9) ? ':  ': ': ') +
                    coordinates[getMoveSource(moveList[count].move)] +
                    coordinates[getMoveTarget(moveList[count].move)] +
                    (getMovePromoted(moveList[count].move) ?
                    promotedPieces[getMovePromoted(moveList[count].move)]: ' ') +
                    '    nodes: ' + oldNodes);
    }
    
    resultString += '\n   Depth: ' + depth;
    resultString += '\n   Nodes: ' + nodes;
    resultString += '\n    Time: ' + (Date.now() - startTime) + ' ms\n';
    console.log(resultString);
  }


  /****************************\
   ============================
   
            EVALUATION

   ============================              
  \****************************/
  
  /*
       UPDATED: PeSTO Evaluation Tables
       Replaces original values with tuned values for stronger play.
  */
  
  const opening = 0, endgame = 1, middlegame = 2;
  const PAWN_PST = 0, KNIGHT_PST = 1, BISHOP_PST = 2, ROOK_PST = 3, QUEEN_PST = 4, KING_PST = 5;
  const openingPhaseScore = 6200; // Increased from 5900 to account for higher PeSTO material sums
  
  // INCREASED: Triggers endgame logic sooner (e.g., when Rooks + Minors are left)
  const endgamePhaseScore = 1500; 

  // PeSTO Material Scores (MG, EG)
  const materialWeights = [
    // Opening (Middlegame) Material
    // P=82, N=337, B=365, R=477, Q=1025, K=0 (King safety handled by PST)
    [0, 82, 337, 365, 477, 1025, 20000, -82, -337, -365, -477, -1025, -20000],

    // Endgame Material
    // P=94, N=281, B=297, R=512, Q=936, K=0
    [0, 94, 281, 297, 512, 936, 20000, -94, -281, -297, -512, -936, -20000]
  ];
  
  // Bonus for passed pawns indexed by Rank (0-7)
  const passedPawnBonuses = [
      // Opening (0-7)
      [0, 5, 10, 20, 35, 60, 100, 0], 
      // Endgame (0-7) - INCREASED AGGRESSION
      [0, 10, 30, 60, 100, 180, 260, 0] 
  ];

  // PeSTO Piece-Square Tables (Formatted for 0x88 Board: Rank 8 down to Rank 1)
  const pst = [
    // Opening / Middlegame Phase
    [
      // Pawn (MG)
      [
          0,   0,   0,   0,   0,   0,   0,   0,   o, o, o, o, o, o, o, o,
         98, 134,  61,  95,  68, 126,  34, -11,   o, o, o, o, o, o, o, o,
         -6,   7,  26,  31,  65,  56,  25, -20,   o, o, o, o, o, o, o, o,
        -14,  13,   6,  21,  23,  12,  17, -23,   o, o, o, o, o, o, o, o,
        -27,  -2,  -5,  12,  17,   6,  10, -25,   o, o, o, o, o, o, o, o,
        -26,  -4,  -4, -10,   3,   3,  33, -12,   o, o, o, o, o, o, o, o,
        -35,  -1, -20, -23, -15,  24,  38, -22,   o, o, o, o, o, o, o, o,
          0,   0,   0,   0,   0,   0,   0,   0,   o, o, o, o, o, o, o, o
      ],
      // Knight (MG)
      [
        -167, -89, -34, -49,  61, -97, -15, -107,   o, o, o, o, o, o, o, o,
         -73, -41,  72,  36,  23,  62,   7,  -17,   o, o, o, o, o, o, o, o,
         -47,  60,  37,  65,  84, 129,  73,   44,   o, o, o, o, o, o, o, o,
          -9,  17,  19,  53,  37,  69,  18,   22,   o, o, o, o, o, o, o, o,
         -13,   4,  16,  13,  28,  19,  21,   -8,   o, o, o, o, o, o, o, o,
         -23,  -9,  12,  10,  19,  17,  25,  -16,   o, o, o, o, o, o, o, o,
         -29, -53, -12,  -3,  -1,  18, -14,  -19,   o, o, o, o, o, o, o, o,
        -105, -21, -58, -33, -17, -28, -19,  -23,   o, o, o, o, o, o, o, o
      ],
      // Bishop (MG)
      [
         -29,   4, -82, -37, -25, -42,   7,  -8,    o, o, o, o, o, o, o, o,
         -26,  16, -18, -13,  30,  59,  18, -47,    o, o, o, o, o, o, o, o,
         -16,  37,  43,  40,  35,  50,  37,  -2,    o, o, o, o, o, o, o, o,
          -4,   5,  19,  50,  37,  37,   7,  -2,    o, o, o, o, o, o, o, o,
          -6,  13,  13,  26,  34,  12,  10,   4,    o, o, o, o, o, o, o, o,
           0,  15,  15,  15,  14,  27,  18,  10,    o, o, o, o, o, o, o, o,
           4,  15,  16,   0,   7,  21,  33,   1,    o, o, o, o, o, o, o, o,
         -33,  -3, -14, -21, -13, -12, -39, -21,    o, o, o, o, o, o, o, o
      ],
      // Rook (MG)
      [
          32,  42,  32,  51,  63,   9,  31,  43,    o, o, o, o, o, o, o, o,
          27,  32,  58,  62,  80,  67,  26,  44,    o, o, o, o, o, o, o, o,
          -5,  19,  26,  36,  17,  45,  61,  16,    o, o, o, o, o, o, o, o,
         -24, -11,   7,  26,  24,  35,  -8, -20,    o, o, o, o, o, o, o, o,
         -36, -26, -12,  -1,   9,  -7,   6, -23,    o, o, o, o, o, o, o, o,
         -45, -25, -16, -17,   3,   0,  -5, -33,    o, o, o, o, o, o, o, o,
         -44, -16, -20,  -9,  -1,  11,  -6, -71,    o, o, o, o, o, o, o, o,
         -19, -13,   1,  17,  16,   7, -37, -26,    o, o, o, o, o, o, o, o
      ],
      // Queen (MG)
      [
         -28,   0,  29,  12,  59,  44,  43,  45,    o, o, o, o, o, o, o, o,
         -24, -39,  -5,   1, -16,  57,  28,  54,    o, o, o, o, o, o, o, o,
         -13, -17,   7,   8,  29,  56,  47,  57,    o, o, o, o, o, o, o, o,
         -27, -27, -16, -16,  -1,  17,  -2,   1,    o, o, o, o, o, o, o, o,
          -9, -26, -9, -10,  -2,  -4,   3,  -3,     o, o, o, o, o, o, o, o,
         -14,   2, -11,  -2,  -5,   2,  14,   5,    o, o, o, o, o, o, o, o,
         -35,  -8,  11,   2,   8,  15,  -3,   1,    o, o, o, o, o, o, o, o,
          -1, -18,  -9,  10, -15, -25, -31, -50,    o, o, o, o, o, o, o, o
      ],
      // King (MG)
      [
         -65,  23,  16, -15, -56, -34,   2,  13,    o, o, o, o, o, o, o, o,
          29,  -1, -20,  -7,  -8,  -4, -38, -29,    o, o, o, o, o, o, o, o,
          -9,  24,   2, -16, -20,   6,  22, -22,    o, o, o, o, o, o, o, o,
         -17, -20, -12, -27, -30, -25, -14, -36,    o, o, o, o, o, o, o, o,
         -49,  -1, -27, -39, -46, -44, -33, -51,    o, o, o, o, o, o, o, o,
         -14, -14, -22, -46, -44, -30, -15, -27,    o, o, o, o, o, o, o, o,
           1,   7,  -8, -64, -43, -16,   9,   8,    o, o, o, o, o, o, o, o,
         -15,  36,  12, -54,   8, -28,  24,  14,    o, o, o, o, o, o, o, o
      ]
    ],

    // Endgame Phase
    [
      // Pawn (EG)
      [
          0,   0,   0,   0,   0,   0,   0,   0,     o, o, o, o, o, o, o, o,
        178, 173, 158, 134, 147, 132, 165, 187,     o, o, o, o, o, o, o, o,
         94, 100,  85,  67,  56,  53,  82,  84,     o, o, o, o, o, o, o, o,
         32,  24,  13,   5,  -2,   4,  17,  17,     o, o, o, o, o, o, o, o,
         13,   9,  -3,  -7,  -7,  -8,   3,  -1,     o, o, o, o, o, o, o, o,
          4,   7,  -6,   1,   0,  -5,  -1,  -8,     o, o, o, o, o, o, o, o,
         13,   8,   8,  10,  13,   0,   2,  -7,     o, o, o, o, o, o, o, o,
          0,   0,   0,   0,   0,   0,   0,   0,     o, o, o, o, o, o, o, o
      ],
      // Knight (EG)
      [
        -58, -38, -13, -28, -31, -27, -63, -99,     o, o, o, o, o, o, o, o,
        -25,  -8, -25,  -2,  -9, -25, -24, -52,     o, o, o, o, o, o, o, o,
        -24, -20,  10,   9,  -1,  -9, -19, -41,     o, o, o, o, o, o, o, o,
        -17,   3,  22,  22,  22,  11,   8, -18,     o, o, o, o, o, o, o, o,
        -18,  -6,  16,  25,  16,  17,   4, -18,     o, o, o, o, o, o, o, o,
        -23,  -3,  -1,  15,  10,  -3, -20, -22,     o, o, o, o, o, o, o, o,
        -42, -20, -10,  -5,  -2, -20, -23, -44,     o, o, o, o, o, o, o, o,
        -29, -51, -23, -15, -22, -18, -50, -64,     o, o, o, o, o, o, o, o
      ],
      // Bishop (EG)
      [
        -14, -21, -11,  -8,  -7,  -9, -17, -24,     o, o, o, o, o, o, o, o,
         -8,  -4,   7, -12, -3,  -13,  -4, -14,     o, o, o, o, o, o, o, o,
         -4,  -8,   8,  20,  37,  -4,  -6,  -8,     o, o, o, o, o, o, o, o,
         -3,  12,   4,  22,  28,   5,  11, -14,     o, o, o, o, o, o, o, o,
        -10,  -3,   3,  28,  33,   2, -11, -19,     o, o, o, o, o, o, o, o,
        -23,  -9, -12,  -6,  -9, -23, -14, -23,     o, o, o, o, o, o, o, o,
        -30,  -9, -20,  -6,  -9, -19, -10, -26,     o, o, o, o, o, o, o, o,
        -48, -18,  -6,  -2, -15, -15,  -3, -13,     o, o, o, o, o, o, o, o
      ],
      // Rook (EG)
      [
         13,  10,  18,  15,  12,  12,   8,   5,     o, o, o, o, o, o, o, o,
         11,  13,  13,  11, -12,  11,  11,  18,     o, o, o, o, o, o, o, o,
         -7,  -2,  -6,  16,  -5,  34,  -6,   6,     o, o, o, o, o, o, o, o,
         -6,   4,  22,  36,  40,   9,  14,   3,     o, o, o, o, o, o, o, o,
        -15,  -3,  13,  34,  36,   5,   4,  -1,     o, o, o, o, o, o, o, o,
         -9,   4,  10,  30,  17,   6,   0, -22,     o, o, o, o, o, o, o, o,
         -6,  -7,   5,   1, -18, -11, -15, -20,     o, o, o, o, o, o, o, o,
         -9,   0,  -1,  -3,   5,  -6, -15, -26,     o, o, o, o, o, o, o, o
      ],
      // Queen (EG)
      [
        -33, -28, -22, -43,  -5, -32, -20, -41,     o, o, o, o, o, o, o, o,
        -22, -23, -30, -16,  -8,   9,   3, -16,     o, o, o, o, o, o, o, o,
        -16,   2,   3, -12,  41,  18,  13, -17,     o, o, o, o, o, o, o, o,
        -12,   4,  17,  28,  27,  16,  13, -12,     o, o, o, o, o, o, o, o,
         -4,  -6,   7,  26,  25,  14,  -5, -12,     o, o, o, o, o, o, o, o,
         -6,   9,  24,  14,  -3,  20,   3, -15,     o, o, o, o, o, o, o, o,
         -2,   1,  13,  -1,   7,  11,  10, -12,     o, o, o, o, o, o, o, o,
         -7,  -5, -12,   2,  -3, -13, -19, -29,     o, o, o, o, o, o, o, o
      ],
      // King (EG)
      [
        -74, -35, -18, -18, -11,  15,   4, -17,     o, o, o, o, o, o, o, o,
        -12,  17,  14,  17,  17,  38,  23,  11,     o, o, o, o, o, o, o, o,
         10,  17,  23,  15,  20,  45,  44,  13,     o, o, o, o, o, o, o, o,
         -8,  22,  24,  27,  26,  33,  26,   3,     o, o, o, o, o, o, o, o,
        -18,  -4,  21,  24,  27,  23,   9, -11,     o, o, o, o, o, o, o, o,
        -19,  -3,  11,  21,  23,  16,   7,  -9,     o, o, o, o, o, o, o, o,
        -27, -11,   4,  13,  14,   4,  -5, -17,     o, o, o, o, o, o, o, o,
        -53, -34, -21, -11, -28, -14, -24, -43,     o, o, o, o, o, o, o, o
      ]
    ]
  ];

  // mirror positional score tables for opposite side
  const mirrorSquare = [
    a1, b1, c1, d1, e1, f1, g1, h1,   o, o, o, o, o, o, o, o,
    a2, b2, c2, d2, e2, f2, g2, h2,   o, o, o, o, o, o, o, o,
    a3, b3, c3, d3, e3, f3, g3, h3,   o, o, o, o, o, o, o, o,
    a4, b4, c4, d4, e4, f4, g4, h4,   o, o, o, o, o, o, o, o,
    a5, b5, c5, d5, e5, f5, g5, h5,   o, o, o, o, o, o, o, o,
    a6, b6, c6, d6, e6, f6, g6, h6,   o, o, o, o, o, o, o, o,
    a7, b7, c7, d7, e7, f7, g7, h7,   o, o, o, o, o, o, o, o,
    a8, b8, c8, d8, e8, f8, g8, h8,   o, o, o, o, o, o, o, o
  ];
  
  // insufficient material detection
  function isMaterialDraw() {
    if(pieceList[P] == 0 && pieceList[p] == 0) {
      if (pieceList[R] == 0 && pieceList[r] == 0 && pieceList[Q] == 0 && pieceList[q] == 0) {
        if (pieceList[B] == 0 && pieceList[b] == 0) {
          if (pieceList[N] < 3 && pieceList[n] < 3)
            return 1;
      } else if (pieceList[N] == 0 && pieceList[n] == 0) {
        if (Math.abs(pieceList[B] - pieceList[b]) < 2)
          return 1;
      } else if ((pieceList[N] < 3 && pieceList[B] == 0) || (pieceList[B] == 1 && pieceList[N] == 0)) {
        if ((pieceList[n] < 3 && pieceList[b] == 0) || (pieceList[b] == 1 && pieceList[n] == 0))
          return 1;
        }
      } else if (pieceList[Q] == 0 && pieceList[q] == 0) {
        if (pieceList[R] == 1 && pieceList[r] == 1) {
          if ((pieceList[N] + pieceList[B]) < 2 && (pieceList[n] + pieceList[b]) < 2) return 1;
        } else if (pieceList[R] == 1 && pieceList[r] == 0) {        
          if ((pieceList[N] + pieceList[B] == 0) &&
            (((pieceList[n] + pieceList[b]) == 1) || 
             ((pieceList[n] + pieceList[b]) == 2)))
            return 1;
        } else if (pieceList[r] == 1 && pieceList[R] == 0) {
          if ((pieceList[n] + pieceList[b] == 0) &&
            (((pieceList[N] + pieceList[B]) == 1) ||
             ((pieceList[N] + pieceList[B]) == 2)))
            return 1;
        }
      }
    }
    
    return 0;
  }
  
  // get game phase score
  function getGamePhaseScore() {
    let gamePhaseScore = 0;

    for (let piece = N; piece <= Q; piece++) gamePhaseScore += pieceList[piece] * materialWeights[opening][piece];
    for (let piece = n; piece <= q; piece++) gamePhaseScore += pieceList[piece] * -materialWeights[opening][piece];

    return gamePhaseScore;
  }
  
  // Check if a pawn at 'square' of 'color' is a passed pawn
  function isPassedPawn(square, color) {
    let opponentPawn = (color === white) ? p : P;
    
    // Get the file (0-7) and rank (0-7) of our pawn
    // Note: 0x88 math -> square & 15 is file, square >> 4 is rank
    let myFile = square & 7; 
    let myRank = square >> 4;

    // Iterate over all opponent pawns
    for (let i = 0; i < pieceList[opponentPawn]; i++) {
      let oppSquare = pieceList.pieces[opponentPawn * 10 + i];
      let oppFile = oppSquare & 7;
      let oppRank = oppSquare >> 4;

      // Check if opponent pawn is on the same, left, or right file
      if (oppFile >= myFile - 1 && oppFile <= myFile + 1) {
        
        // Check if opponent pawn is "ahead" of our pawn
        if (color === white) {
          if (oppRank > myRank) return false; // Blocked or controlled by black
        } else {
          if (oppRank < myRank) return false; // Blocked or controlled by white
        }
      }
    }
    
    return true;
  }

  // Calculate piece mobility (New Feature)
  function getMobility(piece, square, color) {
    let mobility = 0;
    let optimized = mapToOptimized[piece];
    let pieceType = optimized & 0x07;
    let isSlider = optimized & 0x04; // Bishop(4), Rook(5), Queen(6) are sliders
    let directions = pieceOffsets[pieceType];

    for (let d = 0; d < directions.length; d++) {
      let target = square;
      
      while (true) {
        target += directions[d];
        
        // Stop if offboard
        if (target & 0x88) break;
        
        let targetPiece = board[target];
        
        // If empty, increment and continue (if slider)
        if (targetPiece == e) {
          mobility++;
          if (!isSlider) break;
        } 
        // If occupied
        else {
          // If enemy, count it (we can capture) then stop
          if (mapColor[mapToOptimized[targetPiece] & 0x08] != color) {
            mobility++;
          }
          // Blocked by friend or enemy, stop sliding
          break;
        }
      }
    }
    
    return mobility * mobilityWeight[pieceType];
  }

  // Calculate King Safety (Pawn Shield)
  function getKingSafety(kingSq, side) {
    let penalty = 0;
    
    // Direction "up" relative to the board array structure
    // White starts at rank 8 (index 112..127). "Forward" is -16.
    // Black starts at rank 1 (index 0..15). "Forward" is +16.
    let up = (side == white) ? -16 : 16;
    
    // Pawn Shield (Check squares directly in front: Left-Front, Front, Right-Front)
    let shieldSquares = [kingSq + up - 1, kingSq + up, kingSq + up + 1];
    let myPawn = (side == white) ? P : p;
    
    for (let i = 0; i < shieldSquares.length; i++) {
        let sq = shieldSquares[i];
        if (!(sq & 0x88)) {
            // If my pawn is not there, apply penalty
            if (board[sq] != myPawn) penalty += shieldPenalty;
        }
    }
    return penalty;
  }

  // Manhattan Distance (File distance + Rank distance)
  // Used for King Tropism calculations
  function getManhattanDistance(sq1, sq2) {
    let file1 = sq1 & 7, rank1 = sq1 >> 4;
    let file2 = sq2 & 7, rank2 = sq2 >> 4;
    return Math.abs(rank2 - rank1) + Math.abs(file2 - file1);
  }

  // Check if two Rooks are connected (on same rank/file with clear path)
  function areRooksConnected(sq1, sq2) {
    // Check Rank or File alignment
    if ((sq1 >> 4) === (sq2 >> 4) || (sq1 & 7) === (sq2 & 7)) {
      // Simple raycast to check obstruction
      let diff = sq2 - sq1;
      let step = 0;

      // Determine step direction
      if (Math.abs(diff) < 8) step = (diff > 0) ? 1 : -1; // Same Rank
      else step = (diff > 0) ? 16 : -16;                  // Same File

      let curr = sq1 + step;
      while (curr !== sq2) {
        if (board[curr] !== e) return false; // Obstructed
        curr += step;
      }
      return true;
    }
    return false;
  }

  // --- Mop-up Evaluation Helper ---
  // Encourages the engine to push enemy king to the edge in won endgames
  function evaluateMopUp(winningSide) {
    let score = 0;
    let winningKing = kingSquare[winningSide];
    let losingKing = kingSquare[winningSide ^ 1];
    
    // 1. Force enemy King to the edge (Centralization is bad for losing king)
    // Calculate Manhattan distance from center (approximate)
    let losingKingRank = losingKing >> 4;
    let losingKingFile = losingKing & 7;
    
    // Distance from center (3.5, 3.5) doubled to avoid floats: |2 * rank - 7|
    let centerDistRank = Math.abs(2 * losingKingRank - 7);
    let centerDistFile = Math.abs(2 * losingKingFile - 7);
    let distFromCenter = centerDistRank + centerDistFile;
    
    score += distFromCenter * 10; // Bonus for pushing king away
  
    // 2. Minimize distance between Kings (Close in for the kill)
    let distBetweenKings = getManhattanDistance(winningKing, losingKing);
    score += (14 - distBetweenKings) * 10; // Bonus for getting closer
    
    return score;
  }

  // --- NEW: Rule of the Square Helper ---
  // Returns true if the enemy king cannot catch the passed pawn
  function isUnstoppable(pawnSquare, pawnColor, enemyKingSquare) {
    let pawnRank = pawnSquare >> 4;
    let pawnFile = pawnSquare & 7;
    let kingRank = enemyKingSquare >> 4;
    let kingFile = enemyKingSquare & 7;

    let distToPromo, kingDistToPromo;

    if (pawnColor == white) {
      distToPromo = pawnRank; // Ranks are 0 (top) to 7 (bottom). White promotes at 0.
      // If it's White's turn to move (calculated in negamax generally, but static here), 
      // we can be slightly optimistic. 
      // Chebyshev distance for King (max of rank/file diff)
      kingDistToPromo = Math.max(Math.abs(kingRank - 0), Math.abs(kingFile - pawnFile));
    } else {
      distToPromo = 7 - pawnRank; // Black promotes at 7.
      kingDistToPromo = Math.max(Math.abs(kingRank - 7), Math.abs(kingFile - pawnFile));
    }

    // If pawn is closer to promotion than king is to the promotion square
    // We give a generous buffer (-1) to assume the King steps into the square.
    return (distToPromo < kingDistToPromo - 1);
  }
  
  // static evaluation
  function evaluate() {
    if (isMaterialDraw()) return 0;

    let gamePhaseScore = getGamePhaseScore();
    let gamePhase = -1;

    if (gamePhaseScore > openingPhaseScore) gamePhase = opening;
    else if (gamePhaseScore < endgamePhaseScore) gamePhase = endgame;
    else gamePhase = middlegame;

    let score = 0;
    let scoreOpening = 0;
    let scoreEndgame = 0;

    // --- PAWN STRUCTURE PRE-CALCULATION ---
    let whitePawnsOnFile = [0, 0, 0, 0, 0, 0, 0, 0];
    let blackPawnsOnFile = [0, 0, 0, 0, 0, 0, 0, 0];

    // Store Rook Squares for "Connected Rooks" check
    let whiteRooks = [];
    let blackRooks = [];

    // Identify King Squares
    let whiteKingSq = kingSquare[white];
    let blackKingSq = kingSquare[black];

    // Populate pawn counts (Needed for Structure Logic)
    for (let i = 0; i < pieceList[P]; i++) whitePawnsOnFile[pieceList.pieces[P * 10 + i] & 7]++;
    for (let i = 0; i < pieceList[p]; i++) blackPawnsOnFile[pieceList.pieces[p * 10 + i] & 7]++;

    // --- MAIN PIECE LOOP ---
    for (let piece = P; piece <= k; piece++) {
      for (let pieceIndex = 0; pieceIndex < pieceList[piece]; pieceIndex++) {
        let square = pieceList.pieces[piece * 10 + pieceIndex];
        let rank = square >> 4;
        let file = square & 7;

        // Material
        scoreOpening += materialWeights[opening][piece];
        scoreEndgame += materialWeights[endgame][piece];

        // King Tropism (non-king, non-pawn pieces)
        let optimized = mapToOptimized[piece];
        let pieceType = optimized & 0x07; // 1=K, 2=P, 3=N, 4=B, 5=R, 6=Q
        let pieceColor = mapColor[optimized & 0x08];
        if (pieceType >= 3 && pieceType <= 6) {
          let targetKingSq = (pieceColor == white) ? blackKingSq : whiteKingSq;
          let dist = getManhattanDistance(square, targetKingSq);
          let tropism = (14 - dist) * tropismWeights[pieceType];
          if (pieceColor == white) {
            scoreOpening += tropism;
            scoreEndgame += tropism;
          } else {
            scoreOpening -= tropism;
            scoreEndgame -= tropism;
          }
        }

        // Positional Score + Features
        switch (piece) {
          // ----------------------------------------------------
          // WHITE PIECES
          // ----------------------------------------------------
          case P:
            scoreOpening += pst[opening][PAWN_PST][square];
            scoreEndgame += pst[endgame][PAWN_PST][square];

            // Passed Pawn
            if (isPassedPawn(square, white)) {
              scoreOpening += passedPawnBonuses[opening][rank];
              scoreEndgame += passedPawnBonuses[endgame][rank];

              // NEW: Unstoppable Bonus
              if (isUnstoppable(square, white, blackKingSq)) {
                  scoreEndgame += 800; // Massive bonus forces engine to pursue this path
              }
            }

            // Isolated
            if ((file === 0 || whitePawnsOnFile[file - 1] === 0) &&
                (file === 7 || whitePawnsOnFile[file + 1] === 0)) {
              scoreOpening -= isolatedPawnPenalty;
              scoreEndgame -= isolatedPawnPenalty;
            }

            // Doubled
            if (whitePawnsOnFile[file] > 1) {
              scoreOpening -= doubledPawnPenalty;
              scoreEndgame -= doubledPawnPenalty;
            }

            // Backward (Refined)
            // A pawn is backward if adjacent friendly pawns exist, but are all "ahead" and can't support it.
            // We treat a pawn as supported if there is a friendly pawn on an adjacent file on the same rank
            // or behind it (i.e., at a higher/equal rank index for White in 0x88).
            if (blackPawnsOnFile[file] > 0) {
              let neighborExists =
                (file > 0 && whitePawnsOnFile[file - 1] > 0) ||
                (file < 7 && whitePawnsOnFile[file + 1] > 0);

              if (neighborExists) {
                let supported = false;

                // Left neighbor support (same rank or behind)
                if (file > 0) {
                  for (let r = rank; r < 8; r++) {
                    if (board[(r * 16) + file - 1] === P) { supported = true; break; }
                  }
                }

                // Right neighbor support
                if (!supported && file < 7) {
                  for (let r = rank; r < 8; r++) {
                    if (board[(r * 16) + file + 1] === P) { supported = true; break; }
                  }
                }

                if (!supported) {
                  scoreOpening -= backwardPawnPenalty;
                  scoreEndgame -= backwardPawnPenalty;
                }
              }
            }
            break;

          case N:
            scoreOpening += pst[opening][KNIGHT_PST][square];
            scoreEndgame += pst[endgame][KNIGHT_PST][square];

            // Knight Outpost (White) - ranks 2..4 (6th..4th)
            if (rank >= 2 && rank <= 4) {
              if ((!((square + 15) & 0x88) && board[square + 15] === P) ||
                  (!((square + 17) & 0x88) && board[square + 17] === P)) {
                scoreOpening += knightOutpostBonus;
                scoreEndgame += knightOutpostBonus;
              }
            }

            // Mobility
            scoreOpening += getMobility(N, square, white);
            scoreEndgame += getMobility(N, square, white);
            break;

          case B:
            scoreOpening += pst[opening][BISHOP_PST][square];
            scoreEndgame += pst[endgame][BISHOP_PST][square];
            scoreOpening += getMobility(B, square, white);
            scoreEndgame += getMobility(B, square, white);
            break;

          case R:
            scoreOpening += pst[opening][ROOK_PST][square];
            scoreEndgame += pst[endgame][ROOK_PST][square];

            whiteRooks.push(square);

            // Rook on 7th Rank (White)
            if (rank === 1) {
              scoreOpening += rook7thBonus;
              scoreEndgame += rook7thBonus;
            }

            // Tarrasch Rule (Rooks behind passed pawns)
            if (whitePawnsOnFile[file] > 0) {
                for (let r = 0; r < 8; r++) {
                   let sq = r * 16 + file;
                   if (board[sq] == P && isPassedPawn(sq, white)) {
                       // White pawns move up (rank index decreases). 
                       // If Rook rank > Pawn rank, Rook is "physically" behind (at the bottom).
                       if (rank > r) {
                           scoreOpening += 20; 
                           scoreEndgame += 40; 
                       }
                   }
                }
            }

            // Open/Semi-open Files
            if (whitePawnsOnFile[file] === 0) {
              if (blackPawnsOnFile[file] === 0) {
                scoreOpening += rookOpenBonus;
                scoreEndgame += rookOpenBonus;
              } else {
                scoreOpening += rookSemiOpenBonus;
                scoreEndgame += rookSemiOpenBonus;
              }
            }

            scoreOpening += getMobility(R, square, white);
            scoreEndgame += getMobility(R, square, white);
            break;

          case Q:
            scoreOpening += pst[opening][QUEEN_PST][square];
            scoreEndgame += pst[endgame][QUEEN_PST][square];
            scoreOpening += getMobility(Q, square, white);
            scoreEndgame += getMobility(Q, square, white);
            break;

          case K:
            scoreOpening += pst[opening][KING_PST][square];
            scoreEndgame += pst[endgame][KING_PST][square];
            scoreOpening -= getKingSafety(square, white);
            break;

          // ----------------------------------------------------
          // BLACK PIECES
          // ----------------------------------------------------
          case p:
            scoreOpening -= pst[opening][PAWN_PST][mirrorSquare[square]];
            scoreEndgame -= pst[endgame][PAWN_PST][mirrorSquare[square]];

            if (isPassedPawn(square, black)) {
              let relRank = 7 - rank;
              scoreOpening -= passedPawnBonuses[opening][relRank];
              scoreEndgame -= passedPawnBonuses[endgame][relRank];
              
              // NEW: Unstoppable Bonus
              if (isUnstoppable(square, black, whiteKingSq)) {
                  scoreEndgame -= 800; 
              }
            }

            // Isolated
            if ((file === 0 || blackPawnsOnFile[file - 1] === 0) &&
                (file === 7 || blackPawnsOnFile[file + 1] === 0)) {
              scoreOpening += isolatedPawnPenalty;
              scoreEndgame += isolatedPawnPenalty;
            }

            // Doubled
            if (blackPawnsOnFile[file] > 1) {
              scoreOpening += doubledPawnPenalty;
              scoreEndgame += doubledPawnPenalty;
            }

            // Backward (Refined)
            // Mirror logic for Black: supported if adjacent pawn exists on same rank or behind
            // (lower/equal rank index for Black in 0x88).
            if (whitePawnsOnFile[file] > 0) {
              let neighborExists =
                (file > 0 && blackPawnsOnFile[file - 1] > 0) ||
                (file < 7 && blackPawnsOnFile[file + 1] > 0);

              if (neighborExists) {
                let supported = false;

                // Left neighbor support (same rank or behind)
                if (file > 0) {
                  for (let r = rank; r >= 0; r--) {
                    if (board[(r * 16) + file - 1] === p) { supported = true; break; }
                  }
                }

                // Right neighbor support
                if (!supported && file < 7) {
                  for (let r = rank; r >= 0; r--) {
                    if (board[(r * 16) + file + 1] === p) { supported = true; break; }
                  }
                }

                if (!supported) {
                  scoreOpening += backwardPawnPenalty;
                  scoreEndgame += backwardPawnPenalty;
                }
              }
            }
            break;

          case n:
            scoreOpening -= pst[opening][KNIGHT_PST][mirrorSquare[square]];
            scoreEndgame -= pst[endgame][KNIGHT_PST][mirrorSquare[square]];

            // Knight Outpost (Black) - ranks 3..5
            if (rank >= 3 && rank <= 5) {
              if ((!((square - 15) & 0x88) && board[square - 15] === p) ||
                  (!((square - 17) & 0x88) && board[square - 17] === p)) {
                scoreOpening -= knightOutpostBonus;
                scoreEndgame -= knightOutpostBonus;
              }
            }

            scoreOpening -= getMobility(n, square, black);
            scoreEndgame -= getMobility(n, square, black);
            break;

          case b:
            scoreOpening -= pst[opening][BISHOP_PST][mirrorSquare[square]];
            scoreEndgame -= pst[endgame][BISHOP_PST][mirrorSquare[square]];
            scoreOpening -= getMobility(b, square, black);
            scoreEndgame -= getMobility(b, square, black);
            break;

          case r:
            scoreOpening -= pst[opening][ROOK_PST][mirrorSquare[square]];
            scoreEndgame -= pst[endgame][ROOK_PST][mirrorSquare[square]];

            blackRooks.push(square);

            // Rook on 7th Rank (Black)
            if (rank === 6) {
              scoreOpening -= rook7thBonus;
              scoreEndgame -= rook7thBonus;
            }

            // Tarrasch Rule (Rooks behind passed pawns)
            if (blackPawnsOnFile[file] > 0) {
                for (let r = 0; r < 8; r++) {
                   let sq = r * 16 + file;
                   if (board[sq] == p && isPassedPawn(sq, black)) {
                       // Black pawns move down (rank index increases).
                       // If Rook rank < Pawn rank, Rook is behind (at the top).
                       if (rank < r) {
                           scoreOpening -= 20; 
                           scoreEndgame -= 40; 
                       }
                   }
                }
            }

            // Open/Semi-open Files
            if (blackPawnsOnFile[file] === 0) {
              if (whitePawnsOnFile[file] === 0) {
                scoreOpening -= rookOpenBonus;
                scoreEndgame -= rookOpenBonus;
              } else {
                scoreOpening -= rookSemiOpenBonus;
                scoreEndgame -= rookSemiOpenBonus;
              }
            }

            scoreOpening -= getMobility(r, square, black);
            scoreEndgame -= getMobility(r, square, black);
            break;

          case q:
            scoreOpening -= pst[opening][QUEEN_PST][mirrorSquare[square]];
            scoreEndgame -= pst[endgame][QUEEN_PST][mirrorSquare[square]];
            scoreOpening -= getMobility(q, square, black);
            scoreEndgame -= getMobility(q, square, black);
            break;

          case k:
            scoreOpening -= pst[opening][KING_PST][mirrorSquare[square]];
            scoreEndgame -= pst[endgame][KING_PST][mirrorSquare[square]];
            scoreOpening += getKingSafety(square, black);
            break;
        }
      }
    }

    // --- CONNECTED ROOKS ---
    if (whiteRooks.length > 1) {
      let connected = false;
      for (let i = 0; i < whiteRooks.length && !connected; i++) {
        for (let j = i + 1; j < whiteRooks.length; j++) {
          if (areRooksConnected(whiteRooks[i], whiteRooks[j])) {
            connected = true;
            break;
          }
        }
      }

      if (connected) {
        scoreOpening += connectedRookBonus;
        scoreEndgame += connectedRookBonus;
      }
    }

    if (blackRooks.length > 1) {
      let connected = false;
      for (let i = 0; i < blackRooks.length && !connected; i++) {
        for (let j = i + 1; j < blackRooks.length; j++) {
          if (areRooksConnected(blackRooks[i], blackRooks[j])) {
            connected = true;
            break;
          }
        }
      }

      if (connected) {
        scoreOpening -= connectedRookBonus;
        scoreEndgame -= connectedRookBonus;
      }
    }

    // Bishop Pair Logic
    if (pieceList[B] >= 2) {
      scoreOpening += bishopPairBonus;
      scoreEndgame += bishopPairBonus;
    }
    if (pieceList[b] >= 2) {
      scoreOpening -= bishopPairBonus;
      scoreEndgame -= bishopPairBonus;
    }

    // Phase Interpolation
    if (gamePhase == middlegame)
      score = (
        scoreOpening * gamePhaseScore +
        scoreEndgame * (openingPhaseScore - gamePhaseScore)
      ) / openingPhaseScore;
    else if (gamePhase == opening) score = scoreOpening;
    else if (gamePhase == endgame) score = scoreEndgame;

    // --- MOP UP EVALUATION ---
    // If we have a significant material advantage in endgame, force checkmate
    if (gamePhase == endgame) {
         if (score > 200) { // White is winning
             score += evaluateMopUp(white);
         } else if (score < -200) { // Black is winning
             score -= evaluateMopUp(black);
         }
    }

    score = (score * (100 - fifty) / 100) << 0;
    return (side == white) ? score : -score;
  }

  
  /****************************\
   ============================
   
       TRANSPOSITION TABLE

   ============================              
  \****************************/
  
  // Transposition Table constants
  const noHashEntry = 100000;
  const HASH_EXACT = 0;
  const HASH_ALPHA = 1;
  const HASH_BETA = 2;

  // Transposition Table fields (Structure of Arrays)
  // This replaces the old array of objects to improve cache locality and remove GC overhead
  var hashEntries = 0;
  var ttHashLow = null;   // Stores the hash key
  var ttDepth = null;     // Stores the depth of the entry
  var ttFlag = null;      // Stores the flag (Exact, Alpha, Beta)
  var ttScore = null;     // Stores the evaluation score
  var ttMove = null;      // Stores the best move

  // set hash size (Two-Tier Implementation)
  function setHashSize(Mb) {
    if(Mb < 4) Mb = 4;
    if(Mb > 512) Mb = 512;

    // Calculate logical buckets. 
    // 16 bytes divisor allows for overhead. 
    // We will allocate 2x this amount for the actual arrays.
    hashEntries = parseInt(Mb * 0x100000 / 16);

    // Initialize Typed Arrays with DOUBLE the size 
    // Slot 1 (Deepest) = index * 2
    // Slot 2 (Newest)  = index * 2 + 1
    var size = hashEntries * 2;

    ttHashLow = new Int32Array(size);
    ttDepth = new Int8Array(size);
    ttFlag = new Int8Array(size);
    ttScore = new Int16Array(size);
    ttMove = new Int32Array(size);

    // Fill with empty values
    initHashTable();

    console.log('Set hash table size to', Mb, 'Mb');
    console.log('Two-Tier TT initialized with', hashEntries, 'buckets');
  }
  
  // clear TT (hash table)
  function initHashTable() {
    if(ttHashLow) {
        ttHashLow.fill(0);
        ttDepth.fill(0);
        ttFlag.fill(0);
        ttScore.fill(0);
        ttMove.fill(0);
    }
  }
  
  // read hash entry data (Two-Tier)
  function readHashEntry(alpha, beta, bestMove, depth) {
    // Get logical bucket index
    var index = (hashKey & 0x7fffffff) % hashEntries;
    
    // Define physical slot indices
    var slot1 = index * 2;     // Deepest Slot
    var slot2 = index * 2 + 1; // Always Replace Slot

    // --- CHECK SLOT 1 (DEEPEST) ---
    if (ttHashLow[slot1] == hashKey) {
        // Retrieve best move (crucial for move ordering)
        if (ttMove[slot1] != 0) bestMove.value = ttMove[slot1];

        // Check if depth is sufficient to use the score
        if (ttDepth[slot1] >= depth) {
            var score = ttScore[slot1];

            // Adjust mating scores
            if (score < -mateScore) score += searchPly;
            if (score > mateScore) score -= searchPly;

            if (ttFlag[slot1] == HASH_EXACT) return score;
            if ((ttFlag[slot1] == HASH_ALPHA) && (score <= alpha)) return alpha;
            if ((ttFlag[slot1] == HASH_BETA) && (score >= beta)) return beta;
        }
    }

    // --- CHECK SLOT 2 (NEWEST) ---
    // If Slot 1 didn't cause a cutoff, check Slot 2
    if (ttHashLow[slot2] == hashKey) {
        if (ttMove[slot2] != 0) bestMove.value = ttMove[slot2];

        if (ttDepth[slot2] >= depth) {
            var score = ttScore[slot2];

            if (score < -mateScore) score += searchPly;
            if (score > mateScore) score -= searchPly;

            if (ttFlag[slot2] == HASH_EXACT) return score;
            if ((ttFlag[slot2] == HASH_ALPHA) && (score <= alpha)) return alpha;
            if ((ttFlag[slot2] == HASH_BETA) && (score >= beta)) return beta;
        }
    }
    
    return noHashEntry;
  }

  // write hash entry data (Two-Tier)
  function writeHashEntry(score, bestMove, depth, hashFlag) {
    var index = (hashKey & 0x7fffffff) % hashEntries;

    var slot1 = index * 2;     // Deepest
    var slot2 = index * 2 + 1; // Newest

    // Adjust mating scores to be independent of ply
    if (score < -mateScore) score -= searchPly;
    if (score > mateScore) score += searchPly;

    // --- WRITE TO SLOT 1 (DEEPEST) ---
    // Strategy: Only replace if the new search is deeper or equal depth,
    // OR if the current entry in this slot is from a different position (collision/empty).
    if (ttHashLow[slot1] != hashKey || depth >= ttDepth[slot1]) {
        ttHashLow[slot1] = hashKey;
        ttScore[slot1] = score;
        ttFlag[slot1] = hashFlag;
        ttDepth[slot1] = depth;
        ttMove[slot1] = bestMove;
    }

    // --- WRITE TO SLOT 2 (NEWEST) ---
    // Strategy: Always replace. This ensures we remember the most recent path
    // even if it was a shallow search (e.g., during Q-Search or low depth re-search).
    ttHashLow[slot2] = hashKey;
    ttScore[slot2] = score;
    ttFlag[slot2] = hashFlag;
    ttDepth[slot2] = depth;
    ttMove[slot2] = bestMove;
  }
  

  /****************************\
   ============================
   
              SEARCH

   ============================              
  \****************************/
  
  const mvvLva = [
	  0,   0,   0,   0,   0,   0,   0,  0,   0,   0,   0,   0,   0,
	  0, 105, 205, 305, 405, 505, 605,  105, 205, 305, 405, 505, 605,
	  0, 104, 204, 304, 404, 504, 604,  104, 204, 304, 404, 504, 604,
	  0, 103, 203, 303, 403, 503, 603,  103, 203, 303, 403, 503, 603,
	  0, 102, 202, 302, 402, 502, 602,  102, 202, 302, 402, 502, 602,
	  0, 101, 201, 301, 401, 501, 601,  101, 201, 301, 401, 501, 601,
	  0, 100, 200, 300, 400, 500, 600,  100, 200, 300, 400, 500, 600,

	  0, 105, 205, 305, 405, 505, 605,  105, 205, 305, 405, 505, 605,
	  0, 104, 204, 304, 404, 504, 604,  104, 204, 304, 404, 504, 604,
	  0, 103, 203, 303, 403, 503, 603,  103, 203, 303, 403, 503, 603,
	  0, 102, 202, 302, 402, 502, 602,  102, 202, 302, 402, 502, 602,
	  0, 101, 201, 301, 401, 501, 601,  101, 201, 301, 401, 501, 601,
	  0, 100, 200, 300, 400, 500, 600,  100, 200, 300, 400, 500, 600
  ];
  
  // search  constants
  const maxPly = 64;
  const infinity = 50000;
  const mateValue = 49000;
  const mateScore = 48000;
  const DO_NULL = 1;
  const NO_NULL = 0;
  
  // search variables
  var followPv;
  
  // PV table (Optimized)
  var pvTable = new Int32Array(maxPly * maxPly);
  var pvLength = new Int32Array(maxPly);
  
  // killer moves (Optimized)
  var killerMoves = new Int32Array(2 * maxPly);

  // history moves (Optimized)
  var historyMoves = new Int32Array(13 * 128);
  
  // repetition table (Optimized)
  var repetitionTable = new Int32Array(1000);

  // time control handling  
  var timing = {
    timeSet: 0,
    stopTime: 0,
    stopped: 0,
    time: -1
  }
  
  // set time control
  function setTimeControl(timeControl) { timing = timeControl; }
  
  // reset time control
  function resetTimeControl() {
    timing = {
      timeSet: 0,
      stopTime: 0,
      stopped: 0,
      time: -1
    }
  }
  
  function clearSearch() {
    // reset nodes counter
    nodes = 0;
    timing.stopped = 0;
    searchPly = 0;
    
    for (let index = 0; index < pvTable.length; index++) pvTable[index] = 0;
    for (let index = 0; index < pvLength.length; index++) pvLength[index] = 0;
    for (let index = 0; index < killerMoves.length; index++) killerMoves[index] = 0;
    for (let index = 0; index < historyMoves.length; index++) historyMoves[index] = 0;
  }
  
  // handle time control
  function checkTime() {
    if(timing.timeSet == 1 && Date.now() > timing.stopTime) timing.stopped = 1;
  }

  // position repetition detection
  function isRepetition() {
    for (let index = 0; index < gamePly; index++)
      if (repetitionTable[index] == hashKey) return 1;

    return 0;
  }
  
  // move ordering
  function sortMoves(currentCount, moveList) {
    for (let nextCount = currentCount + 1; nextCount < moveList.length; nextCount++) {
      if (moveList[currentCount].score < moveList[nextCount].score) {
        let tempMove = moveList[currentCount];

        moveList[currentCount] = moveList[nextCount];
        moveList[nextCount] = tempMove;
      }
    }
  }
  
  // sort PV move
  function sortPvMove(moveList, bestMove) {
    // sort hash table move
    for (let count = 0; count < moveList.length; count++) {
      if (moveList[count].move == bestMove.value) {
        moveList[count].score = 30000;
        return;
      }
    }
    
    // sort PV move
    if (searchPly && followPv) {
      followPv = 0;
      for (let count = 0; count < moveList.length; count++) {
        if (moveList[count].move == pvTable[searchPly]) {
          followPv = 1;
          moveList[count].score = 20000;
          break;
        }
      }
    }
  }
  
  // store PV move
  function storePvMove(move) {
    pvTable[searchPly * 64 + searchPly] = move;
    for (var nextPly = searchPly + 1; nextPly < pvLength[searchPly + 1]; nextPly++)
      pvTable[searchPly * 64 + nextPly] = pvTable[(searchPly + 1) * 64 + nextPly];
    pvLength[searchPly] = pvLength[searchPly + 1]
  }
  
  // quiescence search
  function quiescence(alpha, beta) {
    pvLength[searchPly] = searchPly;
    nodes++;
    
    if((nodes & 2047 ) == 0) {
      checkTime();
      if (timing.stopped == 1) return 0;
    }

    if (searchPly > maxPly - 1) return evaluate();

    let evaluation = evaluate();
    
    if (evaluation >= beta) return beta;
    if (evaluation > alpha) alpha = evaluation;
    
    var moveList = [];
    generateCaptures(moveList);

    // sort PV move
    sortPvMove(moveList, {'value': 0});
    
    // loop over moves
    for (var count = 0; count < moveList.length; count++) { 
      sortMoves(count, moveList)
      let move = moveList[count].move;
      
      if (makeMove(move) == 0) continue;
      var score = -quiescence(-beta, -alpha);
      takeBack();
      
      if (timing.stopped == 1) return 0;
      if (score > alpha) {
        storePvMove(move);
        alpha = score;
        
        if (score >= beta) return beta;
      }
    }

    return alpha;
  }
  
  // negamax search
  function negamax(alpha, beta, depth, nullMove) {
    pvLength[searchPly] = searchPly;
    
    // best move for TT
    var bestMove = { value: 0 };
    var hashFlag = HASH_ALPHA;
    let score = 0;
    let pvNode = beta - alpha > 1;
    let futilityPruning = 0;
    
    // read hash entry
    if (searchPly && 
       (score = readHashEntry(alpha, beta, bestMove, depth)) != noHashEntry &&
        pvNode == 0) return score;

    // check time left
    if ((nodes & 2047) == 0) {
      checkTime();
      if (timing.stopped == 1) return 0;
    }

    if ((searchPly && isRepetition()) || fifty >= 100) return 0;
    if (depth == 0) { nodes++; return quiescence(alpha, beta); }
    
    // mate distance pruning
    if (alpha < -mateValue) alpha = -mateValue;
    if (beta > mateValue - 1) beta = mateValue - 1;
    if (alpha >= beta) return alpha;
    
    let legalMoves = 0;
    let inCheck = isSquareAttacked(kingSquare[side], side ^ 1);
    
    // check extension
    if (inCheck) depth++;
    
    if (inCheck == 0 && pvNode == 0) {
      // static evaluation for pruning purposes
      let staticEval = evaluate();
    
      // evalution pruning
      if (depth < 3 && Math.abs(beta - 1) > -mateValue + 100) {
        let evalMargin = materialWeights[opening][P] * depth;
        if (staticEval - evalMargin >= beta) return staticEval - evalMargin;
      }
      
      if (nullMove) {
        // NULL MOVE PRUNING with ZUGZWANG protection
        // Don't prune if we only have pawns/King, as zugzwang is likely in endgames
        let nonPawnMaterial = pieceList[N] + pieceList[B] + pieceList[R] + pieceList[Q];
        if (side == black) nonPawnMaterial = pieceList[n] + pieceList[b] + pieceList[r] + pieceList[q];

        if (nonPawnMaterial > 0 && searchPly && depth > 2 && staticEval >= beta) {
          makeNullMove();
          score = -negamax(-beta, -beta + 1, depth - 1 - 2, NO_NULL);
          takeNullMove();
          
          if (timing.stopped == 1) return 0;
          if (score >= beta) return beta;
        }
        
        // razoring
        score = staticEval + materialWeights[opening][P];
        let newScore;
        
        if (score < beta) {
          if (depth == 1) {
            newScore = quiescence(alpha, beta);
            return (newScore > score) ? newScore : score;
          }
        }
        
        score += materialWeights[opening][P];

        if (score < beta && depth < 4) {
          newScore = quiescence(alpha, beta);
          if (newScore < beta) return (newScore > score) ? newScore : score;
        }
      }
      
      // futility pruning condition
      let futilityMargin = [
        0, materialWeights[opening][P], materialWeights[opening][N], materialWeights[opening][R]
      ];
      
      if (depth < 4 && Math.abs(alpha) < mateScore && staticEval + futilityMargin[depth] <= alpha)
        futilityPruning = 1;
    }

    let movesSearched = 0;
    let moveList = [];
    generateMoves(moveList);
    
    // sort PV move
    sortPvMove(moveList, bestMove);
    
    // loop over moves
    for (let count = 0; count < moveList.length; count++) {
      sortMoves(count, moveList);
      let move = moveList[count].move;
      if (makeMove(move) == 0) continue;
      legalMoves++;
      
      // futility pruning
      if (futilityPruning &&
          movesSearched &&
          getMoveCapture(move) == 0 &&
          getMovePromoted(move) == 0 &&
          isSquareAttacked(kingSquare[side], side ^ 1) == 0
         ) { takeBack(); continue; }
      
      // --- NEW: Calculate Extension for Pawn Promotion ---
      let extension = 0;
      // If moving a pawn to the penultimate rank (Rank 1 for White, Rank 6 for Black)
      // Rank 1 index is 0x10 (16), Rank 6 index is 0x60 (96)
      if (getMovePawn(move)) {
          let targetRank = getMoveTarget(move) >> 4;
          if ((side == white && targetRank == 1) || (side == black && targetRank == 6)) {
              extension = 1; 
          }
      }

      if (movesSearched == 0) score = -negamax(-beta, -alpha, depth - 1 + extension, DO_NULL);
      else {
        // LMR with extension included
        if(
            pvNode == 0 &&
            movesSearched > 3 &&
            depth > 2 &&
            inCheck == 0 &&
            (getMoveSource(move) != getMoveSource(killerMoves[searchPly]) ||
             getMoveTarget(move) != getMoveTarget(killerMoves[searchPly])) &&
            (getMoveSource(move) != getMoveSource(killerMoves[maxPly + searchPly]) ||
             getMoveTarget(move) != getMoveTarget(killerMoves[maxPly + searchPly])) &&
            getMoveCapture(move) == 0 &&
            getMovePromoted(move) == 0
          ) {
            score = -negamax(-alpha - 1, -alpha, depth - 2 + extension, DO_NULL);
        } else score = alpha + 1;
          
        // PVS with extension included
        if(score > alpha) {
          score = -negamax(-alpha - 1, -alpha, depth - 1 + extension, DO_NULL);
          if((score > alpha) && (score < beta)) score = -negamax(-beta, -alpha, depth - 1 + extension, DO_NULL);
        }
      }
      
      takeBack();
      movesSearched++;
      
      if (timing.stopped == 1) return 0;
      if (score > alpha) {
        hashFlag = HASH_EXACT;
        bestMove.value = move;
        alpha = score;
        storePvMove(move);
        
        // store history moves
        if (getMoveCapture(move) == 0)
          historyMoves[board[getMoveSource(move)] * 128 + getMoveTarget(move)] += depth;
        
        if (score >= beta) {
          // store hash entry with the score equal to beta
          writeHashEntry(beta, bestMove.value, depth, HASH_BETA);
          
          // store killer moves
          if (getMoveCapture(move) == 0) {
            killerMoves[maxPly + searchPly] = killerMoves[searchPly];
            killerMoves[searchPly] = move;
          }
          
          return beta;
        }
      }
    }
    
    // checkmate or stalemate
    if (legalMoves == 0) {
      if (inCheck) return -mateValue + searchPly;
      else return 0;
    }
    
    // store hash entry with the score equal to alpha
    writeHashEntry(alpha, bestMove.value, depth, hashFlag);

    return alpha;
  }
  
  // search position for the best move
  function searchPosition(depth) {
    let start = Date.now();
    let score = 0;
    let lastBestMove = 0;
    
    clearSearch();

    // iterative deepening
    for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
      lastBestMove = pvTable[0];
      followPv = 1;
      score = negamax(-infinity, infinity, currentDepth, DO_NULL);
      
      // stop searching if time is up
      if (timing.stopped == 1 || 
         ((Date.now() > timing.stopTime) &&
          timing.time != -1)) break;
      
      let info = '';
      
      if (typeof(document) != 'undefined')
        var uciScore = 0;
      
      if (score >= -mateValue && score <= -mateScore) {
        info = 'info score mate ' + (parseInt(-(score + mateValue) / 2 - 1)) + 
               ' depth ' + currentDepth +
               ' nodes ' + nodes +
               ' time ' + (Date.now() - start) +
               ' pv ';
               
        if (typeof(document) != 'undefined')
          uciScore = 'M' + Math.abs((parseInt(-(score + mateValue) / 2 - 1)));
      } else if (score >= mateScore && score <= mateValue) {
        info = 'info score mate ' + (parseInt((mateValue - score) / 2 + 1)) + 
               ' depth ' + currentDepth +
               ' nodes ' + nodes +
               ' time ' + (Date.now() - start) +
               ' pv ';
             
        if (typeof(document) != 'undefined')
          uciScore = 'M' + Math.abs((parseInt((mateValue - score) / 2 + 1)));
      } else {
        info = 'info score cp ' + score + 
               ' depth ' + currentDepth +
               ' nodes ' + nodes +
               ' time ' + (Date.now() - start) +
               ' pv ';
        
        if (typeof(document) != 'undefined')
          uciScore = -score;
      }
      
      for (let count = 0; count < pvLength[0]; count++)
        info += moveToString(pvTable[count]) + ' ';
                
      console.log(info);
      
      if (typeof(document) != 'undefined') {
        if (uciScore == 49000) uciScore = 'M1';
        guiScore = uciScore;
        guiDepth = info.split('depth ')[1].split(' ')[0];
        guiPv = info.split('pv ')[1];
        guiTime = info.split('time ')[1].split(' ')[0];
      }
      
      if (info.includes('mate') || info.includes('-49000')) break;
    }

    let bestMove = (timing.stopped == 1) ? lastBestMove: pvTable[0];
    console.log('bestmove ' + moveToString(bestMove));
    return bestMove;
  }


  /****************************\
   ============================
   
          INPUT & OUTPUT

   ============================              
  \****************************/
  
  // castling bits
  var KC = 1, QC = 2, kc = 4, qc = 8;

  // decode promoted pieces
  var promotedPieces = {
    [Q]: 'q', [R]: 'r', [B]: 'b', [N]: 'n',
    [q]: 'q', [r]: 'r', [b]: 'b', [n]: 'n'
  };

  // encode ascii pieces
  var charPieces = {
      'P': P, 'N': N, 'B': B, 'R': R, 'Q': Q, 'K': K,
      'p': p, 'n': n, 'b': b, 'r': r, 'q': q, 'k': k,
  };
  
  // unicode piece representation
  const unicodePieces = [
    '.', '\u2659', '\u2658', '\u2657', '\u2656', '\u2655', '\u2654',
         '\u265F', '\u265E', '\u265D', '\u265C', '\u265B', '\u265A'
  ];

  // set board position from FEN
  function setBoard(fen) {
    resetBoard();
    var index = 0;
    
    // parse board position
    for (var rank = 0; rank < 8; rank++) {
      for (var file = 0; file < 16; file++) {
        var square = rank * 16 + file;
        if ((square & 0x88) == 0) {
          if ((fen[index].charCodeAt() >= 'a'.charCodeAt() &&
               fen[index].charCodeAt() <= 'z'.charCodeAt()) || 
              (fen[index].charCodeAt() >= 'A'.charCodeAt() &&
               fen[index].charCodeAt() <= 'Z'.charCodeAt())) {
            if (fen[index] == 'K') kingSquare[white] = square;
            else if (fen[index] == 'k') kingSquare[black] = square;
            board[square] = charPieces[fen[index]];
            index++;
          }
          if (fen[index].charCodeAt() >= '0'.charCodeAt() &&
              fen[index].charCodeAt() <= '9'.charCodeAt()) {
            var offset = fen[index] - '0';
            if (!(board[square])) file--;
            file += offset;
            index++;
          }
          if (fen[index] == '/') index++;
        }
      }
    }
    
    // parse side to move
    index++;
    side = (fen[index] == 'w') ? white : black;
    index += 2;
    
    // parse castling rights
    while (fen[index] != ' ') {
      switch(fen[index]) {
        case 'K': castle |= KC; break;
        case 'Q': castle |= QC; break;
        case 'k': castle |= kc; break;
        case 'q': castle |= qc; break;
        case '-': break;
      }

      index++;
    }
    
    index++;
    
    // parse enpassant square
    if (fen[index] != '-') {
      var file = fen[index].charCodeAt() - 'a'.charCodeAt();
      var rank = 8 - (fen[index + 1].charCodeAt() - '0'.charCodeAt());
      enpassant = rank * 16 + file;
    } else enpassant = noEnpassant;
    
    // parse 50 rule move counter
    fifty = parseInt(fen.slice(index, fen.length - 1).split(' ')[1]);

    // parse full move counter
    gamePly = parseInt(fen.slice(index, fen.length + 1).split(' ')[2]) * 2;

    // generate unique position identifier
    hashKey = generateHashKey();

    // init piece list
    initPieceList();
  }
  
  // generate FEN string (to integrate with chessboardjs lib)
  function generateFen() {
    let pieces = ['', 'P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];
    let fen = '';
    
    for (let rank = 0; rank < 8; rank++) {
      let empty = 0;
      
      for (let file = 0; file < 16; file++) {
        let square = rank * 16 + file;

        if ((square & 0x88) == 0) {
          let piece = board[square];
          
          if (piece == 0) empty++;
          if (piece) {
            fen += (empty ? empty : '') + pieces[piece];
            empty = 0;
          }
        }
      }
      
      if (empty) fen += empty;
      empty = 0;
      if (rank < 7) fen += '/';
    }

    fen += ' ' + (engine.getSide() ? 'b' : 'w');
    //fen += ' ' + '- - 0 1'
    return fen;
  }
  
  // load move sequence
  function loadMoves(moves) {
    moves = moves.split(' ');
    
    for (let index = 0; index < moves.length; index++) {
      let move = moves[index];
      let moveString = moves[index];
      let validMove = moveFromString(move);
      if (validMove) {
        makeMove(validMove);
        
        if (typeof(document) != 'undefined') {
          let pv = ''
          let time = 0;
          let score = 0;
          let depth = 0;
          
          if (userTime) {
            time = Date.now() - userTime;
          } else {
            score = guiScore;
            depth = guiDepth;
            time = guiTime;
            pv = guiPv;
          }
          
          moveStack[moveStack.length - 1].piece = board[getMoveTarget(validMove)];
          moveStack[moveStack.length - 1].inCheck = isSquareAttacked(kingSquare[side], side ^ 1) ? 1 : 0;
          moveStack[moveStack.length - 1].score = score;
          moveStack[moveStack.length - 1].depth = depth;
          moveStack[moveStack.length - 1].time = time;
          moveStack[moveStack.length - 1].pv = pv;
        }
      }
    }
    
    searchPly = 0;
  }
  
  // get game moves
  function getMoves() {
    let moves = [];
    
    for (let index = 0; index < moveStack.length; index++) 
      moves.push(moveToString(moveStack[index].move));
    
    return moves;
  }
  
  // print chess board to console
  function printBoard() {
    var boardString = '';
    
    // print board position
    for (var rank = 0; rank < 8; rank++) {
      for (var file = 0; file < 16; file++) {
        var square = rank * 16 + file;
        if (file == 0) boardString += '   ' + (8 - rank).toString() + ' ';
        if ((square & 0x88) == 0) boardString += unicodePieces[board[square]] + ' ';
      }
      boardString += '\n'
    }
    
    boardString += '     a b c d e f g h';
    
    // print board state variables
    boardString += '\n\n     Side:     ' + ((side == 0) ? 'white': 'black');
    boardString += '\n     Castling:  ' + ((castle & KC) ? 'K' : '-') + 
                                        ((castle & QC) ? 'Q' : '-') +
                                        ((castle & kc) ? 'k' : '-') +
                                        ((castle & qc) ? 'q' : '-');
    boardString += '\n     Ep:          ' + ((enpassant == noEnpassant) ? 'no': coordinates[enpassant]);
    boardString += '\n\n     Key: ' + hashKey;
    boardString += '\n 50 rule:          ' + fifty;
    boardString += '\n   moves:          ' + ((gamePly % 2) ? Math.round(gamePly / 2) - 1 : Math.round(gamePly / 2));
    console.log(boardString + '\n');
    
    initHashTable();
  }
  
  // print move
  function moveToString(move) {
    if (getMovePromoted(move)) {
      return coordinates[getMoveSource(move)] +
             coordinates[getMoveTarget(move)] +
             promotedPieces[getMovePromoted(move)];
    } else {
      return coordinates[getMoveSource(move)] +
             coordinates[getMoveTarget(move)];
    }
  }

  // print move list
  function printMoveList(moveList) {
    var listMoves = '   Move     Capture  Double   Enpass   Castling  Score\n\n';
    
    for (var index = 0; index < moveList.length; index++) {
      var move = moveList[index].move;
      listMoves += '   ' + coordinates[getMoveSource(move)] + coordinates[getMoveTarget(move)];
      listMoves += (getMovePromoted(move) ? promotedPieces[getMovePromoted(move)] : ' ');
      listMoves += '    ' + getMoveCapture(move) +
                    '        ' + getMovePawn(move) +
                    '        ' + getMoveEnpassant(move) +
                    '        ' + getMoveCastling(move) + 
                    '         ' + moveList[index].score + '\n';
    }
    
    listMoves += '\n   Total moves: ' + moveList.length;
    console.log(listMoves);
  }
  
  // print piece list & material counts
  function printPieceList() {
    var materialCountString = '    Material counts:\n\n';
    
    // print material count
    for (var piece = P; piece <= k; piece++)
      materialCountString += '    ' + unicodePieces[piece] + ': ' + pieceList[piece] + '\n';

    console.log(materialCountString);
    var pieceListString = '    Piece list:\n\n';
    
    // print piece-square pairs
    for (var piece = P; piece <= k; piece++)
      for (var pieceNumber = 0; pieceNumber < pieceList[piece]; pieceNumber++)
        pieceListString += '    ' + unicodePieces[piece] + ': ' + 
                                    coordinates[pieceList.pieces[piece * 10 + pieceNumber]] + '\n';
  }

  /****************************\
   ============================
   
               GUI

   ============================              
  \****************************/
  
  // browser mode
  if (typeof(document) != 'undefined') { 
    // color theme
    var LIGHT_SQUARE = '#f0d9b5';
    var DARK_SQUARE = '#b58863';
    var SELECT_COLOR = 'brown';
    
    // square size
    var CELL_WIDTH = 50;
    var CELL_HEIGHT = 50;
    
    // override board appearance
    if (boardSize) { CELL_WIDTH = boardSize / 8; CELL_HEIGHT = boardSize / 8; }
    if (lightSquare) LIGHT_SQUARE = lightSquare;
    if (darkSquare) DARK_SQUARE = darkSquare;
    if (selectColor) SELECT_COLOR = selectColor;
    
    // flip board
    var flip = 0;
    
    // flip board
    function flipBoard() { flip ^= 1; }
    
    // render board in browser
    function drawBoard() {
      var chessBoard = '<table align="center" style="border: 1px solid black" cellspacing="0">'
      
      // board table
      for (var row = 0; row < 8; row++) {
        chessBoard += '<tr>'
        for (var col = 0; col < 16; col++) {
          var file, rank;
          if (flip) {
            file = 16 - 1 - col;
            rank = 8 - 1 - row;
          } else {
            file = col;
            rank = row;
          }
          
          var square = rank * 16 + file;
          
          if ((square & 0x88) == 0)
            chessBoard += 
              '<td align="center" id="' + square + 
              '" bgcolor="' + ( ((file + rank) % 2) ? DARK_SQUARE : LIGHT_SQUARE) +
              '" width="' + CELL_WIDTH + 'px" height="' + CELL_HEIGHT +  'px" ' +
              ' onclick="tapPiece(this.id)" ' + 
              ' ondragstart="dragPiece(event, this.id)" ' +
              ' ondragover="dragOver(event, this.id)"'+
              ' ondrop="dropPiece(event, this.id)"' +
              '></td>';
        }

        chessBoard += '</tr>';
      }

      chessBoard += '</table>';
      document.getElementById('chessboard').innerHTML = chessBoard;
    }

    // draw pieces
    function updateBoard() {
      for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 16; col++) {
          var square = row * 16 + col;
          if ((square & 0x88) == 0)
            document.getElementById(square).innerHTML = 
              '<img style="width: ' + 
               (boardSize ? boardSize / 8: 400 / 8) + 
              'px" draggable="true" src ="Images/' + 
              (board[square]) +'.gif">';
        }
      }
    }
    
    // move piece in GUI
    function movePiece(userSource, userTarget, promotedPiece) {
      let moveString = coordinates[userSource] +
                       coordinates[userTarget] +
                       promotedPieces[promotedPiece];

      engine.loadMoves(moveString);
      drawBoard();
      updateBoard();
    }

    // render board initially
    drawBoard();
    updateBoard();
  }
  
  function guiError(func) {
    console.log(func + ' is available only in browser');
  }
  

  /****************************\
   ============================
   
               INIT

   ============================              
  \****************************/
  
  // init all
  (function initAll() {
    initRandomKeys();
    hashKey = generateHashKey();
    initPieceList();
    setHashSize(64); // Initialize TT memory
  }())


  /****************************\
   ============================
   
            DEBUGGING

   ============================              
  \****************************/
  
  // below you can test inner engine methods
  function debug() {
    //setBoard('kqb5/pppppppp/8/8/8/8/PPPPPPPP/KQR5 w K7 - 0 1 ');
    setBoard('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 10 ');
    //setBoard('r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10');
    //setBoard('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
    //setBoard('rnbqkbnr/pp4pp/2p5/3Npp2/2PpP3/3P1P2/PP4PP/R1BQKBNR b KQkq e3 0 6 ');
    //setBoard('rn2kb1r/pp5p/5n2/2p5/4pN2/111P4/PPP2PPP/R2Q1RK1 w kq - 0 15 ');
    //setBoard('8/1p3p2/ppp2p2/8/5P2/PPP2P2/1P6/8 b - - 4 1 ');
    //setBoard('8/p1p1p1pp/8/8/8/8/PP1P1P1P/8 b - - 4 1 ');
    
    
    //setBoard('8/4P3/2pp2p1/pp1p2p1/1P1P2PP/2PP2P1/4p3/8 w - - 4 1 ');
    //setBoard('8/p2p2pp/3p2p1/8/8/3P2P1/P2P2PP/8 w - - 0 0 ')
    //setBoard('8/8/4p3/3p1p2/3P1P2/4P3/4P3/8 w -- 0 0 ');
    //setBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 ');
    updateBoard();
  }
  
  return {
  
    /****************************\
     ============================
   
              PUBLIC API

     ============================              
    \****************************/
    
    // GUI constants
    SELECT_COLOR: SELECT_COLOR,
    
    // Engine constants
    VERSION: version,
    ELO: elo,
    START_FEN: startFen,
    
    COLOR: {
      WHITE: white,
      BLACK: black,
    },
    
    PIECE: {
      NO_PIECE: e,
      WHITE_PAWN: P,
      WHITE_KNIGHT: N,
      WHITE_BISHOP: B,
      WHITE_ROOK: R,
      WHITE_QUEEN: Q,
      WHITE_KING: K,
      BLACK_PAWN: p,
      BLACK_KNIGHT: n,
      BLACK_BISHOP: b,
      BLACK_ROOK: r,
      BLACK_QUEEN: q,
      BLACK_KING: k
    },
    
    SQUARE: {
      A8: a8, B8: b8, C8: c8, D8: d8, E8: e8, F8: f8, G8: g8, H8: h8,
      A7: a7, B7: b7, C7: c7, D7: d7, E7: e7, F7: f7, G7: g7, H7: h7,
      A6: a6, B6: b6, C6: c6, D6: d6, E6: e6, F6: f6, G6: g6, H6: h6,
      A5: a5, B5: b5, C5: c5, D5: d5, E5: e5, F5: f5, G5: g5, H5: h5,
      A4: a4, B4: b4, C4: c4, D4: d4, E4: e4, F4: f4, G4: g4, H4: h4,
      A3: a3, B3: b3, C3: c3, D3: d3, E3: e3, F3: f3, G3: g3, H3: h3,
      A2: a2, B2: b2, C2: c2, D2: d2, E2: e2, F2: f2, G2: g2, H2: h2,
      A1: a1, B1: b1, C1: c1, D1: d1, E1: e1, F1: f1, G1: g1, H1: h1,
    },
    
    // GUI methods
    drawBoard: function() { try { return drawBoard(); } catch(e) { guiError('.drawBoard()'); } },
    updateBoard: function() { try { return updateBoard(); } catch(e) { guiError('.updateBoard()'); } },
    movePiece: function(userSource, userTarget, promotedPiece) { try { movePiece(userSource, userTarget, promotedPiece); } catch(e) { guiError('.movePiece()'); } },
    flipBoard: function() { try { flipBoard(); } catch(e) { guiError('.flipBoard()'); } },

    // perft
    perft: function(depth) { perftTest(depth); },

    // board methods
    squareToString: function(square) { return coordinates[square]; },
    promotedToString: function(piece) { return promotedPieces[piece]; },
    printBoard: function() { printBoard(); },
    setBoard: function(fen) { setBoard(fen); },
    generateFen: function() { return generateFen(); },
    getPiece: function(square) { return board[square]; },
    getSide: function() { return side; },
    getFifty: function() { return fifty; },
    
    // move manipulation
    moveFromString: function(moveString) { return moveFromString(moveString); },
    moveToString: function(move) { return moveToString(move); },
    moveStack: function() { return moveStack; },
    loadMoves: function(moves) { loadMoves(moves); },
    getMoves: function() { return getMoves(); },
    pgn: function() { return getGamePgn(); },
    getMoveSource: function(move) { return getMoveSource(move); },
    getMoveTarget: function(move) { return getMoveTarget(move); },
    getMovePromoted: function(move) { return getMovePromoted(move); },
    getMoveCapture: function(move) { return getMoveCapture(move); },
    getMoveCastling: function(move) { return getMoveCastling(move); },
    generateLegalMoves: function() { return generateLegalMoves(); },
    printMoveList: function(moveList) { printMoveList(moveList); },
    
    // timing
    resetTimeControl: function() { resetTimeControl(); },
    setTimeControl: function(timeControl) { setTimeControl(timeControl); },
    getTimeControl: function() { return JSON.parse(JSON.stringify(timing))},
    search: function(depth) { return searchPosition(depth) },
    searchTime: function(ms) {
      resetTimeControl();
      let startTime = new Date().getTime();
      timing.timeSet = 1;
      timing.time = ms;
      timing.stopTime = startTime + timing.time;
      engine.search(64);
    },

    // misc
    isMaterialDraw: function() { return isMaterialDraw(); },
    takeBack: function() { if (moveStack.length) takeBack(); },
    isRepetition: function() { return isRepetition(); },
    inCheck: function(color) { return isSquareAttacked(kingSquare[color], color ^ 1); },
    isSquareAttacked: function(square, color) { return isSquareAttacked(square, color); },
    
    // uci
    setHashSize: function(Mb) { setHashSize(Mb); },

    // debugging (run any internal engine function)
    debug: function() { debug(); }
  }
}

// export as nodejs module
if (typeof(exports) != 'undefined') exports.Engine = Engine;
// All Tal functions work on a certain game situation (i.e. context at a given moment)
// and all Tal Core functions can be provided with such a situation
// A situation contains
// - Board
// - Pieces
// All other variables like 'moves', 'players' etc are not part of a static game situation, 
// but of the context that *works* on the game-situation or is the result of a move in a certain game-situation
function TalGameSituation(board, pieces) {

	var privates = {
		board : [],
		pieces : {},
		boardSize : {},
		playerDirections : {1:1,2:-1}, // 1 is downwards, -1 is upwards
		createPiecesFromBoard : function() {
			this.pieces = {
				1:[],
				2:[]
			};
			// Calculate pieces from board
			// Place pieces in pieces array
			new TalGame().loopOverTiles(function(row,column,tile) {
				if (tile.piece) {
					// Add to pieces array
					privates.pieces[tile.piece.playerIndex].push(tile.piece);
					// Reference tile from piece (circular!)
					tile.piece.tile = tile;
				}
			}, privates.board);
		}
	}

	privates.board = board;
	// Calculate board-size
	privates.boardSize = {
		width: privates.board[0].length,
		height: privates.board.length
	}
	if (pieces) {
		privates.pieces = pieces;
	} else {
		// Calculate pieces from board
		privates.createPiecesFromBoard();
	}

	var publics = {
		board : function(someBoard) {
			if (someBoard) {
				privates.board = someBoard;
				privates.createPiecesFromBoard();
			} else {
				return privates.board;
			}
		},
		pieces : function(playerIndex) {
			if (playerIndex) {
				return privates.pieces[playerIndex];
			} else {
				return privates.piecees;
			}
		},
		playerDirection : function(playerIndex) {
			if (playerIndex) {
				return privates.playerDirections[playerIndex];
			} else {
				return privates.playerDirections;
			}
		}
	}

	return publics;
}

// Bots go here
TalGame.bots = {};


function TalGame() {

	// Players
	var playerCount = 2;
	var players = [];
	var currentPlayerIndex;
	var currentPlayer;

	// GameSituation
	var gameSituation;

	// Game stats
	var gameIsRunning = false;
	var turnCount = 0;
	var moves = [];

	// Callbacks
	var callbacks = {};

	var publics = {

		bots : TalGame.bots,

		playerCount : function(count) {
			if (count) {
				playerCount = count;
			} else {
				return playerCount;
			}
		},

		player : function(index, player) {
			// Set player
			if (index && player) {
				players[index] = player;
			// Return player
			} else if (index) {
				return players[index];
			// If no parameter was passed, return false
			} else {
				return false;
			}
		},

		boardSize : function(size) {
			boardSize = size;
		},

		board : function(someBoard) {
			return gameSituation.board(someBoard);
		},

		piecesForPlayer : function(playerIndex) {
			// Return pieces
			return gameSituation.pieces(playerIndex);
		},

		pieces : function() {
			return gameSituation.pieces();
		},

		giveUp : function(playerIndex) {
			// TODO: Other player wins...
		},

		start : function() {
			// Determine who is the start player
			var startingPlayerIndex = Math.ceil(Math.random() * playerCount); // !Note: starts with 1
			currentPlayerIndex = startingPlayerIndex;
			currentPlayer = players[currentPlayerIndex];
			// Reset game
			gameIsRunning = true;
			turnCount = 0;
			moves = [];
			privates.createBoard();
			// Do first move
			privates.playerCanMove();
		},

		stop : function() {
			// No more moves will be given to players
			gameIsRunning = false; 
		},

		on : function(callbackName, callback) {
			callbacks[callbackName] = callbacks[callbackName] || [];
			callbacks[callbackName].push(callback);
		},

		off : function(callbackName, callback) {
			// Remove specific callback
			if (callbackName && callback) {
				if (callbacks[callbackName]) {
					var index = callbacks[callbackName].indexOf(callback);
					if (index > -1) {
						delete callbacks[callbackName][index];
					}
				}
			// Remove all callbacks under this callbackName
			} else if (callbackName) {
				if (callbacks[callbackName]) {
					delete callbacks[callbackName];
				}
			}
		},

		moveAllowed : function(from,to,playerIndex,someBoard) {
			var someBoard = someBoard || publics.board();
			// fromTile should exist
			if (!someBoard[from.y] || !someBoard[from.y][from.x]) {
				return {
					allowed:false, 
					reason:"The source tile does not exist"
				};
			}
			var fromTile = someBoard[from.y][from.x];
			// toTile should exist
			if (!someBoard[to.y] || !someBoard[to.y][to.x]) {
				return {
					allowed:false, 
					reason:"The destination tile does not exist"
				};
			}
			var toTile = someBoard[to.y][to.x];
			// There should be a piece on the From tile
			if (!fromTile.piece) {
				return {
					allowed:false, 
					reason:"There is no piece to move"
				};
			}
			var piece = fromTile.piece;
			// Pieces can not move to their own field
			if (from.x === to.x && from.y === to.y) {
				return {
					allowed:false, 
					reason:"A piece cannot move to its own field"
				};
			}
			// The piece should be owned by the playerIndex' player
			if (piece.playerIndex !== playerIndex) {
				return {
					allowed:false, 
					reason:"Only pieces of the current player (" + playerIndex + ") can be moved"
				};
			}
			// Even pieces should move in a straigt line (i.e. either the x or y should remain constant)
			if (piece.number % 2 == 0 && from.x !== to.x && from.y !== to.y) {
				return {
					allowed:false, 
					reason:"Even pieces can only move vertically or horizontally"
				};
			}
			// Odd pieces should move in a diagonal line (i.e. dx and dy should be equal)
			if (piece.number % 2 == 1 && Math.abs(from.x - to.x) !== Math.abs(from.y - to.y)) {
				return {
					allowed:false, 
					reason:"Odd pieces can only move diagonally"
				};
			}
			// A piece can only moe as far as its number is counting
			var steps;
			if (piece.number % 2 == 1) { steps = Math.abs(from.x - to.x); }
			if (piece.number % 2 == 0) { steps = Math.abs(from.x - to.x) || Math.abs(from.y - to.y); }
			if (steps > piece.number) {
				return {
					allowed:false, 
					reason:"A piece cannot be moved further than its number"
				};
			}
			// A piece cannot pass other pieces
			var tilesBetween = publics.tilesBetween(fromTile, toTile, someBoard);
			var returned = false;
			$.each(tilesBetween, function(index,tile) {
				if (tile.piece) {
					returned = true;
					return false; // break
				}
			});
			if (returned) {
				return {
					allowed:false,
					reason:"The path to the destination tile is occupied"
				}
			}

			// Don't take an opponent piece with a backward move
			// Exceeept, for the king
			if (piece.type !== "k") {
				var moveDirection; // 1 is downwards, -1 is upwards
				if (toTile.y < fromTile.y) {
					moveDirection = -1; // upwards
				} else if (toTile.y > fromTile.y) {
					moveDirection = 1; // downwards
				} else {
					moveDirection = 0; // on same line
				}
				if (toTile.piece && toTile.piece.playerIndex !== fromTile.piece.playerIndex && gameSituation.playerDirection(fromTile.piece.playerIndex)*-1 === moveDirection) {
					return {
						allowed:false, 
						reason:"Opponent pieces can only be taken by a forward move"
					};
				}
			}
			
			// Last rule that makes the difference between a normal 'move' and 'dekking'
			// There should be NO own piece on the To tile for moving, but there can be for dekking
			if (toTile.piece && toTile.piece.playerIndex === playerIndex) {
				return {
					allowed:false, 
					dekking:true, // The piece is covering this spot, just only it currently contains its own piece
					reason:"The destination tile is occupied with an own piece"
				};
			}
			return {
				allowed:true
			};
		},
		tilesBetween : function(fromTile, toTile, someBoard) {
			someBoard = someBoard || publics.board();
			var result = [];
			if (fromTile.x === toTile.x) {
				// Range over y, i.e. vertical
				var topDownSign = (toTile.y - fromTile.y) / Math.abs(toTile.y - fromTile.y);
				for(var d = 1; d < Math.abs(fromTile.y - toTile.y); d++) {				
					result.push(someBoard[fromTile.y+(d*topDownSign)][fromTile.x]);
				}
			} else if (fromTile.y === toTile.y) {
				// Range over y, i.e. vertical
				var leftRightSign = (toTile.x - fromTile.x) / Math.abs(toTile.x - fromTile.x);
				for(var d = 1; d < Math.abs(fromTile.x - toTile.x); d++) {				
					result.push(someBoard[fromTile.y][fromTile.x+(d*leftRightSign)]);
				}
			} else {
				// Diagonal
				var topDownSign = (toTile.y - fromTile.y) / Math.abs(toTile.y - fromTile.y);
				var leftRightSign = (toTile.x - fromTile.x) / Math.abs(toTile.x - fromTile.x);
				// Move over the diagonal range, in the correct topdown/leftright direction
				for(var d = 1; d < Math.abs(fromTile.y - toTile.y); d++) {
					result.push(someBoard[fromTile.y+(d*topDownSign)][fromTile.x+(d*leftRightSign)]);
				}
			}
			return result;
		},
		loopOverTiles : function(callback, someBoard) {
			someBoard = someBoard || publics.board();
			for(var i = 0; i < boardSize.height; i++) {
				for (var i2 = 0; i2 < boardSize.width; i2++) {
					// Execute callback
					callback(i,i2,someBoard[i][i2]);
				}
			}
		},
		dekkingPiecesForPiece : function(targetPiece, piecesForPlayer, someBoard) {
			piecesForPlayer = piecesForPlayer || publics.piecesForPlayer(targetPiece.playerIndex);
			someBoard = someBoard || publics.board();			
			// Get dekking pieces for this piece
			var dekkingPieces = [];
			$.each(piecesForPlayer, function(index,elm) {
				if (!elm.taken) {
					var moveAllowed = publics.moveAllowed(
						{x:elm.tile.x, y:elm.tile.y},
						{x:targetPiece.tile.x, y:targetPiece.tile.y},
						targetPiece.playerIndex,
						someBoard
					);
					if (moveAllowed.allowed || moveAllowed.dekking) {
						// If move is allowed, the piece can reach the targetPiece
						dekkingPieces.push(elm);
					}
				}
			});
			return dekkingPieces;
		},
		// Get the pieces that can be attacked by targetPiece
		attackablePiecesForPiece : function(targetPiece, otherPlayerPieces, someBoard) {
			otherPlayerPieces = otherPlayerPieces || publics.piecesForPlayer((targetPiece.playerIndex === 1 ? 2 : 1));
			if (targetPiece.playerIndex === otherPlayerPieces[0].playerIndex) {
				// Attacking our own pieces is silly
				return [];
			}
			someBoard = someBoard || publics.board();
			// Get the pieces that can be attacked by targetPiece
			var attackablePieces = [];
			$.each(otherPlayerPieces, function(index,elm) {
				if (!elm.taken) {
					var moveAllowed = publics.moveAllowed(
							{x:targetPiece.tile.x, y:targetPiece.tile.y},
							{x:elm.tile.x, y:elm.tile.y},
							targetPiece.playerIndex,
							someBoard
					);
					if (moveAllowed.allowed) {
						// If move is allowed, the piece can reach the targetPiece
						attackablePieces.push(elm);
					}
				}
			});
			return attackablePieces;
		},
		// Get pieces that attack targetPiece
		attackedByPiecesForPiece : function(targetPiece, otherPlayerPieces, someBoard) {
			otherPlayerPieces = otherPlayerPieces || publics.piecesForPlayer((targetPiece.playerIndex === 1 ? 2 : 1));
			if (targetPiece.playerIndex === otherPlayerPieces[0].playerIndex) {
				// We cannot being attacked by our own pieces
				return [];
			}
			someBoard = someBoard || publics.board();
			// Get pieces that attack targetPiece
			var attackedByPieces = [];
			$.each(otherPlayerPieces, function(index,elm) {
				if (!elm.taken) {
					var moveAllowed = publics.moveAllowed(
							{x:elm.tile.x, y:elm.tile.y},
							{x:targetPiece.tile.x, y:targetPiece.tile.y},
							elm.playerIndex,
							someBoard
					);
					if (moveAllowed.allowed) {
						// If move is allowed, the piece can reach the targetPiece
						attackedByPieces.push(elm);
					}				}
			});
			return attackedByPieces;
		},
		allowedMovesForPiece : function(piece) {
			// TODO: more efficient please :-)
			var allowedMoves = [];
			if (piece.number % 2 == 0) {
				// Even
				// Horizontal
				for(var x = 0; x < boardSize.width; x++) {
					var move = {
						from:{x:piece.tile.x, y:piece.tile.y},
						to:{x:x, y:piece.tile.y}
					};
					if (publics.moveAllowed(move.from, move.to, piece.playerIndex).allowed) {
						allowedMoves.push(move);
					}
				}
				// Vertical
				for(var y = 0; y < boardSize.height; y++) {
					var move = {
						from:{x:piece.tile.x, y:piece.tile.y},
						to:{x:piece.tile.x, y:y}
					};
					if (publics.moveAllowed(move.from, move.to, piece.playerIndex).allowed) {
						allowedMoves.push(move);
					}
				}
			} else {
				// Odd
				for(var x = 0; x < boardSize.width; x++) {
					for(var y = 0; y < boardSize.height; y++) {
						if (Math.abs(x - piece.tile.x) === Math.abs(y - piece.tile.y)) {
							// A diagonal move
							var move = {
								from:{x:piece.tile.x, y:piece.tile.y},
								to:{x:x, y:y}
							};
							if (publics.moveAllowed(move.from, move.to, piece.playerIndex).allowed) {
								allowedMoves.push(move);
							}
						}
					}
				}
			}
			return allowedMoves;
		},
		situationAfterMove : function(move, someBoard) {
			someBoard = someBoard || publics.board();
			// Situation is an object consisting of board and pieces
			var clonedBoard = publics.cloneBoard(someBoard);
			var piecesOnClonedBoard = [];
			// Place pieces in pieces array and set correct references on tiles
			publics.loopOverTiles(function(row,column,tile) {
				if (tile.piece) {
					// Add to pieces array
					piecesOnClonedBoard[tile.piece.playerIndex] = piecesOnClonedBoard[tile.piece.playerIndex] || [];
					piecesOnClonedBoard[tile.piece.playerIndex].push(tile.piece);
				}
			}, clonedBoard); // supply method with clonedBoard
			// Now do move on clonedBoard
			privates.movePiece(move.from, move.to, clonedBoard);
			return {
				board: clonedBoard,
				pieces: piecesOnClonedBoard
			};
		},
		cloneBoard : function(someBoard) {
			someBoard = someBoard || board;
			var clonedBoard = [];
			for(var i = 0; i < someBoard.length; i++) {
				clonedBoard[i] = [];
				for (var i2 = 0; i2 < someBoard[i].length; i2++) {
					clonedBoard[i][i2] = { 
						x: someBoard[i][i2].x,
						y: someBoard[i][i2].y
					};
					var oldPiece = someBoard[i][i2].piece;
					if (oldPiece) {
						clonedBoard[i][i2].piece = privates.createPiece(
							oldPiece.playerIndex,
							oldPiece.number,
							oldPiece.type,
							clonedBoard[i][i2]
						);
					}
				}
			}
			return clonedBoard;
		}
	}

	var privates = {
		createPiece : function(playerIndex,number,type,tile) {
			return {playerIndex : playerIndex, number: (number||1), type: (type||"n"), tile:tile};
		},
		createBoard : function(someBoardSize) {
			boardSize = someBoardSize || boardSize;
			var board = [];
			for(var i = 0; i < boardSize.height; i++) {
				board[i] = [];
				for (var i2 = 0; i2 < boardSize.width; i2++) {
					board[i][i2] = { y: i, x: i2 };
				}
			}
			function invertSide(column) {
				return boardSize.width-1-column;
			}

			// As many 1s as boardsize.width minus 2 on each side
			var player1Row = 0;
			var player2Row = boardSize.height-1;
			for(var index = 0; index < (boardSize.width-4); index++) {
				
				board[player1Row+1][index+2].piece = { type: "n", number: 1, playerIndex : 1 };
				board[player2Row-1][index+2].piece = { type: "n", number: 1, playerIndex : 2 };
			}
			// A 4 and a 5 on the sides
			var player1LeftColumn = 1;
			var player2LeftColumn = invertSide(player1LeftColumn);
			var player1RightColumn = boardSize.width-2;
			var player2RightColumn = invertSide(player1RightColumn);
			board[player1Row][player1LeftColumn+1].piece = privates.createPiece(1,4,"n");
			board[player2Row][player2LeftColumn-1].piece = { type: "n", number: 4, playerIndex : 2 };
			board[player1Row][player1RightColumn-1].piece = { type: "n", number: 5, playerIndex : 1 };
			board[player2Row][player2RightColumn+1].piece = { type: "n", number: 5, playerIndex : 2 };
			// Place kings in the center
			var player1CenterColumn = Math.floor(boardSize.width/2);
			var player2CenterColumn = invertSide(player1CenterColumn);
			board[player1Row][player1CenterColumn].piece = { type: "k", number: 2, playerIndex : 1};
			board[player2Row][player2CenterColumn].piece = { type: "k", number: 2, playerIndex : 2};
			// An 7 to the left of the king, if there is place for that
			if (boardSize.width > 7) {
				board[player1Row][player1CenterColumn+1].piece = { type: "n", number: 7, playerIndex : 1};
				board[player2Row][player2CenterColumn-1].piece = { type: "n", number: 7, playerIndex : 2};
			}
			// Add 8,9,etc to the right of the king, continuing until there is no more place
			for (var index = 1; index <= boardSize.width - 8; index++) {
				board[player1Row][player1CenterColumn-index].piece = { type: "n", number: 7+index, playerIndex : 1};
				board[player2Row][player2CenterColumn+index].piece = { type: "n", number: 7+index, playerIndex : 2};
			}

			// Create GameSituation
			gameSituation = new TalGameSituation(board);
		},
		playerCanMove : function(previousMoveAllowed) {
			if (gameIsRunning) {
				currentPlayer.doMove(publics.board(), currentPlayerIndex, (moves.length ? moves[moves.length] : false), previousMoveAllowed).done(function(move) {
					// Process move
					var from = move.from;
					var to = move.to;
					// Ensure that move is valid
					var moveAllowed = publics.moveAllowed(from,to,currentPlayerIndex);
					if (moveAllowed.allowed === false) {
						// Let the player try another move
						privates.trigger("invalidPlayerMove", move, moveAllowed.reason);
						privates.playerCanMove();
						return;
					}
					privates.movePiece(from,to);
					// Indicate that player has moved
					turnCount++;
					moves.push(move);
					privates.trigger("validPlayerMove", move);
					// Check if player has won
					var playerThatWon = privates.aPlayerHasWon();
					if (playerThatWon !== false) {
						gameIsRunning = false; // End of game
						privates.trigger("aPlayerHasWon", currentPlayerIndex);
						return;
					}
					// Let other player move
					currentPlayerIndex = privates.getNextPlayerIndex();
					currentPlayer = players[currentPlayerIndex];
					setTimeout(function() {
						privates.playerCanMove();
					}, 100);
				}).fail(function() {
					privates.trigger("error", "Player move did not execute");
				});
			}
		},
		aPlayerHasWon : function() {
			// Check if king is still present
			var piecesPlayer1 = publics.piecesForPlayer(1);
			var piecesPlayer2 = publics.piecesForPlayer(2);
			var returned;
			$.each(piecesPlayer1, function(index, piece) {
				if (piece.type === "k" && piece.taken) {
					returned = 2;
					return false; // break loop
				}
			});
			$.each(piecesPlayer2, function(index, piece) {
				if (piece.type === "k" && piece.taken) {
					returned = 1;
					return false; // break loop
				}
			});
			if (returned) {
				return returned;
			}
			return false;
		},
		movePiece : function(from,to,someBoard) {
			someBoard = someBoard || publics.board();
			var fromTile = someBoard[from.y][from.x];
			var toTile = someBoard[to.y][to.x];
			// If the toTile has a piece, it will be taken
			if (toTile.piece) {
				// Piece is taken. The piece.tile refers to toTile and is the last tile while it was on the board
				toTile.piece.taken = true;
			}
			// Move piece
			toTile.piece = fromTile.piece;
			delete fromTile.piece;		
			// Update piece -> tile reference
			toTile.piece.tile = toTile;	
		},
		getNextPlayerIndex : function() {
			var next = currentPlayerIndex + 1;
			if (next > playerCount) {
				next = 1;
			}
			return next;
		},
		trigger : function(callbackName) {
			if (callbacks[callbackName]) {
				for(var index in callbacks[callbackName]) {
					var callback = callbacks[callbackName][index];
					callback.apply(this, Array.prototype.slice.call(arguments,1));
				}
			}
		}
	}

	return publics;

}
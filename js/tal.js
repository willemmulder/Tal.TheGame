function TalGame() {

	// Players
	var playerCount = 2;
	var players = [];
	var currentPlayerIndex;
	var currentPlayer;

	// Board
	var boardSize = {width:0,height:0};
	var board = [];

	// Game stats
	var gameIsRunning = false;
	var turnCount = 0;
	var moves = [];

	// Callbacks
	var callbacks = {};

	var publics = {

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

		board : function() {
			return board;
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

		moveAllowed : function(from,to,playerIndex) {
			// fromTile should exist
			if (!board[from.y] || !board[from.y][from.x]) {
				return false;
			}
			var fromTile = board[from.y][from.x];
			// toTile should exist
			if (!board[to.y] || !board[to.y][to.x]) {
				return false;
			}
			var toTile = board[to.y][to.x];
			// There should be a piece on the From tile
			if (!fromTile.piece) {
				return false;
			}
			var piece = fromTile.piece;
			// The piece should be owned by the playerIndex' player
			if (piece.playerIndex !== playerIndex) {
				return false;
			}
			// TODO: validity checks on the move itself
			return true;
		}
	}

	var privates = {
		createBoard : function() {
			for(var i = 0; i < boardSize.height; i++) {
				board[i] = [];
				for (var i2 = 0; i2 < boardSize.width; i2++) {
					board[i][i2] = {};
				}
			}
			// Place pieces
			board[0][5].piece = { type: "k", playerIndex : 1};
			board[9][5].piece = { type: "k", playerIndex : 2};
		},
		playerCanMove : function() {
			currentPlayer.doMove(board, currentPlayerIndex, (moves.length ? moves[moves.length] : false)).done(function(move) {
				// Process move
				var from = move.from;
				var to = move.to;
				// Ensure that move is valid
				if (!publics.moveAllowed(from,to,currentPlayerIndex)) {
					// Let the player try another move
					privates.trigger("invalidPlayerMove", move);
					privates.playerCanMove();
					return;
				}
				privates.movePiece(from,to);
				// Indicate that player has moved
				privates.trigger("validPlayerMove", move);
				// Let other player move
				currentPlayerIndex = privates.getNextPlayerIndex();
				currentPlayer = players[currentPlayerIndex];
				privates.playerCanMove();
			}).fail(function() {
				privates.trigger("error", "Player move did not execute");
			});
		},
		movePiece : function(from,to) {
			var fromTile = board[from.y][from.x];
			var toTile = board[to.y][to.x];
			toTile.piece = fromTile.piece;
			delete fromTile.piece;			
		},
		getNextPlayerIndex : function() {
			var next = currentPlayerIndex + 1;
			if (next > playerCount) {
				next = 1;
			}
			return next;
		},
		trigger : function(callbackName, args) {
			if (callbacks[callbackName]) {
				for(var index in callbacks[callbackName]) {
					var callback = callbacks[callbackName][index];
					callback.apply(this, args);
				}
			}
		}
	}

	return publics;

}
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
				console.log("fromTile does not exist");
				return false;
			}
			var fromTile = board[from.y][from.x];
			// toTile should exist
			if (!board[to.y] || !board[to.y][to.x]) {
				console.log("toTile does not exist");
				return false;
			}
			var toTile = board[to.y][to.x];
			// There should be a piece on the From tile
			if (!fromTile.piece) {
				console.log("piece on fromTile does not exist");
				return false;
			}
			var piece = fromTile.piece;
			// The piece should be owned by the playerIndex' player
			if (piece.playerIndex !== playerIndex) {
				console.log("you cannot move pieces of other players");
				return false;
			}
			// Even pieces should move in a straigt line (i.e. either the x or y should remain constant)
			if (piece.number % 2 == 0 && from.x !== to.x && from.y !== to.y) {
				return false;
			}
			// Odd pieces should move in a diagonal line (i.e. dx and dy should be equal)
			if (piece.number % 2 == 1 && Math.abs(from.x - to.x) !== Math.abs(from.y - to.y)) {
				return false;
			}
			// A piece can only moe as far as its number is counting
			var steps;
			if (piece.number % 2 == 1) { steps = Math.abs(from.x - to.x); }
			if (piece.number % 2 == 0) { steps = Math.abs(from.x - to.x) || Math.abs(from.y - to.y); }
			if (steps > piece.number) {
				return false;
			}
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
			function invertSide(column) {
				return boardSize.width-1-column;
			}
			// Place pieces
			// As many 1s as boardsize.width minus 2 on each side
			// TODO: make this work with any amount of players?
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
			board[player1Row][player1LeftColumn+1].piece = { type: "n", number: 4, playerIndex : 1 };
			board[player2Row][player2LeftColumn-1].piece = { type: "n", number: 4, playerIndex : 2 };
			board[player1Row][player1RightColumn-1].piece = { type: "n", number: 5, playerIndex : 1 };
			board[player2Row][player2RightColumn+1].piece = { type: "n", number: 5, playerIndex : 2 };
			// Place kings in the center
			var player1CenterColumn = Math.floor(boardSize.width/2);
			var player2CenterColumn = invertSide(player1CenterColumn);
			board[player1Row][player1CenterColumn].piece = { type: "k", number: 1, playerIndex : 1};
			board[player2Row][player2CenterColumn].piece = { type: "k", number: 1, playerIndex : 2};
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
function Tal() {

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
	var moves;

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
			var startingPlayerIndex = Math.ceil(Math.random() * playerCount);
			currentPlayerIndex = startingPlayerIndex;
			currentPlayer = players[currentPlayerIndex];
			// Reset game
			gameIsRunning = true;
			turnCount = 0;
			privates.createBoard();
			// Do first move
			privates.playerMove();
		}
	}

	var privates = {
		createBoard : function() {
			for(var i = 0; i < boardSize.height; i++) {
				board
			}
		},
		playerMove : function() {
			currentPlayer.doMove(board, (moves.length ? moves[moves.length] : false));
		}
	}

	return publics;

}
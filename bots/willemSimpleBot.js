TalGame.bots.willemSimpleBot = function(talGame) {
	return {
		doMove : function(board, playerIndex, previousMove, previousMoveAllowed) {
			var deferred = new $.Deferred();
			if (previousMoveAllowed && previousMoveAllowed.allowed === false) {
				talGame.giveUp(playerIndex);
				return deferred.promise();
			}
			// Notify player that he can move
			$(".status").html("Computer (player " + playerIndex + ") is moving. His color is");
			$(".playercolor").html("<div class='tile' playerindex='" + playerIndex + "'></div>");

			// Strategy:
			// 1. If we can get the king, do it
			// 2. If our king is attacked, move it to a safe place
			// 3. Calculate the 'totalOtherPlayerAttack' and 'totalDekking'. Do the move that minimises the other player's attack and maximizes the dekking. Also calculate the 'totalOtherPlayerForce' and minimize that (i.e. take its pieces!)
			// 4. Also take into account those pieces away that are hard attacked but not dekked

			// Get some stats and make a move!
			var pieces = talGame.piecesForPlayer(playerIndex);
			var otherPlayerPieces = talGame.piecesForPlayer(playerIndex === 1 ? 2 : 1);
			
			// ===
			// Other players force
			// ===
			// Find out the total force of the other player
			var currentTotalForce = 0;
			$.each(otherPlayerPieces, function(index, piece) {
				if (!piece.taken) {
					currentTotalForce += piece.number;
				}
			});

			// ===
			// Are we under attack?
			// ===
			var currentTotalAttackedBy = 0;
			$.each(pieces, function(index, piece) {
				var attackingPieces = talGame.attackedByPiecesForPiece(piece, otherPlayerPieces);
				if (attackingPieces.length) {
					currentTotalAttackedBy += piece.number; // A higher number under attack is worse
					if (piece.type === "k") {
						// Never ever give away our king
						currentTotalAttackedBy += (pieces.length * board.length);
					}
				}
			});

			// ===
			// Do we attack?
			// ===
			var currentTotalAttack = 0;
			$.each(pieces, function(index, piece) {
				var attackingPieces = talGame.attackablePiecesForPiece(piece, otherPlayerPieces);
				if (attackingPieces.length) {
					$.each(attackingPieces, function(index2, otherPlayerPiece) {
						currentTotalAttack += otherPlayerPiece.number; // A higher number under attack is better
						if (otherPlayerPiece.type === "k") {
							// Attacking their king is GREAT (most often)
							currentTotalAttack += (otherPlayerPieces.length * board.length / 2);
						}
					});
				}
			});

			// === 
			// Dekking
			// ===
			// Find out which move leads to the highest 'dekking' (i.e. the cumulative amount of defense for all pieces)
			var currentTotalDekking = 0;
			$.each(pieces, function(index,piece) {
				var dekkingPieces = talGame.dekkingPiecesForPiece(piece);
				currentTotalDekking += dekkingPieces.length;
			});
			
			// ===
			// Calculate all possible moves and their results
			// ===
			var highestMove;
			var highestMoveDekking = 0;
			var lowestTotalForce = 9999999999;
			var lowestTotalAttackedBy = 9999999999;
			var highestTotalAttack = 0;
			var highestTotalImprovement = -100000; // A combination of dekking, force etc, compared to the current situation. Higher is better for us

			var currentSituationBoard = talGame.board();
			$.each(pieces, function(index,piece) {
				var allowedMoves = talGame.allowedMovesForPiece(piece);
				$.each(allowedMoves, function(index2, allowedMove) {
					var newSituation = talGame.situationAfterMove(allowedMove, currentSituationBoard);
					var otherPlayerPieces = newSituation.pieces[playerIndex === 1 ? 2 : 1];
					var currentPlayerPieces = newSituation.pieces[playerIndex];

					// ==
					// Force
					// ==
					var newTotalForce = 0;
					var kingPresent = false;
					$.each(otherPlayerPieces, function(index, piece) {
						if (!piece.taken) {
							newTotalForce += piece.number;
							if (piece.type === "k") {
								kingPresent = true;
							}
						}
					});
					if (newTotalForce < lowestTotalForce) {
						lowestTotalForce = newTotalForce;
					}

					// ===
					// Are we under attack?
					// ===
					var newTotalAttackedBy = 0;
					var attackedByPieces;
					$.each(currentPlayerPieces, function(index, piece) {
						attackedByPieces = talGame.attackedByPiecesForPiece(piece, otherPlayerPieces, newSituation.board);
						if (attackedByPieces.length) {
							newTotalAttackedBy += piece.number; // A higher number under attack is worse
							if (piece.type === "k") {
								// Never ever give away our king
								newTotalAttackedBy += (currentPlayerPieces.length * board.length);
							}
						}
					});
					if (newTotalAttackedBy < lowestTotalAttackedBy) {
						lowestTotalAttackedBy = newTotalAttackedBy;
					}

					// ===
					// Do we attack?
					// ===
					var newTotalAttack = 0;
					$.each(currentPlayerPieces, function(index, currentPlayerPiece) {
						var attackingPieces = talGame.attackablePiecesForPiece(currentPlayerPiece, otherPlayerPieces, newSituation.board);
						if (attackingPieces.length) {
							$.each(attackingPieces, function(index2, otherPlayerPiece) {
								newTotalAttack += otherPlayerPiece.number; // Attacking a higher number is better
								if (otherPlayerPiece.type === "k") {
									// Attacking their king is GREAT (most often)
									newTotalAttack += (otherPlayerPieces.length * board.length / 2);
								}
							});
						}
					});
					if (newTotalAttack > highestTotalAttack) {
						highestTotalAttack = newTotalAttack;
					}

					// ==
					// Dekking
					// ==
					var newTotalDekking = 0;
					$.each(newSituation.pieces[playerIndex], function(index3, newSituationPiece) {
						var dekkingPieces = talGame.dekkingPiecesForPiece(newSituationPiece, newSituation.pieces[playerIndex], newSituation.board);
						newTotalDekking += dekkingPieces.length;
					});
					if (newTotalDekking > highestMoveDekking) {
						highestMoveDekking = newTotalDekking;
					}

					// ==
					// Total
					// ==
					// If total is higher than we encountered thus far, save it
					// We find totalForce 4 times more important than dekking 
					// currentTotalAttackedBy 2 times more important than dekking
					// currentTotalAttack also 2 times more important than dekking
					/*if (currentTotalForce === 0) { currentTotalForce = 0.11; };
					if (currentTotalAttack === 0) { currentTotalAttack = 0.11; };
					if (currentTotalAttackedBy === 0) { currentTotalAttackedBy = 0.11; };
					var totalImprovement = 
						((currentTotalForce - newTotalForce)/currentTotalForce*4) + // percentage decrease in other player's force * 4
						((newTotalAttack - currentTotalAttack)/currentTotalAttack*2) + // increase
						((currentTotalAttackedBy - newTotalAttackedBy)/currentTotalAttackedBy*2) + // decrease
						// percentage decrease in attack by other player * 2
						(newTotalDekking - currentTotalDekking)/currentTotalDekking // percentage increase in dekking
					*/
					var totalImprovement = - newTotalForce*4 - newTotalAttackedBy*4 + newTotalAttack*2 + newTotalDekking;
					// If their king is gone, totalFactor is Infinity
					if (!kingPresent) {
						totalImprovement = Infinity;
					}
					if (totalImprovement > highestTotalImprovement) {
						highestTotalImprovement = totalImprovement;
						highestMove = allowedMove;
						//console.log("this is even better!", newTotalForce, newTotalAttackedBy, newTotalAttack, newTotalDekking, newSituation.board, attackedByPieces);
					}
				});
			});
			// Check highest dekking
			/*
			console.log("CURRENT", currentTotalDekking);
			console.log("HIGHEST", highestMoveDekking);
			console.log("current force", currentTotalForce);
			console.log("lowest force", lowestTotalForce);
			console.log("current attackedBy", currentTotalAttackedBy);
			console.log("lowest attackedBy", lowestTotalAttackedBy);
			console.log("current attack", currentTotalAttack);
			console.log("highest attack", highestTotalAttack);
			console.log("best move", highestMove);
			console.log("best totalFactor", highestTotalImprovement);*/
			deferred.resolve(highestMove);
			return deferred.promise();
		}
	}
};
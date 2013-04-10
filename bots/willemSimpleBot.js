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
			
			// ===
			// Other players force
			// ===
			// Find out the total force of the other player
			var otherPlayerPieces = talGame.piecesForPlayer(playerIndex === 1 ? 2 : 1);
			var currentTotalForce = 0;
			$.each(otherPlayerPieces, function(index, piece) {
				if (!piece.taken) {
					currentTotalForce += piece.number;
				}
			});

			// ===
			// Are we under attack?
			// ===
			var otherPlayerPieces = talGame.piecesForPlayer(playerIndex === 1 ? 2 : 1);
			var currentTotalAttack = 0;
			$.each(pieces, function(index, piece) {
				var attackingPieces = talGame.attackingPiecesForPiece(piece, otherPlayerPieces);
				if (attackingPieces.length) {
					currentTotalAttack += piece.number; // A higher number under attack is worse
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
			var lowestTotalAttack = 9999999999;
			var highestTotalImprovement = -100000; // A combination of dekking, force etc, compared to the current situation. Higher is better for us

			var currentSituationBoard = talGame.board();
			$.each(pieces, function(index,piece) {
				var allowedMoves = talGame.allowedMovesForPiece(piece);
				$.each(allowedMoves, function(index2, allowedMove) {
					var newSituation = talGame.situationAfterMove(allowedMove, currentSituationBoard);
					// ==
					// Force
					// ==
					var newTotalForce = 0;
					var kingPresent = false;
					var otherPlayerPieces = newSituation.pieces[playerIndex === 1 ? 2 : 1];
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

					// ==
					// Attack
					// ==
					var newTotalAttack = 0;
					$.each(newSituation.pieces[playerIndex], function(index, newSituationPiece) {
						var attackingPieces = talGame.attackingPiecesForPiece(newSituationPiece, otherPlayerPieces, newSituation.board);
						if (attackingPieces.length) {
							newTotalAttack += newSituationPiece.number; // A higher number under attack is worse
						}
					});
					if (newTotalAttack < lowestTotalAttack) {
						lowestTotalAttack = newTotalAttack;
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
					// We find totalForce 4 times more important than dekking and currentDekking 2 times more important than dekking
					var totalImprovement = 
						(currentTotalForce === 0 ? 0 : (currentTotalForce - newTotalForce)/currentTotalForce*4) + // percentage decrease in other player's force * 4
						(currentTotalAttack === 0 ? 0 : (currentTotalAttack - newTotalAttack)/currentTotalAttack*2) +
						// percentage decrease in attack by other player * 2
						(newTotalDekking - currentTotalDekking)/currentTotalDekking // percentage increase in dekking
					// If their king is gone, totalFactor is Infinity
					if (!kingPresent) {
						totalImprovement = Infinity;
					}
					if (totalImprovement > highestTotalImprovement) {
						highestTotalImprovement = totalImprovement;
						highestMove = allowedMove;
					}
				});
			});
			// Check highest dekking
			console.log("CURRENT", currentTotalDekking);
			console.log("HIGHEST", highestMoveDekking);
			console.log("current force", currentTotalForce);
			console.log("lowest force", lowestTotalForce);
			console.log("current attackedBy", currentTotalAttack);
			console.log("lowest attackedBy", lowestTotalAttack);
			console.log("best move", highestMove);
			console.log("best totalFactor", highestTotalImprovement);
			deferred.resolve(highestMove);
			return deferred.promise();
		}
	}
};
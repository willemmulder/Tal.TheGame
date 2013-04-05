function TalCssRenderer(elm) {

	// Callbacks
	var callbacks = {};
	var canvas = $(elm);

	// Interaction variables
	var selectedTile;
	var lastBoard;

	// Make move if two tiles are clicked
	canvas.on("click", ".tile", function() {
		if (!selectedTile) {
			selectedTile = this;
			publics.reRender();
			return;
		} else {
			var fromTile = $(selectedTile);
			selectedTile = null;
			var toTile = $(this);
			publics.reRender();
			privates.trigger("playerInput", {
				from : {
					x : fromTile.attr("column"), 
					y : fromTile.attr("row")
				},
				to : {
					x : toTile.attr("column"), 
					y : toTile.attr("row")
				}
			});
		}
	});

	var publics = {
		render : function(board) {
			lastBoard = board;
			for (var rowIndex in board) {
				var row = board[rowIndex];
				for (var columnIndex in row) {
					var tile = row[columnIndex];
					var $tile = canvas.find(".row_"+rowIndex+".column_"+columnIndex);
					if (!$tile.length) {
						$tile = $("<div>").addClass("tile").addClass("row_"+rowIndex).addClass("column_"+columnIndex);
						$tile.attr("column", columnIndex);
						$tile.attr("row", rowIndex);
						$tile.css("left", columnIndex*50 + "px");
						$tile.css("top", rowIndex*50 + "px");
						canvas.append($tile);
					}
					var piece = tile.piece;
					if (piece) {
						$tile.attr("playerindex", piece.playerIndex);
						if (piece.type === "n") {
							$tile.html(piece.number);
						} else {
							$tile.html(piece.type + piece.number);
						}
					} else {
						$tile.removeAttr("playerindex");
						$tile.html("");
					}
					if (selectedTile === $tile.get(0)) {
						$tile.addClass("selected");
					} else {
						$tile.removeClass("selected");
					}
				}
			}
		},

		reRender : function() {
			return publics.render(lastBoard);
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
		}
	}

	var privates = {
		trigger : function(callbackName) {
			if (callbacks[callbackName]) {
				for(var index in callbacks[callbackName]) {
					var callback = callbacks[callbackName][index];
					callback.apply(this, Array.prototype.slice.call(arguments,-1));
				}
			}
		}
	}

	return publics;
}
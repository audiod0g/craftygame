function ADTileset(theImportData) {
	this.importData=theImportData;
	this.xTileCount=theImportData.imagewidth / theImportData.tilewidth;
	this.yTileCount=theImportData.imageheight / theImportData.tileheight;
	this.firstIndex=theImportData.firstgid; // 1 = first element (not 0)
	this.lastIndex=this.firstIndex + (this.xTileCount * this.yTileCount) - 1;
	this.tiles={};
	this.hasTiles=false;

	this.addTileWithIndex = function(tileIndex) {
		// Return false if the index is outside our bounds
		var i, x, y;
		if ((tileIndex < this.firstIndex) || (tileIndex > this.lastIndex)) return false;
		
		// Add to our tile object list
		i = tileIndex - this.firstIndex;
		y = Math.floor(i / this.xTileCount);
		x = i - (y * this.xTileCount);
		this.tiles[tileIndex] = [x, y];
		this.hasTiles=true;
		//console.log(tileIndex, x, y);
		
		return true;
	}
	
	
	this.checkOwnsTile = function(tileIndex) {
		return (this.hasTiles && this.tiles.hasOwnProperty(tileIndex));
	}
}


function ADLayer(theImportData) {
	this.importData=theImportData;
	this.xTileCount=theImportData.width;
	this.yTileCount=theImportData.height;
	this.dataIndex=0;
	this.dataCount=theImportData.data.length;
	
	this.getNextTile = function() {
		// Iterate data while index is within bounds until a tile is found
		var tile = (this.dataIndex < this.dataCount) ? this.importData.data[this.dataIndex] : 0;
		var result = 0;
		var x, y;

		while((this.dataIndex < this.dataCount) && !tile) {
			this.dataIndex = this.dataIndex + 1;
			tile = this.importData.data[this.dataIndex];
			//console.log(this, tile);
		}
		if (tile) {
			// Create result object
			y = Math.floor(this.dataIndex / this.xTileCount);
			x = this.dataIndex - (y * this.xTileCount);
			result = {};
			result.index = tile;
			result.x = x;
			result.y = y;

			// Move to next tile			
			this.dataIndex = this.dataIndex + 1;
		}	
		
		return result;
	}
}


// Class to link layer tiles to the tilesets, so the properties can be combined. If there is a clash layer over-rides tileset prop
function ADMap(theLayers, theTilesets) {
	this.layers = theLayers;
	this.tilesets = theTilesets;
	this.layerIndex = 0;
	this.layerCount = theLayers.length;
	this.tilesetIndex = 0;
	this.tilesetCount = theTilesets.length;
	
	// If there is a clash layer over-rides tileset prop
	this.mergeLayerAndTilesetProperties = function(iLayer, iTileset) {
		var k, prop = {};
		// First copy layer property
		for (k in this.layers[iLayer].importData.properties) {
			if (this.layers[iLayer].importData.properties.hasOwnProperty(k)) {
				prop[k] = this.layers[iLayer].importData.properties[k];
			}
		}
		
		// Now merge in tileset property
		for (k in this.tilesets[iTileset].importData.properties) {
			if (this.tilesets[iTileset].importData.properties.hasOwnProperty(k) && !prop.hasOwnProperty(k)) {
				prop[k] = this.tilesets[iTileset].importData.properties[k];
			}
		}
		return prop;
	}
	
	this.getNextTile = function() {
		var tile = false;
		while ((this.layerIndex < this.layerCount) && (!(tile = this.layers[this.layerIndex].getNextTile()))) {
			this.layerIndex = this.layerIndex + 1;		
		}
		
		if (tile) {
			// Get the tileset the tile belongs to so we can merge in properties			
			this.tilesetIndex = 0;
			while ((this.tilesetIndex < this.tilesetCount) && !this.tilesets[this.tilesetIndex].checkOwnsTile(tile.index)) {
				this.tilesetIndex = this.tilesetIndex + 1;
			}
			
			if (this.tilesetIndex < this.tilesetCount) {
				// We have a tileset - merge the properties
				tile.properties = this.mergeLayerAndTilesetProperties(this.layerIndex, this.tilesetIndex);
			}
		}
		return tile;		
	}
	
	// return l1ti628 for level 1, tile 628
	this.getComponentName = function(tilesetIndex) {
	
	}
}


// Crafty.load doesn't play with jQuery.ajax so roll our own json loader....

// Load JSON text from server hosted file and return JSON parsed object
function loadJSON(filePath) {
  // Load json file;
  var json = loadTextFileAjaxSync(filePath, "application/json");
  // Parse json
  return JSON.parse(json);
}   

// Load text with Ajax synchronously: takes path to file and optional MIME type
function loadTextFileAjaxSync(filePath, mimeType)
{
  var xmlhttp=new XMLHttpRequest();
  xmlhttp.open("GET",filePath,false);
  if (mimeType != null) {
    if (xmlhttp.overrideMimeType) {
      xmlhttp.overrideMimeType(mimeType);
    }
  }
  xmlhttp.send();
  //console.log(xmlhttp);
  if (xmlhttp.status==200 || xmlhttp.status==0)
  {
    return xmlhttp.responseText;
  }
  else {
    // TODO Throw exception
    throw "balls";
    return null;
  }
}



function ADLevelLoader(levelURL) {
	var that = this;
	var level;
	
	this.result = null;
	
	
	
    /* Return a list of unique tile indexes used by the layers */
    this._getTileIndexesFromLayers = function(layers) {
    	var tileIndexes = {};
    	var iLayer, lenLayer, layer, iData, lenData, cell;
    	// Iterate layers
        for (iLayer = 0, lenLayer = layers.length; iLayer < lenLayer; iLayer++) {
    		// Iterate layer data
    		layer = layers[iLayer];
	        for (iData = 0, lenData = layer.data.length; iData < lenData; iData++) {
    			cell = layer.data[iData];
    			if (cell && !tileIndexes.hasOwnProperty(cell)) {
    				tileIndexes[cell] = cell;
    			} 
    		}
    	}
    	return tileIndexes;
    };
    
    level = loadJSON(levelURL);

	var tileIndexes, i, k, tilesetCount, tilesetIndex, tileIndexesCount, spriteComponentList;
	var tileIndexesSorted = [];
	var tilesets = [];
	var layers = [];
	var images = [];
	var layerCount, tile;
	console.log(level);
	
	// List of which tile indexes are used in the layers
	tileIndexes = that._getTileIndexesFromLayers(level.layers);

  
	// Sort indexes low to high
	for (k in tileIndexes) {
		if (tileIndexes.hasOwnProperty(k)) {
			tileIndexesSorted.push(tileIndexes[k]);
		}
	}
	tileIndexesSorted.sort(function(a,b){return a - b});
	//console.log(tileIndexesSorted);

  
	// Create a set of tileset objects, loaded with import data
	// These will store the sorted tile indexes
	for (i = 0, tilesetCount = level.tilesets.length; i < tilesetCount; i++) {
		tilesets[i] = new ADTileset(level.tilesets[i]);
		images.push(level.tilesets[i].image);
	}
	//console.log(tilesets);


	// Add the sorted tile indexes to the correct tile set. As they are sorted we can step through
	tilesetIndex = 0;
	for (i = 0, tileIndexesCount = tileIndexesSorted.length; i < tileIndexesCount; i++) {
		while (!(tilesets[tilesetIndex].addTileWithIndex(tileIndexesSorted[i]))) {
			tilesetIndex++;
			if (tilesetIndex >= tilesetCount) throw "No tileset to process tileIndex:" + tileIndexes[i];
		}
	}
	//console.log(tilesets);


	// Build layer objects from layer data
	for (i = 0, layerCount = level.layers.length; i < layerCount; i++) {
		layers.push(new ADLayer(level.layers[i]));
	}
  
	// Now we have arrays of tileset objects (tilesets), images (images) and layer objects (layers)
	// Load the images, then we can make some crafty components and sprites
	that.result = {tilesets:tilesets, images:images, layers:layers};
}

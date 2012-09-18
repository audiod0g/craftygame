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
function ADMap(level) {
	this.layers = level.layers;
	this.tilesets = level.tilesets;
	this.layerIndex = 0;
	this.layerCount = level.layers.length;
	this.tilesetIndex = 0;
	this.tilesetCount = level.tilesets.length;
	
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
	

	this.createSpriteComponents = function() {
		var i, k, spriteComponentList;
		for (i = 0; i < this.tilesetCount; i++) {
			if (this.tilesets[i].hasTiles) {
				spriteComponentList = {};	  	  
				for (k in this.tilesets[i].tiles) {
					if (this.tilesets[i].tiles.hasOwnProperty(k)) {
						spriteComponentList['l1ti' + k] = this.tilesets[i].tiles[k];
					}		  	  	  
				}
				//console.log(spriteComponentList);
				  
				// If we are doing a 2 step conversion, list is the data to save
				Crafty.sprite(this.tilesets[i].importData.tilewidth, this.tilesets[i].importData.image, spriteComponentList);
			}
		}	
	}
}





function ADLevelLoader(options) {
	var _options = options || {};
	this.map = null;
	this.tiledData = null;
	this.meta = {};
	this.scenes = _options.scenes || [''];
	this.startScene = _options.startScene || '';
	this.defaultZ = _options.defaultZ || 50;
	this.currentScene = this.scenes[0];
	
	// If a function is defined signature is: function(loader, sprite, value) 
	// where loader = ADLevelLoader instance, sprite = the sprite to configure, value = the component property value
	this.componentRules = _options.componentRules || {}; 


	this.getNextScene = function(update) {
		var i, l = (this.scenes.length - 1);
		for(i = 0; i < l; i++) {
			if (this.currentScene == this.scenes[i]) {
				if (update) this.currentScene = this.scenes[i + 1];
				return this.scenes[i + 1];
			}
		}
		return null;		
	} 
	
	
	this.setCurrentScene = function(scene) {
		this.currentScene = scene;
	}


	// Load textfile with Ajax synchronously: takes path to file and optional MIME type
	function _loadTextFileAjaxSync(filePath, mimeType) {
		var xmlhttp=new XMLHttpRequest();
		xmlhttp.open("GET",filePath,false);
		if (mimeType != null) {
			if (xmlhttp.overrideMimeType) {
				xmlhttp.overrideMimeType(mimeType);
			}
		}
		xmlhttp.send();
		//console.log(xmlhttp);
		if (xmlhttp.status==200 || xmlhttp.status==0) {
			return xmlhttp.responseText;
		} else {
			throw "AJAX file load error";
			return null;
		}
	}

	
    // Return a list of unique tile indexes used by the layers
    function _getTileIndexesFromLayers(layers) {
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
    }
    
    
    this.loadTiledJSON = function(levelURL) {
		var tileIndexes, i, k, tilesetCount, tilesetIndex, tileIndexesCount, spriteComponentList;
		var tileIndexesSorted = [];
		var tilesets = [];
		var layers = [];
		var images = [];
		var layerCount, tile;
		var level = _loadTextFileAjaxSync(levelURL, "application/json");
		level = JSON.parse(level);
		//console.log(level);
		
		// List of which tile indexes are used in the layers
		tileIndexes = _getTileIndexesFromLayers(level.layers);
	
	  
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
		this.tiledData = {tilesets:tilesets, images:images, layers:layers};
		this.map = new ADMap(this.tiledData);
	}
	
	
	this.createSpriteComponents = function() {
		if (!this.map) return;
		this.map.createSpriteComponents();
	}


	this.getMeta = function(field, theDefault) {
		return (this.meta.hasOwnProperty(field) && (this.meta[field] != null)) ? this.meta[field] : theDefault;
	}
	
	
	this.setMeta = function(field, value) {
		this.meta[field] = value;
	}
	
	
	this.createSpriteEntities = function() {
		if (!this.map) return;
		
		var timeout = 5000;
		var component, rule, tile, z;// = this.map.getNextTile();
		this.meta = {};
		while((tile = this.map.getNextTile()) && (timeout-- > 0)) {		
			//console.log(tile.index, tile.properties);
			
			// All tiles are 2D. If 2D property is not defined apply the defaultZ
			z = tile.properties.hasOwnProperty('2D') ? tile.properties['2D'] : 0;
			if (!z) z = 50;
			sprite = Crafty.e("2D, DOM, l1ti" + tile.index).attr({ x: tile.x * 16, y: tile.y * 16, z:z });
			
			// Cycle through the defined component rules and apply them if we have matching properties in the tile
			for (component in this.componentRules) {
				if (this.componentRules.hasOwnProperty(component)) {
					if (tile.properties.hasOwnProperty(component)) {
						// Component is defined in the tile - add it
						sprite.addComponent(component);
						
						// Do we have a callback to apply?
						rule = this.componentRules[component];
						if (typeof rule == 'function') {
							// We do - pass in the level instance, the sprite to configure, the component property value
							rule(this, sprite, tile.properties[component]);
						}
					}
				}
			}
		}	
	}
}

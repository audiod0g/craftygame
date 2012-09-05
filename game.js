/*
*Create simple 8 x 8 platform grid (32px)
*create walking character (32px)
*walk around grid
*create gravity and jump

stop player from leaving map (only guard left and right - need up open for exit)
collect reward 
scoreboard
collect reward animation
time elapsed
exit animation (disable key input, walk up)
sound fx - jump, collect reward, walk, complete level, background music
game completed scene
start game scene

create hazzards
create monsters
scores
levels

*/



//  https://github.com/audiod0g/craftygame.git






window.onload = function () {
    //start crafty
//    Crafty.init(64, 64);
    Crafty.init(640, 480);
    //Crafty.canvas();

    //turn the sprite map into usable components
/*    Crafty.sprite(16, "tiles.png", {
        ground1: [5, 0],
        ground2: [5, 37],
    });
    
	Crafty.sprite(32, "grog.png", {
        player: [0, 0],
    });
    
    //method to generate the map
    function generateWorld() {
    	Crafty.e("TiledLevel").tiledLevel("level1.json", "DOM");
	}*/
    
    
    function generateWorld2() {
        // Make ground floor
        var j = 29;
        for (var i = 0; i < 40; i++) {
	        Crafty.e("2D, DOM, solid, ground1").attr({ x: i * 16, y: j * 16, z:2 });
        }
        
        // Make steps
        var mod = 3;
        for (j = 25; j > 10; j -= 5) {
			for (var i = 0; i < 40; i++) {
				var i_int = parseInt(i / mod);
				var i_mod = i_int % mod;
				
				//console.log(i, i_int, i_mod);
			
				if (i_mod) {
					Crafty.e("2D, DOM, solid, ground1").attr({ x: i * 16, y: j * 16, z:1 });
				}
			}        
			mod++;
        }
    }
    


/*
    Crafty.c('Grid', {
        _cellSize: 16,
        Grid: function(cellSize) {
            if(cellSize) this._cellSize = cellSize;
            return this;
        },
        col: function(col) {
            if(arguments.length === 1) {
                this.x = this._cellSize * col;
                return this;
            } else {
                return Math.round(this.x / this._cellSize);
            }
        },
        row: function(row) {
            if(arguments.length === 1) {
                this.y = this._cellSize * row;
                return this;
            } else {
                return Math.round(this.y / this._cellSize);
            }
        },      
        snap: function(){
            this.x = Math.round(this.x/this._cellSize) * this._cellSize;
            this.y = Math.round(this.y/this._cellSize) * this._cellSize;
        }
    });
    */
    
    Crafty.c('Ape', {
        Ape: function() {
			//setup animations
			this.requires("SpriteAnimation, Collision")
			.animate("walk_left", 0, 0, 7)
			.animate("walk_right", 0, 1, 7)
			//change direction when a direction change event is received
			.bind("NewDirection",
				function (direction) {
					if (direction.x < 0) {
						if (!this.isPlaying("walk_left"))
							this.stop().animate("walk_left", 10, -1);
					}
					if (direction.x > 0) {
						if (!this.isPlaying("walk_right"))
							this.stop().animate("walk_right", 10, -1);
					}
					if(!direction.x && !direction.y) {
						this.stop();
					}
			})
			
        	.onHit("solid", function(hit) {
        		//console.log(this, hit);
				for (var i = 0; i < hit.length; i++) {
					// Check player cannot jump through something solid
					if (this._y < (hit[i].obj._y + hit[i].obj._h)) {
						// We hit the bottom
						this.y = hit[i].obj._y + hit[i].obj._h;	
		        		this._up = false;
					}
					
					if ((this._y + this._h) > hit[i].obj._y) {
						// We hit the top
						this.y = hit[i].obj._y + this._h;	
		        		this._up = false;
					}									
				}	
	        })
			
			// A rudimentary way to prevent the user from passing solid areas
			.bind('Moved', function(from) {
				if(this.hit('solid')){
					this.attr({x: from.x, y:from.y});
				}
			})
			.onHit("fire", function() {
				this.destroy();
			});
            return this;
        }
    });


    Crafty.scene("main", function () {
        //generateWorld();
        
        //create our player entity with some premade components
        var player1 = Crafty.e("2D, DOM, Ape, player, Twoway, Gravity")
                .attr({ x: 16, y: 400, z: 1 })
                .twoway(1, 5)
                .gravity('solid')
                .Ape();
    });
    
    
    //the loading screen that will display while our assets load
    Crafty.scene("loading", function () {
    	var loader, sprite;
        //load takes an array of assets and a callback when complete
/*        console.log('about to load');
        Crafty.load(["grog.png"], function () {
        	console.log('loaded!');
            Crafty.scene("main"); //when everything is loaded, run the main scene
        });
 */
        //black background with some loading text
        Crafty.background("#000");
        Crafty.e("2D, DOM, Text").attr({ w: 100, h: 20, x: 150, y: 120 })
                .text("Loading")
                .css({ "text-align": "center" });
                
        
        loader = new ADLevelLoader('level1.json');
        //loader = new ADLevelLoader('test.json');
        
       	//console.log('json parsed', loader.result);
        	// Now load the images
       	if (!loader.result) throw "Error loading level";
       	loader.result.images.push("grog.png");
       	
       	Crafty.load(loader.result.images, function() {
       		var i, tile, z, prop, reel, dir;
       		var timeout;
       		
       		var map = new ADMap(loader.result.layers, loader.result.tilesets);
       		
			console.log('images loaded!', loader.result);

			// From tileset tiles build sprite components			
			for (i = 0; i < loader.result.tilesets.length; i++) {
				if (loader.result.tilesets[i].hasTiles) {
					spriteComponentList = {};	  	  
					for (k in loader.result.tilesets[i].tiles) {
						if (loader.result.tilesets[i].tiles.hasOwnProperty(k)) {
							// 22 
							spriteComponentList['l1ti' + k] = loader.result.tilesets[i].tiles[k];
						}		  	  	  
					}
					//console.log(spriteComponentList);
					  
					// If we are doing a 2 step conversion, list is the data to save
					Crafty.sprite(loader.result.tilesets[i].importData.tilewidth, loader.result.tilesets[i].importData.image, spriteComponentList);
				}
			}
	
			// Now iterate the layers and draw using these new components
			timeout = 1000;
			tile = map.getNextTile();
			while(tile && (timeout > 0)) {
			
				//console.log(tile.index, tile.properties);
				
				// 2D. Player has z = 1
				z = tile.properties.hasOwnProperty('2D') ? tile.properties['2D'] : 0;
				if (!z) z = 50;
				sprite = Crafty.e("2D, DOM, l1ti" + tile.index).attr({ x: tile.x * 16, y: tile.y * 16, z:z });
				
				// solid
				if (tile.properties.hasOwnProperty('solid')) {
					sprite.addComponent('solid');
				}
				
				// SpriteAnimation
				if (tile.properties.hasOwnProperty('SpriteAnimation')) {
					prop = JSON.parse('{' + tile.properties['SpriteAnimation'] + '}');
					//console.log(tile.index, prop);
					sprite.addComponent('SpriteAnimation');
					if ('updown' == prop.mode) {
						reel = [];
						for(i = prop.start; i <= prop.stop; i++) reel.push([i,0]);
						for(i = prop.stop - 1; i > prop.start; i--) reel.push([i,0]);
						sprite.animate(prop.name, reel);
					} else if ('up' == prop.mode) {
						sprite.animate(prop.name, prop.start, 0, prop.stop);
					} else if ('down' == prop.mode) {
						sprite.animate(prop.name, prop.stop, 0, prop.start);
					} else {
						console.log('unknown spriteanimation mode', prop.mode);
					}
					sprite.animate(prop.name, prop.time, -1);
				}
	
				// Other properties?
				//	reward : 100
				//	water
				// exit
				//console.log(tile);
				tile = map.getNextTile();
				timeout--;
			}
			
			// Create player sprite
			Crafty.sprite(32, "grog.png", {
        		player: [0, 0],
		    });
		    
		    // Call the main scene
	        //Crafty.scene("main");
	                var player1 = Crafty.e("2D, DOM, Ape, player, Twoway, Gravity")
                .attr({ x: 16, y: 400, z: 50 })
                .twoway(1, 6)
                .gravity('solid')
                .gravityConst(0.2)
                .Ape();
		});
    });

    //automatically play the loading scene
    Crafty.scene("loading");
    
};
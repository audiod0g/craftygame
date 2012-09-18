window.onload = function () {

	var levelLoader, scoreboard;

    Crafty.c('PickupAnimation', {
    	init: function () {
			this.requires("SpriteAnimation, pickup")
			.animate("pickup_animate", 0, 0, 7)
			.animate("pickup_animate", 32, 0)
			.bind("AnimationEnd", function() {
				this.destroy();
			});
			Crafty.audio.play('reward', 1, 0.4);
		}
	});
	
	
	Crafty.c('reward', {
		_rewardValue: 0,
		
		reward: function(value) {
			if (arguments.length) {
				this._rewardValue = parseInt(value);
				return this;
			} else {
				return this._rewardValue;
			}
		}
	});
	
	
	Crafty.c('Exitwalk', {
		init: function() {
			// Right point we first need to walk to
		    var x_bounds = Crafty.map.boundaries().max.x - this._w;
		    
		    // Switch off controls - we are on auto pilot now
			this.disableControl();
			
			// Remove gravity - so we can walk up
			this.antigravity();
			
			// Walk right animation 
			if (!this.isPlaying("walk_right")) {
				this.stop().animate("walk_right", 10, -1);
			}
				
			// Walk right then up till we go offscreen
			this.bind("EnterFrame", function() {
				if (this._x <= x_bounds) {
					// Walk right
					this.x = this._x + 1;
				} else if (this._y < (0 - this._h)) {
					// We are done
					console.log("we are done!");
					
					// Fireup next level?
					Crafty.scene(levelLoader.getNextScene(true));
					
					//this.y = 60;
				} else {
					// Walk up
					this.y = this._y - 1;
				}
			});
			
			// Cheer!
			Crafty.audio.play('cheer', 1, 0.7);
		}
	});
	
	
    Crafty.c('Score', {
    	_score: 0,
    	_rewardsRequired: 0,
    
    	init: function () {
			this.requires("2D, DOM, Text")
			.attr({x:0, y:0, w:512, h:32, z:500})
	        .textColor('#990099');
		},
		
		rewardsRequired: function(value) {
			if (arguments.length) {
				this._rewardsRequired = parseInt(value);
				return this;
			} else {
				return this._rewardsRequired;
			}
		},
		
		incScore: function(value) {
			this._score += value;
		},
		
		decRewardsRequired: function() {
			this._rewardsRequired--;
		},
		
		drawScore: function() {
			this.text('Points:' + this._score + " Rewards needed:" + this._rewardsRequired);
		}
	});	
	        		
	
    
    Crafty.c('Ape', {
        Ape: function() {
        	var x_bounds = Crafty.map.boundaries().max.x;
        	
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
	        
	        .onHit("reward", function(hit) {
        		// Remove reward
				for (var i = 0; i < hit.length; i++) {
					// Animation 				
					Crafty.e("2D, DOM, PickupAnimation")
						.attr({x : hit[i].obj._x, y: hit[i].obj._y, z:100});
					
					// Add score
					Crafty("Score").each(function () { 
						this.incScore(hit[i].obj.reward());
						this.decRewardsRequired();
						this.drawScore();
					});

					// Remove reward
					hit[i].obj.destroy();
				}				
	        })
	        
	        .onHit('exit', function(hit) {
	        	if (!this.has('Exitwalk')) {
					this.addComponent('Exitwalk');
				}
	        })
			
			.bind('Moved', function(from) {
				// A rudimentary way to prevent the user from passing solid areas			
				if(this.hit('solid')){
					this.attr({x: from.x, y:from.y});
				}
				
				// Ensure player cannot walk off screen left or right
				if ((this._x < 0) || ((this._x + this._w) > x_bounds)) {
					this.attr({x: from.x, y:from.y});
				}				
			})
			.onHit("fire", function() {
				this.destroy();
			});
            return this;
        }
    });


    //the loading screen that will display while our assets load
    Crafty.scene("loading", function () {
    	var loader, sprite;
    	var imageList = [	"tiles.png", 
    						"spinning_coin_gold.png", 
    						"spinning_coin_silver.png", 
    					 	"gem_150_points.png", 
    					 	"grog.png", 
    					 	"picked_up_16x16_colour.png"];
    	var progress = Crafty.e("2D, DOM, Text").attr({ w: 640, h: 20, x: 0, y: 220 })
                .text("Loading: 0%")
                .css({ "text-align": "center" });        

        //black background with some loading text
        Crafty.background("#000");
        
        // Prepare game audio
    	Crafty.audio.add({
			reward: ['reward.mp3', 'reward.wav', 'reward.ogg'],
			level1: ['level1.mp3'],
			cheer: ['cheer.mp3']
		});            	        
              
		// Load game images
       	Crafty.load(
       		imageList, 
			function() {
				Crafty.scene(levelLoader.getNextScene(true));
			}, 
			function(e) {
       			progress.text('Loading: ' + parseInt(e.percent) + '%');
       		},
       		function(e) {
       			console.log(e);
       			throw "Error loading images";
       		}
       	);
    });
    
    
    Crafty.scene('start_level1', function() {
    	Crafty.background('#f0d1b2');

		Crafty.e("2D, DOM, Text").attr({ w: 640, h: 20, x: 0, y: 220 })
						.text("Ready for level 1 !!!")
						.textColor('#012345')
						.css({ "text-align": "center" });
						
    	setTimeout(function() {
    		Crafty.scene(levelLoader.getNextScene(true));
    	}, 1000);
    });

    
    Crafty.scene("level1", function () {
		// Load level background tiles
		levelLoader.loadTiledJSON('level1.json');
       	if (!levelLoader.tiledData) throw "Error loading level";
		levelLoader.createSpriteComponents();
		levelLoader.createSpriteEntities();
       	
		// Sky blue background to match clouds
		Crafty.background('#5DB1FF');
		
		// Create player sprite
		Crafty.sprite(32, "grog.png", {
			player: [0, 0],
		});
		
		// Create reward animation sprite
		Crafty.sprite(16, "picked_up_16x16_colour.png", {
			pickup: [0, 0],
		});
				
		// Scoreboard
		if (!scoreboard) {
			scoreboard = Crafty.e("Score, Persist");
		}
		scoreboard.rewardsRequired(levelLoader.getMeta('rewardCount', 0)).drawScore();
		
		// Player
		Crafty.e("2D, DOM, Ape, player, Twoway, Gravity")
/*			.attr({ x: 16, y: 400, z: 50 }) */
			.attr({ x: 550, y: 50, z: 50 })
			.twoway(1, 6)
			.gravity('solid')
			.gravityConst(0.2)
			.Ape();
			
		// Background music
		//Crafty.audio.play('level1', -1);

    });


    Crafty.scene('start_level2', function() {
    	scoreboard.visible = false;
    
    	Crafty.background('#f09162');

		Crafty.e("2D, DOM, Text").attr({ w: 640, h: 20, x: 0, y: 220 })
						.text("Ready for level 2 !!!")
						.textColor('#543210')
						.css({ "text-align": "center" });
						
    	setTimeout(function() {
    		Crafty.scene(levelLoader.getNextScene(true));
    	}, 1000);
    });
    
    
    Crafty.scene("level2", function () {
		// Load level background tiles
		levelLoader.loadTiledJSON('level2.json');
       	if (!levelLoader.tiledData) throw "Error loading level";
		levelLoader.createSpriteComponents();
		levelLoader.createSpriteEntities();
       	
		// Sky blue background to match clouds
		Crafty.background('#5DB1FF');
		
		// Create player sprite
		Crafty.sprite(32, "grog.png", {
			player: [0, 0],
		});
		
		// Create reward animation sprite
		Crafty.sprite(16, "picked_up_16x16_colour.png", {
			pickup: [0, 0],
		});
				
		// Scoreboard
		scoreboard.visible = true;
		scoreboard.rewardsRequired(levelLoader.getMeta('rewardCount', 0)).drawScore();
		
		
		// Player
		Crafty.e("2D, DOM, Ape, player, Twoway, Gravity")
/*			.attr({ x: 16, y: 400, z: 50 }) */
			.attr({ x: 550, y: 50, z: 50 })
			.twoway(1, 6)
			.gravity('solid')
			.gravityConst(0.2)
			.Ape();
			
		// Background music
		//Crafty.audio.play('level1', -1);

    });


	// Start engine
    Crafty.init(640, 480);
    
    // Initialise level loader
	levelLoader = new ADLevelLoader({
		scenes: ['loading', 'start_level1', 'level1', 'start_level2', 'level2', 'level3', 'gameover'],
		startScene: 'start',
		defaultZ : 50,
		componentRules: {
			solid: true,
			exit: true,
			reward: function(loader, sprite, value) {
				sprite.reward(value);
				var rc = loader.getMeta('rewardCount', 0);
				rc++;
				loader.setMeta('rewardCount', rc);
			},
			SpriteAnimation: function(loader, sprite, value) {
				var reel;
				var prop = JSON.parse('{' + value + '}');
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
		}
	});
	levelLoader.setCurrentScene('loading');
	
	// Run loading scene
	Crafty.scene("loading");
};

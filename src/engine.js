// engine.js
//  It's the base of the engine, this code is big and someday
// it must be broken in separated things.
//  This contains the engine, that deals with main game logic
// related to the map state, the atomStack that can load
// functions with parameters from a buffer and manipulate it
// in game time.
//  This also contains the player element, that can take user
// input standardized by the HID and also deals with the chara
// that the user controls - in map state.
//  Last this defines the chars array, that contains all charas
// defined in the loaded map, and deals with their movements.
//  Since the actions.js only contains instant functions, the
// engine.actions usually deals with game time execution of the
// functions


var engine = {};
engine.actions = {}

var player = {};
var chars = []

function charalist() {
    if ("charas" in engine.currentLevel["Level"]) {
        listofcharas = engine.currentLevel["Level"]["charas"]
        if (listofcharas[0] == "") {
            return []
        }
        var count = listofcharas.length;
        var returnvalue = []

        for (var i = 0; i < count; i++) {
            var item = listofcharas[i];
            returnvalue.push(new char(item[0], item[1], item[2]))
        }

        return returnvalue
    } else {
        return []
    }
}

engine.resetBlocks = function() {
    actions.blockCounter = 0;
    actions.blockStack = new Array();
    actions.blockStack.push(actions.blockCounter.valueOf());
};

engine.setup = function() {
    engine.toggle = false;
    engine.currentLevel = null;
    engine.levels = null;
    engine.paused = false;
    engine.mapEventBlocked = false;
    engine.timer = null;
    engine.waitKey = false;
    engine.waitTimeSwitch = false;
    engine.minimumWait = false;
    engine.step = 4;
    engine.atomStack = new Array();
    engine.alertStack = new Array();
    engine.st = {};
    engine.st.vars = {};
    engine.resetBlocks()
    engine.state = "startScreen"
    engine.questionBoxUndef = -1
    engine.questionBoxAnswer = engine.questionBoxUndef
    engine.menuSetup()
    engine.charaToPan = player;
}

engine.menuSetup = function() {

    items.setup(resources.items)
    items.menuUpdate()
    engine.mapMenu = new menu({
        items: items.menu,
        status: {
            action: function() {
                engine.mapMenu.wait = true;
                actions.showStatus("hero");
                engine.atomStack.push([function() {
                    engine.mapMenu.wait = false;
                }, null]);
            },
            index: 1
        },

        config: new menu({
            showFPS: new menu({
                yes: {
                    action: [function() {
                        debug.FPS.show = true
                    }, 'exit'],
                    index: 0
                },

                no: {
                    action: [function() {
                        debug.FPS.show = false
                    }, 'exit'],
                    index: 1
                }
            }, 0),

            stepSpeed: new menu({
                x2: {
                    action: [function() {
                        engine.step = 4
                    }, 'exit'],
                    index: 0
                },

                x1: {
                    action: [function() {
                        engine.step = 2
                    }, 'exit'],
                    index: 1
                }
            }, 1),

            sound: new menu({
                on: {
                    action: [function() {
                        feedbackEng.soundOn = true
                    }, 'exit'],
                    index: 0
                },

                off: {
                    action: [function() {
                        feedbackEng.soundOn = false
                    }, 'exit'],
                    index: 1
                }
            }, 2),

            back: {
                action: 'exit',
                index: 3
            }
        }, 2, false, null, 2, true),
        exit: {
            action: 'exit',
            index: 3
        }
    },null, false, null, 2);
    menus.setParent(engine.mapMenu);
}

engine.playerFaceChar = function() {
    return engine.CharFaceChar(player);
}

engine.CharFaceChar = function(charp) {
    var count = chars.length;
    for (var i = 0; i < count; i++) {
        var thischar = chars[i];
        if (charp != thischar) {
            var ppx = Math.floor(charp.mapx / 32),
                ppy = Math.floor(charp.mapy / 32) + 1;

            var cpx = Math.floor(thischar.mapx / 32),
                cpy = Math.floor(thischar.mapy / 32) + 1;

            if (ppx - cpx == 1 && cpy - ppy == 0 && charp.facing == "left")
                return thischar

            if (ppx - cpx == -1 && cpy - ppy == 0 && charp.facing == "right")
                return thischar

            if (ppx - cpx == 0 && cpy - ppy == 1 && charp.facing == "down")
                return thischar

            if (ppx - cpx == 0 && cpy - ppy == -1 && charp.facing == "up")
                return thischar


        }
    }
    return false
}


engine.updateChars = function() {
    var count = chars.length;
    for (var i = 0; i < count; i++) {
        var thischar = chars[i];
        thischar.update()
    }
}

engine.testWaitForKey = function() {
    if (HID.inputs["accept"].active) {
        engine.waitKey = false;
        HID.inputs["accept"].active = false;
        engine.minimumWait = false;
    } else if (HID.inputs["cancel"].active) {
        engine.waitKey = false;
        HID.inputs["cancel"].active = false;
        engine.minimumWait = false;
    }
};

engine.waitForKey = function(state) {
    engine.waitKey = state;
    engine.minimumWait = false;
    setTimeout(function() {
        engine.minimumWait = true;
    }, 300);
};

engine.waitTime = function(time) {
    engine.waitTimeSwitch = true;
    engine.minimumWait = false;
    setTimeout(function() {
        engine.waitTimeSwitch = false;
    }, time);
}

engine.dirKeyActive = function() {
    if (HID.inputs["up"].active)
        return "up"
    else if (HID.inputs["down"].active)
        return "down"
    else if (HID.inputs["left"].active)
        return "left"
    else if (HID.inputs["right"].active)
        return "right"
    else
        return false

}

engine.loop = function() {
    if (!this.paused) {

        // update
        if (!engine.waitKey && !engine.waitTimeSwitch) {
            if (menus.isAnyMenuEnabled()) {
                menus.updateMenuEnabled();
                engine.runatomStack();
            } else {
                if (engine.state == "map") {
                    engine.updateChars();
                } else if (engine.state == "startScreen") {
                    title.startScreen();
                } else if (engine.state == "battle") {
                    battle.update()
                }
                engine.runatomStack();
            }
            engine.alertupdate()

        } else if (this.minimumWait) {
            this.testWaitForKey();
        }


    }

    HID.clearInputs();
    if(engine.toggle){
        HID.processGamepad();
    }
    engine.toggle = !(engine.toggle)
    engine.timer = setTimeout("engine.loop()", 1000 / 60.0);
};

engine.runatomStack = function() {
    if (engine.atomStack.length > 0) {
        while (engine.atomStack.length > 0) {
            eventToRun = engine.atomStack.shift();
            if (eventToRun[0] == "block") {
                break
            } else {
                eventToRun[0](eventToRun[1], eventToRun[2]);
            }
        }
    }
};


engine.checkMapBoundaries = function(_char, px, py, mapw, maph) {
    if (_char.facing == "up") {
        return (py > 0)
    } else if (_char.facing == "left") {
        return (px > 0)
    } else if (_char.facing == "right") {
        return (px < mapw)
    } else if (_char.facing == "down") {
        return (py < maph)
    }
    return True
}

engine.facingPosition = function(_char, px, py) {
    var facing = _char.facing
    if (facing == "up") {
        return [py - 1, px]
    } else if (facing == "left") {
        return [py, px - 1]
    } else if (facing == "right") {
        return [py, px + 1]
    } else {
        return [py + 1, px]
    }
    console.log("error facing! char: " + _char + " ;position: " + px + ", " + py)
    return false
}

engine.charWalkSteps = function(_char, walkSteps) {
    _char.steps -= walkSteps;
    if (_char.facing == "up") {
        _char.mapy -= walkSteps;
    } else if (_char.facing == "left") {
        _char.mapx -= walkSteps;
    } else if (_char.facing == "right") {
        _char.mapx += walkSteps;
    } else if (_char.facing == "down") {
        _char.mapy += walkSteps;
    }
}

engine.charaLookToPlayer = function(chara) {
    var ppx = Math.floor(player.mapx / 32),
        ppy = Math.floor(player.mapy / 32) + 1;
    var cpx = Math.floor(chara.mapx / 32),
        cpy = Math.floor(chara.mapy / 32) + 1;

    var resx = cpx - ppx
    var resy = cpy - ppy

    if (resx == 0 && resy < 0) {
        return "down"
    } else if (resx == 0 && resy > 0) {
        return "up"
    } else if (resx < 0) {
        return "right"
    } else {
        return "left"
    }
    console.log("error facing!" + resx + " , " + resy)
    return false
}

engine.charaLookAwayPlayer = function(chara) {
    var ppx = Math.floor(player.mapx / 32),
        ppy = Math.floor(player.mapy / 32) + 1;
    var cpx = Math.floor(chara.mapx / 32),
        cpy = Math.floor(chara.mapy / 32) + 1;

    var resx = cpx - ppx
    var resy = cpy - ppy

    if (resx == 0 && resy < 0) {
        return "up"
    } else if (resx == 0 && resy > 0) {
        return "down"
    } else if (resx < 0) {
        return "left"
    } else {
        return "right"
    }
    console.log("error facing!" + resx + " , " + resy)
    return false
}

engine.randomDirection = function() {
    var directions = ["down", "up", "right", "left", "down"]
    return directions[Math.floor(Math.random() * 4)]
}

engine.isCharFacingPlayer = function(_char) {
    var ppx = Math.floor(_char.mapx / 32),
        ppy = Math.floor(_char.mapy / 32) + 1;

    var cpx = Math.floor(player.mapx / 32),
        cpy = Math.floor(player.mapy / 32) + 1;

    if (ppx - cpx == 1 && cpy - ppy == 0 && _char.facing == "left") {
        return true
    } else if (ppx - cpx == -1 && cpy - ppy == 0 && _char.facing == "right") {
        return true
    } else if (ppx - cpx == 0 && cpy - ppy == 1 && _char.facing == "down") {
        return true
    } else if (ppx - cpx == 0 && cpy - ppy == -1 && _char.facing == "up") {
        return true
    }
    return false
}

engine.evalNum = function(number) {
    var value = number.slice(0)
    if (isNaN(value)) {
        if (value.indexOf("var:") == 0) {
            return engine.st.vars[value.split('var:')[1]]
        } else if (value.indexOf("ans:") == 0) {
            if (value.split('ans:')[1] == "num") {
                return engine.questionBoxAnswer
            } else {
                return engine.questionBoxAnswerStr
            }
        } else if (value.indexOf("lastbattle:") == 0) {
            return battle.lastresult
        } else if (value.indexOf("hero:") == 0) {
            if (value.split('hero:')[1] == "face") {
                return player.facing
            } else if (value.split('hero:')[1] == "x") {
                return Math.floor(player.mapx / 32)
            } else if (value.split('hero:')[1] == "y") {
                return Math.floor(player.mapy / 32) + 1
            }
        } else if (value.indexOf("map:") == 0) {
            if (value.split('map:')[1] == "this" || value.split('map:')[1] == "current" ) {
                return engine.currentLevel.Level.levelName
            }
        } else if (value.indexOf("item:") == 0) {
            var itemname = value.split('item:')[1];
            if(itemname in items.inventory){
              return items.inventory[itemname].quantity;
            } else {
              return 0;
            }
        } else {
            return value
        }
    } else {
        return +value
    }
}

engine.translateChara = function(charaName, charatodel){
  var charaPointer = [];
  if(charaName=='player'){
    charaPointer = player;
  } else if(charaName=='current'){
    if(typeof charatodel === 'undefined'){
        return;
    }
    var k = -2;
    for (var i = 0; i < chars.length; i++) {
        if (chars[i] == charatodel) {
            k = i;
            break;
        }
    }
    if (chars[k] != engine.player) {
        charaPointer = chars[k];
    }
  } else {
    for (var i = 0; i < chars.length; i++) {
        if (chars[i].name == charaName) {
            charaPointer = chars[i];
            break;
        }
    }
  }

  return charaPointer;
}

engine.testVar = function(param) {
    var var1 = engine.evalNum(param[0])
    if (var1 == "true") {
        return true
    } else if (var1 == "false") {
        return false
    }
    var operator = param[1]
    var var2 = engine.evalNum(param[2])
    var test = {
        '>': function(a, b) {
            return a > b
        },
        'bigger': function(a, b) {
            return a > b
        },
        'greater': function(a, b) {
            return a > b
        },
        '<': function(a, b) {
            return a < b
        },
        'smaller': function(a, b) {
            return a < b
        },
        'less': function(a, b) {
            return a < b
        },
        '>=': function(a, b) {
            return a >= b
        },
        '<=': function(a, b) {
            return a <= b
        },
        '==': function(a, b) {
            return a == b
        },
        'equal': function(a, b) {
            return a == b
        },
        '=': function(a, b) {
            return a == b
        }
    }
    return test[operator](var1, var2)
}

engine.actions.insideOutside = function(param) {
    if(param[0]=='inside' || param[0]=='in' || param[0]=='i'){
      screen.rains.drawrain = false;
      setTimeout(function(){bgmusic.changeVolume(0.5);},150)

    } else {
      screen.rains.drawrain = true;
      setTimeout(function(){bgmusic.changeVolume(0.7);},150)
    }
}

engine.actions.addItem = function(param) {
    for (var i = 0; i < param.length; i++) {
        items.addItem(param[i])
    }
}

engine.actions.subtractItem = function(param) {
    for (var i = 0; i < param.length; i++) {
        items.subtractItem(param[i])
    }
}

engine.actions.runScript = function(param) {
  var fpos = player.facingPosition()
  for (var i = 0; i < param.length; i++) {
    engine.translateActions(param[i][0], param[i][1], fpos);
  }
}

engine.actions.battle = function(param) {
    var monsterlist = [];
    var musicBattle = resources.init['World']['battleMusic'];
    var musicHuzzah = resources.init['World']['battleVictoryMusic'];
    for(var i=0; i<param.length; i++){
      if(param[i].indexOf("music:") == 0){
        musicBattle = param[i].split('music:')[1];
      } else if (param[i].indexOf("musicwin:") == 0) {
        musicHuzzah = param[i].split('musicwin:')[1];
      } else {
        monsterlist.push(param[i]);
      }
    }
    bgmusic.pushSong()
    battle.start(monsterlist, musicBattle, musicHuzzah)
}

engine.actions.changeState = function(param) {
    engine.state = param[0]
}

engine.actions.playMusic = function(param) {
  bgmusic.play(param[0]);
}

engine.actions.playSound = function(param) {
  sound.play(param[0]);
}

engine.actions.teleportInPlace = function(param) {
    var px = Math.floor(player.mapx / 32),
        py = Math.floor(player.mapy / 32) + 1;
    var map = param[0]
    engine.actions.teleport([px, py, map])
}

engine.actions.teleport = function(param) {
    //param = [positionX,positionY,level]
    engine.state = "map"
    engine.currentLevel = resources['levels'][param[2]];
    resources.tileset = resources.tile[engine.currentLevel.Level.tileImage]
    camera.setupMap(engine.currentLevel)
    player.mapx = parseInt(param[0], 10) * 32;
    player.mapy = (parseInt(param[1], 10) - 1) * 32;
    player.steps = 0;
    //    player.facing = "down";
    HID.cleanInputs()
    HID.clearInputs()
    chars = new charalist();
    chars.push(player)
    engine.waitTime(100);
}

engine.actions.changeTile = function(param) {
    //param = [tileType,layer,collision,event,positionY,positionX,level]
    //          0      , 1   , 2      , 3   , 4       , 5       , 6
    ///////////////////////////////////////////////////////////////////

    if (param[6] == null || param[6] == "this") {
        var levelToChange = engine.currentLevel
    } else {
        var levelToChange = resources['levels'][param[6]];
    }
    if (param[2] != -1) {
        levelToChange["Level"]["collision"][param[4]][param[5]] = param[2]
    }
    if (param[3] != -1) {
        levelToChange["Level"]["events"][param[4]][param[5]] = param[3]
    }

    levelToChange["Level"][param[1]][param[4]][param[5]] = param[0]
}

engine.actions.changeAllTiles = function(param) {
    //param = [originalTileType, newTileType,layer,collision,event,level]
    //              0          ,     1      ,  2  ,   3    ,  4  ,  5
    ///////////////////////////////////////////////////////////////////

    var originalTile = param[0]
    var newTile = param[1]
    var layer = param[2]

    if (param[5] == null || param[5] == "this") {
        var levelToChange = engine.currentLevel
    } else {
        var levelToChange = resources['levels'][param[5]];
    }
    var h = levelToChange["Level"]["collision"].length
    var w = levelToChange["Level"]["collision"][0].length

    for(var y=0; y<h; y++){
        for (var x=0; x<w; x++){
            var currTile = levelToChange["Level"][layer][y][x]
            if(currTile == originalTile){
                if (param[3] != -1) {
                    levelToChange["Level"]["collision"][y][x] = param[3]
                }
                if (param[4] != -1) {
                    levelToChange["Level"]["events"][y][x] = param[4]
                }

                levelToChange["Level"][layer][y][x] = param[1]
            }
        }
    }
}




engine.actions.IF = function(param, blockId) {
    if (engine.testVar(param)) {
        var removeActions = false
        for (var i = 0; i < engine.atomStack.length; i++) {
            if (engine.atomStack[i][0] == engine.actions.ELSE && engine.atomStack[i][2] == blockId) {
                removeActions = true

            }
            if (engine.atomStack[i][0] == engine.actions.END && engine.atomStack[i][2] == blockId) {
                return
            }
            if (removeActions) {
                engine.atomStack.splice(i, 1)
                i--
            }

        }
    } else {
        var actToRun = [0, 0, 0]
        while (engine.atomStack.length > 0 &&
            actToRun[0] != engine.actions.END &&
            actToRun[0] != engine.actions.ELSE ||
            actToRun[2] != blockId) {
            actToRun = engine.atomStack.shift();
        }
    }
}

engine.actions.END = function() {}

engine.actions.ELSE = function() {}

engine.actions.setVar = function(param) {
    engine.st.vars[param[0]] = engine.evalNum(param[1])
}

engine.actions.varPlusOne = function(param) {
    if (isNaN(engine.st.vars[param[0]])) {
        engine.st.vars[param[0]] = 0
    }
    engine.st.vars[param[0]]++
}



engine.actions.showPicture = function(param) {
    var picture = {} ;
    picture["image"] = param[0] ;
    picture["position"] = [param[1], param[2]] ;
    if(param[3]=="sys"){
        picture["sys"] = true ;
    }
    screen.pictureStack.push(picture)
}

engine.actions.stopPicture = function(param) {
    screen.clearPicture()
}

engine.actions.charAutoDelete = function(param, charatodel) {
    if(typeof charatodel === 'undefined'){
        return;
    }

    var k = -2;
    for (var i = 0; i < chars.length; i++) {
        if (chars[i] == charatodel) {
            k = i;
            break
        }
    }

    if (chars[k] != engine.player) {
        chars.splice(k, 1);
    }
}

engine.actions.moveChara = function(param, charatodel) {
  var chartomove = engine.translateChara(param[0],charatodel)
  for (var i = 1; i < param.length; i+=2) {
    chartomove.movstack.push([param[i],param[i+1]]);
  }
}

engine.actions.blockInput = function(param) {
  if(param[0]){
    player.blockInput = true;
  } else {
    player.blockInput = false;
  }
}

engine.actions.questionBox = function(param) {
    var answers = {}
    engine.questionBoxAnswer = engine.questionBoxUndef
    if (!(typeof engine.questionBoxMenu === "undefined")) {
        engine.questionBoxMenu.mdelete()
    }

    for (var i = 0; i < param.length; i++) {
        (function(i) {
            answers[param[i]] = {
                action: [function() {
                    engine.questionBoxAnswer = i;
                    engine.questionBoxAnswerStr = param[i]
                }, 'exit'],
                index: i
            };
        })(i);
    }
    engine.questionBoxMenu = new menu(answers, undefined, true)
    menus.setParent(engine.questionBoxMenu)
    menus.setAllDrawables()
    engine.questionBoxMenu.activate()
    if(engine.state=='map')
      feedbackEng.play('question');
}

engine.actions.changePan = function(param){
  engine.charaToPan = engine.translateChara(param[0]);
}

engine.actions.proceedBattleTurn = function(param) {
    battle.waitherodecision = false
}

engine.actions.changePlayerAnimation = function(param){
    var animation = param[0]
    if(param[0]=='default'){
        player.curr_animation = false
    } else {
        player.curr_animation = param[0]
    }
}

engine.actions.setCharaInvisibility = function(param){
  var charaToChange = engine.translateChara(param[0]);
  charaToChange.invisible = param[1];
}

engine.actions.alert = function(param) {
    var textalert = param
    var textlife = 60
    for (var i = 0; i < engine.alertStack.length; i++) {
        if (engine.alertStack[i][0] == textalert) {
            engine.alertStack[i][1] += textlife
            return
        }
    }
    engine.alertStack.push([textalert, textlife])
}

engine.alertupdate = function() {
    if (engine.alertStack.length > 0) {
        for (var i = 0; i < engine.alertStack.length; i++) {
            engine.alertStack[i][1]--
        }
        engine.alertStack.sort(function(a, b) {
            return a[1] - b[1]
        })
        if (engine.alertStack[0][1] <= 0) {
            engine.alertStack.shift()
        }
    }
}

engine.translateActions = function(action, param, position, charsender) {
    actions[action](param, position, charsender)
};

function char(chara, x, y) {
    this['draw'] = function(){ camera.drawChar(this) };
    this['name'] = chara;
    this['chara'] = resources['charas'][chara];
    this['charEventBlocked'] = false;
    this['nocollision'] = this.chara.properties.nocollision
    this['charaset'] = resources['charasets'][this['chara']['charaset']]
    this['pushable'] = this.chara.properties.pushable
    this['facing'] = 'down';
    if('step' in this.chara.properties){
      this['step'] = this.chara.properties.step;
    } else {
      this['step'] = engine.step;
    }
    this['steps'] = 0;
    this['invisible'] = false;
    this['waits'] = 0;
    this['mapx'] = x * 32;
    this['mapy'] = (y - 1) * 32;
    this['movstack'] = clone(this['chara']['movements']);
    this['stopped'] = false;
    this['curr_animation'] = false;
    this['mapheight'] = engine.currentLevel["Level"]["collision"].length-1;
    this['mapwidth'] = engine.currentLevel["Level"]["collision"][0].length;
    this['checkMapBoundaries'] = function(px, py, mapw, maph) {
        return engine.checkMapBoundaries(this, px, py, mapw, maph)
    }
    this['getMapYX'] = function(){
      var yx = [Math.floor(this.mapy / 32) + 1, Math.floor(this.mapx / 32)];
      return yx;
    }
    this['facingPosition'] = function(px, py) {
        return engine.facingPosition(this, px, py)
    }
    this['isFacingPlayer'] = function() {
        return engine.isCharFacingPlayer(this)
    }
    this['imediate'] = (this.chara.actions.type[1] == 1);
    this['followPlayer'] = function() {
        this.facing = engine.charaLookToPlayer(this)
    }
    this['awayPlayer'] = function() {
        this.facing = engine.charaLookAwayPlayer(this)
    }

    //check if the char can walk to certain direction
    this['canWalkTo'] = function(direction){
      this.facing = direction;
      var px; var py;
      [py, px] = this.getMapYX();
      var fpos = this.facingPosition(px, py);
      var charFacing = engine.CharFaceChar(this);
      return (this.checkMapBoundaries(px, py, this.mapwidth, this.mapheight) &&
          engine.currentLevel["Level"]["collision"][fpos[0]][fpos[1]] == 0 &&
          !(charFacing.nocollision)) ;
    }

    this['walkSteps'] = function(){
      if(this.steps > 0){
        engine.charWalkSteps(this, this.step)

        if ((this.mapx%32==0) && (this.mapy%32==0)) {
            //evType [onclick, onover, oncharaover], so we are checking charatouch here!
            if (eventInMap(engine.currentLevel["Level"], [0, 0, 1, 0, 0], this.getMapYX())) {
            }
        }
      }
    }

    this['update'] = function() {
        if (printer.isShown) return;

        if (this.steps == 0 && this.waits == 0 && this.stopped == false) {
            if (this['movstack'].length > 0) {
                var px = Math.floor(this.mapx / 32),
                    py = Math.floor(this.mapy / 32) + 1;
                var moveToDo = this['movstack'].shift();
                if (moveToDo[0] == "move") {
                    if (moveToDo[1] == "follow" || moveToDo[1] == "near") {
                        this.followPlayer()
                    } else if (moveToDo[1] == "away") {
                        this.awayPlayer()
                    } else if (moveToDo[1] == "random") {
                        this.facing = engine.randomDirection()
                    } else {
                        this.facing = moveToDo[1]
                    }


                    var fpos = this.facingPosition(px, py)
                    var charFacing = engine.CharFaceChar(this);
                    if (this.imediate) {
                        if (this.isFacingPlayer()) {
                            var playerpx = Math.floor(player.mapx / 32),
                                playerpy = Math.floor(player.mapy / 32) + 1;
                            //testing for player onover in this char
                            eventInChar(this, [0, 1, 0, 0, 0], [playerpy - 1, playerpx]);
                        }
                    }
                    if (this.checkMapBoundaries(px, py, this.mapwidth, this.mapheight) &&
                        engine.currentLevel["Level"]["collision"][fpos[0]][fpos[1]] == 0 &&
                        !(charFacing.nocollision)) {

                          if(moveToDo[1] == "follow" && (px==Math.floor(player.mapx / 32)) && (py== Math.floor(player.mapy / 32) + 1)){
                            this.waits = 32;
                          } else if(moveToDo[1] == "near" &&
                                    (px>= Math.floor(player.mapx / 32) -1 && px<= Math.floor(player.mapx / 32) +1) &&
                                    (py>= Math.floor(player.mapy / 32) && py <= Math.floor(player.mapy / 32)+2)){
                            this.waits = 32;
                          } else {
                            this.steps = 32;
                          }

                        if ((this.mapx%32==0) && (this.mapy%32==0)) {
                            //evType [onclick, onover, oncharaover, charaleave], so we are checking charaleave here!
                            if (eventInMap(engine.currentLevel["Level"], [0, 0, 0, 1, 0], [py, px])) {
                            }
                        }
                    } else {
                        this.waits = 16
                    }

                }
                if (moveToDo[0] == "face") {
                    if (moveToDo[1] == "follow"|| moveToDo[1] == "near") {
                        this.followPlayer()
                    } else if (moveToDo[1] == "away") {
                        this.awayPlayer()
                    } else if (moveToDo[1] == "random") {
                        this.facing = engine.randomDirection()
                    } else {
                        this.facing = moveToDo[1]
                    }
                    this.waits = 16
                }
            } else {
                if (this['chara']['movements'] != []) {
                    this['movstack'] = clone(this['chara']['movements'])
                }
            }

        } else if (this.steps > 0 && this.waits == 0 && this.stopped == false && !this.pushable) {
            //this is needed to that the chara walks!
            this.walkSteps()

        } else if (this.waits > 0 && this.stopped == false) {
            this.waits -= 2;
        }
    };
}


player.setup = function() {
    player['draw'] = function(){ camera.drawChar(player) };
    player['charaset'] = resources.playerCharaset;
    // player['mapx'] = resources.init['Player']['initPosX'];
    // player['mapy'] = resources.init['Player']['initPosY'];
    player['facing'] = resources.init['Player']['facing'];
    player['party'] = resources.init['Player']['party']
    player['blockInput'] = false;
    player['steps'] = 0;
    player['waits'] = 0;
    player['invisible'] = false;
    player['movstack'] = [];
    player['running'] = false;
    player['curr_animation'] = false;
    player['checkMapBoundaries'] = function(px, py, mapw, maph) {
        return engine.checkMapBoundaries(player, px, py, mapw, maph)
    }

    player['pushing'] = {
      now: false,
      count: 0,
      what: null,
      dopush: function(charToPush){
        player.pushing.now = true;
        player.pushing.count = 32;
        player.pushing.what = charToPush;
        charToPush.movstack.push(['move', player.facing ]);
        charToPush.update();
      },
      update: function(){
        if (player.pushing.now) {
          player.pushing.count-= engine.step;
          player.pushing.what.walkSteps();
          if(player.pushing.count <=0){
            player.pushing.now=false;
            player.pushing.count=0;
            player.pushing.what=null;
          }
        }
      }

   };



    player['update'] = function() {

        if (printer.isShown) return;

        var px = Math.floor(player.mapx / 32),
            py = Math.floor(player.mapy / 32) + 1;
        var mapheight = engine.currentLevel["Level"]["collision"].length-1;
        var mapwidth = engine.currentLevel["Level"]["collision"][0].length;

        if (player.steps == 0 && player.waits == 0) {
          if (this['movstack'].length > 0) {
            engine.mapEventBlocked = false;
            player.mapx = px * 32,
                player.mapy = (py - 1) * 32;
            var moveToDo = player.movstack.shift();
            if (moveToDo[0] == "face") {
              if(moveToDo[1] == 'up' || moveToDo[1] == 'down' || moveToDo[1] == 'right' || moveToDo[1] == 'left'){
                player.facing = moveToDo[1]
              }
              player.waits = 16;
            } else if (moveToDo[0] == "move") {
              if(moveToDo[1] == 'up' || moveToDo[1] == 'down' || moveToDo[1] == 'right' || moveToDo[1] == 'left'){
                player.facing = moveToDo[1]
              }
              player.steps = 32;
            }
          } else {
            if(player.blockInput)
              return;
            var dirkey = engine.dirKeyActive()
            if (dirkey) {
                engine.mapEventBlocked = false;
                player.mapx = px * 32,
                    player.mapy = (py - 1) * 32;
                player.facing = dirkey;
                var fpos = player.facingPosition();
                if (player.checkMapBoundaries(px, py, mapwidth, mapheight)) {
                    var charFacing = engine.playerFaceChar();
                    var ignoreCharColision = false;
                    if(charFacing.pushable && player.pushing.what != charFacing){
                        if(charFacing.canWalkTo(player.facing)){
                          ignoreCharColision = true;
                          player.pushing.dopush(charFacing);
                        }
                    }
                    if (engine.currentLevel["Level"]["collision"][fpos[0]][fpos[1]] == 0 && (!(charFacing.nocollision) || ignoreCharColision)) {
                        player.steps = 32;
                        if (charFacing) {
                            //evType [onclick, onover,...], so we are checking onover here!
                            eventInChar(charFacing, [0, 1, 0, 0, 0], [py - 1, px]);
                        }
                        if ((player.mapx%32==0) && (player.mapy%32==0)) {
                            //evType [onclick, onover, oncharaover, charaleave, onleave], so we are checking onleave here!
                            if (eventInMap(engine.currentLevel["Level"], [0, 0, 0, 0, 1], [py, px])) {
                                engine.mapEventBlocked = true;
                            }
                        }
                    } else {
                        feedbackEng.play('stop');
                        HID.inputs[dirkey].active = false;
                    }
                } else {
                    feedbackEng.play('stop');
                    HID.inputs[dirkey].active = false;
                }
            } else if (HID.inputs["accept"].active) {
                var charFacing = engine.playerFaceChar();
                if (charFacing) {
                    //evType [onclick, onover,...], so we are checking onclick here!
                    if (eventInChar(charFacing, [1, 0, 0, 0, 0], [py - 1, px])) {
                        HID.inputs["accept"].active = false;
                        engine.waitTime(300);
                    } else {
                        player.waits = 16;
                    }
                } else {
                    if (py - 1 > 0 && px> 0 && px + 1 < engine.currentLevel["Level"]["events"][0].length && py + 1 < engine.currentLevel["Level"]["events"].length) {
                        var fpos = player.facingPosition();
                        //evType [onclick, onover,...], so we are checking onclick here!
                        if (eventInMap(engine.currentLevel["Level"], [1, 0, 0, 0, 0], fpos)) {
                            HID.inputs["accept"].active = false;
                            engine.waitTime(300);
                        }
                    }

                }
            } else if (HID.inputs["cancel"].active) {
                HID.inputs["cancel"].active = false
                feedbackEng.play('menu');
                engine.mapMenu.activate();
            }
          }
        } else if (player.waits == 0) {
            engine.charWalkSteps(player, engine.step);
            player.pushing.update();

            if (player.running) {
                if (!(player.steps == 0)) {
                    engine.charWalkSteps(player, engine.step);
                }
            }
            if ((player.mapx%32==0) && (player.mapy%32==0)) {
                px = Math.floor(player.mapx / 32);
                py = Math.floor(player.mapy / 32) + 1;
                //evType [onclick, onover,...], so we are checking ontouch here!
                if (eventInMap(engine.currentLevel["Level"], [0, 1, 0, 0, 0], [py, px])) {
                    HID.inputs["accept"].active = false;
                    engine.mapEventBlocked = true;

                    //solves collision sound played, 8 is how long it takes to fadeOut default
                    player.waits = 8;
                }
            }
        } else {
            player.waits -= 1;
        }
    };
}

player.charaFacingTo = function(chara) {
    var ppx = Math.floor(player.mapx / 32),
        ppy = Math.floor(player.mapy / 32) + 1;
    var cpx = Math.floor(chara.mapx / 32),
        cpy = Math.floor(chara.mapy / 32) + 1;

    var resx = cpx - ppx;
    var resy = cpy - ppy;

    if (resx == 0 && resy < 0)
        return "down";
    else if (resx == 0 && resy > 0)
        return "up";
    else if (resx < 0 && resy == 0)
        return "right";
    else
        return "left";

    console.log("error facing!");
    return false;

}

player.facingPosition = function() {
    var px = Math.floor(player.mapx / 32),
        py = Math.floor(player.mapy / 32) + 1;
    return engine.facingPosition(player, px, py);
}

engine.compareTypes = function(type1,type2){
  return ((type1[0]==type2[0] && type1[0]==1)||
          (type1[1]==type2[1] && type1[1]==1)||
          (type1[2]==type2[2] && type1[2]==1)||
          (type1[3]==type2[3] && type1[3]==1)||
          (type1[4]==type2[4] && type1[4]==1))

}

eventInMap = function(level, evType, position) {
    if (engine.mapEventBlocked) {
        return false;
    }

    var event = level["events"][position[0]][position[1]];

    if (event == 0) {
        return false;
    }

    engine.resetBlocks()
    if ( engine.compareTypes(level['eventsType'][event.toString()],evType) ) {
        var aNmb, action, actionAndParam;
        for (aNmb = 0; aNmb < level['eventsActions'][event.toString()].length; aNmb++) {
            actionAndParam = level['eventsActions'][event.toString()][aNmb];
            engine.translateActions(actionAndParam[0], actionAndParam[1], position);
        }
        return true;
    }
};

eventInChar = function(char, evType, position) {
    if(char.charEventBlocked){
      return false;
    }

    if ( engine.compareTypes(char['chara']['actions']['type'],evType) ) {

        char.charEventBlocked = true;
        char.charwasfacingfirst = char.facing;
        char.waits = 16;
        var newfacing = player.charaFacingTo(char);
        if (newfacing) {
            char.facing = newfacing;
        }
        char.stopped = true;
        engine.resetBlocks();
        var aNmb, action, actionAndParam;
        for (aNmb = 0; aNmb < char['chara']['actions']['list'].length; aNmb++) {
            actionAndParam = char['chara']['actions']['list'][aNmb];
            engine.translateActions(actionAndParam[0], actionAndParam[1], position, char);
        }
        engine.atomStack.push([function() {
            char.stopped = false;
            char.facing = char.charwasfacingfirst;
            char.charEventBlocked = false;
        }, '']);
        return true;
    } else {
        return false;
    }
};

// MIT LICENSE
// Copyright (c) 2016 Érico Vieira Porto
//
// Permission is hereby granted, free of charge, to any
// person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the
// Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// You can't claim ownership, use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell any software, images or
// documents that includes characters, assets, or story elements
// of the game distributed along with this engine.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

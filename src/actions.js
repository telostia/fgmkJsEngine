// actions.js
//  This code are the basic support of the fgmk actions system
// the idea is that each method of the object actions is an
// action.
//
//  Each frame, the engine will execute all functions pushed
// to the atomStack until it meets the keyword "block" or
// until the atomStack is empty. The atomStack is actually a
// buffer. Note that engine frames and screen frames may not
// align, the engine executes 60 frames per seconds even if
// the screen didn't draw 60 frames at that second.
//
//  The atomStack accepts always an array with three positions
// the first position is the name of a function, the second is
// usually an array of parameters defined by the game logic in
// json files, and the third position is usually a parameter
// dependent of the current engine state to help the action
// reach it's goal.
//
//  Note that actions are executed instantaneously at when an
// event occurs, but the functions pushed to the atomStack are
// not.

/** creation of the object actions and the helpers.
 *  helpers are not actions, but they are necessary functions
 * that are reused by actions.
 */
var actions = {};
actions.helpers = {};

/** supportive function to allow IF function to support nesting.
 *  This is not an action.
 */
actions.helpers.lastBlock = function() {
    var value = 0
    var bstk = actions.blockStack.slice(0)
    if (bstk.length > 1) {
        value = bstk[bstk.length - 1];
    } else if (bstk.length == 1) {
        value = bstk[0];
    }
    return value
}

/** supportive function to process text and substitute variables
 */
actions.helpers.preText = function(text) {
    var pretexted = text.slice(0)
    return (text.slice(0)).replace(/(var:)([a-zA-Z0-9]+)/g,
        function(varname) {
            return engine.evalNum(varname)
        })
}

/** the action changePlayerAnimation
 *
 */
actions.changePlayerAnimation = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([engine.actions.changePlayerAnimation, params])
}

actions.charAutoDelete = function(param, position, charatodel) {
    var params = param.split(';')
    engine.atomStack.push([engine.actions.charAutoDelete, params, charatodel])
}

actions.questionBox = function(param, position) {
    var params = param.split(';')
    engine.questionBoxAnswer = engine.questionBoxUndef
    engine.atomStack.push([engine.actions.questionBox, params])
    engine.atomStack.push(["block", null]);
    engine.atomStack.push(["block", null]);
}

actions.stopPicture = function(param, position) {
    engine.atomStack.push([engine.actions.stopPicture, ''])
}

actions.showPicture = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([engine.actions.showPicture, params])
}

actions.changeState = function(param, position) {
    var params = param.split(';');
    engine.atomStack.push([engine.actions.changeState, params])
}

actions.IF = function(param, position) {
    var params = param.split(';');
    actions.blockCounter++;
    actions.blockStack.push(actions.blockCounter.valueOf());
    engine.atomStack.push([engine.actions.IF, params, actions.helpers.lastBlock()]);
}

actions.ELSE = function(param, position) {
    engine.atomStack.push([engine.actions.ELSE, '', actions.helpers.lastBlock()]);
}

actions.END = function(param, position) {
    engine.atomStack.push([engine.actions.END, '', actions.helpers.lastBlock()]);
    var popped = actions.blockStack.pop();
}

actions.showStatus = function(param, position) {
    var params = param.split(';')
    var herotoshow = battle.heroes[params[0]]
    engine.atomStack.push([function(herotosh) {
        battle.herotoshowstatus = herotosh
    }, herotoshow]);
    engine.atomStack.push([engine.waitForKey, true]);
    engine.atomStack.push(["block", null]);
    engine.atomStack.push([function() {
        battle.herotoshowstatus = false;
        engine.waitTime(400);
    }, '']);
};

actions.showText = function(param, position) {
    var params = param.split(';')
    var text = actions.helpers.preText(params[0]);
    engine.atomStack.push([printer.showText, text]);
    var linesTotal = printer.textLines(text);
    var lineNumber;
    for (lineNumber = 0; lineNumber < linesTotal; lineNumber += 2) {
        engine.atomStack.push([engine.waitForKey, true]);
        engine.atomStack.push(["block", null]);
        engine.atomStack.push([function() {
            printer.nextLine();
            engine.waitTime(400);
        }, '']);
    }
};

actions.teleport = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([function() {
        screen.paused = true;
    }, '']);
    engine.atomStack.push([engine.actions.teleport, params]);
    engine.atomStack.push([function() {
        screen.paused = false;
    }, '']);
};

actions.teleportInPlace = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([function() {
        screen.paused = true;
    }, '']);
    engine.atomStack.push([engine.actions.teleportInPlace, params]);
    engine.atomStack.push([function() {
        screen.paused = false;
    }, '']);
};

actions.changeTile = function(param, position) {
    //param[4] location (current or x,y,level)
    var colisionDict = {
        keep: -1,
        noColision: 0,
        collidable: 1
    }
    var params3Value
    var params = param.split(';')

    var aTileType = params[0]
    var aLayer = params[1]
    var aColision = colisionDict[params[2]];
    if (params[3] == "keep") {
        params3Value = -1;
    } else if (params[3] == "remove") {
        params3Value = 0;
    } else {
        params3Value = parseInt(params[3], 10);
    }

    var aEvent = params3Value;
    var aPositionX
    var aPositionY
    var aLevel

    if (params[4] == "current") {
        aPositionY = parseInt(position[0], 10)
        aPositionX = position[1]
        aLevel = null
    } else {
        aPositionX = params[4]
        aPositionY = params[5]
        aLevel = params[6]
    }

    engine.atomStack.push([engine.actions.changeTile, [aTileType,
        aLayer, aColision, aEvent, aPositionY, aPositionX,
        aLevel
    ]]);
};


actions.changeAllTiles = function(param, position) {
  //param = [otileType,newtiletype, layer,colision,event,level]
  //          0      ,     1      ,   2  ,   3    , 4   , 5
  ///////////////////////////////////////////////////////////////////
    var colisionDict = {
        keep: -1,
        noColision: 0,
        collidable: 1
    }
    var params3Value
    var params = param.split(';')

    var originalTileType = params[0]
    var newTileType = params[1]
    var aLayer = params[2]
    var aColision = colisionDict[params[3]];
    if (params[4] == "keep") {
        params3Value = -1;
    } else if (params[4] == "remove") {
        params3Value = 0;
    } else {
        params3Value = parseInt(params[4], 10);
    }

    var aEvent = params3Value;
    var aLevel = params[5]

    engine.atomStack.push([
        engine.actions.changeAllTiles, [originalTileType, newTileType,
                            aLayer, aColision, aEvent, aLevel]
    ]);
};

actions.fadeIn = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([screen.effects.fadeIn, params]);
    for (var i = 0; i < 8; i++) {
        engine.atomStack.push(["block", null]);
    }
};


actions.fadeOut = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([screen.effects.fadeOut, params]);
    for (var i = 0; i < 8; i++) {
        engine.atomStack.push(["block", null]);
    }
};

actions.setVar = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([engine.actions.setVar, params]);
};

actions.varPlusOne = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([engine.actions.varPlusOne, params]);
};

actions.noEffect = function(param, position) {
    engine.atomStack.push([screen.effects.noEffect, '']);
};

actions.battle = function(param, position) {
    var params = param.split(';')
    actions.fadeOut('tension1;keepEffect')
    dist.setup(screen.canvas, 'bgimg1', 1)
    actions.changeState('battle')
    engine.atomStack.push([engine.actions.battle, params]);
};

actions.addItem = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([engine.actions.addItem, params]);
}

actions.dropItem = function(param, position) {
    var params = param.split(';')
    engine.atomStack.push([engine.actions.subtractItem, params]);
}

actions.proceedBattleTurn = function(param, position) {
    battle.herodecision = ""
    engine.questionBoxAnswer = engine.questionBoxUndef
    engine.atomStack.push([engine.actions.proceedBattleTurn, [""]])
}

actions.alert = function(param, position) {
    var params = param.split(';')
    var text = actions.helpers.preText(params[0]);
    engine.atomStack.push([engine.actions.alert, text])
}

actions.waitCycle = function(param, position) {
    var params = param.split(';')
    var cycles = parseInt(params[0])
    for (var i = 0; i < cycles; i++) {
        engine.atomStack.push(["block", null]);
    }
};

actions.rain = function(param, position) {
    var params = param.split(';')

    if (params[0] == 'start') {
        engine.atomStack.push([function() {
                screen.rains.startRain()
            },
            [""]
        ])
    } else {
        engine.atomStack.push([function() {
                screen.rains.stopRain()
            },
            [""]
        ])
    }
}

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
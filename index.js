const electron = require('electron')

const stateToolButton = document.getElementById('stateToolButton')
const transitionToolButton = document.getElementById('transitionToolButton')
const selectToolButton = document.getElementById('selectToolButton')

const drawCanvas = document.getElementById('drawCanvas')

const STATE_TOOL_STR = "stateTool";
const TRANSITION_TOOL_STR = "transitionTool";
const SELECT_TOOL_STR = "selectTool";

const STATE_RADIUS = 10;

var currentTool = "stateTool";
var currentStates = [];
var currentTransitions = [];

function createState(stateId, x, y, isAccepting, isInitial){
  return {
    stateId: stateId,
    x: x,
    y: y,
    accepting: isAccepting,
    initial: isInitial
  }
}

function createTransition(initialStateId, inputStr, finalStateId) {
  return {
    initialState: initialStateId,
    finalState: finalStateId,
    input: inputStr
  }
}

var lastStateId = 0

function autoGenStateId(){
  lastStateId++;
  return lastStateId;
}

function redrawCanvas(){
  var ctx = drawCanvas.getContext("2d");
  // Clear the canvas. May be more efficient to only clear certain areas.
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

  for (var i = 0; i < currentTransitions.length; i++){
    // TODO
  }

  for (var i = 0; i < currentStates.length; i++){
      ctx.beginPath();
      ctx.arc(currentStates[i].x,
       currentStates[i].y,
       STATE_RADIUS,
       0, 2*Math.PI); //Draw a circle
  }
}

// Single click on draw canvas.
drawCanvas.addEventListener('click', function(){
  console.log("drawCanvas single click");
  if (currentTool == STATE_TOOL_STR){
    var state = createState(autoGenStateId(),event.clientX, event.clientY, false, false);
    currentStates.push(state);
    redrawCanvas();
  }

});

// Double click on draw canvas.
drawCanvas.addEventListener('dblclick', function(event){
  console.log("drawCanvas double click");


});

stateToolButton.addEventListener('click', function(){
  currentTool = STATE_TOOL_STR;
});

transitionToolButton.addEventListener('click', function(){
  currentTool = TRANSITION_TOOL_STR;
});

selectToolButton.addEventListener('click', function(){
  currentTool = SELECT_TOOL_STR;
});

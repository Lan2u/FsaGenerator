const electron = require('electron')

const stateToolButton = document.getElementById('stateToolButton');
const transitionToolButton = document.getElementById('transitionToolButton');
const selectToolButton = document.getElementById('selectToolButton');
const editToolButton = document.getElementById('editToolButton');

const drawCanvas = document.getElementById('drawCanvas')

const STATE_TOOL_STR = "stateTool";
const TRANSITION_TOOL_STR = "transitionTool";
const SELECT_TOOL_STR = "selectTool";
const EDIT_TOOL_STR = "editTool";

const DEFAULT_STATE_RADIUS = 10;

const ACCEPTING_FILL_STYLE = 'green';
const STANDARD_FILL_STYLE = 'white';
const STATE_TEXT_FILL_STYLE = 'black';

const STATE_TEXT_FONT = "12px Arial";

var currentTool = "stateTool";
var currentStates = [];
var currentTransitions = [];
var currentlyCreatingTransition = null;

var lastStateId = 0 // The last state ID issued. 

function createState(stateId, x, y, isAccepting, isInitial) {
  return {
    stateId: stateId,
    x: x,
    y: y,
    radius: DEFAULT_STATE_RADIUS,
    accepting: isAccepting,
    initial: isInitial,

    /* Indicates if the state has changed in a way that requires it be redrawn. 
     Initially true then set false after each drawing unless something sets it true again. */
    needsRedrawing: true,

    /* Stores all transitions out of this state */
    transitions: []
  }
}

/*
  Creates a new transition. Takes the index of the state within the currentStates array. The reason for this is that javascript doesn't
  have pointers and so this acts like a pointer in that either states can be updated in the currentStates array and the change will be reflected
  in the transition. 
  This is in contrast to either: 
    - Passing in the states as objects which therefore wouldn't be updated if the state was later changed and so there would be inconsistencies
    which means that this solution wouldn't work unless the states were made immutable which overly restricts the programs usefulness.
    - Passing in the unique state id's. This would mean an average case O(logn) time complexity search each time which means if it has to be done
    to draw every transition is O(klogn) where k is the number of transitions and n is the number of states. 
*/
function createTransition(inputStr, finalStateArrayIndex) {
  return {
    finalStateIndex: finalStateArrayIndex,
    input: inputStr
  }
}

/* Autogenerate a unique stateId */
function autoGenStateId() {
  lastStateId++;
  return lastStateId;
}

function redrawCanvas() {
  var ctx = drawCanvas.getContext("2d");
  // Clear the canvas. May be more efficient to only clear certain areas.
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawStates(ctx);
  drawCreatingTransition(ctx);
}

function drawCreatingTransition(ctx) {

}

function drawStates(ctx) {
  for (var i = 0; i < currentStates.length; i++) {
    drawState(ctx, currentStates[i]);
  }
}

function drawState(ctx, state) {
  ctx.beginPath();
  ctx.arc(state.x,
    state.y,
    state.radius,
    0, 2 * Math.PI); //Draw a circle
  if (state.accepting) {
    ctx.fillStyle = ACCEPTING_FILL_STYLE;
  } else {
    ctx.fillStyle = STANDARD_FILL_STYLE;
  }
  ctx.fill();
  ctx.stroke();
  ctx.font = STATE_TEXT_FONT;
  ctx.fillStyle = STATE_TEXT_FILL_STYLE;
  ctx.fillText(state.stateId, state.x - state.radius, state.y + (state.radius / 2));

  drawTransitions(ctx, state);
}

/* Draws all the transitions from the given initial state */
function drawTransitions(ctx, initialState) {
  for(var i = 0; i < initialState.transitions.length; i++){
    ctx.beginPath();
    ctx.moveTo(initialState.x, initialState.y);

    var finalState = currentStates[initialState.transitions[i].finalStateIndex];
    ctx.lineTo(finalState.x, finalState.y);
  }
  ctx.stroke();
}

/* Returns the nearest state with extra information about if the position in
   within the surrounding area or directly on the state.
   The checks are inclusive so a point on the edge is counted.
   If 2 states have same distance then the one returned is the one that appears
   first (at the lowest index) of the currentStates array.
   Returned object structure:
  {
    state: The nearestState to the given x,y. Null if there is no nearest state.
    directlyWithin: true if x,y directly in the state otherwise false
    surroundWithin: true if x,y is near to the state (within 1.5 * radius from
                    the center) otherwise false.
                    This is always true if directlyWithin is true.
    }
   }
   x: x coordinate of point to find the nearest state to
   y: y coordinate of point to find the nearest state to
   surroundRegion: the multiplier applied to the radius of the nearest state to
                   decide if the point is near to the state.
*/
function getNearestState(x, y, surroundingRegion) {
  var closestIndex = -1;
  var directlyWithin = false;
  var surroundWithin = false;
  var closestRadius;

  for (var i = 0; i < currentStates.length; i++) {
    var dist = getDistance(x, y, currentStates[i].x, currentStates[i].y);
    if (closestIndex == -1 || dist < closestRadius) {
      closestRadius = dist;
      closestIndex = i;
      if (dist <= currentStates[i].radius * surroundingRegion) {
        // Position within the surroundings inclusive.
        surroundWithin = true;
        if (dist <= currentStates[i].radius) {
          // Position directly within the nearest state inclusive.
          directlyWithin = true;
        } else {
          directlyWithin = false;
        }
      } else {
        surroundWithin = false;
      }
    }
  }

  if (closestIndex == -1) { // Impossible to be true unless there were no states
    return {
      state: null,
      directlyWithin: directlyWithin,
      surroundWithin: surroundWithin
    }
  } else {
    return {
      state: currentStates[closestIndex],
      directlyWithin: directlyWithin,
      surroundWithin: surroundWithin
    }
  }
}

// Return the distance between the 2 coordinates (x1, y1) and (x2, y2)
function getDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

drawCanvas.addEventListener('mousemove', function(event){
  if (currentlyCreatingTransition != null){
    // Update the position of the end of the currently being created transition.
    currentlyCreatingTransition.x = event.clientX;
    currentlyCreatingTransition.y = event.clientY;
  }
});

// Single click on draw canvas.
drawCanvas.addEventListener('click', function (event) {
  console.log("drawCanvas single click");

  if (currentTool == STATE_TOOL_STR) {
    stateToolDrawCanvasLeftClick(event);
  } else if (currentTool == EDIT_TOOL_STR){
    editToolDrawCanvasLeftClick(event);
  } else if (currentTool == TRANSITION_TOOL_STR) {
    transitionToolDrawCanvasLeftClick(event);
  } else if (currentTool == SELECT_TOOL_STR) {
    selectToolDrawCanvasLeftClick(event);
  } else {
    console.log("Unrecognised tool left click on drawCavnas!");
  }
});

function stateToolDrawCanvasRightClick(event) {
  var rect = drawCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var surroundRegion = 2; // the multiplier applied to the radius of the nearest state to decide if the point is near to the state.

    var nearestState = getNearestState(x, y, surroundRegion);
    console.log(nearestState);
    if (nearestState.directlyWithin) {
      // A state was clicked directly
      var stateClicked = nearestState.state;

    } else if (nearestState.surroundWithin) {
      // The surrounding around a state was clicked (half the radius beyond the radius)
      var stateClicked = nearestState.state;

    } else {
      // The nearest state was not clicked within 1.5 * its radius
      // Therefore canvas clicked rather than a state
      var state = createState(autoGenStateId(), x, y, true, false);
      currentStates.push(state);
      console.log("Pushed new state");
      console.log(state);
      redrawCanvas();
    }
}

function stateToolDrawCanvasLeftClick(event) {
  var rect = drawCanvas.getBoundingClientRect();
    console.log("Canvas bounding rect: ");
    console.log(rect);
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var surroundRegion = 2; // the multiplier applied to the radius of the nearest state to decide if the point is near to the state.

    var nearestState = getNearestState(x, y, surroundRegion);

    if (!(nearestState.directlyWithin || nearestState.surroundWithin)) { // Canvas clicked rather than a state
      var state = createState(autoGenStateId(), x, y, false, false);
      currentStates.push(state);
      console.log("Pushed new state");
      console.log(state);
      redrawCanvas();
    } else { // State clicked

    }
}

function editToolDrawCanvasRightClick(event) {

}

function stateToolDrawCanvasLeftClick(event) {
  
}

function transitionToolDrawCanvasRightClick(event) {

}

function stateToolDrawCanvasLeftClick(event) {
  
}

function selectToolDrawCanvasRightClick(event) {

}

// Creates an object representing a transition that is being created
function createCreatingTransition(initialStateIndex, initialX, initialY){
  return {
    initialStateIndex: initialStateIndex,
    currentX: initialX,
    currentY: initialY
  }
}

function stateToolDrawCanvasLeftClick(event) {
  var nearestState = getNearestState(event.x, event.y, 1);
  if (nearestState.directlyWithin){ // The left click was directly on a state
    if (currentlyCreatingTransition == null) {
      currentlyCreatingTransition = createCreatingTransition(nearestState.state, nearestState.state.x, nearestState.state.y);
      // Start creating a transition
    } else {
      // Finish creating a transition
      var inputStr; // TODO make an enter input UI

      var finalStateId = findStateIndexById(nearestState.state.stateId);
      var transition = createTransition(inputStr, )
      currentlyCreatingTransition == null;
    }
  }
}

// Double click on draw canvas.
drawCanvas.addEventListener('dblclick', function (event) {
  console.log("drawCanvas double click");
});

// Right click on draw canvas
drawCanvas.addEventListener('contextmenu', function (event) {
  console.log("drawCanvas right click");
  if (currentTool == STATE_TOOL_STR) {
    stateToolDrawCanvasRightClick(event);
  } else if (currentTool == EDIT_TOOL_STR){
    editToolDrawCanvasRightClick(event);
  } else if (currentTool == TRANSITION_TOOL_STR) {
    transitionToolDrawCanvasRightClick(event);
  } else if (currentTool == SELECT_TOOL_STR) {
    selectToolDrawCanvasRightClick(event);
  } else {
    console.log("Unrecognised tool right click on drawCavnas!");
  }
  event.preventDefault();
  return false;
}, false);

stateToolButton.addEventListener('click', function () {
  console.log("State tool selected")
  currentTool = STATE_TOOL_STR;
});

transitionToolButton.addEventListener('click', function () {
  console.log("Transition tool selected")
  currentTool = TRANSITION_TOOL_STR;
});

selectToolButton.addEventListener('click', function () {
  console.log("Select tool selected")
  currentTool = SELECT_TOOL_STR;
});

editToolButton.addEventListener('click', function () {
  console.log("Edit tool selected");
  currentTool = EDIT_TOOL_STR;
})
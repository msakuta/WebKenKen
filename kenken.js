import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-firestore.js";

// Initialize Firestore through Firebase
let firebaseConfig, app, db;

function loadCredentials() {
    fetch("/credentials.json")
        .then(doc => doc.json())
        .then(doc => {
            firebaseConfig = doc;
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            initUserId();
            load(true);
            loadHighScores();
        });
}

loadCredentials();


// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {

        var k;

        // 1. Let o be the result of calling ToObject passing
        //    the this value as the argument.
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let lenValue be the result of calling the Get
        //    internal method of o with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = o.length >>> 0;

        // 4. If len is 0, return -1.
        if (len === 0) {
            return -1;
        }

        // 5. If argument fromIndex was passed let n be
        //    ToInteger(fromIndex); else let n be 0.
        var n = fromIndex | 0;

        // 6. If n >= len, return -1.
        if (n >= len) {
            return -1;
        }

        // 7. If n >= 0, then Let k be n.
        // 8. Else, n<0, Let k be len - abs(n).
        //    If k is less than 0, then let k be 0.
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        // 9. Repeat, while k < len
        while (k < len) {
            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the
            //    HasProperty internal method of o with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            //    i.  Let elementK be the result of calling the Get
            //        internal method of o with the argument ToString(k).
            //   ii.  Let same be the result of applying the
            //        Strict Equality Comparison Algorithm to
            //        searchElement and elementK.
            //  iii.  If same is true, return k.
            if (k in o && o[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}

var container;
var table;
var size;
var board;
var region;
var cellBorderElems;
var cellElems;
var operElems;
var operators;
var memos;
var selectedCell = null;
var selectedCoords = null;
var messageElem;
var debugText;
var startTime;
var finishTime;
var spentTime = 0;
var gameOver = false;
var highScores = {};

function iterateCells(func) {
    for (var iy = 0; iy < size; iy++) {
        for (var ix = 0; ix < size; ix++) {
            func(ix, iy);
        }
    }
}

function solve() {
    iterateCells(function (ix, iy) {
        var valueDiv = document.getElementById('r' + iy + 'c' + ix);
        valueDiv.innerHTML = board[ix + iy * size];
        valueDiv.style.display = 'block';
    });
    finishTime = Date.now();
    gameOver = true;
}

function hide() {
    iterateCells(function (ix, iy) {
        var valueDiv = document.getElementById('r' + iy + 'c' + ix);
        valueDiv.style.display = 'none';
    });
}

function showWinMessage() {
    messageElem.innerHTML = "Congratulations!<br>You've solved the puzzle!";
}

function checkAnswer() {
    var correct = true;
    iterateCells(function (ix, iy) {
        var valueDiv = document.getElementById('r' + iy + 'c' + ix);
        // String based comparison because valueDiv may contain whitespace
        if (board[ix + iy * size].toString() !== valueDiv.innerHTML)
            correct = false;
    });
    if (correct) {
        if(userId !== "" && !gameOver) {
            const endTime = Date.now();
            const time = Math.floor((endTime - startTime) / 1000 + spentTime);
            const userDoc = doc(collection(db, "/users"), userId);
            getDoc(userDoc)
                .then(doc => {
                    const dbHighScores = doc.exists() ? doc.get("highScores") || {} : {};
                    const scores = dbHighScores[size] || [];
                    scores.push(time);
                    scores.sort();
                    dbHighScores[size] = scores;
                    highScores = dbHighScores;
                    setDoc(userDoc, {highScores}, {merge: true})
                        .then(function() {
                            console.log("Document successfully written!");
                        })
                        .catch(function(error) {
                            console.error("Error writing document: ", error);
                        });
                    updateHighScores();
                });
        }

        showWinMessage();
        gameOver = true;
        finishTime = Date.now();
    }
}

function updateTime(evt) {
    var endTime = gameOver ? finishTime : Date.now();
    document.getElementById("time").innerHTML = Math.floor((endTime - startTime) / 1000 + spentTime);
}

window.onload = function () {
    generateBoard();
    setInterval(updateTime, 1000);
}

function createElements() {
    cellBorderElems = new Array(size * size);
    cellElems = new Array(size * size);
    operElems = new Array(size * size);

    // The containers are nested so that the inner container can be easily
    // discarded to recreate the whole game.
    var outerContainer = document.getElementById("container");
    if (container)
        outerContainer.removeChild(container);
    container = document.createElement("div");
    outerContainer.appendChild(container);

    table = document.createElement("div");
    table.style.borderStyle = 'solid';
    table.style.borderWidth = '1px';
    table.style.borderColor = 'red';
    table.style.position = 'relative';
    table.style.left = '50%';
    table.style.width = (size * 4. + 0.5) + 'em';
    table.style.height = (size * 4. + 0.5) + 'em';

    messageElem = document.createElement('div');
    container.appendChild(messageElem);
    messageElem.style.fontFamily = 'Sans-serif';
    messageElem.style.fontSize = '20pt';
    messageElem.style.position = 'relative';
    messageElem.style.color = 'red';

    container.appendChild(table);
    for (var iy = 0; iy < size; iy++) {
        for (var ix = 0; ix < size; ix++) {
            var cellBorder = document.createElement("div");
            cellBorder.style.width = '3.9em';
            cellBorder.style.height = '3.9em';
            cellBorder.style.position = 'absolute';
            cellBorder.style.top = (4.0 * iy + 0.2) + 'em';
            cellBorder.style.left = (4.0 * ix + 0.2) + 'em';
            cellBorder.style.verticalAlign = 'middle';
            cellBorderElems[ix + iy * size] = cellBorder;
            table.appendChild(cellBorder);

            var cell = document.createElement("div");
            cellElems[ix + iy * size] = cell;
            cell.innerHTML = "";
            //cell.style.backgroundColor = colors[region[ix + iy * size] % 4];
            cell.style.width = '3.5em';
            cell.style.height = '3.5em';
            cell.style.position = 'absolute';
            cell.style.top = '0.125em';
            cell.style.left = '0.125em';
            cell.style.verticalAlign = 'middle';
            cell.onclick = function () {
                selectCell(this);
            }
            cellBorder.appendChild(cell);

            var operElem = document.createElement('div');
            operElem.style.position = 'absolute';
            operElem.style.top = '0px';
            cell.appendChild(operElem);
            operElems[ix + iy * size] = operElem;

            var valueDiv = document.createElement("div");
            valueDiv.id = 'r' + iy + 'c' + ix;
            valueDiv.style.fontSize = '30px';
            valueDiv.style.position = 'absolute';
            valueDiv.style.top = '50%';
            valueDiv.style.width = '100%';
            valueDiv.style.textAlign = 'center';
            valueDiv.innerHTML = '&nbsp;';
            cell.appendChild(valueDiv);
            var r = valueDiv.getBoundingClientRect();
            valueDiv.style.marginTop = Math.round(-(r.bottom - r.top) / 2) + 'px';
            valueDiv.style.display = 'none';

            var memoElem = document.createElement("div");
            memoElem.id = 'memo_r' + iy + 'c' + ix;
            memoElem.style.fontSize = '12px';
            memoElem.style.position = 'relative';
            memoElem.style.top = '100%';
            memoElem.style.marginTop = '-1em';
            memoElem.innerHTML = '';
            var currentSet = memos[ix + iy * size];
            for (var j = 0; j < size; j++)
                if (currentSet & (1 << j))
                    memoElem.innerHTML += (j + 1).toString();
            cell.appendChild(memoElem);
        }
    }
    // Set the margin after contents are initialized
    r = table.getBoundingClientRect()
    table.style.marginLeft = Math.round(-(r.right - r.left) / 2) + 'px';

    var answers = document.createElement('div');
    container.appendChild(answers);
    answers.style.fontSize = '25px';
    answers.style.padding = '10px';
    answers.innerHTML = 'Ans: ';

    function addAnswer(str) {
        var a = document.createElement('span');
        answers.appendChild(a);
        a.innerHTML = str;
        a.style.marginRight = '10px';
        a.style.border = '1px solid blue';
        a.style.padding = '5px';
        a.onclick = function () {
            if (selectedCoords) {
                var valueDiv = document.getElementById('r' + selectedCoords[1] + 'c' + selectedCoords[0]);
                valueDiv.style.display = 'block';
                valueDiv.innerHTML = this.innerHTML;
                checkAnswer();
                save(true);
            }
        };
    }

    for (var i = 0; i < size; i++) {
        addAnswer((i + 1).toString());
    }
    addAnswer('&nbsp;');

    var memoContainer = document.createElement('div');
    container.appendChild(memoContainer);
    memoContainer.style.fontSize = '15px';
    memoContainer.style.padding = '10px';
    memoContainer.innerHTML = 'Memo: ';
    for (var i = 0; i < size; i++) {
        var a = document.createElement('span');
        memoContainer.appendChild(a);
        a.innerHTML = (i + 1).toString();
        a.style.marginRight = '10px';
        a.style.border = '1px solid blue';
        a.style.padding = '5px';
        a.onclick = function () {
            if (selectedCoords) {
                var memoElem = document.getElementById('memo_r' + selectedCoords[1] + 'c' + selectedCoords[0]);
                memoElem.style.display = 'block';
                var currentSet = memos[selectedCoords[0] + selectedCoords[1] * size];
                currentSet ^= 1 << (Number(this.innerHTML) - 1);
                memos[selectedCoords[0] + selectedCoords[1] * size] = currentSet;
                memoElem.innerHTML = '';
                for (var j = 0; j < size; j++)
                    if (currentSet & (1 << j))
                        memoElem.innerHTML += (j + 1).toString();
                save(true);
            }
        }
    }

    debugText = document.createElement('div');
    container.appendChild(debugText);
}

function selectCell(sel) {
    selectedCell = sel;
    iterateCells(function (ix, iy) {
        var cell = cellElems[ix + iy * size];
        if (cell === sel) {
            cell.style.top = '0.075em';
            cell.style.left = '0.075em';
            cell.style.border = '2px blue solid';
            selectedCoords = [ix, iy];
        }
        else {
            cell.style.top = '0.125em';
            cell.style.left = '0.125em';
            cell.style.border = '1px gray solid';
        }
    })

    if(sessionId){
        setDoc(doc(collection(db, '/sessions'), sessionId), {
            selected: {
                [userId]: {
                    name: userName,
                    coords: selectedCoords
                }
            }
        }, {merge: true});
    }
}

document.getElementById('setUserName').addEventListener('click', () => {
    userName = document.getElementById('userName').value;

    if(db && userId){
        setDoc(doc(collection(db, '/users'), userId), {name: userName}, {merge: true});
    }
})

function selectCellColor(selectedCoords){
    const labelContainer = document.getElementById('labelContainer');
    while(labelContainer.firstChild) labelContainer.removeChild(labelContainer.firstChild);
    iterateCells(function (ix, iy) {
        const cell = cellElems[ix + iy * size];
        let isSelected = false;
        for (let id in selectedCoords) {
            const { name, coords } = selectedCoords[id];
            if (coords && coords[0] === ix && coords[1] === iy){
                isSelected = true;
                const cellRect = cell.getBoundingClientRect();
                const label = document.createElement("div");
                label.style.position = "absolute";
                label.style.left = `${cellRect.right}px`;
                label.style.top = `${cellRect.bottom - 24}px`;
                label.style.color = "#ffffff";
                label.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                label.style.pointerEvents = "none";
                label.innerHTML = name;
                labelContainer.appendChild(label);
            }
        }
        if (isSelected) {
            cell.style.top = '0.075em';
            cell.style.left = '0.075em';
            cell.style.border = '2px blue solid';
        }
        else {
            cell.style.top = '0.125em';
            cell.style.left = '0.125em';
            cell.style.border = '1px gray solid';
        }
    });
}

function paintCells(region) {
    var colors = [
        '#aaa',
        '#faa',
        '#afa',
        '#aaf',
        '#ffa',
        '#aff',
        '#faf',
        '#f00',
        '#0c0',
        '#c0c',
        '#0ff',
        '#07f',
        '#0f7',
        '#f40',
        '#7f0',
        '#f07',
        '#70f',
        '#fff',
    ];

    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            cellElems[x + y * size].style.backgroundColor = colors[region[x + y * size] % colors.length];
            var cellBorder = cellBorderElems[x + y * size];
            if (x <= 0 || region[x + y * size] !== region[x - 1 + y * size]) {
                cellBorder.style.borderLeft = "solid 2px black";
            }
            else {
                cellBorder.style.borderLeft = "solid 2px skyblue";
            }
            if (size <= x - 1 || region[x + y * size] !== region[x + 1 + y * size]) {
                cellBorder.style.borderRight = "solid 2px black";
            }
            else {
                cellBorder.style.borderRight = "solid 2px skyblue";
            }
            if (y <= 0 || region[x + y * size] !== region[x + (y - 1) * size]) {
                cellBorder.style.borderTop = "solid 2px black";
            }
            else {
                cellBorder.style.borderTop = "solid 2px skyblue";
            }
            if (size <= y - 1 || region[x + y * size] !== region[x + (y + 1) * size]) {
                cellBorder.style.borderBottom = "solid 2px black";
            }
            else {
                cellBorder.style.borderBottom = "solid 2px skyblue";
            }
        }
    }
}

function setOperatorElems(region) {
    // Clear the operator indicator before assigning one because
    // there could be old text from rejected tries.
    for (var i = 0; i < size * size; i++) {
        var operElem = operElems[i];
        operElem.innerHTML = '';
    }
    for (var i = 0; i < operators.length; i++) {
        var top, left;
        var first = true;
        iterateCells(function (ix, iy) {
            if (region[ix + iy * size] === i + 1) {
                if (first) {
                    top = iy;
                    left = ix;
                }
                first = false;
            }
        });
        var operElem = operElems[left + top * size];
        operElem.innerHTML = operators[i].product + operators[i].oper;
        operElem.style.position = 'absolute';
        operElem.style.top = '0px';
    }
}

function generateBoard(quiet=true) {
    try{
        generateBoardInt();
        if(sessionId)
            save(quiet);
    }
    catch(e){
        var debug = document.getElementById("debug");
        debug.innerHTML = e.what();
    }
}

document.getElementById('generateBoard').addEventListener('click', () => {
    sessionId = generateSessionId();

    if(unsubscriber)
        unsubscriber();

    newSession();

    generateBoard(true);
});

function generateBoardInt() {
    var sizeSelectElement = document.getElementById("sizeSelect");
    var sizeStr = sizeSelectElement.options[sizeSelectElement.selectedIndex].text;
    size = parseInt(sizeStr);
    board = new Array(size * size);
    region = new Array(size * size);
    memos = new Array(size * size); // Bitfield
    for (var i = 0; i < memos.length; i++) // Initialize with 0
        memos[i] = 0;
    operators = [];
    startTime = Date.now();
    finishTime = null;
    spentTime = 0;
    gameOver = false;
    updateTime();

    var latinSquareTries = 0;

    function genLatinSquare() {
        for (var iy = 0; iy < size; iy++) {
            for (var tries = 0; tries < 1000; tries++) {
                latinSquareTries++;
                if ((function () {
                    var next = board.slice(0);
                    // First, build an array of all available numbers for a row.
                    // We will randomly pick and delete from this array to enumerate permutation.
                    var avail = [];
                    for (var i = 0; i < size; i++)
                        avail.push(i + 1);
                    for (var ix = 0; ix < size; ix++) {
                        // Create a clone of available numbers array and delete numbers already used in column.
                        // This will greatly reduce the chance of invalid permutation, but it's not like
                        // it will never happen, so we still need to retry if permutation fails.
                        var vavail = avail.slice(0);
                        for (var j = 0; j < iy; j++) {
                            var vidx = vavail.indexOf(board[ix + j * size]);
                            if (0 <= vidx)
                                vavail.splice(vidx, 1);
                        }
                        // There's a possibility of using up all available numbers, in which case we should
                        // retry for this row.
                        // If we'd be sure to check every possible permutations, rather than retry with exactly
                        // the same conditions and new random numbers, we could use recursive calls to
                        // track all paths like the labeling algorithm, but it seems unnecessary around size 6.
                        if (vavail.length === 0)
                            return false;
                        var idx = Math.floor(Math.random() * vavail.length);
                        if (idx < 0)
                            return false;
                        next[ix + iy * size] = vavail[idx];
                        // The original available numbers array should always contain numbers picked from reduced array.
                        avail.splice(avail.indexOf(vavail[idx]), 1);
                    }
                    board = next;
                    return true;
                })())
                    break;
            }
        }
    }

    var allTries = 0;
    var solveTries = 0;

    function checkSolvability(region) {
        function sameVector(a, b) {
            for (var i = 0; i < a.length; i++)
                if (a[i] !== b[i])
                    return false;
            return true;
        }
        function columnVector(region, x) {
            var ret = [];
            for (var i = 0; i < size; i++)
                ret.push(region[x + i * size]);
            return ret;
        }

        // Check if the region definition has a duplicate row or column,
        // in which case it is clear that the problem cannot be solved
        // with single answer.  You could swap these rows or columns to
        // obtain another solution.
        for (var iy = 0; iy < size; iy++) {
            var row = region.slice(iy * size, (iy + 1) * size);
            for (var jy = iy + 1; jy < size; jy++)
                if (sameVector(row, region.slice(jy * size, (jy + 1) * size)))
                    return false;
        }
        for (var ix = 0; ix < size; ix++) {
            var col = columnVector(region, ix);
            for (var jx = ix + 1; jx < size; jx++)
                if (sameVector(col, columnVector(region, jx)))
                    return false;
        }

        genLatinSquare();
        setOperators(region);

        // Assigning true to this variable enables the debugger to let you see
        // the process of reducing solution possibilities by step execution.
        var visualizeSolveProcess = false;

        if (visualizeSolveProcess)
            setOperatorElems(region);

        /// The debug function to visualize the process.
        function showField(x, y) {
            if (!visualizeSolveProcess)
                return;
            var memoElem = document.getElementById('memo_r' + y + 'c' + x);
            memoElem.style.display = 'block';
            memoElem.innerHTML = '';
            for (var i = 0; i < size; i++)
                if (field[x + y * size] & (1 << i))
                    memoElem.innerHTML += (i + 1).toString();
        }

        // 'field' is an array of bitfields for possibilities.
        // Using bitfields rather than arrays enables fast operations
        // (especially cloning) but limits maximum size.
        // Since JavaScript bitwise operators works with 32 bits,
        // we're safe to use it as a bitfield for puzzle sizes up to 9.
        var field = new Array(size * size);
        for (var iy = 0; iy < size; iy++) {
            for (var ix = 0; ix < size; ix++) {
                var currentSet = 0;
                for (var i = 0; i < size; i++)
                    currentSet |= 1 << i;
                field[ix + iy * size] = currentSet;
                showField(ix, iy);
            }
        }

        // From this point, the codes tries to find an answer by reducing
        // possibilities in each cells.
        // We do not fully trace all possible combinations, because the
        // number of combinations are too large to enumerate
        // (10^9 for a size 6 latin square, according to
        //  https://en.wikipedia.org/wiki/Latin_square ),
        // and it's not the method humans normally use.
        // We only check all combinations in operator partitions, which
        // humans can do.
        for (var n = 0; n < 10; n++) {
            var prevField = field.slice(0);

            for (var i = 0; i < operators.length; i++) {
                var cellPos = [];
                iterateCells(function (ix, iy) {
                    if (region[ix + iy * size] === i + 1) {
                        cellPos.push([ix, iy]);
                    }
                });
                if (cellPos.length === 0)
                    break;
                if (operators[i].oper == '*') {
                    for (var j = 0; j < size; j++) {
                        if (operators[i].product % (j + 1) !== 0) {
                            for (var k = 0; k < cellPos.length; k++) {
                                var ix = cellPos[k][0];
                                var iy = cellPos[k][1];
                                field[ix + iy * size] &= ~(1 << j);
                                showField(ix, iy);
                            }
                        }
                    }
                }
                if (operators[i].oper == '/') {
                    var jx = cellPos[0][0];
                    var jy = cellPos[0][1];
                    var jfield = field[jx + jy * size];
                    var jvalid = 0;
                    var kx = cellPos[1][0];
                    var ky = cellPos[1][1];
                    var kfield = field[kx + ky * size];
                    var kvalid = 0;
                    for (var j = 0; j < size; j++) {
                        if (!(jfield & (1 << j)))
                            continue;
                        for (var k = 0; k < size; k++) {
                            if (!(kfield & (1 << k)))
                                continue;
                            var jv = j + 1;
                            var kv = k + 1;
                            if (jv < kv) {
                                if (kv / jv === operators[i].product) {
                                    jvalid |= 1 << j;
                                    kvalid |= 1 << k;
                                }
                            }
                            else {
                                if (jv / kv === operators[i].product) {
                                    jvalid |= 1 << j;
                                    kvalid |= 1 << k;
                                }
                            }
                        }
                    }

                    jfield &= jvalid;
                    field[jx + jy * size] = jfield;
                    showField(jx, jy);
                    kfield &= kvalid;
                    field[kx + ky * size] = kfield;
                    showField(kx, ky);
                }
                if (operators[i].oper == '-') {
                    var jx = cellPos[0][0];
                    var jy = cellPos[0][1];
                    var jfield = field[jx + jy * size];
                    var jvalid = 0;
                    var kx = cellPos[1][0];
                    var ky = cellPos[1][1];
                    var kfield = field[kx + ky * size];
                    var kvalid = 0;
                    for (var j = 0; j < size; j++) {
                        if (!(jfield & (1 << j)))
                            continue;
                        for (var k = 0; k < size; k++) {
                            if (!(kfield & (1 << k)))
                                continue;
                            var jv = j + 1;
                            var kv = k + 1;
                            if (jv < kv) {
                                if (kv - jv === operators[i].product) {
                                    jvalid |= 1 << j;
                                    kvalid |= 1 << k;
                                }
                            }
                            else {
                                if (jv - kv === operators[i].product) {
                                    jvalid |= 1 << j;
                                    kvalid |= 1 << k;
                                }
                            }
                        }
                    }

                    jfield &= jvalid;
                    field[jx + jy * size] = jfield;
                    showField(jx, jy);
                    kfield &= kvalid;
                    field[kx + ky * size] = kfield;
                    showField(kx, ky);
                }
                if (operators[i].oper === '+' || operators[i].oper === '*') {
                    // Recursively checks possible combinations for addition
                    // or multiplcation operator
                    function checkAddOper(field, j, k, sum, stop) {
                        solveTries++;
                        var next = field.slice(0);
                        var jx = cellPos[j][0];
                        var jy = cellPos[j][1];
                        if (!(next[jx + jy * size] & (1 << k)))
                            return false;
                        if (operators[i].oper === '+')
                            sum += k + 1;
                        else
                            sum *= k + 1;
                        // Even before we add all cells, we are sure that
                        // sum greater than the operator's value is not possible.
                        if (operators[i].product < sum)
                            return false;
                        next[jx + jy * size] = (1 << k);
                        for (var l = 0; l < size; l++) {
                            if (l !== jx)
                                next[l + jy * size] &= ~(1 << k);
                            if (l !== jy)
                                next[jx + l * size] &= ~(1 << k);
                        }
                        j = (j + 1) % cellPos.length;
                        if (j === stop)
                            return sum === operators[i].product;
                        for (var l = 0; l < size; l++) {
                            var ret = checkAddOper(next, j, l, sum, stop);
                            if (ret)
                                return true;
                        }
                        return false;
                    }

                    for (var j = 0; j < cellPos.length; j++) {
                        for (var l = 0; l < size; l++) {
                            var ret = checkAddOper(field, j, l, operators[i].oper === '+' ? 0 : 1, j);
                            var jx = cellPos[j][0];
                            var jy = cellPos[j][1];
                            if (!ret)
                                field[jx + jy * size] &= ~(1 << l);
                            showField(jx, jy);
                        }
                    }
                }
            }

            function checkRowCell(ix, iy, k, field, axis, stop) {
                solveTries++;
                var next = field.slice(0);
                if (!(next[ix + iy * size] & (1 << k)))
                    return false;
                next[ix + iy * size] = (1 << k);
                for (var l = 0; l < size; l++) {
                    if (l !== ix) {
                        next[l + iy * size] &= ~(1 << k);
                        if (next[l + iy * size] === 0)
                            return false;
                    }
                    if (l !== iy) {
                        next[ix + l * size] &= ~(1 << k);
                        if (next[ix + l * size] === 0)
                            return false;
                    }
                }
                if (axis === 0)
                    ix = (ix + 1) % size;
                else
                    iy = (iy + 1) % size;
                if ((axis === 0 ? ix : iy) !== stop) {
                    for (var l = 0; l < size; l++)
                        if (checkRowCell(ix, iy, l, next, axis, stop))
                            return true;
                    return false;
                }
                else {
                    return true;
                }
            }

            for (var iy = 0; iy < size; iy++) {
                for (var ix = 0; ix < size; ix++) {
                    for (var k = 0; k < size; k++) {
                        var ret = checkRowCell(ix, iy, k, field, 0, ix);
                        if (!ret) {
                            field[ix + iy * size] &= ~(1 << k);
                            showField(ix, iy);
                        }
                    }
                }
            }

            for (var ix = 0; ix < size; ix++) {
                for (var iy = 0; iy < size; iy++) {
                    for (var k = 0; k < size; k++) {
                        var ret = checkRowCell(ix, iy, k, field, 1, iy);
                        if (!ret) {
                            field[ix + iy * size] &= ~(1 << k);
                            showField(ix, iy);
                        }
                    }
                }
            }
            if (sameVector(prevField, field))
                break;
        }

        for (var i = 0; i < size * size; i++) {
            var count = 0;
            for (var k = 0; k < size; k++)
                if (field[i] & (1 << k))
                    count++;
            if (1 < count)
                return false;
        }
        return true;
    }

    function growCells(type, region) {
        function growCellSingle(x, y, type, region, cells) {
            allTries++;
            var next = region.slice(0);
            var avail = [];
            if (2 <= cells) {
                avail.push({
                    func: function () {
                        var ret = growCells(type, region);
                        if (ret)
                            return ret;
                        paintCells(region);
                    }, data: null,
                    weight: 3
                }); // Prioritize small regions by weighting option for creating new regions
            }
            next[x + y * size] = type;
            if (cells < 3) {
                var deltax = [-1, 0, 1, 0];
                var deltay = [0, -1, 0, 1];
                for (var i = 0; i < 4; i++) {
                    var newx = x + deltax[i];
                    var newy = y + deltay[i];
                    if (newx < 0 || size <= newx || newy < 0 || size <= newy)
                        continue;
                    if (region[newx + newy * size])
                        continue;
                    avail.push({
                        func: function (data) {
                            paintCells(next);
                            return growCellSingle(data[0], data[1], type, next, cells + 1);
                        },
                        data: [newx, newy],
                        weight: 1
                    });
                }
            }

            // Backtrack all available options recursively
            while (avail.length) {
                // Options have weights, so we first measure total weight
                var allWeight = 0;
                for (var j = 0; j < avail.length; j++)
                    allWeight += avail[j].weight;
                // Obtain value for selecting an option
                var val = Math.random() * allWeight;
                // Accumulate weights and find the corresponding option
                allWeight = 0;
                for (var j = 0; j < avail.length; j++) {
                    allWeight += avail[j].weight;
                    if (val < allWeight) {
                        ret = avail[j].func(avail[j].data);
                        if (ret)
                            return ret;
                        avail.splice(j, 1);
                        break;
                    }
                }
            }
            // At least 2 cells are required
            if (cells < 1)
                return null;
            return growCells(type, next);
        }

        function growCellTry(type, region) {

            for (var iy = 0; iy < size; iy++) {
                for (var ix = 0; ix < size; ix++) {
                    if (region[ix + iy * size] === 0) {
                        return growCellSingle(ix, iy, ++type, region, 0);
                    }
                }
            }
            if (iy == size)
                return region;
            else
                return false;
        }

        var numTries = 1;
        for (var tries = 0; tries < numTries; tries++) {
            var ret = growCellTry(type, region);
            if (ret)
                return ret;
        }
        // If all tries fail, return null
        return null;
    }

    for (var iy = 0; iy < size; iy++) {
        for (var ix = 0; ix < size; ix++) {
            region[ix + iy * size] = 0;
        }
    }

    createElements();

    selectCell(null);

    function setOperators(region) {
        operators = [];
        for (var i = 1; i < 100; i++) {
            var cellValues = [];
            iterateCells(function (ix, iy) {
                if (region[ix + iy * size] === i) {
                    cellValues.push(board[ix + iy * size]);
                }
            });
            if (cellValues.length === 0)
                break;
            var avail = ['*', '+'];
            if (cellValues.length === 2)
                avail.push('-');
            // If numbers are not dividable to each other, we can't use it for division operator
            if (cellValues.length === 2 && (cellValues[0] % cellValues[1] === 0 || cellValues[1] % cellValues[0] === 0))
                avail.push('/');
            var index = Math.floor(Math.random() * avail.length);
            var oper = avail[index];
            var product;
            if (oper === '+') {
                product = 0;
                for (var j = 0; j < cellValues.length; j++)
                    product += cellValues[j];
            }
            else if (oper === '*') {
                product = 1;
                for (var j = 0; j < cellValues.length; j++)
                    product *= cellValues[j];
            }
            else if (oper === '-') {
                product = Math.abs(cellValues[1] - cellValues[0]);
            }
            else if (oper === '/') {
                product = cellValues[0] < cellValues[1] ? cellValues[1] / cellValues[0] : cellValues[0] / cellValues[1];
            }
            operators.push({
                oper: oper,
                product: product,
            })
        }
    }

    for (var tries = 0; tries < 100; tries++) {
        var ret = growCells(0, region);
        if (!ret)
            continue;
        if (!checkSolvability(ret))
            continue;
        region = ret;
        paintCells(region);
        setOperatorElems(region);
        break;
    }

    debugText.innerHTML = 'labelTries: ' + allTries.toString()
        + ', latinSquareTries: ' + latinSquareTries.toString()
        + ', solveTries: ' + solveTries;
};

function getSaveData(auto = false) {
    var storage = localStorage.getItem(auto ? 'WebKenKenAutoSave' : 'WebKenKen');
    if (!storage)
        return null;
    const content = JSON.parse(storage);
    if (content['save'] && content['save']['save'])
        return content['save']['save'];
    else
        return null;
}

function prepareSaveData() {
    var saveData = {};
    saveData.size = size;
    saveData.answer = [];
    iterateCells(function (ix, iy) {
        var valueDiv = document.getElementById('r' + iy + 'c' + ix);
        saveData.answer[ix + iy * size] = valueDiv.innerHTML;
    });
    saveData.board = board;
    saveData.region = region;
    saveData.operators = operators;
    saveData.memos = memos;
    if (gameOver)
        saveData.spentTime = (finishTime - startTime) / 1000 + spentTime;
    else
        saveData.spentTime = (Date.now() - startTime) / 1000 + spentTime;
    saveData.gameOver = gameOver;
    return saveData;
}

let userId = "";
let userName = "new user";
let sessionId = null;
const offlineMode = false;

function randomizeUserId(){
    if(offlineMode || !db){
        return "";
    }
    const docRef = doc(collection(db, "/users"));
    const docVal = getDoc(docRef);
    setDoc(docRef, {name: "new user"});
    userId = docRef.id;
    localStorage.setItem('WebKenKenUserId', userId);
    return userId;
}


function loadUserId(){
	var st = localStorage.getItem('WebKenKenUserId');
	var ok = false;
	if(st && typeof st === "string" && st.length !== 0){
		ok = true;
		userId = st;
		var elem = document.getElementById("userId");
		if(elem)
			elem.value = st;
		// refreshQRCode();
	}
	else{
		// If the data is not as expected, regenerate random id
		st = randomizeUserId();
	}
    return ok;
}

function generateUserId(){
    // if(confirm('Are you sure you want to generate a new Id?\n' +
    // 	'Your long accumulated stats can be lost forever!\n' +
    // 	'(You can recall your previous stats by entering old user id)')){
    randomizeUserId();
        // updateHighScores();
    // }
}

function initUserId() {
    if(!loadUserId())
        generateUserId();

    getDoc(doc(collection(db, '/users'), userId))
    .then(doc => {
        userName = doc.data().name;
        document.getElementById('userName').value = userName;
    });
}

function generateSessionId(){
    if(offlineMode || !db){
      return "";
    }
    // This is not cryptographically safe random number, but we'd settle for this
    // because this application is not serious.
    // At this point the sessionId in users should be initialized.
    const docRef = doc(collection(db, "/sessions"));
    setDoc(docRef, {});
    localStorage.setItem('WebHanabiSessionId', docRef.id);
    return docRef.id;
}


function loadSessionId(){
    if(offlineMode || !db){
        return "";
    }
    const params = new URLSearchParams(document.location.search.substring(1));
    let sessionId = params.get('sessionId');
    if(sessionId && sessionId.length !== 0){
        return sessionId;
    }
    const st = localStorage.getItem('WebKenKenSessionId');
    if(st && typeof st === "string" && st.length !== 0){
        sessionId = st;
    }
    else{
        // If the data is not as expected, regenerate random id
        sessionId = generateSessionId();
    }
    return sessionId;
}

function saveSessionId(){
    if(sessionId !== null && sessionId.length !== 0)
        localStorage.setItem('WebKenKenSessionId', sessionId);
}

document.getElementById('setUserId').addEventListener('click', () => {
    userId = document.getElementById('userId').value;
    localStorage.setItem('WebKenKenUserId', userId);
});

function save(quiet = false) {
    if (!window.localStorage || !window.JSON) {
        if (!quiet)
            alert('Your browser cannot save the game progress.');
        return;
    }
    if (!quiet && getSaveData() && !confirm('There is already a saved progress. OK to overwrite?'))
        return;
    const serialized = JSON.stringify({ save: { save: prepareSaveData() } });
    localStorage.setItem(quiet ? 'WebKenKenAutoSave' : 'WebKenKen', serialized);
    const docRef = doc(collection(db, "/sessions"), sessionId);
    const newDoc = {};
    newDoc.save = serialized;
    setDoc(docRef, newDoc, {merge: true})
    .then(function() {
        console.log("Document successfully written!");
    })
    .catch(function(error) {
        console.error("Error writing document: ", error);
    });
}

document.getElementById("save").addEventListener("click", save);

function loadSaveData(saveData, length) {
    if(!saveData.size)
        return;
    size = saveData.size;
    board = saveData.board;
    region = saveData.region;
    operators = saveData.operators;
    memos = saveData.memos;
    gameOver = saveData.gameOver || false;
    if (gameOver) {
        startTime = finishTime = 0;
    }
    else {
        startTime = Date.now();
        finishTime = saveData.finishTime || null;
    }
    spentTime = saveData.spentTime || 0;
    createElements();
    paintCells(region);
    selectCell(null);
    setOperatorElems(region);
    iterateCells(function (ix, iy) {
        var valueDiv = document.getElementById('r' + iy + 'c' + ix);
        valueDiv.innerHTML = saveData.answer[ix + iy * size];
        valueDiv.style.display = 'block';
    });
    updateTime();
    if (gameOver)
        showWinMessage();
    debugText.innerHTML = 'loaded ' + length + ' bytes';
}

const sessionUrlElem = document.getElementById("sessionUrlInput");
const sessionUrlCopyButton = document.getElementById("sessionUrlCopyButton");
if(sessionUrlCopyButton){
    sessionUrlCopyButton.addEventListener('click', () => {
        sessionUrlElem.select();
        sessionUrlElem.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand("copy");
        alert("Copied the text: " + sessionUrlElem.value);
    });
}

function newSession(){
    const sessionIdElem = document.getElementById("sessionId");
    sessionIdElem.value = sessionId;

    if(sessionUrlElem)
        sessionUrlElem.value = `${document.location.origin}${document.location.pathname}?sessionId=${sessionId}`;

    getDoc(doc(collection(db, '/sessions'), sessionId))
    .then(function(doc) {
        if (doc.exists()) {
            const data = doc.data().save;
            loadSaveData(JSON.parse(data).save.save, data.length);
        } else {
            console.log("No user");
        }
    })
    .catch(function(error) {
        console.log("Error : ", error);
    });

    unsubscriber = onSnapshot(doc(collection(db, '/sessions'), sessionId), {
        next: doc => {
            if(doc.exists()){
                const data = doc.data()
                const save = data.save;
                if(save)
                    loadSaveData(JSON.parse(save).save.save, save.length);
                if(data.selected){
                    selectCellColor(data.selected);
                }
            }
        }
    });
}

let unsubscriber = null;

function load(auto = false) {
    if(unsubscriber)
        unsubscriber();

    sessionId = loadSessionId();

    newSession();

    // if (!window.localStorage || !window.JSON) {
    //     if (!auto)
    //         alert('Your browser cannot save the game progress.');
    //     return;
    // }
    // var saveData = getSaveData(auto);
    // if (!saveData) {
    //     if (!auto)
    //         alert('There is no saved game');
    //     return;
    // }
    // loadSaveData(saveData, localStorage[auto ? 'WebKenKenAutoSave' : 'WebKenKen'].length);
}

function loadHighScores(){
    getDoc(doc(collection(db, '/users'), userId))
        .then(function(doc) {
            if (doc.exists()) {
                const data = doc.data().highScores;
                if(data){
                    highScores = data;
                    updateHighScores();
                }
            } else {
                console.log("No user");
            }
        })
        .catch(function(error) {
            console.log("Error : ", error);
        });

}

function updateHighScores(){
    const highScoresElem = document.getElementById("highScores");
    while(highScoresElem.firstChild) highScoresElem.removeChild(highScoresElem.firstChild);
    for(let size in highScores){
        const scores = highScores[size];
        const scoresElem = document.createElement("div");
        scoresElem.className = 'highScoresSub';
        scoresElem.innerHTML = `Score of size ${size}`;
        for(let i = 0; i < scores.length; i++){
            const entryElem = document.createElement("div");
            entryElem.innerHTML = `${scores[i]} seconds`;
            scoresElem.appendChild(entryElem);
        }
        highScoresElem.appendChild(scoresElem);
    }
}

document.getElementById("load").addEventListener("click", load);

window.addEventListener('pageshow', function () {
    // load(true);
});

window.addEventListener('beforeunload', function () {
    saveSessionId();
    save(true);
});

function copyToClipboard(text) {
    window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
}

function clip() {
    if (!window.JSON) {
        alert('Your browser cannot copy to clibboard.');
        return;
    }
    copyToClipboard(JSON.stringify(prepareSaveData()));
}

function pasteFromClipboard() {
    return window.prompt("Paste from clipboard: Ctrl+V, Enter");
}

function paste() {
    if (!window.JSON) {
        alert('Your browser cannot paste from clibboard.');
        return;
    }
    var ret = pasteFromClipboard();
    if (ret !== null && ret !== '')
        loadSaveData(JSON.parse(ret), ret.length);
}


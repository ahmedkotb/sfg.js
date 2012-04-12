DEFAULT_RADIUS = 15
DEFAULT_COLOR = "#228b22"
DEFAULT_SELECTED_COLOR = "#0000FF"

STATES = {NORMAL : 0, ADD_NODE: 1, NODE_MOVE: 2,
          EDGE_WAIT_NODE1: 3,EDGE_WAIT_NODE2: 4
          };

//helper functions
function debug(str){
	document.getElementById("debug").innerHTML += str + "<br/>";
}
function debugClear(){
	document.getElementById("debug").innerHTML = "";
}

function toRadians(angle){
	return angle * Math.PI / 360;
}

function setPixelColor(data,x,y,color){
    var index = (x + y * 400) * 4;
    data[index+0] = color.r;
    data[index+1] = color.g;
    data[index+2] = color.b;
    data[index+3] = 0xff;
}
//--------------------------------------------
function SFG(canvas){
    if (canvas.getContext){
        this.scaleX = 100;
        this.scaleY = 100;
        this.panX = 00;
        this.panY = 00;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.canvas.sfg = this;
        this.canvas.ctx = this.ctx;

        this.nodes = [];
        this.edges = [];
        this.state = STATES.NORMAL;
        this.selectedNode = null;

        this.edgeStartNode = null;
        this.newNode = null;
        this.newEdge = null;

        canvas.addEventListener('mousedown',this.mousedown,false);
        canvas.addEventListener('mouseup',this.mouseup,false);
        canvas.addEventListener('mousemove',this.mousemove,false);
    }else{
        alert("canvas not supported!");
    }
}

SFG.prototype.mousedown = function(e){
    e = e || window.e;
    var x = e.pageX - canvas.offsetLeft;
    var y = e.pageY - canvas.offsetTop;
    var state = this.sfg.state;
    if (state == STATES.ADD_NODE){
        this.sfg.newNode = null;
        this.sfg.state = STATES.NORMAL;
        this.sfg.addNode(x,y);
    }else if (state == STATES.NORMAL){

        var selected = this.sfg.find(x,y);
        this.sfg.selectNode(selected);
        if (selected)
            this.sfg.state = STATES.NODE_MOVE;

    }else if (state == STATES.EDGE_WAIT_NODE1){
        var selected = this.sfg.find(x,y);
        this.sfg.selectNode(selected);
        if (selected){
            this.sfg.state = STATES.EDGE_WAIT_NODE2;
            this.sfg.edgeStartNode = selected;
            this.sfg.newEdge = new LineEdge(selected,null);
        }
    }else if (state == STATES.EDGE_WAIT_NODE2){
        var selected = this.sfg.find(x,y);
        if (selected == null){
            this.sfg.edgeStartNode = null;
            this.sfg.newEdge = null;
            return;
        }
        var edge = new LineEdge(this.sfg.edgeStartNode,selected);
        this.sfg.addEdge(edge);
        this.sfg.selectNode(null);
        this.sfg.state = STATES.NORMAL;
        this.sfg.redraw();
    }
}

SFG.prototype.mouseup = function(e){
    e = e || window.e;
    var x = e.pageX - canvas.offsetLeft;
    var y = e.pageY - canvas.offsetTop;
    var state = this.sfg.state;
    if (state == STATES.NODE_MOVE)
        this.sfg.state = STATES.NORMAL;
}

SFG.prototype.mousemove = function(e){
    e = e || window.e;
    var x = e.pageX - canvas.offsetLeft;
    var y = e.pageY - canvas.offsetTop;
    var state = this.sfg.state;
    var node = this.sfg.selectedNode;
    if (state == STATES.NODE_MOVE && node != null){
        node.x = x;
        node.y = y;
        this.sfg.redraw();
    }else if (state == STATES.ADD_NODE){
        this.sfg.newNode.x = x;
        this.sfg.newNode.y = y;
        this.sfg.redraw();
        this.sfg.newNode.draw(this.sfg.ctx);
    }else if (state == STATES.EDGE_WAIT_NODE2){
        this.sfg.redraw();
        this.sfg.newEdge.drawToPoint(this.sfg.ctx,x,y);
    }
}

SFG.prototype.startAddingNode = function(){
    this.newNode = new Node();
    this.newNode.name = "new";
    this.state = STATES.ADD_NODE;
    if (this.selectedNode != null){
        this.selectedNode.setUnselected();
        this.selectedNode = null;
    }
}

SFG.prototype.startAddingEdge = function(){
    this.edgeStartNode = this.selectedNode;
    if (this.selectedNode == null)
        this.state = STATES.EDGE_WAIT_NODE1;
    else{
        this.newEdge = new LineEdge(this.selectedNode,null);
        this.state = STATES.EDGE_WAIT_NODE2;
    }
}

SFG.prototype.selectNode = function(node){
    var oldNode = this.selectedNode;
    var needRedraw = false;
    if (oldNode != null){
        oldNode.setUnselected();
        needRedraw = true;
    }
    if (node != null){
        node.setSelected();
        needRedraw = true;
    }
    this.selectedNode = node;
    this.edgeStartNode = node;
    if (needRedraw)
        this.redraw();
}

SFG.prototype.find = function(x,y){
    var nodes = this.nodes;
    var selected = null;
    for (var i=0;i<nodes.length;i++){
        var node = nodes[i];
        if (node.pointInside(x,y)){
            selected = node;
            break;
        }
    }
    return selected;
}


SFG.prototype.addNode = function(x,y){
    var node = new Node();
    node.x = x;
    node.y = y;
    this.nodes.push(node);
    this.redraw();
}

SFG.prototype.addEdge = function(edge){
    this.edges.push(edge);
    edge.startNode.edges.push(edge);
}

SFG.prototype.deleteNode = function(){
    if (this.state == STATES.NORMAL && this.selectedNode != null){
        this.selectedNode == null;
    }else{
        alert("please select a node first");
    }
}

SFG.prototype.redraw = function(){
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    var nodes = this.nodes;
    var edges = this.edges;
    for (var i=0;i<edges.length;i++)
        edges[i].draw(this.ctx);
    for (var i=0;i<nodes.length;i++)
        nodes[i].draw(this.ctx);
}

//--------------------------------------------

function Node(){
    this.name = "node";
    this.x = 0;
    this.y = 0;
    this.radius = DEFAULT_RADIUS;
    this.color = DEFAULT_COLOR;
    this.edges = [];
}

Node.prototype.draw = function(ctx){
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.radius,0,2*Math.PI,false);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
    var width = ctx.measureText(this.name).width;
    ctx.fillText(this.name,this.x-width/2.0,this.y+this.radius+10);
}

Node.prototype.setSelected = function(){
    this.color = DEFAULT_SELECTED_COLOR;
}

Node.prototype.setUnselected = function(){
    this.color = DEFAULT_COLOR;
}

Node.prototype.pointInside = function(x,y){
    return Math.abs(this.x-x) < this.radius && Math.abs(this.y-y) < this.radius;
}
//---------------------------
function LineEdge(startNode,endNode){
    this.startNode = startNode;
    this.endNode = endNode;
    this.color = "#000000";
    this.arrowColor = "#800000";
}

LineEdge.prototype.draw = function(ctx){
    ctx.beginPath();
    ctx.moveTo(this.startNode.x,this.startNode.y);
    ctx.lineTo(this.endNode.x,this.endNode.y);
    ctx.strokeStyle = this.color;
    ctx.stroke();

    var r = 10;
    var arrowAng = 45;

    var midX = (this.startNode.x+this.endNode.x)/2.0;
    var midY = (this.startNode.y+this.endNode.y)/2.0;
    var x1,x2,y1,y2;
    if (this.startNode.x == this.endNode.x){
        x1 = midX - r * Math.sin(toRadians(arrowAng));
        x2 = midX + r * Math.sin(toRadians(arrowAng));
        var sign = 0;
        if (this.startNode.y - this.endNode.y < 0) sign = -1;
        else sign = 1;
        y1 = midY + sign * r * Math.cos(toRadians(arrowAng));
        y2 = y1;
    }else{
        var ang = Math.atan2(this.startNode.y-this.endNode.y
                ,this.startNode.x-this.endNode.x);
        var ang1 = ang + Math.tan(toRadians(arrowAng));
        var ang2 = ang - Math.tan(toRadians(arrowAng));
        x1 = midX + r * Math.cos(ang1);
        x2 = midX + r * Math.cos(ang2);
        y1 = midY + r * Math.sin(ang1);
        y2 = midY + r * Math.sin(ang2);
    }
    ctx.beginPath();
    ctx.strokeStyle = this.arrowColor;
    ctx.moveTo(x1,y1);
    ctx.lineTo(midX,midY);
    ctx.moveTo(x2,y2);
    ctx.lineTo(midX,midY);
    ctx.stroke();
}

LineEdge.prototype.drawToPoint = function(ctx,x,y){
    ctx.beginPath();
    ctx.moveTo(this.startNode.x,this.startNode.y);
    ctx.lineTo(x,y);
    ctx.stroke();
}


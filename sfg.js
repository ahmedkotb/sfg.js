DEFAULT_RADIUS = 12
DEFAULT_COLOR = "#228b22"
DEFAULT_EDGE_COLOR = "#000000"
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

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.canvas.sfg = this;
        this.canvas.ctx = this.ctx;

        this.graph = {};
        this.nodeCounter = 0;

        this.nodes = [];
        this.edges = [];
        this.state = STATES.NORMAL;
        this.selectedNode = null;

        this.selected = null;

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
    var sfg = this.sfg;
    if (state == STATES.ADD_NODE){
        sfg.newNode = null;
        sfg.state = STATES.NORMAL;
        sfg.addNode(x,y);
    }else if (state == STATES.NORMAL){

        var selected = sfg.find(x,y);
        sfg.selectItem(selected);

        if (selected instanceof Node){
            sfg.state = STATES.NODE_MOVE;
        }
    }else if (state == STATES.EDGE_WAIT_NODE1){
        var selected = sfg.findNode(x,y);
        sfg.selectItem(selected);
        if (selected){
            sfg.state = STATES.EDGE_WAIT_NODE2;
            sfg.edgeStartNode = selected;
            sfg.newEdge = new LineEdge(selected,null);
        }
    }else if (state == STATES.EDGE_WAIT_NODE2){
        var selected = sfg.findNode(x,y);
        sfg.state = STATES.NORMAL;
        if (selected == null){
            sfg.edgeStartNode = null;
            sfg.newEdge = null;
            return;
        }
        var edge = new LineEdge(sfg.edgeStartNode,selected);
        sfg.addEdge(edge);
        sfg.selectItem(null);
        sfg.redraw();
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
    var sfg = this.sfg;
    var node = null;
    if (sfg.selected instanceof Node)
        node = sfg.selected;
    if (state == STATES.NODE_MOVE && node != null){
        node.x = x;
        node.y = y;
        sfg.redraw();
    }else if (state == STATES.ADD_NODE){
        sfg.newNode.x = x;
        sfg.newNode.y = y;
        sfg.redraw();
        sfg.newNode.draw(sfg.ctx);
    }else if (state == STATES.EDGE_WAIT_NODE2){
        sfg.redraw();
        sfg.newEdge.drawToPoint(sfg.ctx,x,y);
    }
}

SFG.prototype.startAddingNode = function(){
    this.newNode = new Node(-1);
    this.newNode.name = "new";
    this.state = STATES.ADD_NODE;

    if (this.selected != null){
        this.selected.setUnselected();
        this.selected = null;
    }
}

SFG.prototype.startAddingEdge = function(){
    if (this.selected instanceof Node){
        this.edgeStartNode = this.selected;
        this.newEdge = new LineEdge(this.selected,null);
        this.state = STATES.EDGE_WAIT_NODE2;
    }else{
        this.state = STATES.EDGE_WAIT_NODE1;
    }
}

SFG.prototype.selectItem = function(item){
    var oldItem = this.selected;
    var needRedraw = false;
    if (oldItem != null){
        oldItem.setUnselected();
        needRedraw = true;
    }
    if (item != null){
        item.setSelected();
        needRedraw = true;
    }
    this.selected = item;
    if (item instanceof Node)
        this.edgeStartNode = item;
    if (needRedraw)
        this.redraw();
}

SFG.prototype.findNode = function(x,y){
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

SFG.prototype.findEdge = function(x,y){
    var edges = this.edges;
    var selected = null;
    for (var i=0;i<edges.length;i++){
        var edge = this.edges[i];
        if (edge.nearPoint(x,y)){
            selected = edge;
            break;
        }
    }
    return selected;
}

SFG.prototype.find = function(x,y){
    var node = this.findNode(x,y);
    if (node != null)
        return node;
    return this.findEdge(x,y);
}

SFG.prototype.addNode = function(x,y){
    var node = new Node(this.nodeCounter);
    this.nodeCounter++;
    this.graph[node.id] = {};
    node.x = x;
    node.y = y;
    this.nodes.push(node);
    this.redraw();
}

SFG.prototype.addEdge = function(edge){
    if (this.graph[edge.startNode.id][edge.endNode.id] == undefined){
        //TODO:check for self edges
        this.edges.push(edge);
        this.graph[edge.startNode.id][edge.endNode.id] = edge;
    }
    //debug("no of edges = " + this.edges.length);
}

SFG.prototype.deleteSelected = function(){
    if (this.selected instanceof Node){
        var id = this.selected.id;
        var nodes = this.nodes;
        var index = -1;
        for (var i=0;i<nodes.length;i++){
            if (nodes[i].id == id)
                index = i;
            var e = this.graph[nodes[i].id][id];
            if (e != undefined)
                this.deleteEdge(e);
            e = this.graph[id][nodes[i].id];
            if (e != undefined)
                this.deleteEdge(e);
        }
        this.nodes.splice(index,1);
    }else if (this.selected instanceof LineEdge){
        this.deleteEdge(this.selected);
    }

    this.selectItem(null);
}

SFG.prototype.deleteEdge = function(edge){
    var from = edge.startNode;
    var to = edge.endNode;
    var index = -1;
    for (var i=0;i<this.edges.length;i++){
        var e = this.edges[i];
        if (e.startNode.id == from.id && e.endNode.id == to.id){
            index = i;
            break;
        }
    }

    if (index != -1)
        this.edges.splice(index,1);
    delete this.graph[from.id][to.id];
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
function Node(id){
    this.id = id;
    this.name = "node " + this.id;
    this.x = 0;
    this.y = 0;
    this.radius = DEFAULT_RADIUS;
    this.color = DEFAULT_COLOR;
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
    this.label = "a";
}

LineEdge.prototype.draw = function(ctx){
    //drawing the edge
    ctx.beginPath();
    ctx.moveTo(this.startNode.x,this.startNode.y);
    ctx.lineTo(this.endNode.x,this.endNode.y);
    ctx.strokeStyle = this.color;
    ctx.stroke();

    //drawing the arrow
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

    //drawing the label
    var width = ctx.measureText(this.label).width;
    ctx.fillText(this.label,midX-width/2.0,midY+10);
}

LineEdge.prototype.nearPoint = function(x,y){
    var x1 = this.startNode.x;
    var y1 = this.startNode.y;
    var x2 = this.endNode.x;
    var y2 = this.endNode.y;
    var mag = ((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    var u = ((x-x1)*(x2-x1) + (y-y1)*(y2-y1))/mag;
    var xp = x1 + u*(x2-x1);
    var yp = y1 + u*(y2-y1);
    var dist = Math.sqrt((xp-x)*(xp-x) + (yp-y)*(yp-y));
    return dist < 10;
}

LineEdge.prototype.drawToPoint = function(ctx,x,y){
    ctx.beginPath();
    ctx.moveTo(this.startNode.x,this.startNode.y);
    ctx.lineTo(x,y);
    ctx.stroke();
}

LineEdge.prototype.setSelected = function(){
    this.color = "#0000FF";
}

LineEdge.prototype.setUnselected = function(){
    this.color = DEFAULT_EDGE_COLOR;
}

/**
 * @license Copyright (c) 2012 @ahmedkotb , kotbcorp [at] gmail.com
 *
 * See the file license.txt for copying permission.
 */
var sfgjs = {
    DEFAULT_RADIUS : 12,
    DEFAULT_COLOR : "#228b22",
    DEFAULT_EDGE_COLOR : "#000000",
    DEFAULT_SELECTED_COLOR : "#0000FF",
    DEFAULT_MARKED_COLOR : "#FF9933",

    STATES : {NORMAL : 0, ADD_NODE: 1, NODE_MOVE: 2,
                    EDGE_WAIT_NODE1: 3, EDGE_WAIT_NODE2: 4,
                    PAN: 5, SRC_WAIT_NODE: 6, DEST_WAIT_NODE: 7
                },

    //helper functions
    utils:{
        debug : function(str){
            document.getElementById("debug").innerHTML += str + "<br/>";
        },
        debugClear : function(){
            document.getElementById("debug").innerHTML = "";
        },
        toRadians : function(angle){
            return angle * Math.PI / 360;
        },
        //Code ported from c version available here
        //http://tog.acm.org/resources/GraphicsGems/gems/Roots3And4.c
        solveCubic : function(c) {

            M_PI = 3.14159265358979323846;
            function isZero(x){
                var EQN_EPS = 1e-9;
                return Math.abs(x) < EQN_EPS;
            }

            function cbrt(x){
                return (x > 0.0 ? Math.pow(x, 1/3) : (x < 0.0 ? - Math.pow(-x, 1/3) : 0.0));
            }

            var s = null;
            var i, num;
            var sub;
            var A, B, C;
            var sq_A, p, q;
            var cb_p, D;

            /* normal form: x^3 + Ax^2 + Bx + C = 0 */

            A = c[ 2 ] / c[ 3 ];
            B = c[ 1 ] / c[ 3 ];
            C = c[ 0 ] / c[ 3 ];

            /*  substitute x = y - A/3 to eliminate quadric term:
            x^3 +px + q = 0 */

            sq_A = A * A;
            p = 1.0/3 * (- 1.0/3 * sq_A + B);
            q = 1.0/2 * (2.0/27 * A * sq_A - 1.0/3 * A * B + C);

            /* use Cardano's formula */

            cb_p = p * p * p;
            D = q * q + cb_p;

            if (isZero(D)) {
                if (isZero(q)) {
                    /* one triple solution */
                    s = [0.0];
                    s[ 0 ] = 0;
                    num = 1;
                } else {
                    /* one single and one double solution */
                    s = [0.0,0.0];
                    var u = cbrt(-q);
                    s[ 0 ] = 2 * u;
                    s[ 1 ] = - u;
                    num = 2;
                }
            }
            else if (D < 0){
                /* Casus irreducibilis: three real solutions */
                var phi = 1.0/3 * Math.acos(-q / Math.sqrt(-cb_p));
                var t = 2 * Math.sqrt(-p);

                s = [0.0,0.0,0.0];
                s[ 0 ] =   t * Math.cos(phi);
                s[ 1 ] = - t * Math.cos(phi + M_PI / 3);
                s[ 2 ] = - t * Math.cos(phi - M_PI / 3);
                num = 3;
            }
            else{
                /* one real solution */
                var sqrt_D = Math.sqrt(D);
                var u = cbrt(sqrt_D - q);
                var v = - cbrt(sqrt_D + q);

                s = [0.0];
                s[ 0 ] = u + v;
                num = 1;
            }

            /* resubstitute */

            sub = 1.0/3 * A;

            for (i = 0; i < num; ++i)
                s[ i ] -= sub;

            return s;
        }
    },

    /**
     * main SFG solver class
     * @constructor
     */
    SFG : function(canvas){
        if (canvas.getContext){

            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.canvas.sfg = this;
            this.canvas.ctx = this.ctx;

            this.grid = true;
            this.scale = 1.5;
            this.transX = 0;
            this.transY = 0;

            this.graph = {};
            this.nodeCounter = 0;
            this.nodeMap = {};
            this.symbols = {};

            this.nodes = [];
            this.edges = [];
            this.state = sfgjs.STATES.NORMAL;
            this.selectedNode = null;

            this.selected = null;
            this.markedPath = null;

            this.newNode = null;
            this.newEdge = null;

            this.controlNode = null;

            //the method that gets called after solving the sfg
            this.solveCallback = null;

            this.srcNode = null;
            this.destNode = null;

            //status line displayed at the top of the canvas
            this.statusLine = "";
            this.statusRemovable = true;

            //setup events
            canvas.addEventListener('mousedown',this.mousedown,false);
            canvas.addEventListener('mouseup',this.mouseup,false);
            canvas.addEventListener('mousemove',this.mousemove,false);
            canvas.addEventListener('DOMMouseScroll', this.scroll, false);
            canvas.addEventListener('mousewheel', this.scroll, false);

            var me = this;
            document.addEventListener('keydown',function(event){
                me.keydown(event);
            },true);

            //Demo example for testing
            this.scale = 1.4;
            this.transX = -20;
            this.transY = -90;
            this.addNode(50,150); this.addNode(150,150);
            this.addNode(250,150); this.addNode(350,150);
            this.addNode(450,150); this.addNode(550,150);
            this.addNode(350,300); this.addNode(250,300);

            var e = new sfgjs.ArcEdge(this.nodes[0],this.nodes[1]);e.label="g1"; this.addEdge(e);
            e = new sfgjs.ArcEdge(this.nodes[1],this.nodes[2]);e.label="g2"; this.addEdge(e);
            e = new sfgjs.ArcEdge(this.nodes[2],this.nodes[3]);e.label="g3"; this.addEdge(e);
            e = new sfgjs.ArcEdge(this.nodes[3],this.nodes[4]);e.label="g4"; this.addEdge(e);
            e = new sfgjs.ArcEdge(this.nodes[4],this.nodes[5]);e.label="g5"; this.addEdge(e);

            e = new sfgjs.ArcEdge(this.nodes[2],this.nodes[1]);e.label="h1"; this.addEdge(e);
            e.controlPoint.y += 60;
            e = new sfgjs.ArcEdge(this.nodes[4],this.nodes[3]);e.label="h2"; this.addEdge(e);
            e.controlPoint.y += 60;

            e = new sfgjs.ArcEdge(this.nodes[5],this.nodes[6]);e.label="g6"; this.addEdge(e);
            e = new sfgjs.ArcEdge(this.nodes[6],this.nodes[7]);e.label="g7"; this.addEdge(e);
            e = new sfgjs.ArcEdge(this.nodes[7],this.nodes[6]);e.label="h4"; this.addEdge(e);
            e.controlPoint.y += 60;
            e = new sfgjs.ArcEdge(this.nodes[7],this.nodes[1]);e.label="g8"; this.addEdge(e);
            this.redraw();
        }else{
            alert("canvas not supported!");
        }
    },

    /**
     * Path object
     * @constructor
     */
    Path : function(nodesList,graph){
        this.nodes = nodesList;
        this.graph = graph;
        this.id = -1;
    },

    /**
     * Node object
     * @constructor
     */
    Node : function(id){
        this.id = id;
        this.label = "node " + this.id;
        this.x = 0;
        this.y = 0;
        this.radius = sfgjs.DEFAULT_RADIUS;
        this.color = sfgjs.DEFAULT_COLOR;
        this.tag = "";
    },

    /**
     * Control Node object
     * @constructor
     */
    ControlNode : function(arcEdge){
        this.arcEdge = arcEdge;
        this.x = arcEdge.controlPoint.x;
        this.y = arcEdge.controlPoint.y;
        this.label = "";
        this.radius = sfgjs.DEFAULT_RADIUS/1.5;
        this.color = "#FF0000";
        this.tag = "";
    },

    /**
     * LineEdge object
     * @constructor
     */
    LineEdge : function(startNode,endNode){
        this.startNode = startNode;
        this.endNode = endNode;
        this.color = "#000000";
        this.arrowColor = "#800000";
        this.label = "1";
        this.controlPoint = {x:0,y:0};
        this.selfEdge = false;
        this.selfEdgeRadius = sfgjs.DEFAULT_RADIUS + 2;
        this.selfNodeOldLocation = {x:0,y:0};
        if (startNode != null && endNode != null){
            this.selfEdge = startNode.id == endNode.id;
            if (this.selfEdge){
                this.controlPoint.x = this.startNode.x + sfgjs.DEFAULT_RADIUS;
                this.controlPoint.y = this.startNode.y;
                this.selfNodeOldLocation.x = this.startNode.x;
                this.selfNodeOldLocation.y = this.startNode.y;
            }
        }
    },

    /**
     * ArcEdge object
     * @constructor
     */
    ArcEdge : function(startNode,endNode){
        this.startNode = startNode;
        this.endNode = endNode;
        this.controlPoint = {x:0,y:0};
        this.drawControlLines = false;

        this.selfEdge = false;
        this.selfEdgeRadius = sfgjs.DEFAULT_RADIUS + 2;
        this.selfNodeOldLocation = {x:0,y:0};

        if (this.startNode != null && this.endNode != null){
            this.controlPoint.x = (this.startNode.x + this.endNode.x)/2;
            this.controlPoint.y = (this.startNode.y + this.endNode.y)/2;
            this.selfEdge = startNode.id == endNode.id;
            if (this.selfEdge){
                this.controlPoint.x = this.startNode.x + sfgjs.DEFAULT_RADIUS;
                this.controlPoint.y = this.startNode.y;
                this.selfNodeOldLocation.x = this.startNode.x;
                this.selfNodeOldLocation.y = this.startNode.y;
            }
        }

        this.color = "#000000";
        this.arrowColor = "#800000";
        this.label = "1";
    }
};

sfgjs.SFG.prototype = {
    mousedown : function(e){
        e = e || window.e;
        e.preventDefault();
        e.stopPropagation();

        var x = e.pageX - canvas.offsetLeft;
        var y = e.pageY - canvas.offsetTop;
        var state = this.sfg.state;
        var sfg = this.sfg;

        if (sfg.statusRemovable){
            var width = this.ctx.measureText(sfg.statusLine).width;
            var start = (this.width - width)/2;
            var end = start + width;
            if (x >= start && x <= end && y >= 0 && y <= 25)
                sfg.setStatus("",false);
        }
        //scale and translate factors
        x -= sfg.transX; y -= sfg.transY;
        x /= sfg.scale; y /= sfg.scale;

        if (state == sfgjs.STATES.ADD_NODE){
            sfg.newNode = null;
            sfg.state = sfgjs.STATES.NORMAL;
            sfg.addNode(x,y);
        }else if (state == sfgjs.STATES.NORMAL){

            var selected = sfg.find(x,y);

            //in case a marked path exists
            if (selected != null && sfg.markedPath != null)
                sfg.unMarkPath(sfg.markedPath);


            if (selected instanceof sfgjs.Node){
                sfg.state = sfgjs.STATES.NODE_MOVE;
                sfg.controlNode = null;
            }else if (selected instanceof sfgjs.LineEdge){
                sfg.controlNode = null;
                if (selected.selfEdge)
                    sfg.controlNode = new sfgjs.ControlNode(selected);
            }else if (selected instanceof sfgjs.ControlNode){
                sfg.state = sfgjs.STATES.NODE_MOVE;
            }else if (selected instanceof sfgjs.ArcEdge){
                sfg.controlNode = new sfgjs.ControlNode(selected);
            }else{
                sfg.controlNode = null;
            }
            if (selected == null){
                this.startX = x;
                this.startY = y;
                sfg.state = sfgjs.STATES.PAN;
                this.style.cursor = "move";
            }
            sfg.selectItem(selected);
        }else if (state == sfgjs.STATES.SRC_WAIT_NODE){
            var selected = sfg.find(x,y);
            if (selected instanceof sfgjs.Node){
                selected.setAsSource();
                sfg.srcNode = selected;
                sfg.state = sfgjs.STATES.DEST_WAIT_NODE;
                sfg.setStatus("please choose destination node",false);
            }
        }else if (state == sfgjs.STATES.DEST_WAIT_NODE){
            var selected = sfg.find(x,y);
            if (selected instanceof sfgjs.Node){
                selected.setAsDestination();
                sfg.destNode = selected;
                var result = sfg.solve(sfg.srcNode.label,selected.label);
                sfg.solveCallback(result);
                sfg.state = sfgjs.STATES.NORMAL;
                sfg.setStatus("",false);
            }
        }else if (state == sfgjs.STATES.EDGE_WAIT_NODE1){
            //sfg.newEdge must be initialized to empty edge
            //either by startAddingLineEdge or arc edge methods
            var selected = sfg.findNode(x,y);
            sfg.selectItem(selected);
            if (selected){
                sfg.state = sfgjs.STATES.EDGE_WAIT_NODE2;
                sfg.newEdge.setStartNode(selected);
            }
        }else if (state == sfgjs.STATES.EDGE_WAIT_NODE2){
            var selected = sfg.findNode(x,y);
            sfg.state = sfgjs.STATES.NORMAL;
            if (selected == null){
                sfg.newEdge = null;
                sfg.redraw();
                return;
            }
            var edge = sfg.newEdge;
            edge.setEndNode(selected);
            var edgeAdded = sfg.addEdge(edge);
            if (!edgeAdded){
                sfg.newEdge = null;
                sfg.redraw();
                return;
            }
            if (edge instanceof sfgjs.ArcEdge)
                sfg.controlNode = new sfgjs.ControlNode(edge);
            sfg.selectItem(edge);
        }

    },
    mouseup : function(e){
        e = e || window.e;
        e.preventDefault();
        e.stopPropagation();
        var state = this.sfg.state;
        if (state == sfgjs.STATES.NODE_MOVE || state == sfgjs.STATES.PAN){
            this.sfg.state = sfgjs.STATES.NORMAL;
            this.style.cursor = "auto";
        }
    },
    mousemove : function(e){
        e = e || window.e;
        var x = e.pageX - canvas.offsetLeft;
        var y = e.pageY - canvas.offsetTop;
        var state = this.sfg.state;
        var sfg = this.sfg;
        var node = null;

        //scale and translate factors
        x -= sfg.transX; y -= sfg.transY;
        x /= sfg.scale; y /= sfg.scale;

        if (sfg.selected instanceof sfgjs.Node || sfg.selected instanceof sfgjs.ControlNode)
            node = sfg.selected;

        if (state == sfgjs.STATES.NODE_MOVE && node != null){
            node.setX(x);
            node.setY(y);
            sfg.redraw();
        }else if (state == sfgjs.STATES.ADD_NODE){
            sfg.newNode.setX(x);
            sfg.newNode.setY(y);
            sfg.redraw();
            sfg.newNode.draw(sfg.ctx);
        }else if (state == sfgjs.STATES.EDGE_WAIT_NODE2){
            sfg.redraw();
            sfg.newEdge.drawToPoint(sfg.ctx,x,y);
        }else if (state == sfgjs.STATES.PAN){
            var dx = x - this.startX;
            var dy = y - this.startY;
            sfg.transX += dx;
            sfg.transY += dy;
            sfg.redraw();
        }
    },
    keydown : function(e){
        var ESCAPE = 27;
        var unicode = e.keyCode? e.keyCode : e.charCode;
        if (unicode == ESCAPE){
            if (this.state == sfgjs.STATES.ADD_NODE){
                this.cancelAddingNode();
            }else if (this.state == sfgjs.STATES.EDGE_WAIT_NODE1
                    || this.state == sfgjs.STATES.EDGE_WAIT_NODE2){
                this.state = sfgjs.STATES.NORMAL;
                this.newEdge = null;
                this.redraw();
            }else if (this.state == sfgjs.STATES.SRC_WAIT_NODE
                    || this.state == sfgjs.STATES.DEST_WAIT_NODE){
                this.state = sfgjs.STATES.NORMAL;
                this.selectItem(null);
                this.setStatus("",false);
            }else if (this.state == sfgjs.STATES.NORMAL
                    || this.state == NODE_MOVE){
                this.controlNode = null;
                this.selectItem(null);
            }
        }
        //alert(unicode);
    },
    //scroll code can be found at
    //http://www.adomas.org/javascript-mouse-wheel/
    scroll : function(event){
        var delta = 0;
        if (!event) /* For IE. */
                event = window.event;
        if (event.wheelDelta) { /* IE/Opera. */
                delta = event.wheelDelta/120;
        } else if (event.detail) { /** Mozilla case. */
                /** In Mozilla, sign of delta is different than in IE.
                 * Also, delta is multiple of 3.
                 */
                delta = -event.detail/3;
        }
        /** If delta is nonzero, handle it.
         * Basically, delta is now positive if wheel was scrolled up,
         * and negative, if wheel was scrolled down.
         */
        if (delta){
            if (delta > 0)
                this.sfg.zoomIn();
            else if (delta < 0)
                this.sfg.zoomOut();
        }
        /** Prevent default actions caused by mouse wheel.
         * That might be ugly, but we handle scrolls somehow
         * anyway, so don't bother here..
         */
        if (event.preventDefault)
                event.preventDefault();
        event.returnValue = false;
    },
    getSymbols : function(){
        var syms = [];
        for (s in this.symbols){
            if (s != "1")
                syms.push({sym:s,value:this.symbols[s].value});
        }
        return syms;
    },
    setSymbolValue : function(symbol,value){
        this.symbols[symbol].value = value;
        this.clearSolution();
    },
    isSomethingSelected : function(){
        if (this.selected)
            return true;
        return false;
    },
    getSelectedLabel : function(){
        if (this.isSomethingSelected())
            return this.selected.label;
        return "";
    },
    setSelectedLabel : function(label){
        if (this.isSomethingSelected()){
            //in case of edges
            if (this.selected instanceof sfgjs.LineEdge
                    || this.selected instanceof sfgjs.ArcEdge){

                if (this.selected.label != label){
                    if (this.symbols[this.selected.label] != undefined){
                        this.symbols[this.selected.label].count--;
                        if (this.symbols[this.selected.label].count == 0)
                            delete this.symbols[this.selected.label];
                    }

                    if (this.symbols[label] == undefined)
                        this.symbols[label] = {value:1.0,count:1};
                    else
                        this.symbols[label].count++;
                }

                this.clearSolution();
                this.selected.label = label;
            }else if (this.selected instanceof sfgjs.Node){
                if (this.nodeMap[label] == null){
                    delete this.nodeMap[this.selected.label];
                    this.nodeMap[label] = this.selected;
                    this.clearSolution();
                    this.selected.label = label;
                }else{
                    //already existing label
                    this.setStatus("node with same label already exists",true);
                }
            }
            this.redraw();
        }
    },
    startAddingNode : function(){
        this.controlNode = null;
        this.clearSolution();
        this.newNode = new sfgjs.Node(-1);
        this.newNode.label = "new";
        this.state = sfgjs.STATES.ADD_NODE;

        if (this.selected != null){
            this.selected.setUnselected();
            this.selected = null;
        }
    },
    cancelAddingNode : function(){
        this.newNode = null;
        this.state = sfgjs.STATES.NORMAL;
        this.redraw();
    },
    startAddingLineEdge : function(){
        this.clearSolution();
        if (this.selected instanceof sfgjs.Node){
            this.newEdge = new sfgjs.LineEdge(this.selected,null);
            this.state = sfgjs.STATES.EDGE_WAIT_NODE2;
        }else{
            this.newEdge = new sfgjs.LineEdge(null,null);
            this.state = sfgjs.STATES.EDGE_WAIT_NODE1;
        }
    },
    startAddingArcEdge : function(){
        this.clearSolution();
        if (this.selected instanceof sfgjs.Node){
            this.newEdge = new sfgjs.ArcEdge(this.selected,null);
            this.state = sfgjs.STATES.EDGE_WAIT_NODE2;
        }else{
            this.newEdge = new sfgjs.ArcEdge(null,null);
            this.state = sfgjs.STATES.EDGE_WAIT_NODE1;
        }
    },
    selectItem : function(item){
        var oldItem = this.selected;
        var needRedraw = false;

        if (oldItem != null){
            oldItem.setUnselected();
            if (oldItem instanceof sfgjs.Node){
                if (this.srcNode != null && oldItem.id == this.srcNode.id)
                    oldItem.setAsSource();
                if (this.destNode != null && oldItem.id == this.destNode.id)
                    oldItem.setAsDestination();
            }
            needRedraw = true;
        }

        if (item != null){
            item.setSelected();
            if (item instanceof sfgjs.Node){
                if (this.srcNode != null && item.id == this.srcNode.id)
                    item.setAsSource();
                if (this.destNode != null && item.id == this.destNode.id)
                    item.setAsDestination();
            }
            needRedraw = true;
        }

        this.selected = item;

        if (needRedraw)
            this.redraw();
    },
    findNode : function(x,y){
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
    },
    findEdge : function(x,y){
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
    },
    find : function(x,y){
        // first check for control point selection
        if (this.controlNode != null && this.controlNode.pointInside(x,y))
            return this.controlNode;

        // second check for any node selection
        var node = this.findNode(x,y);
        if (node != null)
            return node;

        // third check for any edge selection
        return this.findEdge(x,y);
    },
    addNode : function(x,y){
        var node = new sfgjs.Node(this.nodeCounter);
        this.nodeCounter++;
        this.graph[node.id] = {};
        node.setX(x);
        node.setY(y);
        this.nodes.push(node);
        this.nodeMap[node.label] = node;
        this.redraw();
    },
    addEdge : function(edge){
        if (this.graph[edge.startNode.id][edge.endNode.id] == undefined){
            this.edges.push(edge);
            this.graph[edge.startNode.id][edge.endNode.id] = edge;

            if (this.symbols[edge.label] == undefined)
                this.symbols[edge.label] = {value:1.0,count:1};
            else
                this.symbols[edge.label].count+=1;
            return true;
        }
        this.setStatus("An edge already exists between those two nodes",true);
        return false;
    },
    deleteSelected : function(){

        if (this.selected != null && this.markedPath != null)
            this.unMarkPath(this.markedPath);

        if (this.selected instanceof sfgjs.Node){
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
        }else if (this.selected instanceof sfgjs.LineEdge
                || this.selected instanceof sfgjs.ArcEdge){
            this.controlNode = null;
            this.deleteEdge(this.selected);
        }else if (this.selected instanceof sfgjs.ControlNode){
            this.deleteEdge(this.controlNode.arcEdge);
            this.controlNode = null;
        }

        if (this.selected != null)
            this.clearSolution();
        this.selectItem(null);
    },
    deleteEdge : function(edge){
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

        //modify symtable
        this.symbols[edge.label].count--;
        if (this.symbols[edge.label].count == 0)
            delete this.symbols[edge.label];
    },

    setStatus : function(status,removable){
        this.statusLine = status;
        this.statusRemovable = removable;
        this.redraw();
    },
    redraw : function(){
        //clear the canvas
        this.ctx.setTransform(1,0,0,1,0,0);
        this.ctx.save();
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

        //draw grid
        if (this.grid){
            this.ctx.strokeStyle = "#C8C8C8";
            this.ctx.beginPath();

            for(var i=0;i<this.canvas.width;i+=10){
                this.ctx.moveTo(i,0);
                this.ctx.lineTo(i,this.canvas.height);
            }

            for(var i=0;i<this.canvas.height;i+=10){
                this.ctx.moveTo(0,i);
                this.ctx.lineTo(this.canvas.width,i);
            }

            this.ctx.stroke();
        }

        //draw status line
        this.ctx.fillStyle = "#000000";
        var width = this.ctx.measureText(this.statusLine).width;
        this.ctx.font = "normal 11pt Arial";
        this.ctx.fillText(this.statusLine,(this.canvas.width-width)/2,15);

        this.ctx.restore();
        this.ctx.setTransform(this.scale,0,0,this.scale,this.transX,this.transY);

        var nodes = this.nodes;
        var edges = this.edges;

        //draw edges
        for (var i=0;i<edges.length;i++)
            edges[i].draw(this.ctx);

        //draw nodes
        for (var i=0;i<nodes.length;i++)
            nodes[i].draw(this.ctx);

        //draw control node if exists
        if (this.controlNode)
            this.controlNode.draw(this.ctx);
    },
    zoomIn : function(){
        this.scale += 0.2;
        this.redraw();
    },
    zoomOut : function(){
        this.scale -= 0.2;
        this.redraw();
    },
    clear : function(){
        this.nodes = [];
        this.edges = [];
        this.nodeCounter = 0;
        this.symbols = {};
        this.nodeMap = {};
        this.srcNode = null;
        this.destNode = null;
        this.redraw();
    },
    clearSolution : function(){
        if (this.srcNode)
            this.srcNode.setUnselected();
        if (this.destNode)
            this.destNode.setUnselected();
        this.srcNode = null;
        this.destNode = null;
        this.redraw();
    },
    startSolve : function(callback){
        if (this.nodes.length == 0)
            return;
        this.controlNode = null;
        this.clearSolution();
        this.solveCallback = callback;
        this.selectItem(null);
        this.state = sfgjs.STATES.SRC_WAIT_NODE;
        this.setStatus("please choose source node",false);
    },
    solve : function(srcLabel,destLabel){

        if (this.nodeMap[srcLabel] == undefined  ||
                this.nodeMap[destLabel] == undefined){
            alert("please make sures node with the given labels exists");
        }
        var startNodeID = this.nodeMap[srcLabel].id;
        var endNodeID = this.nodeMap[destLabel].id;
        var paths = this.getPaths(startNodeID,endNodeID);
        var loops = this.getLoops();
        if (paths.length == 0){
            this.setStatus("no forward paths between source and destination",true);
            this.state = sfgjs.STATES.NORMAL;
            return;
        }
        //calculate main delta and paths delta
        var deltaSym = "1";
        var deltaVal = 1;
        //paths data
        var pathsDeltaSym = [];
        var pathsDeltaValue = [];
        var pathsTouch = [];
        var pathsLoopGain = [];
        var pathsLoopGainValue = [];
        var pathsCount = [];
        var pathsTerm = [];
        var pathsTermValue = [];
        //init paths data
        for (var i=0;i<paths.length;i++){
            pathsDeltaSym.push("1");
            pathsDeltaValue.push(1);
            pathsTouch.push(false);
            pathsLoopGain.push("");
            pathsLoopGainValue.push(0);
            pathsTerm.push("");
            pathsTermValue.push(0);
            pathsCount.push(0);
        }

        for(var i=0;i<loops.length;i++){
            var item = loops[i];

            for (var p=0;p<paths.length;p++){
                pathsTerm[p] = "( ";
                pathsCount[p] = 0;
            }

            var deltaValTerm = 0;
            var deltaSymComp = "";
            for (var j=0;j<item.length;j++){
                var loopArray = item[j];
                var loopGain = "";
                var loopGainValue = 0;
                //re-init paths data
                for (var p=0;p<paths.length;p++){
                    pathsTouch[p] = false;
                    pathsLoopGain[p] = "";
                    pathsLoopGainValue[p] = 0;
                }

                if (loopArray.length > 0){
                    loopGain = loopArray[0].gain();
                    loopGainValue = loopArray[0].gainValue(this.symbols);
                    for (var p=0;p<paths.length;p++){
                        pathsTouch[p] |= paths[p].isTouching(loopArray[0]);
                        pathsLoopGain[p] += loopArray[0].gain();
                        pathsLoopGainValue[p] += loopArray[0].gainValue(this.symbols);
                    }
                }

                for (var k=1;k<loopArray.length;k++){
                    loopGain += "." + loopArray[k].gain();
                    loopGainValue *= loopArray[k].gainValue(this.symbols);
                    for (var p=0;p<paths.length;p++){
                        pathsTouch[p] |= paths[p].isTouching(loopArray[k]);
                        pathsLoopGain[p] += "." + loopArray[k].gain();
                        pathsLoopGainValue[p] *= loopArray[k].gainValue(this.symbols);
                    }
                }

                deltaSymComp += loopGain;
                deltaValTerm += loopGainValue;
                if (j != item.length-1)
                    deltaSymComp += " + ";

                for (var p=0;p<paths.length;p++){
                    if (!pathsTouch[p]){
                        if (pathsCount[p] != 0)
                            pathsTerm[p] += " + ";
                        pathsCount[p]+=1;
                        pathsTerm[p] += pathsLoopGain[p];
                        pathsTermValue[p] += pathsLoopGainValue[p];
                    }
                }
            }

            var sign = "";
            if (i%2 == 0){
                deltaVal -= deltaValTerm;
                sign = " - ";
            }
            else{
                deltaVal += deltaValTerm;
                sign = " + ";
            }

            if (deltaSymComp != ""){
                deltaSym += sign;
                deltaSym += "( ";
                deltaSym += deltaSymComp;
                deltaSym += " )";
            }

            for (var p=0;p<paths.length;p++){
                if (pathsTerm[p] != "( ")
                    pathsDeltaSym[p] += sign + pathsTerm[p] + " )";
                if (i%2 == 0)
                    pathsDeltaValue[p] -= pathsTermValue[p];
                else
                    pathsDeltaValue[p] += pathsTermValue[p];
            }

        }
        console.log("deltaSYM");
        console.log(deltaSym);
        console.log("deltaVAL");
        console.log(deltaVal);
        console.log("====");
        for (var p=0;p<paths.length;p++){
            console.log("Path " + p);
            console.log("gain : " + paths[p].gain());
            console.log("gain : " + paths[p].gainValue(this.symbols));
            console.log(paths[p]);
            console.log(pathsDeltaSym[p]);
            console.log(pathsDeltaValue[p]);
            console.log("---");
        }
        console.log("=====================");
        console.log("Transfer Function : ");

        var numerator = "";
        var numeratorVal = 0;
        for (var p=0;p<paths.length-1;p++){
            numerator += "[ (" + pathsDeltaSym[p] + ") * (" + paths[p].gain() + ") ] + ";
            numeratorVal += pathsDeltaValue[p] * paths[p].gainValue(this.symbols);
        }
        numerator += "[ (" + pathsDeltaSym[paths.length-1] + ") * (" + paths[paths.length-1].gain() + ") ]";
        numeratorVal += pathsDeltaValue[paths.length-1] * paths[paths.length-1].gainValue(this.symbols);
        console.log("SYMS")
        console.log(numerator);
        console.log("------------");
        console.log(deltaSym);

        console.log("NUMERIC")
        console.log("( " + numeratorVal + " ) / ( " + deltaVal + " )");
        var singleLoops = [];
        for (i in loops[0])
            singleLoops.push(loops[0][i][0]);

        return {sym:{num:numerator,delta:deltaSym},
            numeric:{num:numeratorVal,delta:deltaVal},
            paths:paths, loops:singleLoops,
            srcLabel:srcLabel, destLabel:destLabel};
    },
    getPaths : function(startNodeID,endNodeID){
        var paths = [];
        this.walk(startNodeID,endNodeID,paths,{},[]);
        var pathsArray= [];
        for (i in paths){
            var path = new sfgjs.Path(paths[i],this.graph);
            path.id = i;
            pathsArray.push(path);
        }
        return pathsArray;
    },
    walk : function(nodeID,destID,paths,visited,stack){
        visited[nodeID] = true;
        stack.push(nodeID);
        for (var n in this.graph[nodeID]){
            if (n == destID){
                path = stack.slice(0,stack.length);
                path.push(destID);
                paths.push(path);
            }
            else if (!visited[n])
                this.walk(n,destID,paths,visited,stack);
        }
        visited[nodeID] = false;
        stack.pop();
    },
    getLoops : function(){
        var singleLoops = [];
        var visited = {};
        for (i in this.nodes){
            var nodeID = this.nodes[i].id;
            var paths = [];
            this.walk(nodeID,nodeID,paths,visited,[]);
            visited[nodeID] = true;
            for (j in paths){
                var l = new sfgjs.Path(paths[j],this.graph);
                singleLoops.push(l);
                l.id = singleLoops.length;
            }
        }

        console.log(singleLoops);

        var pairs = [];
        for (var i=0;i<singleLoops.length;i++){
            for (var j=i+1;j<singleLoops.length;j++){
                if (!singleLoops[i].isTouching(singleLoops[j]))
                    pairs.push([singleLoops[i],singleLoops[j]]);
            }
        }

        var nloops = [pairs];
        var hash = {};
        while (true){
            var nloop = nloops[nloops.length-1];
            var nnloop = [];
            for (var i=0;i<singleLoops.length;i++){
                //loop over pairs or triples ..etc
                for (var j=0;j<nloop.length;j++){
                    //loop on each pair or triple ..
                    var nonTouching = true;
                    var loopArray = nloop[j];
                    for (var k=0;k<loopArray.length;k++){
                        if (loopArray[k].isTouching(singleLoops[i])){
                            nonTouching = false;
                            break;
                        }
                    }
                    if (nonTouching){
                        var newLoopArray = [];
                        var ids = [];
                        for (var l=0;l<loopArray.length;l++){
                            newLoopArray.push(loopArray[l]);
                            ids.push(loopArray[l].id);
                        }
                        newLoopArray.push(singleLoops[i]);
                        ids.push(singleLoops[i].id);
                        ids.sort();
                        var hashStr = "";
                        for (index in ids)
                            hashStr += ids[index] +",";
                        if (hash[hashStr] == undefined){
                            nnloop.push(newLoopArray);
                            hash[hashStr] = true;
                        }
                    }
                }
            }
            if (nnloop.length == 0)
                break;
            nloops.push(nnloop);
        }
        var indeploops = [];
        for (i in singleLoops)
            indeploops.push([singleLoops[i]]);
        nloops.splice(0,0,indeploops);
        console.log("----");
        console.log(nloops);
        return nloops;
    },
    unMarkPath : function(path){

        for (var i=0;i<path.nodes.length;i++){
            var node = this.nodes[path.nodes[i]];
            node.setUnMarked();
        }
        if (this.srcNode)
            this.srcNode.setAsSource();
        if (this.destNode)
            this.destNode.setAsDestination();

        this.redraw();
    },
    markPath : function(path){

        if (this.markedPath != null)
            this.unMarkPath(this.markedPath);

        var to = path.nodes.length;
        if (path.nodes[0] == path.nodes[path.nodes.length-1])
            to--;
        for (var i=0;i<to;i++){
            var node = this.nodes[path.nodes[i]];
            node.tag = (i+1) + "";
            node.setMarked();
        }

        this.markedPath = path;
        this.redraw();
    }
};//end of SFG prototype

//--------------------------------------------

sfgjs.Path.prototype = {
    gain : function(){
        var gain = "";
        var symsCount = 0;

        for (var i=1;i<this.nodes.length;i++){
            var prev = this.nodes[i-1];
            var n = this.nodes[i];
            if (this.graph[prev][n].label != "1"){
                symsCount++;
                gain += this.graph[prev][n].label;
                if (i != this.nodes.length -1)
                    gain += ".";
            }
        }

        //in case of path gain = 1*1*1*1 ...
        if (symsCount == 0)
            return "1";
        if (gain.length > 1 && gain.charAt(gain.length-1)==".")
            gain = gain.substr(0,gain.length-1);
        return gain;
    },
    gainValue : function(symTable){
        var gain = 1;
        for (var i=1;i<this.nodes.length;i++){
            var prev = this.nodes[i-1];
            var n = this.nodes[i];
            var label = this.graph[prev][n].label;
            var value = symTable[label].value;
            gain *= value;
        }
        return gain;
    },
    isTouching : function(path){
        for (var i=0;i<this.nodes.length;i++){
            for (var j=0;j<path.nodes.length;j++){
                if (this.nodes[i] == path.nodes[j])
                    return true;
            }
        }
        return false;
    }
}

//--------------------------------------------

sfgjs.Node.prototype = {

    setX : function(x){
        this.x = x;
    },

    setY : function(y){
        this.y = y;
    },

    draw : function(ctx){
        ctx.beginPath();
        ctx.arc(this.x,this.y,this.radius,0,2*Math.PI,false);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#000000";
        //drawing node label
        var width = ctx.measureText(this.label).width;
        ctx.fillText(this.label,this.x-width/2.0,this.y+this.radius+10);
        //drawing node tag
        ctx.save();
        ctx.fillStyle = "#ffffff";
        var width = ctx.measureText(this.tag).width;
        var height = 10;
        ctx.font = "bold 11pt Courir";
        ctx.fillText(this.tag,this.x-width/2.0,this.y+height/2.0);
        ctx.restore();
    },

    pointInside : function(x,y){
        return Math.abs(this.x-x) < this.radius && Math.abs(this.y-y) < this.radius;
    },

    setMarked : function(){
        this.color = sfgjs.DEFAULT_MARKED_COLOR;
    },

    setUnMarked : function(){
        this.color = sfgjs.DEFAULT_COLOR;
        this.tag = "";
    },

    setAsSource : function(){
        this.tag = "R";
        this.color = "#700000"
    },

    setAsDestination : function(){
        this.tag = "C";
        this.color = "#700000"
    },

    setSelected : function(){
        this.color = sfgjs.DEFAULT_SELECTED_COLOR;
    },

    setUnselected : function(){
        this.color = sfgjs.DEFAULT_COLOR;
        this.tag = "";
    }

};

//--------------------------------------------

sfgjs.ControlNode.prototype = {
    setX : function(x){
        this.arcEdge.controlPoint.x = x;
        this.x = x;
    },
    setY : function(y){
        this.arcEdge.controlPoint.y = y;
        this.y = y;
    },

    //same draw method as Node object
    draw : sfgjs.Node.prototype.draw,

    setSelected : function(){
        this.color = sfgjs.DEFAULT_SELECTED_COLOR;
        this.arcEdge.setSelected();
    },

    setUnselected : function(){
        this.color = "#FF0000";
        this.arcEdge.setUnselected();
    },

    //same pointInside method as Node Object
    pointInside : sfgjs.Node.prototype.pointInside

};

//---------------------------

sfgjs.LineEdge.prototype = {

    setStartNode : function(startNode){
        this.startNode = startNode;
        if (this.startNode != null && this.endNode != null){
            this.selfEdge = this.startNode.id == this.endNode.id;
            if (this.selfEdge){
                this.controlPoint.x = this.startNode.x + sfgjs.DEFAULT_RADIUS;
                this.controlPoint.y = this.startNode.y;
                this.selfNodeOldLocation.x = this.startNode.x;
                this.selfNodeOldLocation.y = this.startNode.y;
            }
        }
    },

    setEndNode : function(endNode){
        this.endNode = endNode;
        if (this.startNode != null && this.endNode != null){
            this.selfEdge = this.startNode.id == this.endNode.id;
            if (this.selfEdge){
                this.controlPoint.x = this.startNode.x + sfgjs.DEFAULT_RADIUS;
                this.controlPoint.y = this.startNode.y;
                this.selfNodeOldLocation.x = this.startNode.x;
                this.selfNodeOldLocation.y = this.startNode.y;
            }
        }
    },

    drawCircle : function(ctx){
        //check node location change
        if (this.startNode.x != this.selfNodeOldLocation.x ||
                this.startNode.y != this.selfNodeOldLocation.y){
            this.controlPoint.x += this.startNode.x - this.selfNodeOldLocation.x;
            this.controlPoint.y += this.startNode.y - this.selfNodeOldLocation.y;
            this.selfNodeOldLocation.x = this.startNode.x;
            this.selfNodeOldLocation.y = this.startNode.y;
        }
        //draw the self edge
        this.selfEdgeRadius = Math.sqrt((this.startNode.x-this.controlPoint.x)
                *(this.startNode.x-this.controlPoint.x)+
                (this.startNode.y-this.controlPoint.y)*
                (this.startNode.y-this.controlPoint.y));
        var r = this.startNode.radius;
        ctx.beginPath();
        //ctx.arc(this.startNode.x+r,this.startNode.y,
        //        this.selfEdgeRadius,0,2*Math.PI,false);
        ctx.arc(this.controlPoint.x,this.controlPoint.y,
                this.selfEdgeRadius,0,2*Math.PI,false);
        ctx.strokeStyle = this.color;
        ctx.stroke();

        var midX = 0;
        var midY = 0;
        var perpendicularAngle = 0;
        if (this.controlPoint.x == this.startNode.x){
            midX = this.startNode.x;
            if (this.startNode.y > this.controlPoint.y){
                midY = this.controlPoint.y - this.selfEdgeRadius;
                perpendicularAngle = 0;
            }else{
                midY = this.controlPoint.y + this.selfEdgeRadius;
                perpendicularAngle = Math.PI;
            }
        }else{
            var ang = Math.atan2(this.controlPoint.y-this.startNode.y
                    ,this.controlPoint.x-this.startNode.x);
            midX = this.controlPoint.x + Math.cos(ang) * this.selfEdgeRadius;
            midY = this.controlPoint.y + Math.sin(ang) * this.selfEdgeRadius;
            if (this.controlPoint.y == this.startNode.y){
                if (this.controlPoint.x > this.startNode.x)
                    perpendicularAngle = Math.PI/2;
                else
                    perpendicularAngle = 3*Math.PI/2;
            }
            else //perpendicular slope = -1/slope
                perpendicularAngle = Math.atan2(this.controlPoint.x-this.startNode.x
                        ,-(this.controlPoint.y-this.startNode.y));
        }

        //drawing the arrow (up directed arrow)
        var len = 8;
        var arrowAng = 60;
        var ang1 = perpendicularAngle - sfgjs.utils.toRadians(arrowAng);
        var ang2 = perpendicularAngle + sfgjs.utils.toRadians(arrowAng);

        var x1 = midX + len * Math.cos(ang1);
        var x2 = midX + len * Math.cos(ang2);
        var y1 = midY + len * Math.sin(ang1);
        var y2 = midY + len * Math.sin(ang2);

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = this.arrowColor;
        ctx.lineWidth = 2;
        ctx.moveTo(midX,midY);
        ctx.lineTo(x1,y1)
        ctx.moveTo(midX,midY);
        ctx.lineTo(x2,y2)
        ctx.stroke();
        ctx.restore();


        //drawing the label
        var width = ctx.measureText(this.label).width;
        ctx.fillText(this.label,midX+5-width/2,midY + 1);
    },

    draw : function(ctx){
        if (this.selfEdge){
            this.drawCircle(ctx);
            return;
        }
        //drawing the edge
        ctx.beginPath();
        ctx.moveTo(this.startNode.x,this.startNode.y);
        ctx.lineTo(this.endNode.x,this.endNode.y);
        ctx.strokeStyle = this.color;
        ctx.stroke();

        //drawing the arrow
        var r = 8;
        var arrowAng = 60;

        var midX = (this.startNode.x+this.endNode.x)/2.0;
        var midY = (this.startNode.y+this.endNode.y)/2.0;
        var x1,x2,y1,y2;
        if (this.startNode.x == this.endNode.x){
            x1 = midX - r * Math.sin(sfgjs.utils.toRadians(arrowAng));
            x2 = midX + r * Math.sin(sfgjs.utils.toRadians(arrowAng));
            var sign = 0;
            if (this.startNode.y - this.endNode.y < 0) sign = -1;
            else sign = 1;
            y1 = midY + sign * r * Math.cos(sfgjs.utils.toRadians(arrowAng));
            y2 = y1;
        }else{
            var ang = Math.atan2(this.startNode.y-this.endNode.y
                    ,this.startNode.x-this.endNode.x);
            var ang1 = ang + Math.tan(sfgjs.utils.toRadians(arrowAng));
            var ang2 = ang - Math.tan(sfgjs.utils.toRadians(arrowAng));
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
    },

    nearPoint : function(x,y){
        var threshold = 8;

        var dist = 0;
        if (this.selfEdge){
            var cx = this.controlPoint.x;
            var cy = this.controlPoint.y;
            dist = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy)) - this.selfEdgeRadius;
            dist = Math.abs(dist);
            return dist < threshold;
        }else{
            var x1 = this.startNode.x;
            var y1 = this.startNode.y;
            var x2 = this.endNode.x;
            var y2 = this.endNode.y;
            var mag = ((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
            var u = ((x-x1)*(x2-x1) + (y-y1)*(y2-y1))/mag;
            if (u > 1 || u < 0)
                return false;
            var xp = x1 + u*(x2-x1);
            var yp = y1 + u*(y2-y1);
            dist = Math.sqrt((xp-x)*(xp-x) + (yp-y)*(yp-y));
        }
        return dist < threshold;
    },

    drawToPoint : function(ctx,x,y){
        ctx.beginPath();
        ctx.moveTo(this.startNode.x,this.startNode.y);
        ctx.lineTo(x,y);
        ctx.stroke();
    },

    setSelected : function(){
        this.color = "#0000FF";
    },

    setUnselected : function(){
        this.color = sfgjs.DEFAULT_EDGE_COLOR;
    }

};

//---------------------------

sfgjs.ArcEdge.prototype = {

    setStartNode : function(startNode){
        this.startNode = startNode;
        //re-estimate control point location and check for selfEdges
        if (this.startNode != null && this.endNode != null){
            this.controlPoint.x = (this.startNode.x + this.endNode.x)/2;
            this.controlPoint.y = (this.startNode.y + this.endNode.y)/2;
            this.selfEdge = this.startNode.id == this.endNode.id;
            if (this.selfEdge){
                this.controlPoint.x = this.startNode.x + sfgjs.DEFAULT_RADIUS;
                this.controlPoint.y = this.startNode.y;
                this.selfNodeOldLocation.x = this.startNode.x;
                this.selfNodeOldLocation.y = this.startNode.y;
            }
        }
    },

    setEndNode : function(endNode){
        this.endNode = endNode;
        //re-estimate control point location and check for self Edges
        if (this.startNode != null && this.endNode != null){
            this.controlPoint.x = (this.startNode.x + this.endNode.x)/2;
            this.controlPoint.y = (this.startNode.y + this.endNode.y)/2;
            this.selfEdge = this.startNode.id == this.endNode.id;
            if (this.selfEdge){
                this.controlPoint.x = this.startNode.x + sfgjs.DEFAULT_RADIUS;
                this.controlPoint.y = this.startNode.y;
                this.selfNodeOldLocation.x = this.startNode.x;
                this.selfNodeOldLocation.y = this.startNode.y;
            }
        }
    },

    //same draw circle method as line edge
    drawCircle : sfgjs.LineEdge.prototype.drawCircle,

    draw : function(ctx){

        if (this.selfEdge){
            this.drawCircle(ctx);
            return;
        }

        //drawing the edge
        ctx.beginPath();
        ctx.moveTo(this.startNode.x,this.startNode.y);
        ctx.quadraticCurveTo(this.controlPoint.x,this.controlPoint.y,
                this.endNode.x,this.endNode.y);
        ctx.strokeStyle = this.color;
        ctx.stroke();

        //draw control lines
        if (this.drawControlLines){
            ctx.beginPath();
            ctx.moveTo(this.startNode.x,this.startNode.y);
            ctx.lineTo(this.controlPoint.x,this.controlPoint.y);
            ctx.lineTo(this.endNode.x,this.endNode.y);
            ctx.strokeStyle = "#606060";
            ctx.stroke();
        }

        //drawing the arrow
        //first get the midpoint on the curve (t=0.5)
        var t = 0.5;
        var x = 0,y = 0;
        var p0x = this.startNode.x, p0y = this.startNode.y;
        var p1x = this.controlPoint.x, p1y = this.controlPoint.y;
        var p2x = this.endNode.x, p2y = this.endNode.y;
        x = (1-t)*(1-t)*p0x + 2*(1-t)*t*p1x + t*t*p2x;
        y = (1-t)*(1-t)*p0y + 2*(1-t)*t*p1y + t*t*p2y;

        //second draw the arrow
        var r = 8;
        var arrowAng = 60;

        var midX = x;
        var midY = y;
        var x1,x2,y1,y2;
        if (this.startNode.x == this.endNode.x){
            x1 = midX - r * Math.sin(sfgjs.utils.toRadians(arrowAng));
            x2 = midX + r * Math.sin(sfgjs.utils.toRadians(arrowAng));
            var sign = 0;
            if (this.startNode.y - this.endNode.y < 0) sign = -1;
            else sign = 1;
            y1 = midY + sign * r * Math.cos(sfgjs.utils.toRadians(arrowAng));
            y2 = y1;
        }else{
            var ang = Math.atan2(this.startNode.y-this.endNode.y
                    ,this.startNode.x-this.endNode.x);
            var ang1 = ang + Math.tan(sfgjs.utils.toRadians(arrowAng));
            var ang2 = ang - Math.tan(sfgjs.utils.toRadians(arrowAng));
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
        ctx.fillText(this.label,x-width/2.0,y+10);
    },

    nearPoint : function(x,y){

        var threshold = 8;

        if (this.selfEdge){
            var cx = this.controlPoint.x;
            var cy = this.controlPoint.y;
            dist = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy)) - this.selfEdgeRadius;
            dist = Math.abs(dist);
            return dist < threshold;
        }

        if ((this.startNode.x == this.endNode.x
                && this.startNode.x == this.controlPoint.x) ||
                this.startNode.y ==  this.endNode.y
                && this.startNode.y == this.controlPoint.y){
            //vertical or horizontal case
            var x1 = this.startNode.x;
            var y1 = this.startNode.y;
            var x2 = this.endNode.x;
            var y2 = this.endNode.y;
            var mag = ((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
            var u = ((x-x1)*(x2-x1) + (y-y1)*(y2-y1))/mag;
            if (u > 1 || u < 0)
                return false;
            var xp = x1 + u*(x2-x1);
            var yp = y1 + u*(y2-y1);
            var dist = Math.sqrt((xp-x)*(xp-x) + (yp-y)*(yp-y));
            return dist < threshold;
        }

        //solving cubic equation to get closest point
        var A = {x:this.controlPoint.x - this.startNode.x,
                y:this.controlPoint.y - this.startNode.y}
        var B = {x:this.endNode.x - this.controlPoint.x - A.x,
                y:this.endNode.y - this.controlPoint.y - A.y}

        //numerical hack to solve a strange case
        //where B values are very small (1e-14)
        if (Math.abs(B.x) < 1e-10){
            if (B.x > 0)
                B.x = 1e-5;
            else
                B.x = -1e-5;
        }
        if (Math.abs(B.y) < 1e-10){
            if (B.y > 0)
                B.y = 1e-5;
            else
                B.y = -1e-5;
        }
        var M = {x:x,
                y:y}

        var Mp = {x:this.startNode.x - M.x,
                y:this.startNode.y - M.y}


        var a = B.x*B.x + B.y*B.y;
        var b = 3 *(A.x*B.x + A.y*B.y);
        var c = 2 *(A.x*A.x + A.y*A.y) + (Mp.x*B.x + Mp.y*B.y);
        var d = Mp.x*A.x + Mp.y*A.y;
        result = sfgjs.utils.solveCubic([d,c,b,a]);

        //to always check for endpoints (for corner cases)
        result.push(2);
        result.push(-2);
        var minDist = Infinity;
        var px = 0,py = 0;
        for (var i=0;i<result.length;i++){
            var t = result[i];
            if (t > 0 && t < 1){
                var p0x = this.startNode.x, p0y = this.startNode.y;
                var p1x = this.controlPoint.x, p1y = this.controlPoint.y;
                var p2x = this.endNode.x, p2y = this.endNode.y;
                px = (1-t)*(1-t)*p0x + 2*(1-t)*t*p1x + t*t*p2x;
                py = (1-t)*(1-t)*p0y + 2*(1-t)*t*p1y + t*t*p2y;
                var dist = Math.sqrt((x-px)*(x-px) + (y-py)*(y-py));
                minDist = dist < minDist ? dist : minDist;
            }else if (t > 1){
                px = this.endNode.x;
                py = this.endNode.y;
                var dist = Math.sqrt((x-px)*(x-px) + (y-py)*(y-py));
                minDist = dist < minDist ? dist : minDist;
            }else{
                px = this.startNode.x;
                py = this.startNode.y;
                var dist = Math.sqrt((x-px)*(x-px) + (y-py)*(y-py));
                minDist = dist < minDist ? dist : minDist;
            }
        }
        return minDist < threshold;
    },

    drawToPoint : function(ctx,x,y){
        ctx.beginPath();
        ctx.moveTo(this.startNode.x,this.startNode.y);
        ctx.lineTo(x,y);
        ctx.stroke();
    },

    setSelected : function(){
        this.color = "#0000FF";
        if (!this.selfEdges)
            this.drawControlLines = true;
    },

    setUnselected : function(){
        this.color = sfgjs.DEFAULT_EDGE_COLOR;
        this.drawControlLines = false;
    }

};


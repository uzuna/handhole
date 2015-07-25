'use strict';

var util = require('util');
var EE = require('events').EventEmitter;
var through = require('through2');
var isstream = require('isstream')
var xtend = require('xtend');
require('date-utils');

// addi tional Module
var Hopper = require('./modules/hopper');
var Valve = require('./modules/valve');
var FlowMater = require('./modules/flowMater');
var Capture = require('./modules/capture');

module.exports = function createHandhole(stream){
	return new HandHole(stream);
}

function HandHole(stream){
	this.stream = stream;
	this._data = {
		list:[],
		id:0
	}
	this._loopflag = false;

	// update object list
	this.add(stream);
}


// string = name/number = id
// return list
HandHole.prototype.list = function(filter){
	if(typeof filter === 'function') return this._data.list.filter(filter);
	return this._data.list;
}

// 人にわかるリストで返す
// return viewlist;
HandHole.prototype.viewlist = function(filter){
	return this._data.list.map(function (d) {
		return {
			id:d.id,
			name:d.name,
			next:d.next,
			type:d.type,
		};
	});
}


// --[Stream Status]--------------------
// loopの有無、終端、始端、孤立の取得
HandHole.prototype.term = function(){
	var self = this;
	var result = {
		start:[],
		end:[],
		alone:[],
		loop:[],
		other:[]
	}

	// next list
	var srclist = this.list().reduce(function getnext(a, b) {
		return a.concat(b.next);
	},[]);
	// alone src似なくnext藻ないもの
	// start srcにないもの
	// end似ないものtannsaku
	this.list().forEach(function term(d){
		if(d.next.length === 0 && srclist.indexOf(d.id) < 0){
			result.alone.push(d);
		}else if(srclist.indexOf(d.id) < 0){
			result.start.push(d);
		}else if(d.next.length === 0 ){
			result.end.push(d);
		}else{
			result.other.push(d);
		}
	});

	// loop
	result.other = result.other.filter(function (d) {
		var loopf = self._islooped(d,d.id);
		if(loopf) result.loop.push(d);
		return !loopf;
	});

	return result;
}

// TBD
HandHole.prototype.add = function (stream){
	if(util.isArray(stream)) stream = Array2Stream(stream);
	return this._updateloop(stream);
	// return this.getobj(stream);
}


// --[Update Loop]-------------------------------
// すべてのstreamを再帰的にupdateする
// infinity loop ... > 
HandHole.prototype._updateloop = function(stream){
	var self = this;
	var next = openNextPipe(stream);
	var rs = this._update(stream);
	if(!util.isArray(next)){
		next = [next];
	}
	next.forEach(function (d) {
		self._update(d);
	})
	return rs;
}


// --[Update]-------------------------------
// 指定されたstreamの状態を読み込んで更新する
HandHole.prototype._update = function(obj, nest){
	nest = nest || true; 
	// isstream
	if(!isObj(obj)) throw new TypeError("unmach datatype");
	if(isstream(obj)){
		// listから探す
		var list = this._data.list.filter(function (d, i) {
			return d.obj === obj;
		});
		
		if(list.length > 0) return onupdate(this, list[0]);
		return onAdd(this, obj)

	}else if("id" in obj){
		return onupdate(this, obj);
	}
	throw new Error("Update Error");

	// すでにある項目の場合
	// listの中身をアップデート = getnext
	function onupdate(hh, obj){
		var next = openNextPipe(obj.obj);
		obj.next = next.map(function (d) {
			var t = hh._matchStream(d);
			if(t !== null) return t.id;
			if(!("id" in d) && nest){
				d = hh._update(d, false);
			}
			return d.id;
		});
		return obj;
	}


	// まだない項目の場合
	function onAdd(hh, stream){
		setpipename(stream);
		var id = hh._data.id;
		// 生成
		var obj = {
			id:id,
			name: stream.name || "id_"+id,
			obj: stream,
			type: streamType(stream)
		}
		hh._data.id++;
		hh._data.list.push(obj);

		// next取得
		var next = openNextPipe(stream);
		var nlist = next.map(function (d) {
			var t = hh._matchStream(d);
			if(t !== null) return t.id;
			if(!("id" in d)){
				d = hh._update(d);
			}
			return d.id;
		});
		obj.next = nlist;
		return obj;
	}
}


// --[MatchStream]-----------------------------------
// search stream object in selflist
HandHole.prototype._matchStream = function(target){
	var list = this.list().filter(function (d) {
		return d.obj === target;
	});
	if(list.length === 1) return list[0];
	return null; 
}

// --[Check pipe ther loop?]-------------------
//
HandHole.prototype._ismakeLoop = function(src, dest){
	var r_dest = this.getRouteNode(dest);
	return r_dest.filter(function (d) {
		return d.id === src.id;
	}).length > 0
}

// --[Check pipe ther loop?]-------------------
//
HandHole.prototype._islooped = function(src, dest){
	var r_dest = this.getRouteNode(dest);
	return r_dest.filter(function (d) {
		return d.next.indexOf(src.id) > -1 ;
	}).length > 0
}

// --[GetRoutes]-----------------------------------
// return route list using target 
HandHole.prototype.getRouteNode = function(target){
	// down
	// loopstop
	var map = this.list().reduce(function (a, b){
		a[b.id] = {
			next: b.next,
			visited: false
		}
		return a;
	},{})
	var t = this.getobj(target);
	var task = [t.id];

	var loop = 0, looplimit = map.length * 2;
	while(true){
		if(task.length < 1) break;
		if(loop++ > looplimit) throw new Error("unlimited Loop!!!")
		nexttask(task.shift())
	}

	return Object.keys(map).map(function (d) {
		return xtend(map[d], {id: Number(d)});
	}).filter(function(d){
		return d.visited
	})

	function nexttask(t){
		if(!map[t].visited){
			map[t].next.forEach(function(d){
				task.push(d);
			})
			map[t].visited = true;
		}
	}
}


//
// -- Pipe Controlle
//

// --[Insert]---------------------------------------------
// return 挿入したstream
HandHole.prototype.insert = function(target, stream){
	var self = this;
	var list = this.list();
	var src = [], dest =[], part_src =[], part_dest = [];

	// Auto head Insert
	if(arguments.length === 1 
		&& (util.isArray(target) || isstream(target))){
		stream = target;
		list = this.term().start
			.concat(this.term().alone)
			.filter(function (d) {
			return isstream.isWritable(d.obj);
		});


		if(list.length < 1) return 0;
		dest = list;
	}else if(arguments.length === 3){
		src = this.getobj(target);
		if(src.next.indexOf(stream) < 0) throw new Error("target is not piped");
		dest = this.getobj(stream);
		stream = arguments[3];
	}else{
		dest = this.getobj(target)
		src = this.list().filter(function (d){
			return d.next.indexOf(dest.id) > -1;
		})
		if(!util.isArray(dest)) dest = [dest];
	}

	if(!util.isArray(src)){
		src = [src];
	}

	src.forEach(function (d){
		if(!isstream.isReadable(d.obj)) throw new Error("target head is cannot read")
	});
	dest.forEach(function (d){
		if(!isstream.isWritable(d.obj)) throw new Error("target is cannot write")
	});



	// Validate part
	// get connect point;
	if(util.isArray(stream)){
		part_src = this.add(stream);
		part_dest = this.getRouteNode(part_src).filter(function (d) {
			return d.next.length < 1;
		});
		if(part_dest.length <1) part_dest = part_src;
		else part_dest = this.getobj(part_dest[0]);
	}else if(isstream(stream)){
		part_src = part_dest = this._update(stream);
	}else{
		part_src = part_dest = this.getobj(stream);
	}

	if(!isstream.isWritable(part_src.obj) && src.length > 0) throw new TypeError("cannot Write")
	if(!isstream.isReadable(part_dest.obj)) throw new TypeError("cannot Read")


	// connect
	// src to ps
	src.forEach(function (s) {
		dest.forEach(function (d){
			self.unpipe(s,d);	
		});
		self.pipe(s, part_src);
	});
	// pd to dest
	dest.forEach(function (d){
		self.pipe(part_dest, d);
	});
	

	return part_src;
}


// --[Remove]----------------------------------------------
// return 取り除いたstream
HandHole.prototype.remove = function(target, dest){
	var self = this;
	// リテラル指定@todo
	

	// 変数指定
	var t = this.getobj(target);
	var src = this.list().filter(function (d) {
		return d.next.filter(function (n){
			return n === target;
		}).length > 0
	});
	var dest = t.next.map(function (d) {
		return self.getobj(d);
	});

	// unpipe
	if(isstream.isReadable(t.obj))
		t.obj.unpipe();
	src.forEach(function (s) {
		s.obj.unpipe(t.obj);
		dest.forEach(function (d) {
			s.obj.pipe(d.obj);
		});
		self._update(s);
	})

	// unregister
	this._data.list = this._data.list.filter(function (d) {
		return d.id !== t.id;
	})

	return t;
}


// --[Pipe]--------------------------------------------
// 2つをつなげる 追加する場合とすでにある場合どちらにも対応
// return 追加したstream
//ignore auto pipe self
HandHole.prototype.pipe = function(target, nextpipe){
	var self = this;
	var src, dest;

	// Source Validate
	// if about Auto pipe request
	if(arguments.length === 1){
		
		//target replace
		var list = this.list();
		if(list.length > 1){
			list = this.term().end
				.concat(this.term().alone)
				.filter(function (d) {
				return isstream.isReadable(d.obj);
			});
		}
		if(list.length < 1) return 0;
		nextpipe = destValidate(target);


		// If looping Dissable
		list = list.filter(function (d) {
			return !self._ismakeLoop(d, nextpipe);
		});
		if(list.length == 1) list = list[0];
		src = list;
	}else{
		src = destValidate(target);
	}


	// Dest Validation
	if(isstream.isWritable(nextpipe)){
		dest = this._update(nextpipe)
	}else{
		dest = this.getobj(nextpipe);
	}

	// If Multiple Pipe then loop self
	if(util.isArray(src)){
		src.forEach(function (d) {
			if(d.name === "garbage"){
				self.insert(d.id, dest);
			}else {
				self.pipe(d.id, dest);
			}
		})
		return dest;
	}else{
		if(self._ismakeLoop(src, dest) && !self._loopflag)
			throw new Error("loop pipe");
	}

	// Pipe and Update
	src.obj.pipe(dest.obj);
	this._update(src);	// loop...
	return dest;

	function destValidate(dest){
		if(util.isArray(dest)){
			return self.add(dest);
		}else if(isstream(dest)){
			if(!isstream.isWritable(dest)){
				throw new Error("Need Writable Stream")
			}
			return self._update(dest);
		}
		return self.getobj(dest);
	}
}


// --[unpipe]----------------------------------------------
// 指定のstreamから後ろを切る
// return: unpipe list
HandHole.prototype.unpipe = function(target, nextpipe){
	var self = this;
	var t = this.getobj(target);
	var next = t.next;
	if(nextpipe !== undefined){
		var dest = this.getobj(nextpipe);
		t.obj.unpipe(dest.obj);
	}else{
		t.obj.unpipe();
	}
	this._update(t);
	return next;
}



// --[split]----------------------------------------------
// あるstreamを分離する
// 
HandHole.prototype.split = function(target, topipe){
	var self = this;
	var t = this.getobj(target);

	var src = this.list().filter(function (d) {
		return d.next.filter(function (n){
			return n === target;
		}).length > 0
	});


	src.forEach(function (d) {
		d.obj.unpipe(t.obj);
		self._update(d);
	});

	if(arguments.length < 2) return t;

	// get topipe
	var to = this.getobj(topipe);
	var dest = to.next.map(function (d) {
		return self.getobj(d);
	});
	this.unpipe(to);

	// parent reconnection
	src.forEach(function (s) {
		dest.forEach(function (d){
			s.obj.pipe(d.obj);
		})
		self._update(s);
	});

	return t;
}




// --[GetStreamObject]------------------------------------------
HandHole.prototype.getobj = function(target){
	if(isNum(target)){
		var list = this._data.list.filter(function (d) {return d.id === target;});
		if(list.length <1) throw new Error("not found stream object");
		return list[0];
	}else if(isString(target)){
		var list = this._data.list.filter(function (d) {return d.name === target;});
		if(list.length <1) throw new Error("not found stream object");
		return list[0];	
	}else if(isObj(target)){
		if("id" in target){
			return this.getobj(target.id);
		}
	}
	throw new Error("not found Stream Object");
}

//
// --[Additional modules]---------------------------------------
//

// --[Hopper]-----------------------------------
// 
HandHole.prototype.hopper = function(target, opt){
	if(arguments.length < 1) return Hopper()
	var obj = this.getobj(target);
	var hopper = Hopper();
	hopper.pipe(obj.obj);
	this._update(hopper);
	return hopper;
}

module.exports.hopper = Hopper;


// --[finish]-------------------------------------
//
HandHole.prototype.onfinish = function(target, cb){
	var obj = this.getobj(target);
	obj.obj.on("finish", cb);
}

// --[garbage]-------------------------------------
// endが立つとコールバックする
// PLET 設計用語だとPipe line end termination
HandHole.prototype.garbage = function(target, done){
	done = done || function(){};
	var t = this.getobj(target);
	if(!isstream.isReadable(t.obj)){
		return t.obj.on("finish", done);
	}
	this.pipe(target, garbageBox())
	function garbageBox(){
		return through.obj(
			function garbage(chunk, enc, cb){return cb();},
			done);
	}
}



// --[garbage all]-------------------------------------
// 終端につながってないすべてにgarbage終端をつけてすべてが終わったらdoneを返す
HandHole.prototype.garbageAll = function(done){
	done = done || function(){};
	util.inherits(endMonitor, EE);
	
	// get end tarmination(Duplex only)
	var self = this;
	var list = this.term().end;

	// assign Monitor Object
	var em = new endMonitor(list);
	list.forEach(function (d){
		self.garbage(d.id, function (){
			em.emit("done", d);
		})
	});
	
	// Monitor class
	function endMonitor(data){
		var self = this;
		EE.call(this);
		this.list = data;
		this.status = data.reduce(function (a, b) {
			if(!(b.id in a)) a[b.id] = null;
			return a;
		},{})
		this.on("done", onfinish);

		function onfinish(src, err){
			var callStatus = self.status;
			callStatus[src.id] = new Date();
			for(var v in callStatus){
				if(callStatus[v] === null) return false;
			}
			self.emit("finish", callStatus)
			return done(callStatus);
		}
	}
	return em;
}


// --[Captche]----------------------------------------------
// データを取る
// 何もなければconsole.log
// 指定があればそこに書き出す?
HandHole.prototype.capture = function(target, option){
	if(arguments.length < 1) return Capture();
	var cp = Capture(option);
	this.insert(target, cp);
	return cp;
}

module.exports.capture = Capture;

// --[FlowMater]---------------------------------------------
// Object
HandHole.prototype.flowMater = function(target, option){
	if(arguments.length < 1) return FlowMater();
	var fm = FlowMater(option);
	this.insert(target, fm);
	return fm;
}

module.exports.flowMater = FlowMater;




// --[Valve]---------------------------------------------
//
HandHole.prototype.valve = function(target, option){
	if(arguments.length < 1) return Valve();
	var vl = Valve(option)
	if(target === null) return vl;
	this.insert(target, vl);
	return vl;
}

module.exports.valve = Valve;





// --[Util]------------------------
module.exports.util = {
	getDatatype: getDatatype,
	streamType: streamType
}


// getDataType
function getDatatype(data){
	var type = typeof data;
	if(type === 'object'){
		if(util.isBuffer(data)) return "buffer";
		if(data instanceof String) return "string";
		if(util.isArray(data)) return "array";
		if(util.isDate(data)) return "date";
		if(isstream(data)) {
			return ["stream", streamType(data)];
		}
		return [type, data.constructor.name];
	}else if(type === 'function'){
		return [type, data.name];
	}
	return type;
}


// check Stream Type
function streamType(stream){
	if(isstream.isDuplex(stream)){
		return "duplex";
	}else if(isstream.isWritable(stream)){
		return "writable"
	}else if(isstream.isReadable(stream)){
		return "readable"
	}
	return "Unknown"
}


// 次のpipeを取得する
function openNextPipe(stream){
	if(!isstream.isReadable(stream)) return [];
	var pipes = stream._readableState.pipes;
	if(util.isArray(pipes)) return pipes;
	if(pipes === null) return [];
	return [pipes];
}

function getBuffer(stream){
	return stream._writableState.length;
}

// pipeに名前がついていなければ導入した関数を使って名前を付ける
function setpipename(stream){
	if("name" in stream) return stream;
	if(isstream.isDuplex(stream)){
		var name = stream._transform.name;
		if("_flush" in stream)
			name += stream._flush.name;
		stream.name = name
	}else if(isstream.isReadable()){
		var name = stream._read;
		stream.name = name
	}else{
		stream.name = "";
	}
	return stream;
}


// Array to Stream
function Array2Stream (ary) {
	var s = ary[0]

	var r = ary.reduce(function (a,b){
		return a.pipe(b)
	});
	return s;
}


function isNum(num){
	return typeof num === 'number';
}

function isString(str){
	return typeof str === 'string' || str instanceof String;
}

function isObj(value) {
	var type = typeof value;
	return !!value && (type == 'object' || type == 'function');
}
const util = require('util');
const EE = require('events').EventEmitter;

const through = require('through2');
const isstream = require('isstream')
const xtend = require('xtend');
const Transform = require('readable-stream/transform');

module.exports = function createHandhole(stream){
	return new HandHole(stream);
}

function HandHole(stream){
	this.stream = stream;
	this._data = {
		list:[],
		id:0
	}

	// update object list
	this._updateloop(stream);
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
	var result = {
		start:[],
		end:[],
		alone:[],
		other:[]
	}

	// next list
	var srclist = this.list().reduce(function getnext(a, b) {
		return a.concat(b.next);
	},[]);
	// alone src似なくnext藻ないもの
	// start srcにないもの
	// end似ないもの
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


	return result;
}

// TBD
HandHole.prototype.tree = function(){

}


// --[Update Loop]-------------------------------
// すべてのstreamを再帰的にupdateする
HandHole.prototype._updateloop = function(stream){
	var self = this;
	var next = openNextPipe(stream);
	this._update(stream);
	if(!util.isArray(next)){
		next = [next];
	}
	next.forEach(function (d) {
		self._update(d);
	})
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
			if(!("id" in d)){
				d = hh._update(d);
			}
			return d.id;
		});
		obj.next = nlist;
		return obj;
	}
}



// --[Hopper]-----------------------------------
// 
HandHole.prototype.hopper = function(target, opt){
	if(arguments.length < 1) return genHopper()
	var obj = this.getobj(target);
	var hopper = genHopper();
	hopper.pipe(obj.obj);
	this._update(hopper);
	return hopper;
}

module.exports.hopper = genHopper;
function genHopper(){
	var hopper = through.obj(function hopper(chunk, enc, cb){
		this.push(chunk)
		cb();
	})

	hopper.data = function(data){
		if(util.isArray(data)){
			for(var v in data){
				this.push(data[v]);
			}
		}else{
			this.push(data);
		}
	}
	return hopper;
}

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
	var list = this.list().filter(function (d) {
		return d.next.length < 1 && d.type === "duplex";
	});

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
	if(target === undefined){
		target = null;
	}else	if(arguments.length < 2 && typeof target === 'object'){
		option = target;
		target = null;
	}

	var cp = through.obj(function capture(chunk, enc, cb){
		console.log(Date.now(), getDatatype(chunk), chunk)
		this.push(chunk)
		cb();
	},function flush(cb){
		cb();
	})
	if(target === null) return cp;
	this.insert(target, cp);
	return cp;
}

// --[FlowMater]---------------------------------------------
// Object
HandHole.prototype.flowMater = function(target, option){
	if(target === undefined){
		target = null;
	}else	if(arguments.length < 2 && typeof target === 'object'){
		option = target;
		target = null;
	}
	option = option || {};
	var fm = new FlowMater(option);
	if(target === null) return fm;
	this.insert(target, fm);
	return fm;
}



// --[Valve]---------------------------------------------
//
HandHole.prototype.valve = function(target, option){
	if(target === undefined){
		target = null;
	}else	if(arguments.length < 2 && typeof target === 'object'){
		option = target;
		target = null;
	}
	if(isNum(option)) option = {valve:option};
	option = option || {};

	var fm = new Valve(option);
	if(target === null) return fm;
	this.insert(target, fm);
	return fm;
}


//
// -- Pipe Controlle
//

// --[Insert]---------------------------------------------
// return 挿入したstream
HandHole.prototype.insert = function(target, stream){
	var self = this;
	if(!isstream(stream)) throw new Error("Need Stream Object");
	var list = this.list();
	var src = list.filter(function (d) {
		return d.next.filter(function (n){
			return n === target;
		}).length > 0
	});
	var dest = this.getobj(target);

	src.forEach(function (d) {
		d.obj.unpipe(dest.obj);
		d.obj.pipe(stream)
		self._update(d);
	})
	stream.pipe(dest.obj);

	return this._update(stream);
}


// --[Remove]----------------------------------------------
// return 取り除いたstream
HandHole.prototype.remove = function(target, dest){
	var self = this;
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
HandHole.prototype.pipe = function(target, nextpipe){
	if(arguments.length < 2) throw new Error("Need 2 arguments");
	var src = this.getobj(target);
	var dest;
	if(isstream(nextpipe)){
		dest = this._update(nextpipe);
	}else{
		try{
			dest = this.getobj(nextpipe);
		}catch(e){
			dest = this._update(nextpipe);
		}
	}

	src.obj.pipe(dest.obj);
	this._update(src);
	return dest;
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

	var to = this.getobj(topipe);
	var dest = to.next.map(function (d) {
		return self.getobj(d);
	});
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
	}
	throw new Error("not found Stream Object");
}


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

// --[FlowMater]--------------------------------------
// 流量を監視と合計値の取得を行う
function FlowMater(opts){
	var self = this;
	opts = xtend({objectMode: true, timer:500}, opts);

	Transform.call(this, opts);
	this.name = "flowMater";
	this.flow = {
		count:0,
		size:0
	}
	this.total = {
		count:0,
		size:0
	}

	this.interval = setInterval(onTimer, opts.timer)

	function onTimer(){
		// console.log(self.flow);
		self.emit("flow", self.flow);
		self.total.count += self.flow.count;
		self.total.size += self.flow.size;
		self.flow = {
			count:0,
			size:0
		};
	}
	
	this.on("finish", function(){
		onTimer()
		self.emit("total", self.total)
		clearInterval(self.interval);
	})
}

util.inherits(FlowMater, Transform)

FlowMater.prototype._transform = function(chunk, enc, cb){
	this.flow.count++;
	if(isString(chunk) || Buffer.isBuffer(chunk)){
		this.flow.size += chunk.length
	}else{
		this.flow.size += JSON.stringify(chunk).length;	
	}
	cb();
}




// --[valve]-------------------------------------
// 流量の制御を行う 秒間目標に近づくように制御する。
// 0 = cork ~ 100/sec ~ -1=unlimit;
function Valve(opt){
	var self = this;
	opt = xtend({valve:500, objectMode:true}, opt);
	Transform.call(this, opt);
	this.name = "valve";
	this._valve = {
		timer: Date.now(),	// 目標流量を計算するための値
		valve: 0,
		rate: 0,
		wait: 0,
		count:0		// 現在の
	}
	this.valve(opt.valve);
	this.interval = setInterval(onTimer, 1000);

	function onTimer(){
		self.emit("flow", self._valve);
		self._valve.timer = Date.now();
		self._valve.count = 0;
	}
	
	this.on("finish", function(){
		self.emit("flow", self._valve);
		clearInterval(self.interval);
	})
}
util.inherits(Valve, Transform)

Valve.prototype._transform = function(chunk, enc, cb){
	var self = this;
	this._valve.count++;

	if(this._valve.valve === 0){
		cb();
		return false;
	}else if(this._valve.valve < 0) {
		this.push(chunk);
		return cb();
	}

	this._valve.wait++;
	var timer = Date.now() - this._valve.timer;
	var target = this._valve.valve * (timer/1000);
	var diff = (this._valve.count - target) * this._valve.rate;
	
	
	if(diff > 0){
		return setTimeout(function(){
			self.push(chunk);
			self._valve.wait--;
			cb();
		}, diff);
	}else{
		this.push(chunk);
		this._valve.wait--;
		cb();
	}
}

Valve.prototype._flush = function(cb){
	var self = this;
	if(this._valve.wait < 1){
		cb();	
	}else{
		throw new Error("Wait chunk")
	}
}

// change valve
Valve.prototype.valve = function(num){
	if(!isNum(num)) return this._valve.valve;
	if(num === 0){
		this.cork();
	}else{
		this.uncork();
	}
	this._valve.valve = num;
	this._valve.rate = 1000 / num;
	this.emit("flow", xtend(this._valve, {change:num}));
	return num;
}
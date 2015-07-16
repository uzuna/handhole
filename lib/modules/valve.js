const through = require('through2');
const isstream = require('isstream')
const util = require('util');
const xtend = require('xtend');
const Transform = require('readable-stream/transform');
const valid = require('./validFunction')
module.exports = genValve;


function genValve(option){
	option = option || {};
	return new Valve(option);;
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
		interval: 0,
		count:0		// 現在の
	}
	this.valve(opt.valve);
	this.interval = setInterval(onTimer, 1000);

	function onTimer(){
		var now = Date.now()
		self._valve.interval = now - self._valve.timer
		self.emit("flow", self._valve);
		self._valve.timer = now;
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
	if(!valid.isNum(num)) return this._valve.valve;
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
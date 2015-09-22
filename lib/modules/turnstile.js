'use strict';

var util = require('util');
var xtend = require('xtend');
var Transform = require('readable-stream/transform');
var valid = require('./validFunction')
module.exports = genTrunstile;

function genTrunstile(option){
	option = option || {};
	return new Turnstile(option);
}

// --[Turnstile]-------------------------------------
// 複数のpipeからの入力を1つのpipeに合流させる
// 
function Turnstile(opt){

	if(util.isFunction(opt)){
		opt = { t: opt };
	}

	var self = this;
	opt = xtend({objectMode:true, max: 10, timeout: 1000}, opt);
	Transform.call(this, opt);
	this.name = "turnstile";

	// option
	this.max = opt.max;
	this.timeout = opt.timeout;
	this.current = 0;
	this.preclose = false;
	this.flushCallback = function(){}

	this._tf = opt.t;
}
util.inherits(Turnstile, Transform)

//
// --[Turnstile]-------------------------
//
Turnstile.prototype._transform = function(chunk, enc, cb){
	var killed = false;
	var timer = null;
	var self = this;
	this._tf(chunk, enc, function(){
		clearTimeout(timer);
		timer = null;
		if(!killed)
			nextstep();
	});

	var timer = setTimeout(function(){
		self.emit("timeout", chunk);
		killed = true;
		if(timer !== null)
			nextstep();
	}, this.timeout);

	function nextstep(){
		// console.log("close",self.current, self.preclose);
		if(self.preclose){
			if(--self.current < 1){
				self.flushCallback()
			}
		}
		else if(self.max <= self.current--)
			cb();
	}

	// console.log("timeout",this.max, this.current)
	if(this.max > ++this.current && !this.preclose)
		cb();
}


Turnstile.prototype._flush = function(cb){
	// console.log("flush", this.current);
	this.preclose = true;
	if(this.current === 0)
		return cb();
	else
		this.flushCallback = cb;
	return false;
}
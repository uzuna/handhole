'use strict';

var util = require('util');
var xtend = require('xtend');
var Transform = require('readable-stream/transform');
var valid = require('./validFunction')
module.exports = genConful;

function genConful(option){
	option = option || {};
	return new Conful(option);
}

// --[Conful]-------------------------------------
// 複数のpipeからの入力を1つのpipeに合流させる
// 
function Conful(opt, arrays){
	if(util.isArray(opt)){
		arrays = opt;
		opt = {};
	}
	var self = this;
	opt = xtend({objectMode:true}, opt);
	Transform.call(this, opt);
	this.name = "conful";
	this._srcCount = 0;
	if(util.isArray(arrays)){
		this.conful(arrays);
	}
}
util.inherits(Conful, Transform)

//
// non operation
//
Conful.prototype._transform = function(chunk, enc, cb){
	this.push(chunk);
	cb();
}

//
// pipe set and Adding
//
Conful.prototype.conful = function(src){
	var self = this;
	if(util.isArray(src)){
		src.forEach(function(vp){
			setSrc(self, vp)
		})
	}else
		setSrc(this, src)
}

Conful.prototype._flush = function(cb){
	cb();
}

//
// Set Cource Pipe
//
function setSrc(self, src){
	var opt = {end:false};
	src.pipe(self, opt);
	self._srcCount++;
	src.on("end", function(){
		callOnEnd(self);
	})
}

function callOnEnd(self){
	self._srcCount--;
	if(self._srcCount < 1)
		self.end();
}
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

// --[Stacker]-------------------------------------
// データをStackしてArrayにする
// -> splitflag
// 
function Conful(opt){
	var self = this;
	opt = xtend({objectMode:true}, opt);
	Transform.call(this, opt);
	this.name = "conful";
	this._srcCount = 0;
}

util.inherits(Conful, Transform)
Conful.prototype._transform = function(chunk, enc, cb){
	this.push(chunk);
	cb();
}

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
// 
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
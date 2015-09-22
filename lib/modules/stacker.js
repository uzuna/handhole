'use strict';

var util = require('util');
var xtend = require('xtend');
var Transform = require('readable-stream/transform');
var valid = require('./validFunction')
module.exports = genStack;

function genStack(option){
	option = option || {};
	return new Stacker(option);
}

// --[Stacker]-------------------------------------
// データをStackしてArrayにする
// 
function Stacker(opt){
	var self = this;
	opt = xtend({objectMode:true, splitChar: ","}, opt);
	Transform.call(this, opt);
	this.name = "stacker";
	this.splitChar = opt.splitChar;
	this.stack = [];
}

util.inherits(Stacker, Transform)
Stacker.prototype._transform = function(chunk, enc, cb){
	if(chunk === this.splitChar) {
		this.push(this.stack);
		this.stack = [];
	}
	else this.stack.push(chunk);
	cb();
}

Stacker.prototype._flush = function(cb){
	this.push(this.stack);
	cb();
}
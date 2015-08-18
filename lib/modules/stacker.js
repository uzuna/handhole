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
// -> splitflag
// 
function Stacker(opt){
	var self = this;
	opt = xtend({valve:500, objectMode:true}, opt);
	Transform.call(this, opt);
	this.name = "stacker";
	this.stack = [];
}

util.inherits(Stacker, Transform)
Stacker.prototype._transform = function(chunk, enc, cb){
	this.stack.push(chunk);
	cb();
}

Stacker.prototype._flush = function(cb){
	this.push(this.stack);
	cb();
}
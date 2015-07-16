'use strict';

var through = require('through2');
var isstream = require('isstream')
var util = require('util');
var xtend = require('xtend');
var Transform = require('readable-stream/transform');
var valid = require('./validFunction')
module.exports = genHopper;

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
const through = require('through2');
const isstream = require('isstream')
const util = require('util');
const xtend = require('xtend');
const Transform = require('readable-stream/transform');
const valid = require('./validFunction')
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
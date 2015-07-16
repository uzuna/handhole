const through = require('through2');
const isstream = require('isstream')
const util = require('util');
const xtend = require('xtend');
const Transform = require('readable-stream/transform');
const valid = require('./validFunction')
module.exports = genFlowMater;


function genFlowMater(option){
	option = option || {};
	return new FlowMater(option);
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
	if(valid.isString(chunk) || Buffer.isBuffer(chunk)){
		this.flow.size += chunk.length
	}else{
		this.flow.size += JSON.stringify(chunk).length;	
	}
	cb();
}

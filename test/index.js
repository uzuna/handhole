'use strict';
var assert = require('assert');
var util = require('util');
var fs = require('fs');
var through = require('through2');
var HandHole = require('../index.js');
var isstream = require('isstream');


var srcfile = './README.md';
var destfile = './copy.md';

describe("handhole", function(){
	var getDatatype = HandHole.util.getDatatype;

	before(function(done){
		fs.writeFile(destfile, "test", function(){
			// console.log("saved");
			done();
		});
	});

	after(function(done){
		setTimeout(function(){
			fs.unlink(destfile, done);
		}, 100);
	});


	describe.skip("v0.0.1", function(){

		it("data type", function(){
			assert.equal(getDatatype(new Buffer(1)),  'buffer')
			assert.equal(getDatatype(1),              'number')
			assert.equal(getDatatype("1"),            'string')
			assert.equal(getDatatype(["1"]),          'array')
			assert.deepEqual(getDatatype({aaa:1}), 						['object',    'Object'])
			assert.deepEqual(getDatatype(function test(){}), 	["function",  'test'])
			assert.deepEqual(getDatatype(new klass()),				["object",    'klass'])
			assert.deepEqual(getDatatype(through()),					["stream",    'duplex'])
		});

		// get stream list
		it("list", function(){
			var hRead = HandHole(fs.createReadStream(srcfile));
			var hWrite = HandHole(fs.createWriteStream(destfile));
			hRead.list().forEach(function (d) {
				assert.equal(getDatatype(d.name), "string")
				assert.equal(getDatatype(d.id), "number")
				assert.deepEqual(getDatatype(d.obj), ["stream", 'readable'])
				assert.equal(getDatatype(d.next),"array")
			});
			hWrite.list().forEach(function (d) {
				assert.equal(getDatatype(d.name), "string")
				assert.equal(getDatatype(d.id), "number")
				assert.deepEqual(getDatatype(d.obj), ["stream", 'writable'])
				assert.equal(getDatatype(d.next),"array")
			});

			var hh = HandHole(makeModel());
			var list = hh.list().forEach(function (d) {
				assert.equal(getDatatype(d.name), "string")
				assert.equal(getDatatype(d.id), "number")
				assert.deepEqual(getDatatype(d.obj), ["stream", 'duplex'])
				assert.equal(getDatatype(d.next),"array")
			});

			list = hh.viewlist().forEach(function (d) {
				assert.equal(getDatatype(d.name), "string")
				assert.equal(getDatatype(d.id), "number")
				assert.equal(getDatatype(d.next),"array")
			});

			var h2 = HandHole(makeModel_line());
			// console.log(h2.viewlist())
		})

		// Get Termination
		it("term", function(){
			
			var hh = HandHole(makeModel());
			var term = hh.term();

			assert.equal(getDatatype(term.start),"array")
			assert.equal(getDatatype(term.end),"array")
			assert.equal(getDatatype(term.alone),"array")

			for(var v in term){
				term[v].forEach(function (d){
					assert.equal(getDatatype(d.name), "string")
					assert.equal(getDatatype(d.id), "number")
					assert.deepEqual(getDatatype(d.obj), ["stream", 'duplex'])
					assert.equal(getDatatype(d.next),"array")
				});
			}
			// console.log(term);
		})


		// Pipe Controll
		it("insert", function(){
			
			var hh = HandHole(makeModel());

			// error noparameter
			assert.throws(function(){
				hh.insert()
			});

			// error not stream
			assert.throws(function(){
				hh.insert(1)
			});
			assert.throws(function(){
				hh.insert(1,{})
			});

			// error writable stream
			assert.throws(function(){
				hh.insert(1, getWritable())
			});
			
			// test before after pipe state
			var src = hh.list().filter(function (d){
				return d.next.indexOf(1) > -1;
			})
			var t = hh.insert(1, through.obj());
			src.forEach(function (d) {
				assert.equal(d.next.indexOf(1), -1);
			});
			assert.deepEqual(t.next, [1]);


			// 連列してすべてに書き込み　交互にhopperがはいるのを確認
			var h2 = HandHole(makeModel_line());

			// 0 はreadableなのでerrorが発生することを確認
			assert.equal(h2.getobj(0).type,"readable")
			assert.throws(function(){
				h2.insert(0, through.obj());
			});

			var list = h2.list();
			list.filter(function (d) {
				return d.type !== "readable";
			}).forEach(function (d) {
				h2.insert(d.id, h2.hopper());
			});

			var start = h2.term().start;
			assert.equal(start.length, 1);
			var current = start[0].id;
			var cur_name = start[0].name;
			var count = 0;
			var length = h2.list().length;


			while(current !== false){
				var obj = h2.getobj(current);
				current = returnnext(obj);
				if(current === false) break;
				var next = h2.getobj(current);
				if(cur_name !== "hopper"){
					assert.equal(next.name, "hopper");
				}else{
					assert.notEqual(next.name, "hopper");
				}
				cur_name = next.name;
			}

			function returnnext(obj){
				if(obj.next.length === 1)
					return obj.next[0]
				else
					return false;
			}

		})

		// remove 
		it("remove", function(done){
			this.timeout(5*1000)
			var hh = HandHole(makeModel_line());
			var list = hh.list();
			list.filter(function (d) {
				return d.type !== "readable";
			}).forEach(function (d) {
				hh.insert(d.id, hh.hopper());
			});

			list = hh.list().filter(function(d){
				return d.name === "hopper";
			})

			assert.ok(list.length > 1);

			list.forEach(function (d) {
				hh.remove(d.id);
			})

			var term = hh.term();

			assert.equal(term.start.length, 1);
			assert.equal(term.end.length, 1);
			assert.equal(term.alone.length, 0);

			hh.remove(0);
			var hp = hh.hopper(1);
			var fm = hh.flowMater(6);
			var fm2 = hh.flowMater(6);

			fm.on("flow", function(rs){
				// console.log("flow",rs);
				assert.equal(rs.count, 1)
			})

			fm2.on("flow", function(rs){
				// console.log("flow",rs);
				assert.equal(rs.count, 1)
			})

			fm.on("finish", done)

			// console.log(hh.viewlist())

			hp.data(["string"]);
			hp.data(null)

		});

		// pipe 
		it("pipe", function(done){
			// liner
			var hh = HandHole(makeModel_line());
			assert.throws(function(){
				hh.pipe()
			});
			assert.throws(function(){
				h.pipe(1);
			});
			assert.throws(function(){
				hh.pipe(1,{});
			});
			// assert.throws(function(){
			// 	hh.pipe(1, getReadable());
			// });
			assert.throws(function(){
				var end = hh.term().end[0];
				hh.pipe(end, getReadable());
			});

			// Nhave not Open End term === return 0
			// assert.equal(hh.pipe(getReadable()),0)
			

			// Aute pipe readableの終端にのみ反応
			var before = hh.viewlist();
			var hp = hh.pipe(through.obj());
			assert.deepEqual(before, hh.viewlist());	// not add

			hh.remove(6);
			var rs = hh.pipe(through.obj());
			assert.notDeepEqual(before, hh.viewlist()); // adding
			// console.log(rs,hh.viewlist());
			var hr = HandHole(getReadable());
			hr.pipe(hr.flowMater())

			assert.equal(hr.list().length, 2)

			done();
		});


		// unpipe 
		it("unpipe", function(done){
			var hh = HandHole(makeModel());
			var hp = hh.hopper(0);

			// single
			assert.equal(hh.term().alone.length, 0);
			hh.unpipe(1,2);
			var alone = hh.term().alone;
			assert.equal(alone.length, 1);
			assert.equal(alone[0].id, 2);
			
			var status = hh.garbageAll(function(result){
				// console.log(result);
				// console.log(hh.viewlist())
				done();
			});

			// line
			assert.equal(hh.term().start.length, 1);
			hh.unpipe(0, 1);
			var start = hh.term().start;
			assert.equal(start.length, 2);
			var hp3 = hh.hopper(1);
			

			hp.push("testdata");
			for(var i = 0; i< 1000; i++){
				hp.push(i);
			}
			hp.push(null);

			var hp2 = hh.hopper(2);
			hp2.push(null);

			hp3.push(null)

		});


		// split 
		it("split", function(done){

			// split
			var hh = HandHole(makeModel());
			var hp = hh.hopper(0);

			assert.equal(hh.term().start.length, 1);
			var sp = hh.split(1);
			assert.equal(hh.term().start.length, 2);
			var list = hh.term().start.reduce(function (a, b) {
				a.push(b.id);
				return a;
			},[]);
			assert(list.indexOf(1) > -1);

			var h2 = HandHole(makeModel_line());

			var split = h2.split(1,5);
			// console.log(h2.viewlist());
			var start = h2.term().start.reduce(function (a, b){
				a.push(b.id);
				return a;
			},[]);

			assert.equal(start.length, 2);
			assert(start.indexOf(0) > -1);
			assert(start.indexOf(1) > -1);

			var end = h2.term().end.reduce(function (a, b){
				a.push(b.id);
				return a;
			},[]);

			assert.equal(end.length, 2);
			assert(end.indexOf(6) > -1);
			assert(end.indexOf(5) > -1);

			h2.garbageAll(function(){
				done();
			})

			var hp = h2.insert(h2.hopper());
			hp.obj.push(null);
		});

		it("hopper & garbage", function(done){
			var hh = HandHole(makeModel());
			var status = hh.garbageAll(function(result){
				assert.deepEqual(result['object', 'Object'])
				for(var v in result){
					assert.equal(getDatatype(v), "string")
					assert.equal(getDatatype(result[v]), "date")
				}
				done();
			});

			var hp = hh.hopper(0);
			assert.deepEqual(getDatatype(hp), ["stream", 'duplex'])

			var data = []
			for(var i = 0; i< 100; i++){
				data.push(i);
			}
			hp.data(data);
			hp.push(null);
		})

		it("flowmater", function (done) {
			var hh = HandHole(makeModel());
			var hp = hh.hopper(0);
			var status = hh.garbageAll();

			var fm = hh.flowMater(1);
			fm.on("flow", function(data){
				// console.log("flow",data);
				assert.deepEqual(Object.keys(data),["count","size"]);
			})
			fm.on("total", function(data){
				// console.log("total",data);
				assert.deepEqual(Object.keys(data),["count","size"]);
				done();
			})

			hp.push("testdata");
			for(var i = 0; i< 1000; i++){
				hp.push(i);
			}

			setTimeout(function(){
				hp.push(null);
			},1100)
			
		})


		it("valve", function(done){
			this.timeout(5*1000)
			var hh = HandHole(makeModel());
			// console.log(hh.viewlist())
			var hp = hh.hopper(0);
			var status = hh.garbageAll(function(result){
				// console.log(result);
				// console.log(hh.viewlist())
				done();
			});
			// console.log(hh.viewlist())

			var vl = hh.valve(1,5);

			vl.on("flow", function(data){
				console.log("valve",data.count);
				assert.equal(getDatatype(data.timer),"number")
				assert.equal(getDatatype(data.rate),"number")
				assert.equal(getDatatype(data.wait),"number")
				assert.equal(getDatatype(data.interval),"number")
				assert.equal(getDatatype(data.count),"number")
			})

			hp.push("testdata");
			for(var i = 0; i< 1000; i++){
				hp.push(i);
			}
			hp.push(null);

			setTimeout(function(){
				vl.valve(0);
			},1000)
			setTimeout(function(){
				vl.valve(-1);
			},1500)
		})

		it("capture", function(done){
			this.timeout(5*1000)
			var hh = HandHole(makeModel());
			var hp = hh.hopper(0);
			var status = hh.garbageAll(function(result){
				// console.log(result);
				// console.log(hh.viewlist())
				done();
			});

			var cp = hh.capture(2);

			var c2 = HandHole.capture();

			hp.push("testdata");
			for(var i = 0; i< 10; i++){
				hp.push(i);
			}
			hp.push(null);
		})
	})


	describe.skip("v0.0.2", function(){
		it("add", function(done){
			var hh = HandHole(makeModel_line());
			var v1 = hh.viewlist();
			var t1 = hh.term();
			assert.equal(t1.start.length,1)
			assert.equal(t1.end.length,1)
			var rs = hh.add(makeModel_line(true))

			assert.equal(hh.term().start.length,2)
			assert.equal(hh.term().end.length,2)

			done();
		})

		it("pipe Array", function(done){
			var hh = HandHole(getReadable());
			var rs = hh.add(makeModel_line());
			var v1 = hh.viewlist();
			var t1 = hh.term();
			assert.equal(t1.start.length,1)
			assert.equal(t1.end.length,1)
			assert.equal(t1.alone.length,1)

			var addArray = [through.obj(),hh.flowMater()];
			var rs = hh.pipe(addArray);

			// Check total count
			assert.equal(hh.viewlist().length, v1.length+addArray.length);

			// Check pipe Connection
			var rsf = hh.list().filter(function (d){
				return d.next.indexOf(rs.id) > -1;
			});
			assert.equal(rsf.length,1)
			assert.equal(rsf[0].id,0);

			// console.log(hh.viewlist());
			done();
		})

		it("insert Array", function (done) {
			var hh = HandHole(getWritable());
			var rs = hh.add(makeModel_line());

			var v1 = hh.viewlist();
			var t1 = hh.term();
			assert.equal(t1.start.length,1)
			assert.equal(t1.end.length,1)
			assert.equal(t1.alone.length,1)

			var addArray = [through.obj(),hh.flowMater()];
			var ir = hh.insert(addArray);

			// Check total count
			assert.equal(hh.viewlist().length, v1.length+addArray.length);

			// Check pipe Connection
			var rn = hh.getRouteNode(ir.id);
			assert.equal(rn.length,3)


			// console.log(hh.viewlist());
			// console.log(hh.getRouteNode(8));
			done();
		})

		it("loop check term", function (done){

			// makeloop
			var addArray = [through.obj(),HandHole.flowMater()];
			var hh = HandHole(addArray);
			hh.add(makeModel_line());
			hh.add(getPassthrogh());

			var t1 = hh.term();
			assert.equal(t1.start.length,2)
			assert.equal(t1.end.length,2)
			assert.equal(t1.alone.length,1)

			// loop 2 stream
			assert.throws(function(){
				hh.pipe(1,0)
			})

			// force use
			hh._loopflag = true;
			hh.pipe(1,0)
			
			var pth = t1.alone[0];

			
			hh.pipe(pth.id,pth.id)
			
			var t2 = hh.term();
			assert.equal(t2.start.length,1)
			assert.equal(t2.end.length,1)
			assert.equal(t2.alone.length,0)
			assert.equal(t2.loop.length,3)

			// console.log(hh.viewlist())
			// get term loop
			done();
		});

	});


	describe.skip("v0.0.5", function(){
		it("stacker", function (done){
			var hp = HandHole.hopper();
			var fm = HandHole.flowMater();
			var fm2 = HandHole.flowMater();
			var cp = HandHole.capture({out:"file", filename:"capture.txt"});
			var hh = HandHole([
				hp,
				fm,
				HandHole.stacker(),
				fm2,
				cp
			]);

			fm.on("flow", function(flow){
				// console.log("before",flow);
				assert.equal(flow.count, 100);

			})
			fm2.on("flow", function(flow){
				// console.log("after",flow);
				assert.equal(flow.count, 1);
			})

			hh.garbageAll(function(){
				fs.unlink("capture.txt")
				done();
			})

			for(var i=0; i< 100; i++){
				hp.push("D"+i);
			}
			hp.push(null)

		})
	})


	describe.skip("v0.0.6", function(){
		it("stacker", function (done) {
			var splitChar = "/";
			var hp = HandHole.hopper();
			var fm = HandHole.flowMater();
			var fm2 = HandHole.flowMater();
			var cp = HandHole.capture({out:"file", filename:"capture.txt"});
			var hh = HandHole([
				hp,
				fm,
				HandHole.stacker({splitChar: splitChar}),
				fm2,
				cp
			]);
			
			fm.on("flow", function(flow){
				// console.log("before",flow);
				assert.equal(flow.count, 101);

			})
			fm2.on("flow", function(flow){
				// console.log("after",flow);
				assert.equal(flow.count, 2);
			})

			hh.garbageAll(function(){
				fs.unlink("capture.txt")
				done();
			})

			for(var i=0; i< 50; i++){
				hp.push("D"+i);
			}
			hp.push(splitChar);
			for(var i=0; i< 50; i++){
				hp.push("C"+i);
			}
			hp.push(null)


		});

		it("conful", function (done){
			var hp1 = HandHole.hopper();
			var hp2 = HandHole.hopper();
			var hp3 = HandHole.hopper();
			var stc = HandHole.stacker();
			var asrt = through.obj(confulAssert)
			var cnf = HandHole.conful([hp1, hp2]);
			cnf.conful(hp3);
			var hh = HandHole([cnf, stc, asrt]);
			hh.garbageAll(function(result){
				done();
			})

			//
			// Test Data
			//
			hp1.push("A"+1);
				
			hp1.push(null)
			for(var i=0; i< 10; i++){
				hp2.push("D"+i);
			}
			
			hp2.push(null)

			setTimeout(function(){
				hp3.data(["da3", null])
			}, 1000);


			function confulAssert (chunk, enc, cb) {
				assert.ok(chunk.length, 12);
				cb();
			}
		})
	})

	describe("v0.0.7", function(){
		it("turnstile", function (done) {
			var hp = HandHole.hopper();
			var tsl = HandHole.turnstile(ff);
			var cp = HandHole.capture();
			var hh = HandHole([hp, tsl, cp]);

			hh.garbageAll(function(result){
				done();
			})


			for(var i=0; i< 5; i++){
				var v = Math.random() * 1500;
				hp.push(v);
			}
			hp.push(null);

			// function 
			function ff(chunk, enc, cb){
				// console.log(chunk);
				var self = this;
				setTimeout(function(){
					self.push(chunk);
					cb();
				}, chunk);
				
			}

		});
	})
});

function logprog(str){
	var length = Object.keys(arguments).length;
	arguments[length] = '%\r';
	process.stdout.write(util.format.apply(this, arguments));
}

// test model
function makeModel(){
	// t1 -- t2 -tend
	//		|- t3 - t4 -t5
	//		|- noname
	function t1(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	var model = through.obj(t1)

	function t2(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f2(cb){
		cb();
	}

	function t3(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f3(cb){
		// console.log("f3")
		cb();
	}

	function t4(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f4(cb){
		// console.log("f4")
		cb();
	}

	function t5(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f5(cb){
		// console.log("f5")
		cb();
	}

	function tend(chunk, enc, cb){
		// logprog("[tend]", chunk);
		cb();
	}
	function fend(cb){
		// console.log("[Latest]")
		cb();
	}

	model
		.pipe(through.obj(t2,f2))
		.pipe(through.obj(tend,fend))
	model.pipe(through.obj(t3,f3)).pipe(through.obj(t4,f4)).pipe(through.obj(t5,f5))
	model.pipe(through.obj(function(chunk,enc,cb){return cb()},function(cb){cb()}))
	return model;
}

// test model
function makeModel_line(opt){
	var readstr = fs.createReadStream('./README.md',{encoding:"utf-8"});
	var writestr = fs.createWriteStream('./copy.md',{encoding:"utf-8"});
	function t1(chunk,enc,cb){
		this.push(chunk)
		cb();
	}

	function t2(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f2(cb){
		cb();
	}

	function t3(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f3(cb){
		// console.log("f3")
		cb();
	}

	function t4(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f4(cb){
		// console.log("f4")
		cb();
	}

	function t5(chunk, enc, cb){
		this.push(chunk)
		cb();
	}
	function f5(cb){
		// console.log("f5")
		cb();
	}
	if(opt === true){
		return [
			readstr,
			through.obj(t1),
			through.obj(t2,f2),
			through.obj(t3,f3),
			through.obj(t4,f4),
			through.obj(t5,f5)
		]
	}
	readstr
		.pipe(through.obj(t1))
		.pipe(through.obj(t2,f2))
		.pipe(through.obj(t3,f3))
		.pipe(through.obj(t4,f4))
		.pipe(through.obj(t5,f5))
		.pipe(writestr)
	return readstr;
}

function getReadable(){
	return fs.createReadStream('./README.md',{encoding:"utf-8"})
}
function getWritable(){
	return fs.createWriteStream('./copy.md',{encoding:"utf-8"})
}
function getPassthrogh(){
	return through.obj(function(chunk,enc,cb){cb()},function(cb){cb()})
}

// test class
function klass(){

}
klass.prototype.get = function(){
	return true;
}

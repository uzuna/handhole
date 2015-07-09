const assert = require('assert');
const util = require('util');
const through = require('through2');
const HandHole = require('../index.js');
const isstream = require('isstream');

describe("handhole", function(){
	var getDatatype = HandHole.util.getDatatype;
	it("data type", function(){
		assert.equal(getDatatype(new Buffer(1)), 	'buffer')
		assert.equal(getDatatype(1), 							'number')
		assert.equal(getDatatype("1"), 						'string')
		assert.equal(getDatatype(["1"]), 					'array')
		assert.deepEqual(getDatatype({aaa:1}), 						['object', 		'Object'])
		assert.deepEqual(getDatatype(function test(){}), 	["function", 	'test'])
		assert.deepEqual(getDatatype(new klass()),				["object", 		'klass'])
		assert.deepEqual(getDatatype(through()),					["stream", 		'duplex'])
	});

	// get stream list
	it("list", function(){
		var hh = HandHole(makeModel());
		var list = hh.list().forEach(function (d) {
			assert.equal(getDatatype(d.name), "string")
			assert.equal(getDatatype(d.id), "number")
			assert.deepEqual(getDatatype(d.obj), ["stream", 		'duplex'])
			assert.equal(getDatatype(d.next),"array")
		});

		list = hh.viewlist().forEach(function (d) {
			assert.equal(getDatatype(d.name), "string")
			assert.equal(getDatatype(d.id), "number")
			assert.equal(getDatatype(d.next),"array")
		});
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
		assert.throws(function(){
			hh.insert()
		});
		assert.throws(function(){
			assert.throws(hh.insert(1));
		});
		assert.throws(function(){
			assert.throws(hh.insert(1,{}));
		});
		
		var src = hh.list().filter(function (d){
			return d.next.indexOf(1) > -1;
		})
		var t = hh.insert(1, through.obj());
		src.forEach(function (d) {
			assert.equal(d.next.indexOf(1), -1);
		});
		assert.deepEqual(t.next, [1])
	})

	// remove 
	it("remove", function(done){
		this.timeout(5*1000)
		var hh = HandHole(makeModel());
		var hp = hh.hopper(0);
		
		hh.remove(1);
		// console.log(hh.viewlist())
		var fm = hh.flowMater(2);
		var status = hh.garbageAll(function(result){
			// console.log(result);
			// console.log(hh.viewlist())
			// done();
		});
		
		fm.on("total", function(data){
			console.log("total", data);
			done();
		})

		hp.push("testdata");
		for(var i = 0; i< 1000; i++){
			hp.push(i);
		}
		hp.push(null);

	});

	// pipe 
	it("pipe", function(done){
		var hh = HandHole(makeModel());
		var hp = hh.hopper(0);

		var p = hh.pipe(2, hh.flowMater())

		var status = hh.garbageAll(function(result){
			console.log(result);
			console.log(hh.viewlist())
			done();
		});


		hp.push("testdata");
		for(var i = 0; i< 1000; i++){
			hp.push(i);
		}
		hp.push(null);

	});


	// unpipe 
	it("unpipe", function(done){
		var hh = HandHole(makeModel());
		var hp = hh.hopper(0);
		hh.unpipe(1,2);
		console.log(hh.viewlist())
		
		var status = hh.garbageAll(function(result){
			console.log(result);
			console.log(hh.viewlist())
			done();
		});


		hp.push("testdata");
		for(var i = 0; i< 1000; i++){
			hp.push(i);
		}
		hp.push(null);

		var hp2 = hh.hopper(2);
		hp2.push(null);

	});


	// split 
	it("split", function(done){
		var hh = HandHole(makeModel());
		var hp = hh.hopper(0);
		var sp = hh.split(1);
		console.log(hh.viewlist())
		var status = hh.garbageAll(function(result){
			console.log(result);
			console.log(hh.viewlist())
			done();
		});

		// pipeの端を取得する
		// console.log(hh.term())

		hp.push("testdata");
		for(var i = 0; i< 1000; i++){
			hp.push(i);
		}
		hp.push(null);

		var hp2 = hh.hopper(1);
		hp2.push(null);

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
		var status = hh.garbageAll(function(result){
			console.log(result);
			done();
		});

		var fm = hh.flowMater(1);
		fm.on("flow", function(data){
			console.log("flow",data);
		})
		fm.on("total", function(data){
			console.log("total",data);
		})

		hp.push("testdata");
		for(var i = 0; i< 1000; i++){
			hp.push(i);
		}

		setTimeout(function(){
			hp.push(null);
		},1500)
		
	})


	it("valve", function(done){
		this.timeout(5*1000)
		var hh = HandHole(makeModel());
		var hp = hh.hopper(0);
		var status = hh.garbageAll(function(result){
			console.log(result);
			console.log(hh.viewlist())
			done();
		});

		var fm = hh.valve(1,5);

		fm.on("flow", function(data){
			console.log("flow",data);
		})

		hp.push("testdata");
		for(var i = 0; i< 1000; i++){
			hp.push(i);
		}
		hp.push(null);

		setTimeout(function(){
			fm.valve(0);
		},1000)
		setTimeout(function(){
			fm.valve(-1);
		},1500)
	})

	it("captche", function(done){
		this.timeout(5*1000)
		var hh = HandHole(makeModel());
		var hp = hh.hopper(0);
		var status = hh.garbageAll(function(result){
			console.log(result);
			console.log(hh.viewlist())
			done();
		});

		var cp = hh.capture(2);

		hp.push("testdata");
		for(var i = 0; i< 10; i++){
			hp.push(i);
		}
		hp.push(null);

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
	function t1(chunk,enc,cb){
		chunk.t1 = "t1";
		this.push(chunk)
		cb();
	}
	var model = through.obj(t1)

	function t2(chunk, enc, cb){
		chunk.t2 = "t2"
		this.push(chunk)
		cb();
	}
	function f2(cb){
		cb();
	}

	function t3(chunk, enc, cb){
		chunk.t3 = "t3"
		this.push(chunk)
		cb();
	}
	function f3(cb){
		// console.log("f3")
		cb();
	}

	function t4(chunk, enc, cb){
		chunk.t4 = "t4"
		this.push(chunk)
		cb();
	}
	function f4(cb){
		// console.log("f4")
		cb();
	}

	function t5(chunk, enc, cb){
		chunk.t5 = "t5"
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
	model.pipe(through.obj(function(chunk,enc,cb){cb()},function(cb){cb()}))
	return model;
}




// test class
function klass(){

}
klass.prototype.get = function(){
	return true;
}

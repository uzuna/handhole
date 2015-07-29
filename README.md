## Handhole
[![Build Status](https://secure.travis-ci.org/uzuna/handhole.png?branch=master)](http://travis-ci.org/uzuna/handhole)

__This is develop/maintenance tool for StreamAPI__

### Target

__Make it eacy to use StreamAPI : StreamAPIをもっと簡単に__

データがどこを流れている、どう流れているかわかりにくい点、
そしてデータを流し込んだり、パイプをつなぐ操作が煩雑なので、負荷を軽減をするために作りました。

__Install__
`npm install handhole`


__Use__

```javascript
var Handhole = require('handhole');

var hh = Handhole(stream);
var hh = HandHole([s1,s2]);
```

### Methods

#### Pipe Controlle

|method|exsample|descript|
|:---|:---|:---|
|insert|`hh.insert([target], stream or array)`|指定したstreamの前に追加する|
|remove|`hh.remove(target)`|指定したstreamを取り除く|
|pipe|`hh.pipe([target], stream or array)`|指定したstreamの後ろに追加|
|unpipe|`hh.unpipe(target)`|指定したstreamの後ろを切り離す|
|split|`hh.sprit(to,[from])`|指定したstreamから切り離す|

#### Stream Module

|method|exsample|descript|
|:---|:---|:---|
|hopper|`hh.hopper([target])`|データを流し込み口を作る。指定があればtargetの前に追加する|
|flowMater|`hh.flowMater([target])`|データ量(count,size)を計測する。終了時に他totalを返す|
|valve|`hh.valve([DPS],[target])`|DPS(data/sec)を調整する(0=stop, 0 > no limit)|

#### Module for Dev

開発時に陥りがちな不具合を避ける。
開発時に終端までpipeを通してないことは多いので、とりあえず終端にモニターをつける

|method|exsample|descript|
|:---|:---|:---|
|garbage|`hh.garbage(target, [done])`|trash chunk data|
|garbageAll|`hh.garbageAll(target, [done])`|set garbage to all EndTerm|



## Information Methods

Get stream information

### list

Return registered stream list

```javascript
var hh = HandHole([s1,s2]);
var list = hh.list();
console.log(list);
// [
// 	{
// 		id:0,              // uniqueid
// 		name:"s1",         // name(from transform function name)
// 		obj:StreamObject,  // stream object
// 		next:[1]           // list pipes id
// 	},
// 	...
// ]
```


### viewlist

Check stream list by looking

```javascript
var hh = HandHole([s1,s2]);
var list = hh.viewlist();
console.log(list);
// [
// 	{
// 		id:0,       // unique id
// 		name:"s1",  // name(from transform function name)
// 		next:[1]    // list pipes id
// 	},
// 	{
// 		id:1,
// 		mame:"s2",
// 		next:[]     // have not next pipe
// 	}
// ]
```

### term

Get stream by termination type.

```javascript
var hh = HandHole([s1,s2]);

// alone
hh.Add(s3);

// loop
hh.Add([s4,s5]);
hh.pipe("s5", "s4")

var term = hh.term();
console.log(term);
// {
// 	start:[...],	// start term.     ex.s1
// 	end:[...],		// end term.       ex.s2
// 	alone:[...],	// alone streams.  ex.s3
// 	loop:[...],		// loop streams.   ex.[s4,s5]
// 	other:[...],	// others
// }
```

## Controll Methods

### Insert

__targetの前に__streamを追加する

`hh.insert([target], stream or array)`

```javascript
var t = [A,B,C];			// A-B-C 
var hh = HandHole(t);

// 指定なしなら先頭に追加
hh.insert(D);				// D-A-B-C

// 指定をすれば前のStreamとの間に追加
hh.insert("B",E)		// D-A-E-B-C

// readableの前には入れられない
var r = fs.createReadStream(filepath);
var hh = HandHole(r);
hh.insert(0, F);	// Error!!!
```

### Pipe

__targetの後ろに__streamを追加する

`hh.pipe([target], stream or array)`

```javascript
var t = [A,B,C];			// A-B-C
var hh = HandHole(t);

// 指定なしなら最後尾に追加
hh.pipe(D);				// A-B-C-D

// 指定をすれば並列に接続
hh.pipe("B",E)    // A-B-C-D
                  //   |-E

// ループ構造は基本的には作れない
hh.pipe("C","A")  // Error! stream loop is very slow

// if want to use
// hh._loopflag = true // _loopflag = true
// hh.pipe("C","A") // OK

// writableの後には入れられない
var r = fs.createWriteStream(filepath);
var hh = HandHole(r);
hh.insert("D", F);	// Error!!!

```


### Remove

__target__を取り除く

`hh.pipe([target])`

```javascript
var t = stream;			// A-B-C-D-Eという順番でつながっていると仮定
var hh = HandHole(t);

// 指定したstreamを取り除いて前後とつなげる
hh.remove("D");				// A-B-C-E

```

### Unpipe

targetの下流を切り離す。

`hh.unpipe(target)`

```javascript
var t = [A,B,C,D,E];     // A-B-C-D-E
var hh = HandHole(t);

// 指定したstreamを取り除いて前後とつなげる
hh.unpipe("C");       // A-B-C, D-Eができる

```


### Split

split stream pipe by from-to 

`hh.unpipe(to, [from])`

```javascript
var t = [A,B,C,D,E];     // A-B-C-D-E
var hh = HandHole(t);

// split in front of target
hh.split("C");       // A-B, C-D-Eができる

// get between "to" and "from"
hh.split("B","D");	// A-E, B-C-D

```

## Support Streams

### Hopper

データを個別に導入するためのStream

```javascript
var Handhole = require('handohole');

//　生成方法は二つ srreamobjを受け取るか
var hp = Handhole.hopper();

// 直接追加する
var hh = handhole(stream);
var hp = hh.hopper(1);	// insertと同じ動作を行う


// データはpushもしくはdataで追加できる。
hp.push("A");
hp.push("B");
hp.push("C");
hp.push("D");

hp.data(["A","B","C","D"]);	// data Methodなら配列で渡すこともできる

// close
hp.push(null);
hp.data(null);

```

### Garbage / garbageAll()

閉じていないStreamを動作させるための終端Stream。  
終了時にはcallbackを呼ぶ。  
基本的にはgarbageAllで勝手にDuplexの終端を閉じるのでそちらを使う

```javascript
var Handhole = require('handohole');

//　生成方法は二つ srreamobjを受け取るか
var hp = Handhole.hopper();

// 直接追加する
var hh = handhole(stream); // A-B-C-D

// Callbackを指定 A-B-C-D-[garbage]
hh.garbageAll(function(){
	// call by streamD.onfinish
	done();
});

hh.data(data);
hh.data(null);

```

### FlowMater

Monitoring data flow call count and chunk size.

#### event

##### data
emiting on timer(default:500ms)
return info latest dataflow.

##### total
emitting on finish.
return info total dataflow.

`handhole.flowMater([option])`

```javascript

// get Object from class
var fm = Handhole.flowMeter(option)

// or insert to instance
var hh = handhole(stream); 
var fm = hh.flowMater("B");	// insert

// option
option  = {
	timer:1000 // interval of emit flow event
}

// result
fm.on("flow", function (flow){
	console.log(flow.count); 	// count of call in interval
	console.log(flow.size); 	// size of total datasize in interval
})

```

### Valve

valve is regurate data count per second.

`Handhole.valve([option])`

```javascript

// get Object from class
var vl = Handhole.valve(option)

// or insert to instance
var hh = handhole(stream); 
var vl = hh.valve("B");	// insert

// option
option  = {
	valve:1000 // iDPS target
}

// change valve
vl.valve(50);

// result
vl.on("flow", function (flow){
	console.log(flow.count); 	// count of call in interval
	console.log(flow.size); 	// size of total datasize in interval
	console.log(flow.timer); 	// start datetime of controll span
	console.log(flow.wait); 	// buffering chunk count
	console.log(flow.valve); 	// now valve setting
})

```

### Capture

It is `console.log(data)`

```javascript

// get Object from class
var cp = Handhole.capture(option)

// or insert to instance
var hh = handhole(stream); 
var cp = hh.capture("B");	// insert

```


### util func

Please read test/index.js

```
var getDatatype = HandHole.util.getDatatype;
```

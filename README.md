## Handhole
[![Build Status](https://secure.travis-ci.org/uzuna/handhole.png?branch=master)](http://travis-ci.org/uzuna/handhole)

__This is develop/maintenance tool for StreamAPI__

### Target

Stream APIを使ったmodule開発をもっと簡単に。

データがどこを流れている、どう流れているかわかりにくい点、
そしてデータを流し込んだり、パイプをつなぐ操作が煩雑なので、負荷を軽減をするために作りました。

__Install__
`npm install handhole`


__Use__

```javascript
var Handhole = require('handhole');

var hh = Handhole(stream);
```

### Methods

#### Pipe Controlle

|method|exsample|descript|
|:---|:---|:---|
|insert|`hh.insert(target, stream)`|指定したstreamの前に追加する|
|remove|`hh.remove(target)`|指定したstreamを取り除く|
|pipe|`hh.pipe(target, stream)`|指定したstreamの後ろに追加|
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

## Method Detail

### Insert

__targetの前に__streamを追加する

`hh.insert([target], stream)`

```javascript
var t = stream;			// A-B-Cという順番でつながっていると仮定
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

`hh.pipe([target], stream)`

```javascript
var t = stream;			// A-B-Cという順番でつながっていると仮定
var hh = HandHole(t);

// 指定なしなら最後尾に追加
hh.pipe(D);				// A-B-C-D

// 指定をすれば並列に接続
hh.pipe("B",E)		// A-B-C-D
									//   |-E

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
var t = stream;     // A-B-C-D-Eという順番でつながっていると仮定
var hh = HandHole(t);

// 指定したstreamを取り除いて前後とつなげる
hh.unpipe("C");       // A-B-C と　D-Eができる

```


### Split

split stream pipe in front of "to".  

`hh.unpipe(to, [from])`

```javascript
var t = stream;     // ex. it is piped A-B-C-D-E
var hh = HandHole(t);

// split in front of target
hh.split("C");       // A-B と C-D-Eができる

// get between "to" and "from"
hh.split("B","D");

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
var hh =　handhole(stream); // A-B-C-D

// Callbackを指定 A-B-C-D-[garbage]
hh.garbageAll(function(){
	// call by streamD.onfinish
	done();
});

hh.data(data);
hh.data(null);

```


### FlowMater
### Capture

### ...Now writing!!!


### Degub

stream.nameをreadable/writableの対応

insert("garbage")の動作
もしくは終端追加Method

### Need

moduleにinsertではなくpipeを設定できるoptionを

グローバルにmoduleを生成するコードを

### if


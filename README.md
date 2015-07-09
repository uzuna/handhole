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
|insert|`hh.insert(target, stream)`|指定したstreamの前に追加する。すでにつながっているものがあれば間に挿入する|
|remove|`hh.remove(target)`|指定したstreamを取り除く。前後のstreamは接続される|
|pipe|`hh.pipe(target, stream)`|指定したstreamの後ろに追加|
|unpipe|`hh.unpipe(target)`|指定したstreamの後ろを切り離す|
|split|`hh.sprit(to,[from])`|指定したstreamから切り離す|

#### Stream Module

|method|exsample|descript|
|:---|:---|:---|
|hopper|`hh.hopper([target])`|データを流し込み口を作る。指定があればtargetの前に追加する。|
|flowMater|`hh.flowMater([target])`|データ量(count,size)を計測する。終了時に他totalを返す|
|valve|`hh.valve([DPS],[target])`|DPS(data/sec)を調整する。0で停止。マイナス値で制限なし。|

#### Module for Dev

開発時に陥りがちな不具合を避ける。
開発時に終端までpipeを通してないことは多いので、とりあえず終端にモニターをつける

|method|exsample|descript|
|:---|:---|:---|
|garbage|`hh.garbage(target, [done])`|targetの後ろにデータが流れないようにする。|
|garbageAll|`hh.garbageAll(target, [done])`|すべての終端にgarbegeをつける。すべてがfinishされたらcbする|

### Method Detail

```
var hh = HandHole(stream);
hh.insert(id, nextstream);
```


...Now writing!!!
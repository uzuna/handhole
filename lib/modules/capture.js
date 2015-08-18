'use strict';

require('date-utils');
var through = require('through2');
var util = require('util');
var valid = require('./validFunction');
var xtend = require('xtend');
var fs = require('fs');

module.exports = genCapture;

function genCapture(option){
  option = option || {};
  option = xtend({out:"console"}, option);

  if(option.out ==='file'){
    option.filename = option.filename  || "capture_" + new Date().toFormat("MM-DD HH24MISS.LL");
  }
  return new Capture(option);
}

//
// @todo out to file
//
function Capture(option){
  return through.obj(function capture(chunk, enc, cb){
    if(option.out === 'file'){
      var str = "";
      if(!valid.isString(chunk) && !util.isBuffer(chunk)){
        str = JSON.stringify(chunk)
      }else{
        str = chunk;
      }
      return fs.writeFile(option.filename
        , str
        , {flag:"a"}
        , function(err){
          if(err) throw err;
          cb();
      })

    }else{
      console.log("["+ new Date().toFormat("MM-DD HH24:MI:SS.LL") + "]"
        , valid.getDatatype(chunk)
        , chunk)
    }
    this.push(chunk)
    cb();
  },function flush(cb){
    cb();
  })
}
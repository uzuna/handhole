'use strict';

require('date-utils');
var through = require('through2');
var valid = require('./validFunction')

module.exports = genCapture;

function genCapture(option){
  option = option || {};
  return new Capture(option);
}

function Capture(option){
  return through.obj(function capture(chunk, enc, cb){
    console.log("["+ new Date().toFormat("MM-DD HH24:MI:SS.LL") + "]"
      , valid.getDatatype(chunk)
      , chunk)
    this.push(chunk)
    cb();
  },function flush(cb){
    cb();
  })
}
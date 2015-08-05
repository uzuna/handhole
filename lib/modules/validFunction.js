'use strict';
var util = require('util');
var isstream = require('isstream');

module.exports = {
	isNum:isNum,
	isString:isString,
  isObj:isObj,
	getDatatype:getDatatype,
}

function isNum(num){
	return typeof num === 'number';
}

function isString(str){
	return typeof str === 'string' || str instanceof String;
}

function isObj(value) {
	var type = typeof value;
	return !!value && (type == 'object' || type == 'function');
}

// getDataType
function getDatatype(data){
  var type = typeof data;
  if(type === 'object'){
    if(util.isBuffer(data)) return "buffer";
    if(data instanceof String) return "string";
    if(util.isArray(data)) return "array";
    if(util.isDate(data)) return "date";
    if(isstream(data)) {
      return ["stream", streamType(data)];
    }
    return [type, data.constructor.name];
  }else if(type === 'function'){
    return [type, data.name];
  }
  return type;
}

module.exports = {
	isNum:isNum,
	isString:isString,
	isObj:isObj
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
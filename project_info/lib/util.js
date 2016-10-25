var util = {}

module.exports = util

util.uniq = function(arr) {
  return arr.reverse().filter(function (e, i, arr) {
    return arr.indexOf(e, i+1) === -1;
  }).reverse();
}

// depth first recursive flatten
util.flatten = function(item, dest) {
  if(dest === undefined) {
    dest = []
  }
  if(Array.isArray(item)) {
    item.forEach(function(i){util.flatten(i, dest)})
  } else {
    dest.push(item)
  }
  return dest
}

util.copyMap = function(from, target) {
  Object.keys(from).forEach(function(key){
    target[key]=from[key];
  })
  return target
}

require("./polyfills.js")
var fs = require('fs')
var PropertiesParser = require('properties-parser')

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

util.read = function(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

util.createFileTree = function (root, files) {
  var ret = {
    root: root,
    files: files,
    filesByFN: function (fn) {
      return ret.files.filter(fn)
    },
    createFileLookupFn: function(){
      var lookup = {}
      ret.files.forEach(function(path) {
        var pathArr = path.split("/")
        var file = pathArr.pop()
        if(!lookup[file]) {
          lookup[file] = []
        }
        lookup[file].push(path)
      })
      return function(file) {
        return lookup[file]
      }
    },
    filesBySuffix: function () {
      var suffixes = util.flatten(Array.prototype.slice.call(arguments));
      return ret.filesByFN(function (file) {
        return suffixes.some(function (suffix) {
          return file.endsWith(suffix)
        })
      })
    }
  };
  return ret
}

util.parseProperties = function(originalFileContent) {
  return PropertiesParser.parse(originalFileContent)
}

util.readProperties = function(filePath) {
  return util.parseProperties(util.read(filePath))
}

// flattens nested map by concatenating keys with commas
// {test: {map: {key: value}}} -> {"test.map.key": value}
// note: supports only strings or maps as values
function flattenNested(obj, dest, keyprefix) {
  if (!dest) {
    dest = {}
  }
  Object.keys(obj).forEach(function (key) {
    var val = obj[key];
    var newkey = key
    if (keyprefix) {
      newkey = keyprefix + "." + key;
    }
    if (typeof val === 'string') {
      dest[newkey] = val
    } else {
      flattenNested(val, dest, newkey)
    }
  })
  return dest
}

util.addUrlProperties = function(urlProperties, project, properties, originalFileContent, sourcePath) {
  var urlPropertyInfo=urlProperties[project];
  if(!urlPropertyInfo) {
    urlProperties[project]=urlPropertyInfo={name: project, properties: {}}
  }
  var originalProperties = urlPropertyInfo.properties
  var flattenedProperties = flattenNested(properties);
  Object.keys(flattenedProperties).forEach(function (key) {
      if(originalProperties[key]) {
        if(originalProperties[key] != flattenedProperties[key]) {
          throw "Can't add urlProperties to " + project + ". Key " + key + " is already defined as " + originalProperties[key] +". New value: " + flattenedProperties[key]
        }
      }
      originalProperties[key] = flattenedProperties[key]
    })
  var sourceInfo = {
    properties: flattenedProperties
  }
  if(sourcePath) {
    sourceInfo.path = sourcePath;
  }
  if(originalFileContent) {
    sourceInfo.originalFileContent = originalFileContent;
  }
  if(!urlPropertyInfo.sources) {
    urlPropertyInfo.sources = []
  }
  urlPropertyInfo.sources.push(sourceInfo)
}
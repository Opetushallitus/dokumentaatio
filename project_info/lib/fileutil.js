var fs = require('fs')
var PropertiesParser = require('properties-parser')
var util = require('../static/util.js')

var fileutil = {}
module.exports = fileutil

fileutil.read = function(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

fileutil.createFileTree = function (root, files) {
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

fileutil.parseProperties = function(originalFileContent) {
  return PropertiesParser.parse(originalFileContent)
}

fileutil.readProperties = function(filePath) {
  return fileutil.parseProperties(fileutil.read(filePath))
}

fileutil.addUrlProperties = function(urlProperties, project, properties, originalFileContent, sourcePath, originalData) {
  var urlPropertyInfo=urlProperties[project];
  if(!urlPropertyInfo) {
    urlProperties[project]=urlPropertyInfo={name: project, properties: {}}
    if(originalData.type) {
      urlPropertyInfo["type"]=originalData.type
    }
  }
  var urlsInclude = util.safeGet(originalData, "urls.includes")
  if(urlsInclude) {
    if(!urlPropertyInfo.includes) {
      urlPropertyInfo.includes=[]
    }
    urlPropertyInfo.includes=urlPropertyInfo.includes.concat(urlsInclude)
  }
  var originalProperties = urlPropertyInfo.properties
  var flattenedProperties = util.flattenNested(properties);
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

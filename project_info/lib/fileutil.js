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

fileutil.removeRootPath = function(path, root) {
  if(!root.endsWith("/")) {
    root = root + "/"
  }
  if(!path.startsWith(root)) {
    throw "Path "+path+" doesn't start with " + root
  }
  return path.substring(root.length)

}
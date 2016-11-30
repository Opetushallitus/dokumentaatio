var fs = require('fs')
var glob = require("glob")
var Path = require('path')
var PropertiesParser = require('properties-parser')

var util = require('../static/util.js')

var fileutil = {}
module.exports = fileutil

fileutil.read = function(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

fileutil.globFileTree = function (root, pattern, fn) {
  var globPattern = Path.join(root, pattern);
  var rootAfterJoining = globPattern.substr(0,globPattern.length-pattern.length)
  glob(globPattern, function (er, files) {
    var shortenedFiles = files.map(function(filePath){
      return filePath.substr(rootAfterJoining.length, filePath.length)
    });
    fn(er, fileutil.createFileTree(root, shortenedFiles))
  })
};

fileutil.fileTree = function(root, fn) {
  this.globFileTree(root, "**/*", fn);
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
    },
    fullPath: function(path) {
      return Path.join(ret.root, path)
    }
  };
  return ret
}

fileutil.readJSON = function(filePath) {
  return JSON.parse(fileutil.read(filePath))
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
  return path.substring(root.length)
}
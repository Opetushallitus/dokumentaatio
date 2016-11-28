#!/usr/bin/env node
"use strict";

// shows which directories contain project_info.json files

var workDir = process.argv[2];

if(!workDir) {
  console.log("Please define work directory")
  process.exit(1);
}

var util = require('./static/util.js')
var fileutil = require('./lib/fileutil.js')
var scan = require('./lib/scan.js')

fileutil.globFileTree(workDir, "*", function (err, dirTree) {
  fileutil.fileTree(workDir, function (err, fileTree) {
    var projectInfoFiles = fileTree.filesBySuffix(scan.supportedFileSuffixes);
    var dirsWithProjectInfoFiles = util.groupBy(projectInfoFiles, function (path) {
      return path.split("/")[0]
    });
    var dirsWithInfoFiles = Object.keys(dirsWithProjectInfoFiles)
    var dirsWithoutInfoFiles = dirTree.files.filter(function (dir) {
      return dirsWithInfoFiles.indexOf(dir) === -1
    })
    console.log("Dirs without project info files ["+dirsWithoutInfoFiles.length+"]: " + dirsWithoutInfoFiles.join(" "))
    console.log("Dirs with project info files ["+dirsWithInfoFiles.length+"]: " + dirsWithInfoFiles.join(" "))
    util.mapEachPair(dirsWithProjectInfoFiles, function (dir, list) {
      console.log(dir, ":", list.join(" "))
    })
  })
})
var xml2js = require('xml2js')
var util = require('../static/util.js')
var fileutil = require('./fileutil.js')
var Path = require('path')

var spring = {}
module.exports = spring

spring.scanForJaxUrls = function (fileTree, serverState) {
  var projectInfos = util.values(util.combineSourcesToProjectInfoMap(serverState.sources))
  projectInfos.forEach(function (projectInfo) {
    var project = projectInfo.name
    if (project && projectInfo.spring && projectInfo.spring.length > 0) {
      projectInfo.spring.forEach(function (springConfig) {
        var filePath = projectInfo.sources[0].path;
        var root = filePath
        if (!root) {
          throw "Can't resolve root directory for " + JSON.stringify(projectInfo)
        }
        function resolveFullPath(filePath) {
          return Path.join(serverState.workDir, Path.dirname(root), filePath)
        }
        function resolveProjectPath(filePath) {
          return Path.join(Path.dirname(root), filePath)
        }
        var properties = {}
        var propertyPaths = []
        util.flatten(springConfig.properties || [])
          .forEach(function (filePath) {
            propertyPaths.push(resolveProjectPath(filePath))
            util.copyMap(fileutil.readProperties(resolveFullPath(filePath)), properties)
          })
        util.flatten(springConfig.xml || [])
          .forEach(function (filePath) {
            var sourceFiles = []
            sourceFiles.push(resolveProjectPath(filePath))
            var originalFileContent = spring.createUrlPropertiesForJax(resolveFullPath(filePath), properties, fileTree.createFileLookupFn(), serverState, sourceFiles)
            var parsedProperties = fileutil.parseProperties(originalFileContent)
            var source = {
              name: project,
              properties: parsedProperties,
              sources: propertyPaths.concat(sourceFiles).map(function (path) {
                return {
                  path: path
                }
              })
            };
            serverState.sources.push(source)
          })
      })
    }
  })
}

spring.createUrlPropertiesForJax = function (springXmlPath, properties, fileLookupFn, serverState, sourceFiles) {
  var xml = parseXmlFile(springXmlPath)
  if (xml) {
    function parseXmlClientDef(client) {
      var attrs = client["$"];
      if (attrs) {
        var baseUrl = attrs["address"]
        var serviceClass = attrs["serviceClass"]
        var urlDefinitions = {}
        return resolveJavaAnnotations(serviceClass, baseUrl, properties, fileLookupFn, urlDefinitions, serverState, sourceFiles)
      } else {
        return []
      }
    }

    return util.flatten([collectTagsRecursively("jaxrs-client:client", xml).map(parseXmlClientDef),
      collectTagsRecursively("jaxws:client", xml).map(parseXmlClientDef)]).join("\n")
  }
}

function resolveJavaAnnotations(serviceClass, baseUrl, properties, fileLookupFn, urlDefinitions, serverState, sourceFiles) {
  var classNameArr = serviceClass.split(".");
  var className = classNameArr.pop()
  var package = classNameArr.join(".")
  var found = []
  var str = []
  var classFiles = fileLookupFn(className + ".java") || []
  classFiles.forEach(function (classFilePath) {
    sourceFiles.push(fileutil.removeRootPath(classFilePath, serverState.workDir))
    var fileStr = fileutil.read(classFilePath)
    if (fileStr.indexOf(package) > -1) {
      if (found.length != 0) {
        throw "Already found " + found.join(", ") + " for " + serviceClass + " Has configuration also in " + classFilePath
      }
      found.push(classFilePath)
      str = str.concat(convertAnnotationsToUrlProperties(serviceClass, classFilePath, baseUrl, fileStr, properties, urlDefinitions))
    }
  })
  if (found.length == 0) {
    var error = "Could not find matching file for " + serviceClass
    if (classFiles.length > 0) {
      error = "Could not find definition for " + serviceClass + " from " + classFiles.join(", ")
    }
    error = error + " Creating a key for the baseUrl " + baseUrl
    serverState.scanInfo.errors.push(error)
    var fullPath = util.resolvePropertyReferences(baseUrl, properties)
    var key = util.resolveKeyForRelativeUrl(fullPath)
    str.push("# " + error)
    str.push(key + "=" + fullPath)
  }
  return str
}

function convertAnnotationsToUrlProperties(serviceClass, classFilePath, baseUrl, fileStr, properties, urlDefinitions) {
  var arr = []
  arr.push("# " + serviceClass + " (from: " + classFilePath + ")")
  var indexOfFirstOpenCurly = fileStr.indexOf("{")
  var header = fileStr.slice(0, indexOfFirstOpenCurly)
  var body = fileStr.slice(indexOfFirstOpenCurly, fileStr.length)
  var headerPaths = collectPathAnnotations(header)
  var bodyPaths = collectPathAnnotations(body)
  if (headerPaths.length > 1) {
    throw classFilePath + " has more than one path in header part: " + headerPaths
  }
  var pathPrefix = headerPaths[0] || ""
  bodyPaths.forEach(function (pathString) {
    var unresolvedPath = Path.join(baseUrl, pathPrefix, pathString);
    var fullPath = util.resolvePropertyReferences(unresolvedPath, properties)
    var key = util.resolveKeyForRelativeUrl(fullPath)
    if (urlDefinitions[key]) {
      if (urlDefinitions[key] != fullPath) {
        throw "Key " + key + " has been defined to be " + urlDefinitions[key] + " but " + classFilePath + " contains path " + fullPath
      }
    } else {
      urlDefinitions[key] = fullPath
      arr.push(key + "=" + fullPath)
    }
  })
  return arr
}

function collectPathAnnotations(str) {
  var ret = []
  var re = /@Path\("([^"]*)"\)/g;
  var m;
  while (m = re.exec(str)) {
    ret.push(m[1]);
  }
  return ret;
}

function parseXmlFile(xmlPath) {
  var ret, retErr;
  new xml2js.Parser({
    normalizeTags: true,
    explicitChildren: true,
    preserveChildrenOrder: true,
    explicitRoot: false
  }).parseString(fileutil.read(xmlPath), function (err, result) {
    retErr = err;
    ret = result;
  });
  if (retErr) {
    throw retErr
  }
  return ret;
}

// depth first recursive search
function collectTagsRecursively(tagName, o) {
  var list = []
  if (o["#name"] == tagName) {
    list.push(o)
  }
  if (o["$$"]) {
    o["$$"].forEach(function (i) {
      list = list.concat(collectTagsRecursively(tagName, i))
    })
  }
  return list
}

var xml2js = require('xml2js')
var util = require('../static/util.js')
var fileutil = require('./fileutil.js')
var path = require('path')

var spring = {}
module.exports = spring

spring.scanForJaxUrls = function (fileTree, serverState) {
  var projectInfos = util.values(util.combineSourcesToProjectInfoMap(serverState.sources))
  processProjectInfoList(projectInfos, serverState, fileTree.createFileLookupFn())
}

function processProjectInfoList(list, serverState, fileLookupFn, pathRoot) {
  list.forEach(function (projectInfo) {
    var project = projectInfo.name
    if(project && projectInfo.spring && projectInfo.spring.length > 0) {
      projectInfo.spring.forEach(function (springConfig) {
        var filePath = projectInfo.sources[0].path;
        var root = filePath || pathRoot
        if(!root) {
          throw "Can't resolve root directory for " + JSON.stringify(projectInfo)
        }
        function relativePath(filePath) {
          return path.join(path.dirname(root), filePath)
        }
        var properties = {}
        util.flatten(springConfig.properties || [])
          .map(relativePath)
          .forEach(function (props) {
            util.copyMap(fileutil.readProperties(props), properties)
          })
        util.flatten(springConfig.xml || [])
          .map(relativePath)
          .forEach(function (xmlPath) {
            var originalFileContent = spring.createUrlPropertiesForJax(xmlPath, properties, fileLookupFn, serverState.scanInfo)
            var parsedProperties = fileutil.parseProperties(originalFileContent)
            var source = {
              name: project,
              properties: parsedProperties,
              sources: [
                {
                  path: xmlPath
                }]
            };
            serverState.sources.push(source)
          })
      })
    }
  })
}

spring.createUrlPropertiesForJax = function(springXmlPath, properties, fileLookupFn, scanInfo) {
 var xml = parseXmlFile(springXmlPath)
  scanInfo.files.push(springXmlPath)
  if(xml) {
    function parseXmlClientDef(client) {
      var attrs = client["$"];
      if(attrs) {
        var baseUrl = attrs["address"]
        var serviceClass = attrs["serviceClass"]
        var urlDefinitions = {}
        return resolveJavaAnnotations(serviceClass, baseUrl, properties, fileLookupFn, urlDefinitions, scanInfo)
      } else {
        return []
      }
    }
    return util.flatten([collectTagsRecursively("jaxrs-client:client", xml).map(parseXmlClientDef),
    collectTagsRecursively("jaxws:client", xml).map(parseXmlClientDef)]).join("\n")
  }
}

function resolveKey(value) {
  value = util.parsePlainUrl(value);
  if(value[0] == "/") {
    value = value.slice(1, value.length)
  }
  return value.replace(/\//g,".")
}

function resolveJavaAnnotations(serviceClass, baseUrl, properties, fileLookupFn, urlDefinitions, scanInfo) {
  var classNameArr = serviceClass.split(".");
  var className = classNameArr.pop()
  var package = classNameArr.join(".")
  var found = []
  var str = []
  var classFiles = fileLookupFn(className + ".java") || []
  classFiles.forEach(function (classFilePath) {
    scanInfo.files.push(classFilePath)
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
    if(classFiles.length > 0) {
      error = "Could not find definition for " + serviceClass + " from " + classFiles.join(", ")
    }
    error = error + " Creating a key for the baseUrl " + baseUrl
    scanInfo.errors.push(error)
    var fullPath = util.resolvePropertyReferences(baseUrl, properties)
    var key=resolveKey(fullPath)
    str.push("# " + error)
    str.push( key + "=" + fullPath)
  }
  return str
}

function convertAnnotationsToUrlProperties(serviceClass, classFilePath, baseUrl, fileStr, properties, urlDefinitions) {
  var str = []
  str.push("# " + serviceClass +" (from: " + classFilePath+")")
  var indexOfFirstOpenCurly = fileStr.indexOf("{")
  var header = fileStr.slice(0, indexOfFirstOpenCurly)
  var body = fileStr.slice(indexOfFirstOpenCurly, fileStr.length)
  var headerPaths = collectPaths(header)
  var bodyPaths = collectPaths(body)
  if (headerPaths.length > 1) {
    throw classFilePath +" has more than one path in header part: " + headerPaths
  }
  var pathPrefix = headerPaths[0] || ""
  bodyPaths.forEach(function(pathString){
    var unresolvedPath = path.join(baseUrl, pathPrefix, pathString);
    var fullPath = util.resolvePropertyReferences(unresolvedPath, properties)
    var key=resolveKey(fullPath)
    if(urlDefinitions[key]) {
      if (urlDefinitions[key] != fullPath) {
        throw "Key " + key + " has been defined to be " + urlDefinitions[key] + " but " + classFilePath + " contains path " + fullPath
      }
    } else {
      urlDefinitions[key] = fullPath
      str.push(key + "=" + fullPath)
    }
  })
  return str
}

function collectPaths(str) {
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
  if(retErr) {
    throw retErr
  }
  return ret;
}

// depth first recursive search
function collectTagsRecursively(tagName, o) {
  var list = []
  if(o["#name"] == tagName) {
    list.push(o)
  }
  if(o["$$"]) {
    o["$$"].forEach(function (i) {
      list = list.concat(collectTagsRecursively(tagName, i))
    })
  }
  return list
}

function exportUtil(module, window) {
  var util = {}
  if(module) {
    module.exports = util
  }
  if(window) {
    window.util = util
  }

util.arrToLowerCase=function(array) {
  return array.map(function (txt) {
    return txt.toLowerCase();
  })
}

util.someMatches = function(arr, subs, caseSensitive) {
  if(!caseSensitive) {
    arr = util.arrToLowerCase(arr)
    subs = util.arrToLowerCase(subs)
  }
  return arr.some && arr.some(function(str){
      return subs.some(function(substring) {
        return str.indexOf(substring) > -1
      })
    })
}

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

// flattens nested map by concatenating keys with commas
// {test: {map: {key: value}}} -> {"test.map.key": value}
// note: supports only strings or maps as values
  util.flattenNested=function(obj, dest, keyprefix) {
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
        util.flattenNested(val, dest, newkey)
      }
    })
    return dest
  }

  util.safeGet = function (o, path, defaultValue) {
    if(!o) {
      return defaultValue
    }
    if(o.hasOwnProperty(path)) {
      return o[path]
    } else {
      var arr = path.split(".")
      if(arr.length == 1) {
        return defaultValue
      }
      var firstArg = arr.shift()
      if(o.hasOwnProperty(firstArg)) {
        return util.safeGet(o[firstArg], arr.join("."), defaultValue)
      } else {
        return defaultValue
      }
    }
  }

  util.safeCollect = function(list, key, defaultValue) {
    return list.map(function (o) {
      return util.safeGet(o, key, defaultValue)
    })
  }

  util.parseServiceName = function (key) {
    if (key.indexOf(".") > 0) {
      return key.substring(0, key.indexOf("."));
    }
  }

// convert url properties to project info
// collects "uses" and "service2service" information from flattened "properties"
// "service2service" groups properties by {"thisProject.destProject": ["key=value"]}
  util.convertUrlPropertiesToProjectInfo = function (urlProperties, showHidden) {
    return Object.keys(urlProperties).map(function (project) {
      var s2sInfo = {}
      var urlPropertyInfo = urlProperties[project];
      var properties = urlPropertyInfo.properties
      var usedServices = []
      Object.keys(properties).forEach(function (key) {
        var destService = util.parseServiceName(key);
        // ignore keys without .
        if (destService) {
          var s2sKey = project + "." + destService;
          s2sInfo[s2sKey] = (s2sInfo[s2sKey] || [])
          s2sInfo[s2sKey].push(key + "=" + properties[key])
          usedServices.push(destService)
        }
      })
      if (showHidden && urlPropertyInfo.includes) {
        usedServices = usedServices.concat(urlPropertyInfo.includes)
      }
      return util.copyMap(urlPropertyInfo, {
        uses: util.uniq(usedServices).join(" "),
        service2service: s2sInfo
      })
    })
  }

// walks through the projectInfoList and collects information that is used to generate the graph
  util.createGraphInfoFromProjectInfos = function (projectInfoList, showHidden) {
    var allData = {
      // use information, by project.name
      uses: {}, used_by: {},
      // list of project.names
      items: [],
      // maps for project.name's id in items
      id_name_map: {}, name_id_map: {},
      // lists each myProject.destProject dependency and the original property value {"thisProject.destProject": ["key=value"]}
      service2service: {},
      // project_info list in map, key = project.name
      project_infos: {},
      // list of all urls and their uses: {project: "", url: "", count: 20, uses: [{project: "", key: "", original_url: ""}]}
      url_uses: []
    };

    function collectUrlUse(projectInfoList) {
      var urlUseLookup = {}
      var urlUsesList = []

      function addUrl(destService, plainUrl, userProject, userKey, originalUrl) {
        var lookupKey = destService + "." + plainUrl
        if (!urlUseLookup[lookupKey]) {
          urlUsesList.push(urlUseLookup[lookupKey] = {
            project: destService,
            url: plainUrl,
            count: 0,
            uses: []
          })
        }
        var info = urlUseLookup[lookupKey]
        info.count = info.count + 1
        info.uses.push({project: userProject, key: userKey, original_url: originalUrl})
      }

      function parsePlainUrl(url) {
        if (url.indexOf("?") > 0) {
          url = url.substring(0, url.indexOf("?"));
        }
        if (url.indexOf("${") == 0) {
          url = url.substring(url.indexOf("}") + 1)
        }
        return url;
      }

      projectInfoList.forEach(function (projectInfo) {
        var properties = projectInfo.properties
        Object.keys(properties).forEach(function (userKey) {
          var destService = util.parseServiceName(userKey)
          if (destService) {
            var originalUrl = properties[userKey]
            var plainUrl = parsePlainUrl(originalUrl)
            addUrl(destService, plainUrl, projectInfo.name, userKey, originalUrl)
          }
        })
      })
      return urlUsesList
    }

    function add(projectInfo) {
      if (projectInfo.uses && projectInfo.name) {
        var name = projectInfo.name
        var usedServicesAsArr = projectInfo.uses.split(" ");
        allData.uses[name] = usedServicesAsArr
        allData.items.push(name)
        usedServicesAsArr.forEach(function (u) {
          allData.items.push(u)
          if (!allData.used_by[u]) {
            allData.used_by[u] = []
          }
          allData.used_by[u].push(name)
        })
        util.copyMap(projectInfo.service2service || {}, allData.service2service)
      }
    }

    // add information from every projectInfo and go through projectInfo.projects
    projectInfoList.forEach(function (projectInfo) {
      add(projectInfo);
      (projectInfo["projects"] || []).forEach(add)
      allData.project_infos[projectInfo.name] = projectInfo
    });
    function itemIsVisible(project_infos, showHidden) {
      return function (name) {
        return showHidden || "library" != util.safeGet(project_infos, name + ".type")
      }
    }

    allData.items = util.uniq(allData.items).filter(itemIsVisible(allData.project_infos, showHidden))
    allData.items.forEach(function (name, index) {
      allData.id_name_map[index] = name
      allData.name_id_map[name] = index
    })

    allData.url_uses = collectUrlUse(projectInfoList)
    return allData
  }

// generates map for showing the project info table
// {fields: ["name","makeFile"], project_infos:[{name: "Test", makeFile: "Yes"}]}
  util.generateProjectInfoTable = function (projectInfos) {
    var fields = [];
    projectInfos.forEach(function (i) {
      fields = fields.concat(Object.keys(i))
    })
    return {
      project_infos: projectInfos,
      fields: util.uniq(fields)
    }
  }
}
if(typeof window === 'undefined') {
  exportUtil(module)
} else {
  exportUtil(undefined, window)
}
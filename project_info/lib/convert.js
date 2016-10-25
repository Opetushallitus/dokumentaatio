var convert = {}

module.exports = convert

function parseServiceName(key) {
  if(key.indexOf(".") > 0) {
    return key.substring(0,key.indexOf("."));
  }
}

function copyMap(from, target) {
  Object.keys(from).forEach(function(key){
    target[key]=from[key];
  })
  return target
}

// convert url properties to project info
// collects "uses" and "service2service" information from flattened "properties"
// "service2service" groups properties by {"thisProject.destProject": ["key=value"]}
convert.appendUsesAndS2SInfoToUrlProperties = function (urlProperties) {
  return Object.keys(urlProperties).map(function(project){
    var s2sInfo = {}
    var urlPropertyInfo = urlProperties[project];
    var properties = urlPropertyInfo.properties
    var usedServices = []
    Object.keys(properties).forEach(function(key) {
      var destService = parseServiceName(key);
      // ignore keys without .
      if(destService) {
        var s2sKey = project + "." + destService;
        s2sInfo[s2sKey] = (s2sInfo[s2sKey] || [])
        s2sInfo[s2sKey].push(key + "=" + properties[key])
        usedServices.push(destService)
      }
    })
    return copyMap(urlPropertyInfo, {
      uses: convert.uniq(usedServices).join(" "),
      service2service: s2sInfo
    })
  })
}

// walks through the projectInfoList and collects information that is used to generate the graph
convert.createGraphInfoFromProjectInfos = function(projectInfoList) {
  var allData = {
    // use information, by project.name
    uses : {}, used_by : {},
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
      if(!urlUseLookup[lookupKey]) {
        urlUsesList.push(urlUseLookup[lookupKey]={
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
      if(url.indexOf("?") > 0) {
        url = url.substring(0,url.indexOf("?"));
      }
      if(url.indexOf("${") == 0) {
        url = url.substring(url.indexOf("}")+1)
      }
      return url;
    }
    projectInfoList.forEach(function (projectInfo) {
      var properties = projectInfo.properties
      Object.keys(properties).forEach(function (userKey) {
        var destService = parseServiceName(userKey)
        if(destService) {
          var originalUrl = properties[userKey]
          var plainUrl = parsePlainUrl(originalUrl)
          addUrl(destService, plainUrl, projectInfo.name, userKey, originalUrl)
        }
      })
    })
    return urlUsesList
  }

  function add(projectInfo) {
    if(projectInfo.uses && projectInfo.name) {
      var name = projectInfo.name
      var usedServicesAsArr = projectInfo.uses.split(" ");
      allData.uses[name] = usedServicesAsArr
      allData.items.push(name)
      usedServicesAsArr.forEach(function(u){
        allData.items.push(u)
        if(!allData.used_by[u]) {
          allData.used_by[u] = []
        }
        allData.used_by[u].push(name)
      })
      copyMap(projectInfo.service2service || {}, allData.service2service)
    }
  }

  // add information from every projectInfo and go through projectInfo.projects
  projectInfoList.forEach(function(projectInfo){
    add(projectInfo);
    (projectInfo["projects"] || []).forEach(add)
    allData.project_infos[projectInfo.name]=projectInfo
  });
  allData.items = convert.uniq(allData.items)
  allData.items.forEach(function(name, index){
    allData.id_name_map[index]=name
    allData.name_id_map[name]=index
  })

  allData.url_uses = collectUrlUse(projectInfoList)
  return allData
}

// generates map for showing the project info table
// {fields: ["name","makeFile"], project_infos:[{name: "Test", makeFile: "Yes"}]}
convert.generateProjectInfoTable = function(projectInfos) {
  var fields = [];
  projectInfos.forEach(function(i){
    fields = fields.concat(Object.keys(i))
  })
  return {
    project_infos: projectInfos,
    fields: convert.uniq(fields)
  }
}

convert.uniq = function(arr) {
  return arr.reverse().filter(function (e, i, arr) {
    return arr.indexOf(e, i+1) === -1;
  }).reverse();
}

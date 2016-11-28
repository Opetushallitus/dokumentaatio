var assert = require('assert');
var scan = require('../lib/scan.js')
var util = require('../static/util.js')
var spring = require('../lib/spring-support.js')

describe("util.js", function () {
  it('uniq', function () {
    assert.deepEqual(util.uniq([1, 1, 3]), [1, 3])
  })
  it('safeGet', function () {
    assert.equal(util.safeGet({a: 1}, "a"), 1)
    assert.equal(util.safeGet({a: 1}, "b"), undefined)
    assert.equal(util.safeGet({a: 1}, "b", "2"), "2")
    assert.equal(util.safeGet({b: {a: 1}}, "b.a"), 1)
    assert.equal(util.safeGet({"b.a": 1}, "b.a"), 1)
  })

  it('flattenNested', function () {
    assert.deepEqual(util.flattenNested({test: {map: {key: 1}}}), {"test.map.key": 1})
    assert.deepEqual(util.flattenNested({}), {})
    assert.deepEqual(util.flattenNested([]), {})
    assert.deepEqual(util.flattenNested([{}]), {})
    assert.deepEqual(util.flattenNested({a: 1}), {a: 1})
    assert.deepEqual(util.flattenNested([{a: 1}, {b: 2}]), {a: 1, b: 2})
    assert.deepEqual(util.flattenNested([{a: {b: 1}}]), {"a.b": 1})
    assert.deepEqual(util.flattenNested({a: [{b: 1}, {c: 2}]}), {"a.b": 1, "a.c": 2})
    assert.deepEqual(util.flattenNested({a: [{b: 1}, [{c: 2}, {d: 3}]]}), {"a.b": 1, "a.c": 2, "a.d": 3})
  })

  it('safeCollect', function () {
    assert.deepEqual(util.safeCollect({}, "a"), [])
    assert.deepEqual(util.safeCollect([], "a"), [])
    assert.deepEqual(util.safeCollect([[]], "a"), [])
    assert.deepEqual(util.safeCollect([[{}]], "a"), [])
    assert.deepEqual(util.safeCollect({a: 1}, "a"), [1])
    assert.deepEqual(util.safeCollect({a: 1, b: 2, ab: 3}, "a*"), [1, 3])
    assert.deepEqual(util.safeCollect([{a: 1}, {a: 2}], "a"), [1, 2])
    assert.deepEqual(util.safeCollect([[{a: 1}]], "a"), [1])
    assert.deepEqual(util.safeCollect([{b: {a: 1}}], "a"), [])
    assert.deepEqual(util.safeCollect([{b: {a: 1}}], "*.a"), [1])
    assert.deepEqual(util.safeCollect([{c: {b: {a: 1}}}], "*.a"), [])
    assert.deepEqual(util.safeCollect([{c: {b: {a: 1}}}], "**.a"), [1])
    assert.deepEqual(util.safeCollect([{b: {a: 1}}], "**.a"), [1])
    assert.deepEqual(util.safeCollect([{b: [{a: 1}]}], "**.a"), [1])
  })
})

describe('util.js', function () {

  it('generateProjectInfoTable', function () {
    assert.deepEqual(util.generateProjectInfoTable([{
      "a": 1, "b": 2
    }, {
      "a": 1, "c": 2
    }]), {
      project_infos: [{a: 1, b: 2}, {a: 1, c: 2}],
      fields: ['a', 'b', 'c']
    })
  })

  it('collectProjectInfoSummary', function () {
    var projectInfoMap = {
      a: {
        name: "a",
        properties: {
          "b.url": "1"
        },
        includes: ["c"]
      },
      b: {
        name: "b",
        properties: {
          "a.url": "1"
        }
      }, c: {
        name: "c",
        includes: ["d"],
        properties: {
          "b.url2": "2"
        }
      }, d: {
        name: "d",
        properties: {
          "b.url3": "3"
        }
      }
    };
    assert.deepEqual(util.collectProjectInfoSummary(projectInfoMap), {
        "uses": {
          "a": ["b"],
          "b": ["a"],
          "c": ["b"],
          "d": ["b"]
        },
        "used_by": {"b": ["a", "c", "d"], "a": ["b"]},
        "resolved_includes": {"a": {"c": [["a", "c"]], "d": [["a", "c", "d"]]}, "c": {"d": [["c", "d"]]}},
        "included_by": {"c": ["a"], "d": ["a", "c"]},
        "items": ["a", "b", "c", "d"],
        "id_name_map": {"0": "a", "1": "b", "2": "c", "3": "d"},
        "name_id_map": {"a": 0, "b": 1, "c": 2, "d": 3},
        "service2service": {"a.b": {"b.url": "1"}, "b.a": {"a.url": "1"}, "c.b": {"b.url2": "2"}, "d.b": {"b.url3": "3"}}
      }
    )
  })

  it('createGraphInfoFromProjectInfos', function () {
    var projectInfoMap = {
      a: {
        name: "a",
        properties: {
          "b.url": "1"
        }
      },
      b: {
        name: "b",
        properties: {
          "a.url": "1"
        }
      }
    };
    assert.deepEqual(util.collectProjectInfoSummary(projectInfoMap), {
      "uses": {"a": ["b"], "b": ["a"]},
      "used_by": {"b": ["a"], "a": ["b"]},
      "resolved_includes": {},
      "included_by": {},
      "items": ["a", "b"],
      "id_name_map": {"0": "a", "1": "b"},
      "name_id_map": {"a": 0, "b": 1},
      "service2service": {"a.b": {"b.url": "1"}, "b.a": {"a.url": "1"}}
    })
  })
  it('collectUrlUse', function () {
    var projectInfoMap = {
      a: {
        name: "a",
        properties: {
          "b.url": "1"
        }
      },
      b: {
        name: "b",
        properties: {
          "a.url": "1"
        }
      }
    };
    assert.deepEqual(util.collectUrlUse(projectInfoMap), [{
      "project": "b",
      "url": "1",
      "count": 1,
      "uses": [{"project": "a", "key": "b.url", "original_url": "1"}]
    }, {
      "project": "a",
      "url": "1",
      "count": 1,
      "uses": [{"project": "b", "key": "a.url", "original_url": "1"}]
    }])
  })

})

describe("spring-support.js", function () {
  it('spring.scanForJaxUrls', function (done) {
    var serverState = {workDir: __dirname + "/spring"}
    scan.scan(serverState, function () {
      delete serverState.scanInfo.duration
      delete serverState.scanInfo.start
      assert.deepEqual(serverState, {
        "workDir": __dirname + "/spring",
        "scanInfo": {
          "files": ["project_info.json", "spring-test.xml", "ViestintapalveluResource.java"],
          "errors": []
        },
        "sources": [{
          "name": "viestintapalvelu",
          "type": "jar",
          "spring": {"xml": "spring-test.xml", "properties": "spring.properties"},
          "projects": [{
            "name": "koulutusinformaatio-web",
            "uses": "viestintapalvelu-rest oppija-raamit"
          }, {"name": "koulutusinformaatio-rest", "uses": ""}],
          "sources": [{"path": "project_info.json"}]
        }, {
          "name": "viestintapalvelu",
          "properties": {
            "viestintapalvelu.foo.bar.api.v1.addresslabel.sync.pdf": "https://{{host_virkailija}}/viestintapalvelu/foo/bar/api/v1/addresslabel/sync/pdf",
            "viestintapalvelu.foo.bar.api.v1.template.getHistory": "https://{{host_virkailija}}/viestintapalvelu/foo/bar/api/v1/template/getHistory"
          },
          "sources": [{"path": "spring-test.xml"}]
        }]
      })
      done()
    })
  })
})

describe("scan.js", function () {
  it('should scan both project_info.json and url properties', function (done) {
    var workDir = __dirname + "/project_info_and_url_properties";
    var serverState = {workDir: workDir}
    scan.scan(serverState, function () {
      delete serverState.scanInfo.duration
      delete serverState.scanInfo.start
      assert.deepEqual(serverState, {
        "workDir": __dirname + "/project_info_and_url_properties",
        "scanInfo": {
          "errors": [],
          "files": [
            "project_info.json",
            "koodisto-client-url.properties"
          ]
        },
        "sources": [
          {
            "name": "koodisto-client",
            "sources": [
              {
                "path": "project_info.json"
              }
            ],
            "type": "library"
          },
          {
            "name": "koodisto-client",
            "properties": {
              "koodisto-service.getKoodistoRyhmas": "/koodisto-service/rest/json"
            },
            "sources": [
              {
                "content": "koodisto-service.getKoodistoRyhmas=/koodisto-service/rest/json\n",
                "path": "koodisto-client-url.properties"
              }
            ]
          }
        ]
      })
      done()
    })
  })
})

describe('util.combineSourcesToProjectInfoMap', function () {
  it('should merge project_info and json', function () {
    assert.deepEqual(util.combineSourcesToProjectInfoMap([{
      name: "a",
      uses: [1, 2],
      properties: {
        e: 9
      },
      projects: [{
        name: "b",
        uses: ["a", "c"]
      }]
    }, {
      name: "a",
      includes: "b",
      uses: [3, 4],
      properties: {
        f: 10
      }
    }]), {
      "a": {
        "name": "a",
        "uses": [1, 2, 3, 4],
        "properties": {"e": 9, "f": 10},
        "projects": [{"name": "b", "uses": ["a", "c"]}],
        "includes": ["b"]
      }, "b": {"name": "b", "uses": ["a", "c"]}
    })
  })
})

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

  it('appendUsesAndS2SInfoToUrlProperties', function () {
    assert.deepEqual(util.convertUrlPropertiesToProjectInfo({
        a: {
          name: "a",
          properties: {
            "b.url": 1
          }
        },
        b: {
          name: "b",
          properties: {
            "a.url": 1
          }
        }
      }), [{
        "name": "a",
        "properties": {
          "b.url": 1
        },
        "service2service": {
          "a.b": [
            "b.url=1"
          ]
        },
        "uses": "b"
      },
        {
          "name": "b",
          "properties": {
            "a.url": 1
          },
          "service2service": {
            "b.a": [
              "a.url=1"
            ]
          },
          "uses": "a"
        }]
    )
  })

  it('createGraphInfoFromProjectInfos', function () {
    var projectInfoList = util.convertUrlPropertiesToProjectInfo({
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
    });
    assert.deepEqual(util.createGraphInfoFromProjectInfos(projectInfoList), {
      "uses": {"a": ["b"], "b": ["a"]},
      "used_by": {"b": ["a"], "a": ["b"]},
      "items": ["a", "b"],
      "id_name_map": {"0": "a", "1": "b"},
      "name_id_map": {"a": 0, "b": 1},
      "service2service": {"a.b": ["b.url=1"], "b.a": ["a.url=1"]},
      "project_infos": {
        "a": {
          "uses": "b",
          "service2service": {"a.b": ["b.url=1"]},
          "name": "a",
          "properties": {"b.url": "1"}
        }, "b": {
          "uses": "a",
          "service2service": {"b.a": ["a.url=1"]},
          "name": "b",
          "properties": {"a.url": "1"}
        }
      },
      "url_uses": [{
        "project": "b",
        "url": "1",
        "count": 1,
        "uses": [{"project": "a", "key": "b.url", "original_url": "1"}]
      }, {
        "project": "a",
        "url": "1",
        "count": 1,
        "uses": [{"project": "b", "key": "a.url", "original_url": "1"}]
      }]
    })
  })

})

describe("spring-support.js", function () {
  it('spring.scanForJaxUrls', function (done) {
    var serverState = {workDir: __dirname + "/spring"}
    scan.scan(serverState, function () {
      assert.deepEqual(serverState.urlProperties.viestintapalvelu.type, "jar")
      assert.deepEqual(serverState.urlProperties.viestintapalvelu.properties, {
        "viestintapalvelu.foo.bar.api.v1.addresslabel.sync.pdf": "https://{{host_virkailija}}/viestintapalvelu/foo/bar/api/v1/addresslabel/sync/pdf",
        "viestintapalvelu.foo.bar.api.v1.template.getHistory": "https://{{host_virkailija}}/viestintapalvelu/foo/bar/api/v1/template/getHistory"
      })
      done()
    })
  })
})
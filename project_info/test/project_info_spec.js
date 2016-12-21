var assert = require('assert');
var scan = require('../lib/scan.js')
var util = require('../static/util.js')
var spring = require('../lib/spring-support.js')

function logJson(o) {
    console.log(JSON.stringify(o))
}

function logJsonPretty(o) {
    console.log(JSON.stringify(o, null, 2))
}

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
        assert.deepEqual(util.flattenNested([
            {
                "links": [
                    {
                        "href": "/org-ui/"
                    },
                    {
                        "href": "/addr/#/"
                    }
                ]
            },
            {
                "links": [
                    {
                        "href": "/auth/html/request"
                    }
                ]
            },
            {
                "href": "/tuai/",
            }
        ], true), {
            'links.href': ['/org-ui/', '/addr/#/', '/auth/html/request'],
            href: ['/tuai/']
        })
    })

    it('safeCollect', function () {
        assert.deepEqual(util.safeCollect({}, "a"), [])
        assert.deepEqual(util.safeCollect([], "a"), [])
        assert.deepEqual(util.safeCollect([[]], "a"), [])
        assert.deepEqual(util.safeCollect([[{}]], "a"), [])
        assert.deepEqual(util.safeCollect({b: 2}, "a"), [])
        assert.deepEqual(util.safeCollect([], "a"), [])
        assert.deepEqual(util.safeCollect([[]], "a"), [])
        assert.deepEqual(util.safeCollect([[{b: 2}]], "a"), [])
        assert.deepEqual(util.safeCollect({a: 1, b: 2}, "a"), [1])
        assert.deepEqual(util.safeCollect({a: 1, b: 2}, "**.a"), [1])
        assert.deepEqual(util.safeCollect({a: 1, b: 2, ab: 3}, "a*"), [1, 3])
        assert.deepEqual(util.safeCollect([{a: 1, b: 2}, {a: 2, b: 2}], "a"), [1, 2])
        assert.deepEqual(util.safeCollect([[{a: 1, b: 2}]], "a"), [1])
        assert.deepEqual(util.safeCollect([{b: {a: 1, b: 2}}], "a"), [])
        assert.deepEqual(util.safeCollect([{b: {a: 1, b: 2}}], "*.a"), [1])
        assert.deepEqual(util.safeCollect([{c: {b: {a: 1, b: 2}}}], "*.a"), [])
        assert.deepEqual(util.safeCollect([{c: {b: {a: 1, b: 2}}}], "**.a"), [1])
        assert.deepEqual(util.safeCollect([{b: {a: 1, b: 2}}], "**.a"), [1])
        assert.deepEqual(util.safeCollect([{b: [{a: 1, b: 2}]}], "**.a"), [1])
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
            "direct_uses_from_includes": {},
            "items": ["a", "b"],
            "items_by_type": {
                "project": ["a", "b"]
            },
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
                    "dirsWithProjectInfoFiles": {
                        "project_info.json": [
                            "project_info.json"
                        ]
                    },
                    "dirsWithoutInfoFiles": [
                        "spring-test.xml",
                        "spring.properties",
                        "ViestintapalveluResource.java"
                    ],
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
                    "sources": [
                        {"path": "spring.properties"},
                        {"path": "spring-test.xml"},
                        {"path": "ViestintapalveluResource.java"}]
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
                    "dirsWithProjectInfoFiles": {
                        "koodisto-client-url.properties": [
                            "koodisto-client-url.properties"
                        ],
                        "project_info.json": [
                            "project_info.json"
                        ]
                    },
                    "dirsWithoutInfoFiles": []
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

    it("should scan url-config configs", function (done) {
        var workDir = __dirname + "/url-config";
        var serverState = {workDir: workDir}
        scan.scan(serverState, function () {
            delete serverState.scanInfo.duration
            delete serverState.scanInfo.start
            delete serverState.sources[1].sources[0].content
            assert.deepEqual(serverState.sources[1], {
                    "name": "virkailija-raamit",
                    "properties": {
                        "org-ui.": "/org-ui/",
                        "addr.#.": "/addr/#/",
                        "auth.html.request": "/auth/html/request",
                        "tuai.": "/tuai/"
                    },
                    "sources": [
                        {
                            "path": "data/data.json"
                        }
                    ]
                }
            )
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
        }, {}]), {
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

describe('util.collectProjectInfoSummary', function () {
    it('should generate summary from projectInfoMap', function () {
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
                },
                type: "library"
            }, e: {
                name: "e",
                uses: ["a"]
            }
        };
        assert.deepEqual(util.collectProjectInfoSummary(projectInfoMap), {
                "uses": {
                    "a": ["b"],
                    "b": ["a"],
                    "c": ["b"],
                    "d": ["b"],
                    "e": ["a"]
                },
                "used_by": {"b": ["a", "c", "d"], "a": ["b", "e"]},
                "resolved_includes": {"a": {"c": [["a", "c"]], "d": [["a", "c", "d"]]}, "c": {"d": [["c", "d"]]}},
                "included_by": {"c": ["a"], "d": ["a", "c"]},
                "direct_uses_from_includes": {
                    "a": {"b": [["a", "c", "b"], ["a", "c", "d", "b"]]},
                    "c": {"b": [["c", "d", "b"]]}
                },
                "items": ["a", "b", "c", "d", "e"],
                "items_by_type": {"project": ["a", "b", "c", "e"], "library": ["d"]},
                "service2service": {
                    "a.b": {"b.url": "1"},
                    "b.a": {"a.url": "1"},
                    "c.b": {"b.url2": "2"},
                    "d.b": {"b.url3": "3"},
                    "e.a": {}
                }
            }
        )
    })
    it('should handle missing deps', function () {
        var projectInfoMap = {
            a: {
                name: "a",
                properties: {
                    "b.url": "1"
                },
                includes: ["c"],
                uses: ["d"]
            }
        };
        assert.deepEqual(util.collectProjectInfoSummary(projectInfoMap), {
                "uses": {"a": ["b", "d"]},
                "used_by": {"b": ["a"], "d": ["a"]},
                "resolved_includes": {"a": {"c": [["a", "c"]]}},
                "included_by": {"c": ["a"]},
                "direct_uses_from_includes": {},
                "items": ["a", "b", "c", "d"],
                "items_by_type": {"project": ["a", "b", "c", "d"]},
                "service2service": {"a.b": {"b.url": "1"}, "a.d": {}}
            }
        )
    })
    it('should handle include uses', function () {
        var projectInfoMap = {
            a: {
                name: "a",
                includes: ["b"]
            },
            b: {
                name: "b",
                includes: ["c"],
                uses: ["x"]
            },
            c: {
                name: "b",
                includes: ["d"],
                uses: ["y"]
            },
            d: {
                name: "d",
                uses: ["z"]
            }
        };
        assert.deepEqual(util.collectProjectInfoSummary(projectInfoMap), {
                "uses": {"b": ["x"], "c": ["y"], "d": ["z"]},
                "used_by": {"x": ["b"], "y": ["c"], "z": ["d"]},
                "resolved_includes": {
                    "a": {"b": [["a", "b"]], "c": [["a", "b", "c"]], "d": [["a", "b", "c", "d"]]},
                    "b": {"c": [["b", "c"]], "d": [["b", "c", "d"]]},
                    "c": {"d": [["c", "d"]]}
                },
                "included_by": {"b": ["a"], "c": ["a", "b"], "d": ["a", "b", "c"]},
                "direct_uses_from_includes": {
                    "a": {
                        "x": [["a", "b", "x"]],
                        "y": [["a", "b", "c", "y"]],
                        "z": [["a", "b", "c", "d", "z"]]
                    }, "b": {"y": [["b", "c", "y"]], "z": [["b", "c", "d", "z"]]}, "c": {"z": [["c", "d", "z"]]}
                },
                "items": ["a", "b", "c", "d", "x", "y", "z"],
                "items_by_type": {"project": ["a", "b", "c", "d", "x", "y", "z"]},
                "service2service": {"b.x": {}, "c.y": {}, "d.z": {}}
            }
        )
    })
})

describe('util.generateGraphInfo', function () {
    it('should generate graphInfo', function () {
        var sources = [
            {name: "a", properties: {"b.1": "/b/123"}, sources: [{}]}
        ]
        var projectInfoMap = util.combineSourcesToProjectInfoMap(sources)
        var summary = util.collectProjectInfoSummary(projectInfoMap)
        assert.deepEqual(util.generateGraphInfo(projectInfoMap, summary), {
                "nodes": {
                    "project": [{
                        "id": "a",
                        "hasSources": true,
                        "type": "project"
                    }, {"id": "b", "hasSources": false, "type": "project"}]
                }, "edges": {
                    "node": [{"from": "a", "id": "a.b", "to": "b", "use": true}]
                }
            }
        )
    })
    it('should show and hide libraries', function () {
        var sources = [
            {name: "a", properties: {"b.1": "/b/123"}, sources: [{}], type: "library"},
            {name: "c", includes: ["a"]}
        ]
        var projectInfoMap = util.combineSourcesToProjectInfoMap(sources)
        var summary = util.collectProjectInfoSummary(projectInfoMap)

        assert.deepEqual(util.generateGraphInfo(projectInfoMap, summary), {
                "nodes": {
                    "library": [{
                        "id": "a",
                        "hasSources": true,
                        "type": "library"
                    }],
                    "project": [{"id": "b", "hasSources": false, "type": "project"}, {
                        "id": "c",
                        "hasSources": false,
                        "type": "project"
                    }]
                },
                "edges": {
                    "library": [{"from": "a", "id": "a.b", "to": "b", "use": true}, {
                        "from": "c",
                        "id": "c.a",
                        "to": "a",
                        "include": true
                    }],
                    "directFromInclude": [{"from": "c", "id": "c.b", "to": "b", "directFromInclude": true}]
                }
            }
        )
    })
})
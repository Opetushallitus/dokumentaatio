# Running

Shows reports based on project_info.json files

    npm install && ./server.js ../..

Browse to http://localhost:20102

# Running in production

    ./restart_server.sh ../path/to/repositories

# Testing

    npm test

# Configuration in projects

### Properties in files: *.properties *.json *.js

Project info server can load properties from files based on the prefix of the filename.
Currently supported prefixes:

    "oph.properties", "url.properties", "oph.json", "oph_properties.json", "url_properties.json", "oph.js", "oph_properties.js", "url_properties.js"

note: only keys that have at least two parts and one "." character are used: service.url is included, service-url is not

### Spring Jax-WS and Jax-RS client support

JaxWs and JaxRs Spring configuration can be parsed directly from Spring config
xml files and java classes, if the source code files for the java classes are available
in the global scan directory.

The code will parse the Spring xml and resolve the serviceClass and address attributes.
serviceClass file is parsed and all @Path annotations from there are added as URLs.
Optional properties files can be included to resolve configurable values.

project_info.json

    {
      "name": "messageservice",
      "spring": {
          "xml": "src/main/resources/spring-context.xml",
          "properties": "src/main/resources/app.properties"
        }
    }

spring-context.xml

    <?xml version="1.0" encoding="UTF-8"?>
    <beans>
        <beans>
            <jaxrs-client:client id="viestintapalveluClient"
                                 name="ViestintapalveluRestClient"
                                 serviceClass="fi.valinta.kooste.viestintapalvelu.resource.ViestintapalveluResource"
                                 address="${valintalaskentakoostepalvelu.viestintapalvelu.url}"
                                 inheritHeaders="true">
            </jaxrs-client:client>
        </beans>
    </beans>

ViestintapalveluResource.java

    @Path("/api/v1")
    public interface ViestintapalveluResource {
        @POST
        @Produces(APPLICATION_OCTET_STREAM)
        @Consumes(APPLICATION_JSON)
        @Path("/addresslabel/sync/pdf")
        InputStream haeOsoitetarratSync(Osoitteet osoitteet);
    }

app.properties

    valintalaskentakoostepalvelu.viestintapalvelu.url=${host.virkailija}/viestintapalvelu/foo/bar
    host.virkailija=https://{{host_virkailija}}

### Parsing property files with url-config

project_info.json

    {
      "name": "virkailija-raamit",
      "url-config": {
        "path": "src/main/webapp/data.json",
        "values-for-key": "**.href"
      }
    }
    
data.json

    [
      {
        "requiresRole":["app_org"],
        "key":"orgs",
        "links":[
          { "key":"org-ui", "requiresRole":["app_org-ui"], "href":"/org-ui/" },
          { "key":"addr", "href":"/addr/#/", "requiresRole":["app_addr"] }
        ]
      },
      {
        "key":"system",
        "requiresRole":["app_filter","app_select"],
        "links":[
          { "key":"request", "href":"/auth/html/request", "requiresRole":["app_request"] }
        ]
      },
      { "key":"tuai", "href":"/tuai/", "requiresRole":["app_tuai"] }
    ]
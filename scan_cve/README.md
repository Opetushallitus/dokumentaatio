Scans local directory for pom.xml files and uses `mvn dependency:tree` to generate the full dependency graph.
Uses https://github.com/adedov/victims-version-search and https://github.com/victims/victims-cve-db to identify CVEs for
the dependencies.

# Usage

    ./setup.sh # downloads victims-version repos
    ./scan_jars.sh ../dir/ > jar_list.txt
    ruby jar_list_parser.rb jar_list.txt
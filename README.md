# grunt-nexus-release

> release zip artifacts to a Nexus server

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-nexus-release --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-nexus-release');
```

##Acknowledgement
This plugin is a copy of the [grunt-maven-tasks](https://github.com/smh/grunt-maven-tasks) plugin. It has been amended to more closely follow the cadence of the Java maven-release-plugin. This plugin operatates as follows:

1. Check that there are no uncommitted changes
2. Remove the -SNAPSHOT suffix from the version number.
3. Commit the version number changes, tag the code, then push.
4. Release the constructed artifact to Nexus.
5. Up the version number (patch level) and restore the -SNAPSHOT suffix.
6. Commit the version number changes, then push.

## The "nexus_release" task

### Overview
In your project's Gruntfile, add a section named `nexus_release` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  nexus_release: {
    options: {
      // Task-specific options go here.
    },
    release: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

This task packages and releases an artifact to a maven repository. It will update the version number in the package.json file to the next development version, and, if this is a git project, it will commit and tag the release.

The version number will have the `patch` number incremented.

### Overview

In your project's Gruntfile, add a section named `nexus_release` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  nexus_release: {
    options: {
      groupId: 'com.example',
      url: '<repository-url>',
    },
    src: [ '**', '!node_modules/**' ]
  }
})
```

### Options

#### options.groupId
Type: `String`
Required

The maven group id to use when deploying and artifact

#### options.artifactId
Type: `String`
Default: name found in package.json

The maven artifact id to use when deploying and artifact

#### options.version
Type: `String`
Default: version found in package.json or the file specified by options.versionFile

The version to use when deploying to the maven repository

#### options.classifier
Type: `String`
Optional

The classifier to use when deploying to the maven repository

#### options.uniqueVersion
Type: `String`
Optional

Allow to generate timestamped artifacts.

#### options.mode
Type: `String`
Default: minor

The mode passed to semver.inc to determine next development version.

#### options.packaging
Type: `String`
Default: zip

The packaging to use when deploying to the maven repository. Will also
determine the archiving type. As internally the grunt-contrib-compress
plugin is used to package the artifact, only archiving types supported
by this module is supported.

#### options.url
Type: `String`
Required

The url for the maven repository to deploy to.

#### options.repositoryId
Type: `String`
Optional

The repository id of the repository to deploy to. Used for looking up authentication in settings.xml.

#### options.type
Type: `String`
Optional

Enables you to choose a different file extension for your artifact besides .zip which is useful when using the Maven WAR-plugin

#### options.injectDestFolder
Type: `String`
Optional

Enables you to turn off the injection of destination folder inside your artifact allowing you to choose the structure you want by configuring the compress task.

#### options.destFolder
Type: `String`
Optional

Specifies the name of the folder to be injected inside the artifact. If not specified, this will be auto-generated.

#### options.branch
Type: `String`
Optional

Git branch to push the changes to. Defaults to develop

#### options.commitPrefix
Type: `String`
Optional

Prefix for the commit message when releasing.

#### options.unsecure
Type: `Boolean`
Optional

If `true`, runs maven with `-Dmaven.wagon.http.ssl.insecure=true` and `-Dmaven.wagon.http.ssl.allowall=true`

#### options.settingsXml
Type: `String`
Optional

Specifies the settings.xml file for `-s` argument.

#### options.optionalParams
Type: `Array`
Optional

Appends more optional parameters for `mvn deploy`. [optional parameters list](https://maven.apache.org/plugins/maven-deploy-plugin/deploy-mojo.html)

### Files

Files may be specified using any of the supported [Grunt file mapping formats](http://gruntjs.com/configuring-tasks#files).

### Usage Examples

#### Default Options

```js
nexus_release: {
            options: {
                groupId: 'com.example.ex',
                repositoryId: 'nexus'
            },
            release: {
                options: {
                    goal: 'release',
                    url: '<>'
                    destFolder: 'fred',
                    injectDestFolder : true
                },
                files: [
                    {
                        expand: true,
                        cwd: 'build/',
                        src: ['**'],
                        dest: 'dist/'
                    }
                ]
            }
        }

grunt.registerTask('release', [ 'clean', 'test', 'nexus_release:release' ]);
```

In order to customize the output archive, please look at the documenations for the [grunt-contrib-compress task](https://github.com/gruntjs/grunt-contrib-compress).

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
 Version | Date | Change summary
 ------|---------|--------------
 0.1.0 | April 6 2016 | initial plugin release
 0.2.0 | April 6 2016 | allowed setting of git branch

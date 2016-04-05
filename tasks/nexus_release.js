/*
 * grunt-nexus-release
 * https://github.com/TrueDub/grunt-nexus-release
 *
 * Copyright (c) 2016 Jim Gallagher
 * Licensed under the MIT license.
 */

'use strict';

var semver = require('semver');
var fs = require('fs');

module.exports = function (grunt) {

    grunt.registerMultiTask('nexus_release', 'Packages and deploys artifact to maven repo', function (version) {
        var options = this.options();

        grunt.log.writeln('Starting nexus_release');

        requireOptionProps(options, ['groupId']);

        options.goal = options.goal || this.target;
        options.commitPrefix = options.commitPrefix || '%s';

        var pkg = grunt.file.readJSON(options.versionFile || 'package.json');

        requireOptionProps(options, ['url']);
        release(this, pkg, version);

    });

    function requireOptionProps(options, props) {
        var msg = 'Verifying properties ' + grunt.log.wordlist(props) + ' exists in options...';
        grunt.verbose.write(msg);

        var failProps = props.filter(function (p) {
            return !options.hasOwnProperty(p);
        }).map(function (p) {
            return '"' + p + '"';
        });

        if (failProps.length === 0) {
            grunt.verbose.ok();
        } else {
            grunt.verbose.or.write(msg);
            grunt.log.error().error('Unable to process task.');
            throw grunt.util.error('Required options ' + failProps.join(', ') + ' missing.');
        }
    }

    function release(task, pkg, version) {
        var options = task.options({
            artifactId: pkg.name,
            packaging: pkg.packaging
        });

        options.version = version || pkg.version.substr(0, pkg.version.length - '-SNAPSHOT'.length);

        if (options.nextVersion === 'null-SNAPSHOT') {
            grunt.fail.fatal('Failed to determine next development version ' +
                'based on version (' + options.version.cyan + ') ');
        }
        options.nextVersion = semver.inc(options.version, 'patch') + '-SNAPSHOT';
        if (options.nextVersion === 'null-SNAPSHOT') {
            grunt.fail.fatal('Failed to determine next development version ' +
                'based on version (' + options.version.cyan + ') ');
        }

        if (!options.file) {
            options.file = getFileNameBase(options) + '.' + getExtension(options.packaging, options.classifier, options.type);
        }

        grunt.log.writeln('injectDestFolder:' + options.injectDestFolder + " destFolder: " + options.destFolder);
        if (typeof options.injectDestFolder === 'undefined' || options.injectDestFolder === true) {
            var fileNameBase = options.destFolder ? options.destFolder : getFileNameBase(options);
            task.files = injectDestFolder(fileNameBase, task.files);
        }
        grunt.config.set('grunt.maven.commitPrefix', options.commitPrefix);

        options.packaging = getExtension(options.packaging, options.classifier, options.type);

        grunt.config.set('maven.package.options', {archive: options.file, mode: 'zip', extension: options.packaging});
        grunt.config.set('maven.package.files', task.files);
        grunt.config.set('maven.deploy-file.options', options);
        grunt.config.set('maven.install-file.options', options);

        grunt.task.run(
            'nexus_release:gitstatus',
            'nexus_release:version:' + options.version,
            'nexus_release:gitcommit:' + '[nexus_release] release ' + options.version,
            'nexus_release:gittag:' + options.artifactId + '-' + options.version,
            'nexus_release:gitpush',
            'nexus_release:package',
            'nexus_release:deploy-file',
            'nexus_release:version:' + options.nextVersion,
            'nexus_release:gitcommit:' + '[nexus_release] prepare for next development iteration',
            'nexus_release:gitpush'
        );

    }

    grunt.registerTask('nexus_release:deploy-file', function () {
        var options = grunt.config('maven.deploy-file.options');

        var args = ['deploy:deploy-file'];
        args.push('-Dfile=' + options.file);
        args.push('-DgroupId=' + options.groupId);
        args.push('-DartifactId=' + options.artifactId);
        args.push('-Dpackaging=' + options.packaging);
        args.push('-Dversion=' + options.version);
        if (options.unsecure) {
            args.push('-Dmaven.wagon.http.ssl.insecure=' + options.unsecure);
            args.push('-Dmaven.wagon.http.ssl.allowall=' + options.unsecure);
        }
        if (options.classifier) {
            args.push('-Dclassifier=' + options.classifier);
        }
        if (options.uniqueVersion === 'true') {
            args.push('-DuniqueVersion=true');
        }
        args.push('-Durl=' + options.url);
        if (options.repositoryId) {
            args.push('-DrepositoryId=' + options.repositoryId);
        }
        if (options.settingsXml) {
            // The lack of a space after the -s is critical
            // otherwise the path will be processed by maven incorrectly.
            args.push('-s' + options.settingsXml);
        }
        // Optional Parameters List :
        // https://maven.apache.org/plugins/maven-deploy-plugin/deploy-mojo.html
        if (Array.isArray(options.optionalParams)) {
            args = args.concat(options.optionalParams);
        }
        if (grunt.debug || options.debug) {
            args.push('-e');
            args.push('-X');
        }

        var done = this.async();
        var msg = 'Deploying to maven...';
        grunt.verbose.write(msg);
        grunt.log.debug('Running command "mvn ' + args.join(' ') + '"');
        grunt.util.spawn({cmd: 'mvn', args: args, opts: {stdio: 'inherit'}}, function (err, result, code) {
            if (err) {
                grunt.verbose.or.write(msg);
                grunt.log.error().error('Failed to deploy to maven');
            } else {
                grunt.verbose.ok();
                grunt.log.writeln('Deployed ' + options.file.cyan + ' to ' + options.url.cyan);
            }
            done(err);
        });
    });

    grunt.registerTask('nexus_release:package', function () {
        var compress = require('grunt-contrib-compress/tasks/lib/compress')(grunt);
        compress.options = grunt.config('maven.package.options');
        compress.tar(grunt.config('maven.package.files'), this.async());

        renameForKnownPackageTypeArtifacts(compress.options.archive, compress.options.extension);
    });

    grunt.registerTask('nexus_release:version', 'Bumps version', function (version) {
        var done = this.async();
        var commitPrefix = grunt.config('grunt.maven.commitPrefix') || '';


        var msg = 'Bumping version to ' + version.cyan + '...';
        grunt.verbose.write(msg);

        grunt.util.spawn({
            cmd: 'npm',
            args: ['version', version, '-m', commitPrefix + '%s']
        }, function (err, result, code) {
            if (err) {
                grunt.verbose.or.write(msg);
                grunt.log.error().error('Failed to bump version to ' + version.cyan);
                return done(err);
            }

            grunt.verbose.ok();
            grunt.log.writeln('Version bumped to ' + version.cyan);

            return done();

        });
    });

    grunt.registerTask('nexus_release:gitstatus', 'checks git for uncommitted changes', function () {
        var done = this.async();

        grunt.verbose.write('checking git for uncommitted changes');

        gitStatus(function (err) {
            if (err) {
                grunt.log.error().error('git status command failed');
            } else {
                grunt.log.writeln('Repo is clean');
            }
            done(err);
        });
    });

    grunt.registerTask('nexus_release:gitpush', 'Pushes to git', function () {
        var done = this.async();

        grunt.verbose.write('Pushing to git');

        gitPush(function (err) {
            if (err) {
                grunt.log.error().error('Failed to push new version to remote');
            } else {
                grunt.log.writeln('Pushed new version to remote');
            }
            done(err);
        });
    });

    grunt.registerTask('nexus_release:gitcommit', 'Commits changes to git', function (message) {
        var done = this.async();

        grunt.verbose.write('Committing to git: ' + message);

        gitCommit(message, function (err) {
            if (err) {
                grunt.log.error().error('Failed to commit changes to git');
            } else {
                grunt.log.writeln('Committed changes to git');
            }
            done(err);
        });
    });

    grunt.registerTask('nexus_release:gittag', 'tags git', function (tag) {
        var done = this.async();

        grunt.verbose.write('Tagging git with ' + tag);

        gitTag(tag, function (err) {
            if (err) {
                grunt.log.error().error('Failed to tag new version to remote');
            } else {
                grunt.log.writeln('Tagged new version to remote');
            }
            done(err);
        });
    });

    function gitPush(fn) {
        grunt.util.spawn({cmd: 'git', args: ['push']}, function (err, result, code) {
            fn(err);
        });
    }

    function gitTag(version, fn) {
        grunt.util.spawn({
            cmd: 'git',
            args: ['tag', '-a', version, '-m', '[nexus_release] release tag ' + version]
        }, function (err, result, code) {
            fn(err);
        });
    }

    function gitCommit(message, fn) {
        grunt.util.spawn({
            cmd: 'git',
            args: ['commit', '-a', '-m', message]
        }, function (err, result, code) {
            fn(err);
        });
    }

    function gitStatus(fn) {
        grunt.util.spawn({cmd: 'git', args: ['status', '--porcelain']}, function (err, result, code) {
            if (err) {
                fn(err);
            } else {
                if (result.stdout != null) {
                    grunt.log.writeln('uncommitted changes!');
                    grunt.log.error().error(result.stdout);
                    fn(err);
                }
            }
        });
    }

    function getExtension(packaging, classifier, type) {
        if (classifier === 'javadoc' || classifier === 'sources') {
            return 'zip';
        }
        return type || packaging || 'zip';
    }

    function renameForKnownPackageTypeArtifacts(fileName, extension) {
        var newFileName = fileName.replace('zip', extension);
        try {
            fs.renameSync(fileName, newFileName);
            return newFileName;
        } catch (e) {
            throw e;
        }
    }

    function getFileNameBase(options) {
        return options.artifactId + '-' + options.version +
            (options.classifier ? '-' + options.classifier : '');
    }

    function injectDestFolder(targetPath, files) {
        var path = require('path');
        files.forEach(function (file) {
            file.dest = path.join(targetPath, file.dest || '');
        });
        return files;
    }

}
;

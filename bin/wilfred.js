#!/usr/bin/env node
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _colors = require('colors');

var _colors2 = _interopRequireDefault(_colors);

var _child_process = require('child_process');

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PKG = require('../package.json');
var CONFIG_PATH = _path2.default.join(_os2.default.homedir(), '.' + PKG.name + '.json');
var DEFAULT_CONFIG = {
    boilerplates: []
};

_commander2.default.version(PKG.version).usage('[options] [boilerplate name] [location]').option('-a, --add', 'Save given path as boilerplate').option('-f, --force', 'Force copying the boilerplate to destination').option('-l, --list', 'Returns the list of boilerplates').option('-r, --remove', 'Remove boilerplate by name').option('-s, --silent', 'Run in silent mode (requires passing at least boilerplate parameter)').parse(process.argv);

var Wilfred = function () {
    function Wilfred(config) {
        _classCallCheck(this, Wilfred);

        this.config = config;

        if (this.config.boilerplates.length <= 0 && (_commander2.default.remove || !_commander2.default.add || _commander2.default.list)) {
            !_commander2.default.silent && console.log('No boilerplates added. For more usage info run: ' + PKG.name + ' --help');
            return;
        }

        if (_commander2.default.list) {
            return this.config.boilerplates.map(function (bp) {
                return !_commander2.default.silent && console.log(bp.boilerplate, '-', bp.path);
            });
        }

        if (_commander2.default.remove) {
            return this.remove();
        }

        if (_commander2.default.add) {
            this.questions = [{
                name: 'boilerplate',
                message: 'Enter the boilerplate name:',
                default: _commander2.default.args[0] || ''
            }, {
                name: 'path',
                message: 'Enter the boilerplate\'s path:',
                default: process.cwd()
            }];
        } else {
            this.questions = [{
                name: 'boilerplate',
                message: 'Select a boilerplate:',
                type: 'list',
                choices: this.config.boilerplates.map(function (bp) {
                    return bp.boilerplate;
                }) || [],
                default: _commander2.default.args[0] || this.config.boilerplates[0].boilerplate
            }, {
                name: 'path',
                message: 'Select a path',
                default: _path2.default.resolve(_commander2.default.args[1] || '.')
            }];
        }

        this.parse();
    }

    _createClass(Wilfred, [{
        key: 'parse',
        value: function parse() {
            var _this = this;

            var method = _commander2.default.add ? 'add' : 'copy';

            if (!_commander2.default.args.length) {
                _inquirer2.default.prompt(this.questions, function (answers) {
                    answers.path = _path2.default.resolve(answers.path);
                    _this[method].call(_this, answers);
                });
            } else {
                this[method].call(this, {
                    boilerplate: _commander2.default.args[0],
                    path: _path2.default.resolve(_commander2.default.args[1] || '.') || process.cwd()
                });
            }
        }
    }, {
        key: 'add',
        value: function add(options) {
            if (this.config.boilerplates.filter(function (bp) {
                return bp.boilerplate === options.boilerplate;
            }).length) {
                return !_commander2.default.silent && console.error(options.boilerplate, 'already exists!');
            }

            this.config.boilerplates.push(options);
            _fsExtra2.default.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, '  '), function (err) {
                if (err) throw err;
                !_commander2.default.silent && console.log(options.boilerplate, 'added as boilerplate!');
            });
        }
    }, {
        key: 'copy',
        value: function copy(options) {
            var _this2 = this;

            var bp = this.config.boilerplates.find(function (item) {
                return item.boilerplate === options.boilerplate;
            }),
                execCopy = function execCopy(from, to) {
                _fsExtra2.default.copy(from, to, function (err) {
                    if (err) return console.error(err);
                    !_commander2.default.silent && console.log('Boilerplate copied to destination!');
                    _this2.postCopy(to);
                });
            };

            if (!bp) {
                return !_commander2.default.silent && console.log('Boilerplate not found...');
            }

            _fsExtra2.default.readdir(options.path, function (err, items) {
                if (err) {
                    _fsExtra2.default.mkdirSync(options.path);
                    items = [];
                }

                if (_commander2.default.force || !items.length) {
                    return execCopy(bp.path, options.path);
                }

                _inquirer2.default.prompt([{
                    name: 'confirmation',
                    message: 'The destination is not empty, are you sure you want to continue?',
                    type: 'confirm'
                }], function (answers) {
                    if (answers.confirmation) {
                        return execCopy(bp.path, options.path);
                    }
                });
            });
        }
    }, {
        key: 'postCopy',
        value: function postCopy(dest) {
            var HOOK = _path2.default.join(dest, '.' + PKG.name + 'hook');
            _fsExtra2.default.stat(HOOK, function (err) {
                if (err) return;

                var cmd = (0, _child_process.spawn)('bash', [HOOK]),
                    output = [],
                    hookError = false;

                cmd.stdout.on('data', function (chunk) {
                    !_commander2.default.silent && process.stdout.write('[.' + PKG.name + 'hook] ' + chunk);
                });

                cmd.stderr.on('data', function (chunk) {
                    !_commander2.default.silent && process.stderr.write(chunk.toString());
                });

                cmd.on('close', function (code, signal) {
                    if (code > 0) {
                        !_commander2.default.silent && console.error(('An error occured while running .' + PKG.name + 'hook').red);
                    }
                });
            });
        }
    }, {
        key: 'remove',
        value: function remove() {
            var _this3 = this;

            var execRemove = function execRemove(name) {
                _this3.config.boilerplates = _this3.config.boilerplates.filter(function (bp) {
                    return bp.boilerplate !== name;
                });
                _fsExtra2.default.writeFile(CONFIG_PATH, JSON.stringify(_this3.config, null, '  '), function (err) {
                    if (err) throw err;
                    !_commander2.default.silent && console.log(name, 'removed from boilerplates!');
                });
            };

            if (!_commander2.default.args[0]) {
                _inquirer2.default.prompt([{
                    name: 'boilerplate',
                    message: 'What boilerplate do you want to remove?',
                    type: 'list',
                    choices: this.config.boilerplates.map(function (bp) {
                        return bp.boilerplate;
                    }) || [],
                    default: ''
                }], function (answers) {
                    return execRemove(answers.boilerplate);
                });
            } else {
                return execRemove(_commander2.default.args[0]);
            }
        }
    }]);

    return Wilfred;
}();

_fsExtra2.default.stat(CONFIG_PATH, function (err, stat) {
    if (err && err.code === 'ENOENT') {
        _fsExtra2.default.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, '  '));
        new Wilfred(DEFAULT_CONFIG);
    } else {
        _fsExtra2.default.readFile(CONFIG_PATH, function (err, data) {
            if (err) throw err;
            new Wilfred(JSON.parse(data));
        });
    }
});

exports.default = Wilfred;
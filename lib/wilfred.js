#!/usr/bin/env node

import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import program from 'commander'

const PKG = require('../package.json')
const CONFIG_PATH = path.join(os.homedir(), `.${PKG.name}.json`)
const DEFAULT_CONFIG = {
    boilerplates: []
}

program
    .version(PKG.version)
    .usage('[options] [boilerplate name] [location]')
    .option('-a, --add', 'Save given path as boilerplate')
    .option('-f, --force', 'Force copying the boilerplate to destination')
    .option('-l, --list', 'Returns the list of boilerplates')
    .option('-r, --remove', 'Remove boilerplate by name')
    .option('-s, --silent', 'Run in silent mode (requires passing at least boilerplate parameter)')
    .parse(process.argv)

class Wilfred {
    constructor(config) {
        this.config = config;

        if (this.config.boilerplates.length <= 0 && (program.remove || program.add || program.list)) {
            console.log(`No boilerplates added. For more usage info run: ${PKG.name} --help`)
            return;
        }

        if (program.list) {
            return this.config.boilerplates.map((bp) => console.log(bp.boilerplate, '-', bp.path))
        }

        if (program.remove) {
            return this.remove();
        }

        if (program.add) {
            this.questions = [
                {
                    name: 'boilerplate',
                    message: 'Enter the boilerplate name:',
                    default: program.args[0] || ''
                },
                {
                    name: 'path',
                    message: 'Enter the boilerplate\'s path:',
                    default: process.cwd()
                }
            ]
        } else {
            this.questions = [
                {
                    name: 'boilerplate',
                    message: 'Select a boilerplate:',
                    type: 'list',
                    choices: this.config.boilerplates.map((bp) => bp.boilerplate) || [],
                    default: program.args[0] || this.config.boilerplates[0].boilerplate
                },
                {
                    name: 'path',
                    message: 'Select a path',
                    default: path.resolve(program.args[1] || '.')
                }
            ]
        }

        this.parse()
    }

    parse() {
        let method = (program.add ? 'add' : 'copy')

        if (!program.args.length) {
            inquirer.prompt(this.questions, (answers) => {
                answers.path = path.resolve(answers.path)
                this[method].call(this, answers)
            })
        } else {
            this[method].call(this, {
                boilerplate: program.args[0],
                path: path.resolve(program.args[1] || '.') || process.cwd()
            })
        }
    }

    add(options) {
        if (this.config.boilerplates.filter((bp) => bp.boilerplate === options.boilerplate).length) {
            return console.error(options.boilerplate, 'already exists!')
        }

        this.config.boilerplates.push(options)
        fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, '  '), (err) => {
            if (err) throw err
            console.log(options.boilerplate, 'added as boilerplate!')
        })
    }

    copy(options) {
        let bp = this.config.boilerplates.find(item => item.boilerplate === options.boilerplate),
            execCopy = (from, to) => {
                fs.copy(from, to, (err) => {
                    if (err) return console.error(err)
                    console.log('Boilerplate copied to destination!')
                })
            }

        if (!bp) {
            return console.log('Boilerplate not found...')
        }

        fs.readdir(options.path, function (err, items) {
            if (err) {
                fs.mkdirSync(options.path)
                items = []
            }

            if (program.force || !items.length) {
                return execCopy(bp.path, options.path)
            }

            inquirer.prompt([{
                name: 'confirmation',
                message: 'The destination is not empty, are you sure you want to continue?',
                type: 'confirm'
            }], (answers) => {
                if (answers.confirmation) {
                    return execCopy(bp.path, options.path)
                }
            })
        })
    }

    remove() {
        let execRemove = (name) => {
            this.config.boilerplates = this.config.boilerplates.filter(bp => bp.boilerplate !== name)
            fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, '  '), (err) => {
                if (err) throw err
                console.log(name, 'removed from boilerplates!')
            })
        }

        if (!program.args[0]) {
            inquirer.prompt([{
                name: 'boilerplate',
                message: 'What boilerplate do you want to remove?',
                type: 'list',
                choices: this.config.boilerplates.map((bp) => bp.boilerplate) || [],
                default: ''
            }], (answers) => {
                return execRemove(answers.boilerplate)
            })
        } else {
            return execRemove(program.args[0])
        }
    }
}

fs.stat(CONFIG_PATH, (err, stat) => {
    if (err && err.code === 'ENOENT') {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, '  '))
        new Wilfred(DEFAULT_CONFIG)
    } else {
        fs.readFile(CONFIG_PATH, (err, data) => {
            if (err) throw err
            new Wilfred(JSON.parse(data))
        })
    }
})

export default Wilfred

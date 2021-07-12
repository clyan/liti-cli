"use strict";
const Command = require("@liti/command");
const log = require("@liti/log");
const Package = require("@liti/package");
const { sleep, spinnerStart, execAsync } = require("@liti/utils");
const constants = require("@liti/constants");
const userHome = require('user-home');
const path = require('path');
const ejs = require('ejs');
const inquirer = require("inquirer");
const fs = require("fs");
const fse = require("fs-extra");
const semver = require("semver");
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHILTE_COMMAND = ['npm', 'cnpm', 'yarn']
const getProjectTemplate = require("./getProjectTemplate");
class InitCommand extends Command {
    constructor(argv) {
        super(argv);
    }
    init() {
        this.projectName = this._argv[0] || "";
        this.force = !!this._argv[1].force;
        log.verbose(this.projectName, this.force);
    }
    async exec() {
        try {
            //1. 准备阶段
            const projectInfo = await this.prepare();
            if (projectInfo) {
                //2. 下载模板
                // console.log(projectInfo)
                this.projectInfo = projectInfo;
                await this.downloadTemplate();
                //3. 安装模板
                await this.installTemplate();
            }
        } catch (e) {
            log.error(e.message);
            if (process.env[constants.LOG_LEVEL] === 'verbose') {
                console.log(e)
            }
        }
    }
    async prepare() {
        // 0. 判断模板是否存在， 不存在时，清空模板没有意义
        const template = await getProjectTemplate();
        // log.verbose("后台template", template);
        if (!template || template.length === 0) {
            throw new Error("项目模板不存在");
        }
        this.template = template;
        const localPath = process.cwd();
        // 1. 判断当前目录是否为空，询问是否继续执行
        if (!this.isDirEmpty(localPath)) {
            let ifContinue = false;
            // 询问是否继续创建
            if (!this.force) {
                // 询问是否继续创建
                ifContinue = (
                    await inquirer.prompt({
                        type: "confirm",
                        name: "ifContinue",
                        message: "当前文件夹不为空，是否继续创建项目？",
                    })
                ).ifContinue;
                // 选择否时，终止流程
                if (!ifContinue) {
                    return;
                }
            }
            // 2. 是否启动强制更新
            if (ifContinue || this.force) {
                // 给用户做二次确认
                const { confirmDelete } = await inquirer.prompt({
                    type: "confirm",
                    name: "confirmDelete",
                    message: "是否确认清空当前目录下的文件？",
                });
                if (confirmDelete) {
                    const spinner = spinnerStart('清空目录中....')
                    await sleep(500)
                    // 清空当前目录, 并不会删除此目录
                    fse.emptyDirSync(localPath);
                    spinner.stop(true)
                }
            }
        }
        // 3. 选择创建项目或组件
        // 4. 获取项目/组件的基本信息
        return this.getProjectInfo();
    }
    async getProjectInfo() {
        function isValidName(v) {
            return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
        }
        let projectInfo = {};
        let isProjectNameVaild = false;
        if (isValidName(this.projectName)) {
            isProjectNameVaild = true
            projectInfo.projectName = this.projectName
        }
        // 1. 选择创建项目或组件
        const { type } = await inquirer.prompt({
            type: "list",
            name: "type",
            message: "请选择初始化类型",
            default: TYPE_PROJECT,
            choices: [
                {
                    name: "项目",
                    value: TYPE_PROJECT,
                },
                {
                    name: "组件",
                    value: TYPE_COMPONENT,
                },
            ],
        });
        const title = type === TYPE_PROJECT ? '项目' : '组件'
        this.template = this.template.filter((template) => template.tag.includes(type))
        log.verbose("template", this.template);
        log.verbose("组件还是项目", type);
        const projectNamePrompt = {
            type: "input",
            name: "projectName",
            message: `请输入${title}名称`,
            default: "",
            validate: function (v) {
                const done = this.async();
                setTimeout(function () {
                    // 1. 输入的首字符必须为英文字母
                    // 2. 尾字符必须为英文或数字，不能为字符
                    // 3. 字符允许"-_"
                    // 合法: a, a-b, a_b, a-b-c, a-b1-c1,a_b1_c1a1,a1,a1-b1-c1, a1_b1_c1
                    // 不合法: 1,a_,a-.a_1,a-1
                    if (!isValidName(v)) {
                        done(`请输入合法的${title}名称`);
                        return;
                    }
                    done(null, true);
                }, 0);
            },
            filter: function (v) {
                return v;
            },
        }
        const projetPrompt = [];
        if (!isProjectNameVaild) {
            projetPrompt.push(projectNamePrompt)
        }
        projetPrompt.push({
            type: "input",
            name: "projectVersion",
            message: `请输入${title}版本号`,
            default: "1.0.0",
            validate: function (v) {
                // 用于输入不合法得内容时，提示错误信息
                const done = this.async();
                setTimeout(function () {
                    if (!!!semver.valid(v)) {
                        done("请输入合法的版本号");
                        return;
                    }
                    done(null, true);
                }, 0);
            },
            filter: function (v) {
                if (semver.valid(v)) {
                    return semver.valid(v);
                } else {
                    return v;
                }
            },
        },
            {
                type: 'list',
                name: 'projectTemplate',
                message: `请选择${title}模板`,
                choices: this.createTemplateChoise()
            })
        if (type === TYPE_PROJECT) {
            // 2. 获取项目/组件的基本信息
            const project = await inquirer.prompt(projetPrompt);
            projectInfo = {
                ...projectInfo,
                type,
                ...project,
            };
        } else if (type === TYPE_COMPONENT) {
            const descriptionPrompt = {
                type: "input",
                name: "componentDescription",
                message: `请输入组件描述信息`,
                default: "",
                validate: function (v) {
                    // 用于输入不合法得内容时，提示错误信息
                    const done = this.async();
                    setTimeout(function () {
                        if (!v) {
                            done("请输入组件描述信息");
                            return;
                        }
                        done(null, true);
                    }, 0);
                }
            }
            projetPrompt.push(descriptionPrompt)
            // 获取组件的基本信息
            const component = await inquirer.prompt(projetPrompt);
            projectInfo = {
                ...projectInfo,
                type,
                ...component,
            };
        }
        if (projectInfo.projectName) {
            projectInfo.name = projectInfo.projectName
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
        }
        if (projectInfo.projectVersion) {
            projectInfo.version = projectInfo.projectVersion
        }
        if (projectInfo.componentDescription) {
            projectInfo.description = projectInfo.componentDescription
        }

        log.verbose('projectInfo', projectInfo)
        return projectInfo;
    }
    createTemplateChoise() {
        return this.template.map(temp => ({
            value: temp.npmName,
            name: temp.name
        }))
    }
    async downloadTemplate() {
        // 前置工作
        // 1. 通过项目模板API获取模板信息
        // 1.1 通过egg搭建一套后端系统
        // 1.2 通过npm存储项目模板
        // 1.3 将项目模板信息存储到mongodb数据库中
        // 1.4 通过egg.js获取mongodb中的数据，并通过API返回

        // console.log(this.template, this.projectInfo)
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(item => item.npmName === projectTemplate);

        const targetPath = path.resolve(userHome, constants.DEFAULT_CLI_HOME, constants.TEMPLATE_DIR)

        const storeDir = path.resolve(
            userHome,
            constants.DEFAULT_CLI_HOME,
            constants.TEMPLATE_DIR,
            constants.NODE_MODULES
        )
        const { npmName, version } = templateInfo;
        this.templateInfo = templateInfo;
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version,
        })
        if (!await templateNpm.exists()) {
            const spinner = spinnerStart('正在下载模板...');
            await sleep()
            try {
                await templateNpm.install()
            } catch (err) {
                throw err
            } finally {
                spinner.stop(true)
                if (templateNpm.exists()) {
                    log.success("模板下载成功")
                }
            }
        } else {
            const spinner = spinnerStart('正在更新模板...');
            await sleep()
            try {
                await templateNpm.update()
            } catch (err) {
                throw err
            } finally {
                spinner.stop(true)
                if (templateNpm.exists()) {
                    log.success("模板更新成功")
                }
            }
        }
        // 赋值到原型上供模板安装时使用
        this.templateNpm = templateNpm
        log.verbose("模板目录", targetPath)
        log.verbose("模板缓存目录", storeDir)
    }
    async installTemplate() {
        // console.log("templateInfo", this.templateInfo)
        if (this.templateInfo) {
            if (!this.templateInfo.type) {
                this.templateInfo.type = TEMPLATE_TYPE_NORMAL
            }
            if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
                // 标准安装
                this.installNormalTemplate()
            } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
                // 自定义安装
                this.installCustomTemplate()
            } else {
                throw new Error('无法识别项目模板类型')
            }
        } else {
            throw new Error('项目模板信息不存在')
        }
    }
    checkCommand(cmd) {
        if (WHILTE_COMMAND.includes(cmd)) {
            return cmd;
        }
        return null;
    }
    async execCommand(command, errMsg) {
        let ret;
        try {
            if (command && command.length > 0) {
                const cmdArray = command.split(' ')
                const cmd = this.checkCommand(cmdArray[0])
                if (!cmd) {
                    throw new Error(`命令不存在 command:${command} `)
                }
                const args = cmdArray.slice(1)
                ret = await execAsync(cmd, args, {
                    stdio: 'inherit',
                    cwd: process.cwd()
                })
            }
            if (ret !== 0) {
                throw new Error(errMsg)
            }
        } catch (e) {
            log.error(e.message)
            process.exit()
        }
        return ret;
    }
    async ejsRender(options) {
        const dir = process.cwd();
        const projectInfo = this.projectInfo;
        return new Promise((resolve, reject) => {
            require('glob')('**', {
                cwd: dir,
                ignore: options.ignore,
                nodir: true
            }, (err, files) => {
                if (err) {
                    reject(err)
                }
                log.verbose(files)
                Promise.all(files.map(file => {
                    const filePath = path.join(dir, file)
                    return new Promise((resolve, reject) => {
                        ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                            // console.log(err, result)
                            if (err) {
                                reject(err)
                            } else {
                                fse.writeFileSync(filePath, result)
                                resolve(result)
                            }
                        })
                    })
                })).then(() => {
                    resolve();
                }).catch(err => {
                    reject(err)
                })
            })
        })
    }
    async installNormalTemplate() {
        log.verbose("templateInfo", this.templateInfo)
        let spinner = spinnerStart('正在安装模板');
        await sleep();
        try {
            // 1. 拷贝模板代码 ,将缓存目录下的内容，拷贝到用户执行当前目录中
            // 获取缓存目录
            const templatePath = path.resolve(this.templateNpm.cacheFilePath + '/template')
            // 获取当前目录
            const targetPath = process.cwd()

            log.verbose("模板目录", templatePath)
            log.verbose("当前目录", targetPath)

            // 确保目录存在，没有则会创建
            fse.ensureDirSync(templatePath)
            fse.ensureDirSync(targetPath)
            // 拷贝
            fse.copySync(templatePath, targetPath)
        } catch (error) {
            throw error
        } finally {
            spinner.stop(true);
            log.success("模板安装成功")
        }
        // 从后台获取ignore信息
        const templateIgnore = this.templateInfo.ignore || []
        const ignore = ['**/node_modules/**', ...templateIgnore]
        // 使用ejs编译模板，将命令交互的内容写入到模板中
        await this.ejsRender({ ignore })

        // 2.依赖安装
        const { installCommand, startCommand } = this.templateInfo
        log.info("依赖安装中...")
        log.verbose(`当前支持命令${WHILTE_COMMAND.join(', ')}`)
        await this.execCommand(installCommand, '依赖安装过程失败')
        // 3. 启动命令执行
        log.info("项目启动中...")
        await this.execCommand(startCommand, '项目启动失败')
    }
    async installCustomTemplate() {
        // 查询自定义模板的入口文件
        if (await this.templateNpm.exists()) {
            const rootFile = this.templateNpm.getRootFilePath();
            if (fs.existsSync(rootFile)) {
                log.notice('开始执行自定义模板');
                const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
                const options = {
                    templateInfo: this.templateInfo,
                    projectInfo: this.projectInfo,
                    sourcePath: templatePath,
                    targetPath: process.cwd(),
                };
                const code = `require('${rootFile}')(${JSON.stringify(options)})`;
                log.verbose('code', code);
                await execAsync('node', ['-e', code], { stdio: 'inherit', cwd: process.cwd() });
                log.success('自定义模板安装成功');
            } else {
                throw new Error('自定义模板入口文件不存在！');
            }
        }
    }
    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        // 认为含只有.开头的文件和node_modules得文件夹为空文件夹
        fileList = fileList.filter(
            (file) => !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
        );
        return fileList && fileList.length <= 0;
    }
}

function init(argv) {
    const [name, options, command] = argv;
    // console.log('init', name, options, process.env.CLI_TARGET_PATH)
    return new InitCommand(argv);
}

module.exports = init;

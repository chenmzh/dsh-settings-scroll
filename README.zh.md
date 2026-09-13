# DSH 设置标签滚动插件

[English](README.md)

让 DSH Web 设置弹窗左侧的标签列表可以上下滚动，解决插件较多或窗口较矮时，底部标签被裁掉、无法点击的问题。

- 设置标题保持可见，标签列表独立滚动。
- 支持鼠标滚轮、触控板和触摸滑动。
- 聚焦标签后，用上下方向键、Home / End 移动焦点，Enter / 空格打开对应设置。
- 打开弹窗或切换选中项时，自动显示当前标签。
- 保留右侧设置内容的滚动位置。
- 禁用或卸载时清理样式、监听器和 DOM 标记。

## 安装

需要 DSH `>=0.1.5-rc.1`。发布包已包含构建产物，没有运行时依赖。

```sh
dsh plugin --profile web add https://github.com/chenmzh/dsh-settings-scroll/releases/download/v0.1.0/dsh-settings-scroll-0.1.0.tgz
```

安装后自行重启 `dsh web`，刷新页面，打开「设置」，在左侧标签区域滚动即可。

卸载：

```sh
dsh plugin --profile web remove dsh-settings-scroll
```

卸载后同样重启服务并刷新页面。

## 开发与验证

```sh
npm ci
npm run build
npm test
dsh plugin --profile web add link:/插件仓库的绝对路径
```

浏览器验证使用单独的 DSH 测试配置，避免操作个人会话。把测试服务的启动日志路径传入环境变量；脚本读取登录地址，不输出其中的令牌。

```sh
npx playwright install chromium
DSH_TEST_LOG=/测试服务的私有日志路径 npm run test:browser
```

也请通过 `dsh plugin --profile <测试配置> add link:/插件仓库的绝对路径/test/fixture` 安装测试用插件；它通过官方设置接口提供 30 个测试标签，不包含在发布包中。

使用已安装的 Google Chrome 时，设置 `DSH_TEST_BROWSER=chrome`。测试输出和截图放在不提交到 Git 的 `artifacts/` 目录。

## 兼容范围

适配官方设置弹窗结构：带标题关联的模态弹窗、导航标题以及包含标签按钮的 `*_navList`。不依赖 CSS 哈希前缀或界面语言。不支持的结构保持原样；替换设置 DOM 或改用横向导航的皮肤可能需要额外适配。未来 DSH 版本若更改内部结构，也可能需要更新插件。

插件通过标准 `cordis.patch.yml` 和浏览器模块入口加载，不修改 DSH 核心文件，不请求网络，不读取账户或会话内容。

具体测试版本和限制见[验证记录](docs/validation.md)。

## 许可证

MIT。

### 性能

对话区域的 DOM 更新会先被过滤；只有弹窗挂载／移除、设置导航内的变化才触发扫描，并合并到一个动画帧。卸载时释放导航监听和待执行动画帧。

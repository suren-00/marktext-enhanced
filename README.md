# 🚀 MarkText Enhanced (MarkText 增强版阅读器)

一个彻底修复传统 MarkText **Mermaid 流程图错位重叠 Bug**、并内置**浮光式侧边栏目录树 (TOC Sidebar)** 的现代高颜值开源 Markdown 阅读与编辑应用。

---

## ✨ 核心特性

- 🛠 **Mermaid 渲染防重叠优化**：彻底解决老版本 MarkText 中流程图节点中文文字计算偏离、箭头错位及盒模型重叠的问题。
- 📌 **多级目录树 (TOC Sidebar)**：参考浮光 Markdown 设计，支持侧边栏目录导航（H1~H6），点击平滑滚动跳转。
- 📖 **三种阅读与编辑视图**：支持 **阅读模式 (Read)**、**分栏对照 (Split)** 与 **纯源码编辑 (Edit)**。
- 📝 **正文动态目录**：支持在 Markdown 中输入 `[toc]`，自动在正文中生成交互式目录结构。
- 🌓 **深浅主题切换**：支持一键切换暗黑模式与亮色模式。
- ⚡️ **高颜值与流畅性能**：基于 React 18 + Vite 构建，极致轻量与快速启动。

---

## 🛠 本地运行

```bash
# 1. 进入项目目录
cd marktext-enhanced

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

---

## 📤 如何推送到您自己的 GitHub 账号？

在 GitHub 上新建一个名为 `marktext-enhanced` 的空仓库，然后在终端执行以下三行命令即可：

```bash
# 1. 关联您的 GitHub 远程仓库
git remote add origin https://github.com/YOUR_USERNAME/marktext-enhanced.git

# 2. 将主分支名称设为 main
git branch -M main

# 3. 推送代码
git push -u origin main
```

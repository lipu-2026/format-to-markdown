# 墨转 · Markdown 工作台 2.0.1

在本机整理文档，转换成适合发给 AI 阅读的 Markdown。不需要账号、API Key 或联网。

## 启动

从 [版本下载页](https://github.com/lipu-2026/format-to-markdown/releases/tag/v2.0.1) 下载 `Format-to-Markdown-v2.0.1-Windows.zip`，完整解压后双击其中的 `Format-to-Markdown.exe`。保留同目录下的 `app` 和 `runtime` 文件夹，无需安装 Python；需要 Windows 10/11 x64 与 Edge 或 Chrome。新版已嵌入墨转图标，创建桌面快捷方式后会显示应用图标。

这是免安装便携包。普通用户请选择上述 ZIP，而不是 GitHub 自动生成的 Source code 源码包。更新说明见 `CHANGELOG.md`。

## 从源码运行

安装 Python 3.10 或更新版本，下载源码后，在项目目录执行：

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe desktop.py
```

Windows 独立窗口需要 Edge 或 Chrome。其他平台可运行 `python app.py` 使用浏览器界面（先在相应 Python 环境中安装依赖）。

源码运行也可双击 `Format-to-Markdown.vbs`，使用已安装依赖的本机 Python 环境。

`start.bat` 是排查问题时使用的备用启动方式，会在浏览器中打开：

```text
http://127.0.0.1:8765
```

也可以在当前目录运行：

```powershell
python app.py
```

## 支持的格式

- 文档：PDF、DOCX、PPTX、EPUB
- 表格与数据：XLSX、XLS、CSV、TSV、JSON、JSONL、XML、YAML、TOML
- 网页与笔记：HTML、TXT、Markdown、RST、Jupyter Notebook
- 代码：Python、JavaScript、TypeScript、Java、C/C++、Go、Rust、SQL 等
- 其他：ZIP 文件清单与小型文本文件、常见图片引用，以及未知扩展名的 UTF-8 文本

## 日常使用

1. 拖入文件，或粘贴 Markdown / 纯文本 / HTML 源码 / CSV / JSON。
2. 开始转换；失败文件可单独重试，停止操作会等待当前文件完成。
3. 在「阅读预览」检查标题和表格，在「Markdown」直接编辑。
4. 复制或下载当前结果；多份资料可合并下载，也可打包为 ZIP（同名文件自动编号）。
5. 长文可按 4,000 / 8,000 / 16,000 字符分段复制，附文件名与段落序号。分段优先采用换行，不会漏掉正文，但代码和表格可能跨段。

每批最多 50 个文件、总大小 100 MB、单文件 60 MB。预览为保证流畅只展示前 16 万字符，完整内容保留在编辑区和导出文件中。Token 是 AI 计量文本长度的单位，界面显示为粗估。

## 已知限制

- 扫描版 PDF 没有文字层时，需要 OCR；当前离线版不会假装识别。
- 图片可以链接或以 Base64 嵌入 Markdown，但当前不做文字识别。发给支持看图的 AI 时，建议把原图一并上传。
- 旧版 `.doc` 和 `.ppt` 请先用 Office 另存为 `.docx` 和 `.pptx`。
- 音频、视频、设计源文件和专业工程文件需要各自的专用解析器，不可能由一个通用转换器无损理解。
- PDF 表格、多栏阅读顺序和 Office 内嵌图表不保证完整恢复；Excel 公式保留文本而非自动计算。
- 阅读预览支持常见 Markdown 元素，不执行原文 HTML、不自动请求远程图片。

## 隐私

网页默认只监听 `127.0.0.1`。文件在本机内存中转换，结果不会自动保存到本工具；请在刷新、清空或关闭前导出。下载的文件由你自行保存。

## 验证与打包

`python tests/test_conversion.py` 检查转换和接口；`node tests/test_frontend.cjs` 检查预览安全、分段完整性与 ZIP；`node tests/test_browser.cjs` 使用已安装的 Chrome 和 Playwright 检查真实交互。

`python build_portable.py` 复用旧便携包的运行环境离线打包，并使用 Windows 自带 C# 编译器生成入口。已有发布目录不会被覆盖，需另传 `--name 新目录名`。浏览器测试可通过 `MARKDOWN_TEST_APP` 和 `MARKDOWN_TEST_PYTHON` 指定发布包。

首次从 GitHub 下载源码时，先下载并解压 Windows 便携包，将其中的 `runtime` 文件夹复制到源码目录的 `release/Format-to-Markdown-Windows/runtime`，再运行打包命令。打包所用 Python 需安装 Pillow；发布包和本地验证输出不提交到源码仓库。浏览器测试另需安装 Node.js、Playwright 和 Chrome，并将 `MARKDOWN_TEST_PYTHON` 设置为可用的 Python 路径。

## 开源许可

本项目源码采用 [MIT License](LICENSE)。Python 运行环境及第三方依赖分别遵循各自许可证，便携包中保留其许可文件。

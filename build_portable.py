"""Build a versioned portable release from the already bundled, offline runtime."""
import argparse
import hashlib
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VERSION = '2.0.1'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', default=f'Format-to-Markdown-v{VERSION}-Windows')
    args = parser.parse_args()
    if Path(args.name).name != args.name or any(c in args.name for c in '/\\:'):
        raise SystemExit('Release name must be a folder name, not a path.')
    source_runtime = ROOT / 'release/Format-to-Markdown-Windows/runtime'
    target = ROOT / 'release' / args.name
    archive = target.parent / (target.name + '.zip')
    if target.exists() or archive.exists():
        raise SystemExit(f'Release exists: {target}. Choose a new --name; existing releases are never overwritten.')
    if not (source_runtime / 'pythonw.exe').exists():
        raise SystemExit('The offline runtime from the original portable release is required.')
    compiler = Path('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
    if not compiler.is_file():
        raise SystemExit('Windows .NET C# compiler was not found.')
    icon = ROOT / 'format-to-markdown.ico'
    subprocess.run([sys.executable, str(ROOT / 'make_icon.py'), '--output', str(icon)], check=True)
    target.mkdir(parents=True)
    shutil.copytree(source_runtime, target / 'runtime', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    app_dir = target / 'app'
    app_dir.mkdir()
    for name in ['app.py', 'desktop.py']:
        shutil.copy2(ROOT / name, app_dir / name)
    shutil.copytree(ROOT / 'static', app_dir / 'static')
    shutil.copy2(ROOT / 'PORTABLE-README.txt', target / '使用说明.txt')
    shutil.copy2(ROOT / 'CHANGELOG.md', target / '更新记录.md')
    shutil.copy2(ROOT / 'LICENSE', target / 'LICENSE')
    shutil.copytree(ROOT / 'third-party-licenses', target / 'third-party-licenses')
    subprocess.run([str(compiler), '/nologo', '/target:winexe', '/optimize+', '/reference:System.Windows.Forms.dll',
                    '/win32icon:' + str(icon),
                    '/out:' + str(target / 'Format-to-Markdown.exe'), str(ROOT / 'launcher.cs')], check=True)
    subprocess.run([str(target/'runtime/python.exe'), '-E', '-s', '-B', '-c',
                    'import docx,pptx,openpyxl,pypdf,markdownify,bs4,xlrd,PIL,lxml; print("Portable imports OK")'],check=True,cwd=app_dir)
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as packed:
        for path in sorted(target.rglob('*')):
            if path.is_file():
                packed.write(path, path.relative_to(target.parent))
    with zipfile.ZipFile(archive) as packed:
        failed = packed.testzip()
        if failed:
            raise SystemExit(f'ZIP integrity failure: {failed}')
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    print(f'Release: {target}')
    print(f'ZIP: {archive} ({archive.stat().st_size/1048576:.1f} MB)')
    print(f'SHA256: {digest}')


if __name__ == '__main__':
    main()

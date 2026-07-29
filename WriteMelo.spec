from pathlib import Path


root = Path(SPECPATH)
datas = [
    (str(root / "index.html"), "."),
    (str(root / "styles.css"), "."),
    (str(root / "app.js"), "."),
    (str(root / "completion.js"), "."),
    (str(root / "logo.svg"), "."),
    (str(root / "byok-privacy.html"), "."),
    (str(root / "public" / "support.css"), "public"),
]
a = Analysis(
    [str(root / "desktop.py")],
    pathex=[str(root)],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["PyQt5", "PyQt6", "PySide2", "PySide6", "cefpython3", "gi"],
    noarchive=False,
    optimize=1,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="WriteMelo",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=[str(root / "desktop-assets" / "app-icon.ico")],
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="WriteMelo",
)

import ast
import os
import json

def parse_py(path):
    with open(path, "r") as f:
        src = f.read()
    try:
        tree = ast.parse(src)
        funcs = []
        for n in ast.walk(tree):
            if isinstance(n, ast.FunctionDef):
                funcs.append({"name": n.name, "doc": ast.get_docstring(n) or ""})
            elif isinstance(n, ast.ClassDef):
                for sub in n.body:
                    if isinstance(sub, ast.FunctionDef):
                        funcs.append({"name": f"{n.name}.{sub.name}", "doc": ast.get_docstring(sub) or ""})
        return funcs
    except Exception as e:
        return []

files = [
    "backend/elecom/main.py",
    "backend/elecom/steps/__init__.py",
    "backend/elecom/steps/features.py",
    "backend/elecom/steps/loader.py",
    "backend/elecom/steps/masking.py",
    "backend/elecom/steps/noise_reduction.py",
    "backend/elecom/steps/segmentation.py",
    "backend/elecom/steps/reconstruction.py",
    "backend/elecom/steps/spectrogram.py",
    "backend/elecom/steps/cv_analyzer.py"
]
result = {}
for file in files:
    if os.path.exists(file):
        result[file] = parse_py(file)
print(json.dumps(result, indent=2))

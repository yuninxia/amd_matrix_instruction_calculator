# backend/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess, json, importlib.util, sys, pathlib
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to path so we can import matrix_calculator
parent_dir = str(pathlib.Path(__file__).resolve().parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Now import matrix_calculator
import matrix_calculator

# point to the existing CLI module
CALC_PATH = pathlib.Path(__file__).resolve().parent.parent / "matrix_calculator.py"

app = FastAPI(title="Matrix Instruction Calculator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows your frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

@app.get("/architectures")
def architectures():
    return list(matrix_calculator.dict_insts.keys())

@app.get("/instructions")
def instructions(arch: str):
    if arch not in matrix_calculator.dict_insts:
        raise HTTPException(404, "Unknown architecture")
    return list(matrix_calculator.dict_insts[arch].keys())

class Request(BaseModel):
    architecture: str
    instruction: str
    mode: str
    matrix_type: str | None = None
    flags: dict | None = None

@app.post("/calculate")
def calculate(req: Request):
    cmd = [
        sys.executable,
        str(CALC_PATH),
        "-a", req.architecture,
        "-i", req.instruction,
        f"--{req.mode}",
    ]
    # Add default matrix type for modes that require it
    if req.matrix_type and req.mode in ["register-layout", "matrix-layout", "get-register", "matrix-entry"]:
        if req.matrix_type.upper() == "K":
            cmd.append("--compression")
        else:
            cmd.append(f"--{req.matrix_type.upper()}-matrix")

    if req.flags:
        cmd.extend(["--flags", json.dumps(req.flags)])
    print(f"Running command: {cmd}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode:
        raise HTTPException(400, result.stderr)
    return result.stdout 
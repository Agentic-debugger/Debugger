from Baseagent import BaseAgent
# abstract syntax trees it conversts python code into a tree structure so as to find patterns without execution 
import ast 
# stop a script if a critical vulnerability is found
import sys 
# helps orders from terminal access
import argparse
# file locations ppath handling 
from pathlib import Path
import re      

class DetectorEngine:
    def __init__(self, source_code: str):
        self.source = source_code
        self.report = {
            "status": "CLEAN",
            "critical_count": 0,
            "findings": []
        }
    
    def add_findings(self, line, category, diagnosis, neutralization, severity="Warning"):
        if severity == "Error":
            self.report["status"] = "FLAGGED"
            self.report["critical_count"] += 1

        self.report["findings"].append({
            "line": line,
            "type": category,
            "severity": severity,
            "diagnosis": diagnosis,
            "neutralization": neutralization
        })
        
    def analyze(self):
        try:
            tree = ast.parse(self.source)
        except SyntaxError as e:
            self.add_findings(e.lineno, "Syntax Violation", e.msg, 
                             f"Fix syntax near: {e.text.strip() if e.text else 'EOF'}", "Error")
            return self.report

        for node in ast.walk(tree):
            # Logic: Mutable Defaults
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        self.add_findings(node.lineno, "Logic Flaw", 
                                         f"Mutable default in '{node.name}'", 
                                         "Use 'None' as default.", "Warning")
            
            # Security: eval/exec
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id in ['eval', 'exec']:
                    self.add_findings(node.lineno, "Security Risk", 
                                     f"Use of {node.func.id}", 
                                     "Use literal_eval or refactor logic.", "Error")

            # Style: snake_case
            if isinstance(node, ast.FunctionDef) and not re.match(r'^[a-z_][a-z0-9_]*$', node.name):
                self.add_findings(node.lineno, "Style Issue", 
                                 f"Function '{node.name}' is not snake_case", 
                                 "Rename to lowercase_with_underscores.", "Warning")

        return self.report
    
class BugDetectionAgent(BaseAgent):
    def __init__(self):
        instructions=""" Role: You are a Senior Forensic Security & Logic Auditor. Your mission is to detect bugs, logic flaws, and security vulnerabilities with zero-tolerance for hallucinations.

Protocol: Before providing any fixes, you must perform a 3-step scan:

Data Flow Mapping: Trace how inputs move through the function.

Edge Case Stress Test: Mentally execute the code with None, empty strings, massive integers, or unexpected types.

Logic Verification: Does the code actually achieve the stated goal, or is it just "syntactically correct" while being logically broken?

Output Format (Required):

[DETECTION]: Name the bug (e.g., Race Condition, Off-by-one Error).

[SEVERITY]: Critical / Warning / Optimization.

[EVIDENCE]: Explain exactly why this line fails and provide a "Proof of Concept" input that would break it.

[NEUTRALIZATION]: Provide the minimal surgical fix. Do not rewrite the whole file unless necessary. """
        super().__init__(name="detection_Agent",instructions=instructions)
    def audit_file(self,filepath:str):
        path=Path(filepath)
        if not path.exists():
            return f"Error: {filepath} not found"
        
        code=path.read_text()

        engine=DetectorEngine(code)
        rawreport=engine.analyze()
        if not rawreport["findings"]:
            return " No forensic issues detected in file."

        # 4. Use the ADK BaseAgent to format the report (Soft Audit)
        prompt = f"Please process these findings and format a Detection Report:\n{rawreport['findings']}" 
        return self.run(prompt)
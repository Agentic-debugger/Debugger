import os
from Detector import BugDetectionAgent

def create_test_file():
    content = """
def BadFunction(items=[]): # Logic Flaw & Style Issue
    eval("print('hello')") # Security Risk
    return True
    """
    with open("buggy_code.py", "w") as f:
        f.write(content)

def test_forensic_workflow():
    # 1. Setup the dummy file
    create_test_file()
    
    # 2. Initialize the ADK-backed Agent
    print("[*] Initializing Forensic Agent via Google ADK...")
    forensic_agent = BugDetectionAgent()
    
    # 3. Run the Audit through the BaseAgent system
    print("[*] Starting Audit on buggy_code.py...")
    report = forensic_agent.audit_file("buggy_code.py")
    
    print("\n" + "="*50)
    print("FINAL FORENSIC DETECTION REPORT")
    print("="*50)
    print(report)

if __name__ == "__main__":
    test_forensic_workflow()
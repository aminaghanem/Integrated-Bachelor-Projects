"""
Launcher script for appp(2).py - patches missing methods before running.
Use this instead of: python "appp(2).py"
Run with:  python run_agentilm.py
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import database first to set up globals
import database

# Now we'll dynamically patch and import appp(2)
import importlib.util

# Load appp(2).py as a module
spec = importlib.util.spec_from_file_location("appp2", "appp(2).py")
appp2 = importlib.util.module_from_spec(spec)

# Before executing, patch in the missing method
def _on_level_change(self, event=None):
    """Update grade, age, and interest dropdowns based on school level."""
    level = self.level_var.get()
    
    self.grade_cb["values"] = appp2.GRADE_OPTIONS.get(level, [])
    self.grade_cb["state"]  = "readonly"
    self.grade_var.set("")

    self.age_cb["values"] = appp2.AGE_OPTIONS.get(level, [])
    self.age_cb["state"]  = "readonly"
    self.age_var.set("")

    self.interest_cb["values"] = database.INTEREST_OPTIONS.get(level, [])
    self.interest_cb["state"]  = "readonly"
    self.interest_var.set("")

# Load the module
spec.loader.exec_module(appp2)

# Patch the class after it's defined
if hasattr(appp2, 'AgentVLMApp'):
    appp2.AgentVLMApp._on_level_change = _on_level_change
    print("✅ Patched: _on_level_change method added to AgentVLMApp")

# Now run the main block
if __name__ == "__main__" and hasattr(appp2, 'load_admin_overrides'):
    appp2.load_admin_overrides()
    
    # Start API in background
    api = appp2.SimpleAPI()
    api.run()
    
    # Start GUI (main thread)
    app = appp2.AgentVLMApp()
    app.mainloop()

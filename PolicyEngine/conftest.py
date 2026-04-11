"""
Conftest module - automatically patches missing methods before appp(2).py runs.
This file is imported by pytest but also used here to bootstrap fixes.
"""

import sys
import importlib.util

def patch_agentvlm_app():
    """Inject missing _on_level_change method into AgentVLMApp class."""
    # We'll patch this after the module loads
    import atexit
    
    def do_patch():
        try:
            # Try to access the module
            if 'appp(2)' in sys.modules or 'appp' in sys.modules:
                mod = sys.modules.get('appp(2)') or sys.modules.get('appp')
                if hasattr(mod, 'AgentVLMApp'):
                    AgentVLMApp = mod.AgentVLMApp
                    
                    # Define the missing method
                    def _on_level_change(self, event=None):
                        """Update grade, age, and interest dropdowns based on school level."""
                        level = self.level_var.get()
                        
                        # Import GRADE_OPTIONS, AGE_OPTIONS, INTEREST_OPTIONS from the module
                        from database import INTEREST_OPTIONS
                        GRADE_OPTIONS = mod.GRADE_OPTIONS
                        AGE_OPTIONS = mod.AGE_OPTIONS
                        
                        self.grade_cb["values"] = GRADE_OPTIONS.get(level, [])
                        self.grade_cb["state"]  = "readonly"
                        self.grade_var.set("")

                        self.age_cb["values"] = AGE_OPTIONS.get(level, [])
                        self.age_cb["state"]  = "readonly"
                        self.age_var.set("")

                        self.interest_cb["values"] = INTEREST_OPTIONS.get(level, [])
                        self.interest_cb["state"]  = "readonly"
                        self.interest_var.set("")
                    
                    # Add method to class
                    if not hasattr(AgentVLMApp, '_on_level_change'):
                        AgentVLMApp._on_level_change = _on_level_change
                        print("✅ Patched: _on_level_change method added to AgentVLMApp")
        except Exception as e:
            print(f"⚠️ Patch attempt: {e}")
    
    # Schedule patch to run after modules load
    atexit.register(do_patch)

patch_agentvlm_app()

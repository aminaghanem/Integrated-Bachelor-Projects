# test_db.py
from database import db

print("=" * 50)
print("Testing MongoDB Connection & Grade Mapping")
print("=" * 50)

if db.connected:
    print("✅ Connected to MongoDB Atlas\n")
    
    # First, see what grades are actually stored in the DB
    print("Checking raw database contents:")
    db.get_all_subjects_debug()
    
    print("\nFetching subjects by school level:")
    for level in ["Elementary School", "Middle School", "High School"]:
        subjects = db.get_subjects_by_school_level(level)
        print(f"\n{level} (Grades as defined in code):")
        for i, subj in enumerate(subjects, 1):
            print(f"  {i}. {subj}")
else:
    print("❌ Failed to connect - using fallbacks")
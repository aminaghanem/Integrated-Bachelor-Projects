# database.py
import certifi
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

log = logging.getLogger("AGentVLM")

class SubjectDatabase:
    def __init__(self):
        MONGO_URI = "mongodb+srv://aminaghanemkhalil_db_user:FtMggldiz2lY2pDA@cluster0.ok9wzt0.mongodb.net/?appName=Cluster0"
        
        self.client = None
        self.db = None
        self.connected = False
        
        try:
            self.client = MongoClient(
                MONGO_URI,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=5000
            )
            self.client.admin.command('ping')
            self.db = self.client["test"]
            self.subjects_collection = self.db["subjects"]
            self.connected = True
            log.info("✅ Connected to MongoDB successfully")
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            log.error(f"⚠️ MongoDB connection failed: {e}")
            self.connected = False
        except Exception as e:
            log.error(f"⚠️ Unexpected error: {e}")
            self.connected = False
    
    def get_subjects_by_school_level(self, school_level: str) -> list:
        """Fetch subjects from DB based on school level using grade ranges 1-12."""
        if not self.connected:
            return self._get_fallback_subjects(school_level)
        
        # Map school levels to grade ranges (as per your DB structure)
        # Note: MongoDB might store grades as strings or integers
        # We'll query for both to be safe
        grade_mapping = {
            "Elementary School": ["1", "2", "3", "4", "5", 1, 2, 3, 4, 5],
            "Middle School":     ["6", "7", "8", 6, 7, 8],
            "High School":       ["9", "10", "11", "12", 9, 10, 11, 12]
        }
        
        target_grades = grade_mapping.get(school_level, [])
        
        if not target_grades:
            return []
        
        try:
            # Query: Find subjects where grade_levels array contains ANY of the target grades
            # This handles both string and integer grade formats in the DB
            cursor = self.subjects_collection.find(
                {"grade_levels": {"$in": target_grades}},
                {"name": 1, "_id": 0}
            ).sort("name", 1)
            
            subjects = [doc["name"] for doc in cursor]
            
            if not subjects:
                log.warning(f"No subjects found for {school_level}, using fallback")
                return self._get_fallback_subjects(school_level)
                
            return subjects
            
        except Exception as e:
            log.error(f"Error querying subjects: {e}")
            return self._get_fallback_subjects(school_level)
    
    def get_all_subjects_debug(self):
        """Debug helper to see what's actually in the database."""
        if not self.connected:
            print("Not connected to DB")
            return
            
        print("\n📊 DEBUG: Raw data from database:")
        cursor = self.subjects_collection.find({}, {"name": 1, "grade_levels": 1})
        for doc in cursor:
            grades = doc.get('grade_levels', [])
            print(f"  - {doc['name']}: grades {grades} (types: {[type(g).__name__ for g in grades[:1]]})")
    
    def _get_fallback_subjects(self, school_level: str) -> list:
        """Hardcoded fallback if DB is down."""
        fallbacks = {
            "Elementary School": [
                "Math", "Science", "Reading", "Art", "Music",
                "Sports", "Social Studies", "Computer Science", "Arabic",
            ],
            "Middle School": [
                "Math", "Biology", "Chemistry", "Physics", "English",
                "History", "Computer Science", "Art", "Arabic", "Music", "Sports",
            ],
            "High School": [
                "Math", "Physics", "Chemistry", "Biology", "English",
                "History", "Sports", "Music", "Computer Science", "Arabic", "Art",
            ],
        }
        return fallbacks.get(school_level, ["Math", "Science"])

# Singleton instance
db = SubjectDatabase()
# database.py
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import logging

log = logging.getLogger("AGentVLM")

class SubjectDatabase:
    def __init__(self):
        # Your connection string
        MONGO_URI = "mongodb+srv://aminaghanemkhalil_db_user:FtMggldiz2lY2pDA@cluster0.ok9wzt0.mongodb.net/?appName=Cluster0"
        
        self.client = None
        self.db = None
        self.connected = False
        
        try:
            # Connect with timeout to avoid hanging
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            # Verify connection
            self.client.admin.command('ping')
            
            # Based on your screenshot: database="test", collection="subjects"
            self.db = self.client["test"]
            self.subjects_collection = self.db["subjects"]
            
            self.connected = True
            log.info("✅ Connected to MongoDB successfully")
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            log.error(f"⚠️ MongoDB connection failed: {e}")
            self.connected = False
    
    def get_subjects_by_school_level(self, school_level: str) -> list:
        """
        Fetch subjects from DB based on school level.
        Maps GUI school levels to grade ranges matching your DB schema.
        """
        if not self.connected:
            log.warning("Database not connected, using fallback subjects")
            return self._get_fallback_subjects(school_level)
        
        # Map your GUI levels to grade numbers (1-12)
        # Based on your screenshot showing grade_levels as arrays like [1,2,3,4,5...]
        grade_mapping = {
            "Elementary School": [1, 2, 3, 4, 5],
            "Middle School": [6, 7, 8], 
            "High School": [9, 10, 11, 12]
        }
        
        target_grades = grade_mapping.get(school_level, [])
        
        if not target_grades:
            return []
        
        try:
            # Query: Find subjects where grade_levels array contains ANY of the target grades
            # This matches your DB schema where grade_levels is an array field
            cursor = self.subjects_collection.find(
                {"grade_levels": {"$in": target_grades}},
                {"name": 1, "_id": 0}  # Only return the name field
            ).sort("name", 1)  # Sort alphabetically
            
            subjects = [doc["name"] for doc in cursor]
            
            if not subjects:
                log.warning(f"No subjects found for {school_level}, using fallback")
                return self._get_fallback_subjects(school_level)
                
            return subjects
            
        except Exception as e:
            log.error(f"Error querying subjects: {e}")
            return self._get_fallback_subjects(school_level)
    
    def _get_fallback_subjects(self, school_level: str) -> list:
        """Hardcoded fallback if DB is down - matches your current INTEREST_OPTIONS"""
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

# Singleton instance - import this in appp(2).py
db = SubjectDatabase()
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class Database:
    def __init__(self, db_name="notes.db"):
        self.db_name = db_name
    
    def get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """Initialize the database with required tables"""
        with self.get_connection() as conn:
            # Users table for authentication
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT UNIQUE
                )
            """)
            
            # Notes table with user_id for ownership
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notes (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    title TEXT NOT NULL,
                    content TEXT,
                    folder TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Folders table for organization
            conn.execute("""
                CREATE TABLE IF NOT EXISTS folders (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    parent_id INTEGER,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (parent_id) REFERENCES folders (id)
                )
            """)


class User:
    def __init__(self, db):
        self.db = db
    
    def create(self, username, password, email=None):
        """Create a new user"""
        hashed_password = generate_password_hash(password)
        
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
                    (username, hashed_password, email)
                )
                user_id = cursor.lastrowid
                return user_id
        except sqlite3.IntegrityError:
            # Username or email already exists
            return None
    
    def authenticate(self, username, password):
        """Authenticate a user by username and password"""
        with self.db.get_connection() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE username = ?", 
                (username,)
            ).fetchone()
            
            if user and check_password_hash(user['password'], password):
                return dict(user)
            return None
    
    def get_by_id(self, user_id):
        """Get user by ID"""
        with self.db.get_connection() as conn:
            user = conn.execute(
                "SELECT id, username, email FROM users WHERE id = ?", 
                (user_id,)
            ).fetchone()
            
            if user:
                return dict(user)
            return None


class Note:
    def __init__(self, db):
        self.db = db
    
    def create(self, user_id, title, content="", folder=None):
        """Create a new note"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO notes (user_id, title, content, folder) VALUES (?, ?, ?, ?)",
                (user_id, title, content, folder)
            )
            note_id = cursor.lastrowid
            
            # Return the newly created note
            note = conn.execute(
                "SELECT * FROM notes WHERE id = ?", 
                (note_id,)
            ).fetchone()
            
            return dict(note) if note else None
    
    def get_all_by_user(self, user_id):
        """Get all notes for a user"""
        with self.db.get_connection() as conn:
            notes = conn.execute(
                """
                SELECT id, title, content, folder, created_at
                FROM notes 
                WHERE user_id = ?
                ORDER BY created_at DESC
                """, 
                (user_id,)
            ).fetchall()
            
            return [dict(note) for note in notes]
    
    def get_by_id(self, note_id, user_id=None):
        """Get a note by ID, optionally checking user ownership"""
        with self.db.get_connection() as conn:
            if user_id:
                note = conn.execute(
                    "SELECT * FROM notes WHERE id = ? AND user_id = ?", 
                    (note_id, user_id)
                ).fetchone()
            else:
                note = conn.execute(
                    "SELECT * FROM notes WHERE id = ?", 
                    (note_id,)
                ).fetchone()
            
            return dict(note) if note else None
    
    def update(self, note_id, user_id, title=None, content=None, folder=None):
        """Update a note"""
        # Get current note data
        current_note = self.get_by_id(note_id, user_id)
        if not current_note:
            return False
        
        # Update with new values or keep current ones
        new_title = title if title is not None else current_note['title']
        new_content = content if content is not None else current_note['content']
        new_folder = folder if folder is not None else current_note['folder']
        
        with self.db.get_connection() as conn:
            conn.execute(
                """
                UPDATE notes 
                SET title = ?, content = ?, folder = ?
                WHERE id = ? AND user_id = ?
                """,
                (new_title, new_content, new_folder, note_id, user_id)
            )
            
            return True
    
    def delete(self, note_id, user_id):
        """Delete a note"""
        with self.db.get_connection() as conn:
            conn.execute(
                "DELETE FROM notes WHERE id = ? AND user_id = ?", 
                (note_id, user_id)
            )
            
            return True


class Folder:
    def __init__(self, db):
        self.db = db
    
    def create(self, user_id, name, parent_id=None):
        """Create a new folder"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO folders (user_id, name, parent_id) VALUES (?, ?, ?)",
                (user_id, name, parent_id)
            )
            folder_id = cursor.lastrowid
            
            # Return the newly created folder
            folder = conn.execute(
                "SELECT * FROM folders WHERE id = ?", 
                (folder_id,)
            ).fetchone()
            
            return dict(folder) if folder else None
    
    def get_all_by_user(self, user_id):
        """Get all folders for a user"""
        with self.db.get_connection() as conn:
            folders = conn.execute(
                """
                SELECT id, name, parent_id
                FROM folders 
                WHERE user_id = ?
                ORDER BY name
                """, 
                (user_id,)
            ).fetchall()
            
            return [dict(folder) for folder in folders]
    
    def update(self, folder_id, user_id, name=None, parent_id=None):
        """Update a folder"""
        # Get current folder data
        with self.db.get_connection() as conn:
            current_folder = conn.execute(
                "SELECT * FROM folders WHERE id = ? AND user_id = ?", 
                (folder_id, user_id)
            ).fetchone()
            
            if not current_folder:
                return False
            
            # Update with new values or keep current ones
            new_name = name if name is not None else current_folder['name']
            new_parent_id = parent_id if parent_id is not None else current_folder['parent_id']
            
            conn.execute(
                """
                UPDATE folders 
                SET name = ?, parent_id = ?
                WHERE id = ? AND user_id = ?
                """,
                (new_name, new_parent_id, folder_id, user_id)
            )
            
            return True
    
    def delete(self, folder_id, user_id):
        """Delete a folder and update notes that were in it"""
        with self.db.get_connection() as conn:
            # Update notes in this folder to have no folder
            conn.execute(
                """
                UPDATE notes 
                SET folder = NULL
                WHERE folder = ? AND user_id = ?
                """, 
                (folder_id, user_id)
            )
            
            # Delete the folder
            conn.execute(
                "DELETE FROM folders WHERE id = ? AND user_id = ?", 
                (folder_id, user_id)
            )
            
            return True
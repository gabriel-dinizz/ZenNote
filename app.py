from flask import Flask, render_template, request, redirect, jsonify, session, flash, url_for
import sqlite3
import os
import json
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.urandom(24)  # For session management

# Create DB if not exists
def init_db():
    with sqlite3.connect("notes.db") as conn:
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


# Main routes
@app.route("/")
def index():
    if 'user_id' in session:
        return redirect("/notes")
    return redirect("/login")


@app.route("/login", methods=["GET", "POST"])
def login():
    # If user is already logged in, redirect to notes
    if 'user_id' in session:
        return redirect("/notes")
        
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        
        with sqlite3.connect("notes.db") as conn:
            user = conn.execute("SELECT * FROM users WHERE username = ?", 
                              (username,)).fetchone()
            
        if user and check_password_hash(user[2], password):
            session['user_id'] = user[0]
            session['username'] = user[1]
            return redirect("/notes")
        else:
            flash("Invalid username or password")
            
    return render_template("menu.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    # If user is already logged in, redirect to notes
    if 'user_id' in session:
        return redirect("/notes")
        
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")
        email = request.form.get("email") if "email" in request.form else None
        
        if password != confirm_password:
            flash("Passwords do not match")
            return render_template("register.html")
        
        hashed_password = generate_password_hash(password)
        
        try:
            with sqlite3.connect("notes.db") as conn:
                conn.execute("INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
                          (username, hashed_password, email))
                
            flash("Registration successful. Please log in.")
            return redirect("/login")
        except sqlite3.IntegrityError:
            flash("Username or email already exists")
            
    return render_template("register.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


@app.route("/notes")
def notes():
    if 'user_id' not in session:
        # Redirect to login if not logged in
        flash("Please log in to access your notes")
        return redirect("/login")
    
    return render_template("editor.html", username=session.get('username', 'User'))


# Provide a separate route for landing page if needed
@app.route("/welcome")
def welcome():
    return render_template("index.html")


# API Routes for AJAX calls

@app.route("/api/notes", methods=["GET"])
def get_notes():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session['user_id']
    
    with sqlite3.connect("notes.db") as conn:
        conn.row_factory = sqlite3.Row
        notes = conn.execute("""
            SELECT id, title, content, folder, created_at
            FROM notes 
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,)).fetchall()
    
    notes_list = [dict(note) for note in notes]
    return jsonify(notes_list)


@app.route("/api/notes", methods=["POST"])
def create_note():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    user_id = session['user_id']
    title = data.get('title', 'Untitled')
    content = data.get('content', '')
    folder = data.get('folder', None)
    
    with sqlite3.connect("notes.db") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO notes (user_id, title, content, folder)
            VALUES (?, ?, ?, ?)
        """, (user_id, title, content, folder))
        note_id = cursor.lastrowid
    
    return jsonify({
        "id": note_id,
        "title": title,
        "content": content,
        "folder": folder
    })


@app.route("/api/notes/<int:note_id>", methods=["GET"])
def get_note(note_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session['user_id']
    
    with sqlite3.connect("notes.db") as conn:
        conn.row_factory = sqlite3.Row
        note = conn.execute("""
            SELECT id, title, content, folder, created_at
            FROM notes 
            WHERE id = ? AND user_id = ?
        """, (note_id, user_id)).fetchone()
    
    if note:
        return jsonify(dict(note))
    return jsonify({"error": "Note not found"}), 404


@app.route("/api/notes/<int:note_id>", methods=["PUT"])
def update_note(note_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    user_id = session['user_id']
    title = data.get('title')
    content = data.get('content')
    folder = data.get('folder')
    
    with sqlite3.connect("notes.db") as conn:
        conn.execute("""
            UPDATE notes 
            SET title = ?, content = ?, folder = ?
            WHERE id = ? AND user_id = ?
        """, (title, content, folder, note_id, user_id))
    
    return jsonify({"success": True})


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session['user_id']
    
    with sqlite3.connect("notes.db") as conn:
        conn.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", 
                  (note_id, user_id))
    
    return jsonify({"success": True})


@app.route("/api/folders", methods=["GET"])
def get_folders():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session['user_id']
    
    with sqlite3.connect("notes.db") as conn:
        conn.row_factory = sqlite3.Row
        folders = conn.execute("""
            SELECT id, name, parent_id
            FROM folders 
            WHERE user_id = ?
            ORDER BY name
        """, (user_id,)).fetchall()
    
    folders_list = [dict(folder) for folder in folders]
    return jsonify(folders_list)


@app.route("/api/folders", methods=["POST"])
def create_folder():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    user_id = session['user_id']
    name = data.get('name', 'New Folder')
    parent_id = data.get('parent_id')
    
    with sqlite3.connect("notes.db") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO folders (user_id, name, parent_id)
            VALUES (?, ?, ?)
        """, (user_id, name, parent_id))
        folder_id = cursor.lastrowid
    
    return jsonify({
        "id": folder_id,
        "name": name,
        "parent_id": parent_id
    })


@app.route("/api/folders/<int:folder_id>", methods=["PUT"])
def update_folder(folder_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    user_id = session['user_id']
    name = data.get('name')
    parent_id = data.get('parent_id')
    
    with sqlite3.connect("notes.db") as conn:
        conn.execute("""
            UPDATE folders 
            SET name = ?, parent_id = ?
            WHERE id = ? AND user_id = ?
        """, (name, parent_id, folder_id, user_id))
    
    return jsonify({"success": True})


@app.route("/api/folders/<int:folder_id>", methods=["DELETE"])
def delete_folder(folder_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session['user_id']
    
    with sqlite3.connect("notes.db") as conn:
        # Also delete or reassign notes in this folder
        conn.execute("""
            UPDATE notes 
            SET folder = NULL
            WHERE folder = ? AND user_id = ?
        """, (folder_id, user_id))
        
        # Delete the folder
        conn.execute("""
            DELETE FROM folders 
            WHERE id = ? AND user_id = ?
        """, (folder_id, user_id))
    
    return jsonify({"success": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)

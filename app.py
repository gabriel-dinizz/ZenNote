from flask import Flask, render_template, request, redirect
import sqlite3

app = Flask(__name__)

# Create DB if not exists
def init_db():
    with sqlite3.connect("notes.db") as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT, content TEXT)")

@app.route("/")
def menu():
    return render_template("menu.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/register")
def register():
    return render_template("register.html")

@app.route("/notes", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        title = request.form["title"]
        content = request.form["content"]
        with sqlite3.connect("notes.db") as conn:
            conn.execute("INSERT INTO notes (title, content) VALUES (?, ?)", (title, content))
        return redirect("/")
    
    with sqlite3.connect("notes.db") as conn:
        notes = conn.execute("SELECT * FROM notes").fetchall()
    return render_template("index.html", notes=notes)


@app.route("/delete/<int:note_id>")
def delete_note(note_id):
    with sqlite3.connect("notes.db") as conn:
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    return redirect("/")

if __name__ == "__main__":
    init_db()
    app.run(debug=True)

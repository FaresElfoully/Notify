from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import sqlite3
from datetime import datetime
import os
from ai_enhancer import TaskEnhancer
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize database
def init_db():
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    
    # Drop existing table if it exists
    c.execute('DROP TABLE IF EXISTS tasks')
    
    # Create new table with updated schema
    c.execute('''
        CREATE TABLE IF NOT EXISTS tasks
        (id INTEGER PRIMARY KEY AUTOINCREMENT,
         title TEXT NOT NULL,
         task_type TEXT NOT NULL,
         notification_time TEXT NOT NULL,
         reminder_text TEXT NOT NULL,
         created_at TEXT NOT NULL)
    ''')
    conn.commit()
    conn.close()

# Initialize AI enhancer with API key
AI_API_KEY = "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"
task_enhancer = TaskEnhancer(AI_API_KEY)

# Task types
TASK_TYPES = ['Work', 'Personal', 'Shopping', 'Health', 'Other']

# Create database and table
init_db()

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.route('/')
def health_check():
    return jsonify({"status": "healthy", "message": "Server is running"}), 200

@app.route('/api/task-types', methods=['GET'])
def get_task_types():
    return jsonify(TASK_TYPES)

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        conn = sqlite3.connect('tasks.db')
        conn.row_factory = dict_factory
        c = conn.cursor()
        c.execute('SELECT * FROM tasks ORDER BY notification_time')
        tasks = c.fetchall()
        conn.close()
        return jsonify(tasks)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks', methods=['POST'])
def add_task():
    try:
        data = request.json
        required_fields = ['title', 'taskType', 'notificationTime', 'reminderText']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        if data['taskType'] not in TASK_TYPES:
            return jsonify({'error': 'Invalid task type'}), 400

        conn = sqlite3.connect('tasks.db')
        c = conn.cursor()
        c.execute('''
            INSERT INTO tasks (title, task_type, notification_time, reminder_text, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['title'],
            data['taskType'],
            data['notificationTime'],
            data['reminderText'],
            datetime.now().isoformat()
        ))
        conn.commit()
        task_id = c.lastrowid
        
        # Fetch the created task
        c.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
        task = dict_factory(c, c.fetchone())
        conn.close()

        # Emit the new task to all connected clients
        socketio.emit('new_task', task)
        
        return jsonify(task), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/enhance-task', methods=['POST'])
def enhance_task():
    try:
        logger.info("Received enhance task request")
        data = request.json
        if not data or 'text' not in data:
            logger.error("Missing text field in request")
            return jsonify({'error': 'Missing text field'}), 400

        logger.info(f"Processing task text: {data['text']}")
        enhanced_task = task_enhancer.enhance_task(data['text'])
        logger.info(f"Task enhanced successfully: {enhanced_task}")
        return jsonify(enhanced_task), 200
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error enhancing task: {error_msg}")
        return jsonify({
            'error': error_msg,
            'details': {
                'type': type(e).__name__,
                'message': str(e)
            }
        }), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        conn = sqlite3.connect('tasks.db')
        c = conn.cursor()
        c.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()
        
        # Emit the deleted task ID to all connected clients
        socketio.emit('delete_task', {'id': task_id})
        
        return '', 204
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)

from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import logging
import re
from functools import wraps

app = Flask(__name__)
CORS(app, origins=["https://your-todo-app.vercel.app"])
app.config['SECRET_KEY'] = 'your-super-secret-key-change-this'

# Setup logging
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# In-memory database
# users_db[username] = {
#   "password": "xxx",
#   "email": "xxx",
#   "security_question": "xxx",
#   "security_answer": "xxx"
# }
users_db = {}

# Store reset tokens temporarily
reset_tokens = {}  # username: {"token": "xxx", "expires_at": timestamp}

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data['username']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

# ========== SECURITY QUESTIONS ==========
SECURITY_QUESTIONS = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What was your first car?",
    "What city were you born in?",
    "What is your favorite book?",
    "What was your elementary school name?",
    "What is your father's middle name?",
    "What was your first job?",
    "What is your favorite movie?",
    "What is your best friend's name?"
]

@app.route('/security-questions', methods=['GET'])
def get_security_questions():
    """Get list of available security questions"""
    return jsonify({'questions': SECURITY_QUESTIONS}), 200

# ========== REGISTER ENDPOINT ==========
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        security_question = data.get('security_question')
        security_answer = data.get('security_answer')
        
        if not username or not email or not password:
            return jsonify({'message': 'Username, email and password are required'}), 400
        
        if not security_question or not security_answer:
            return jsonify({'message': 'Security question and answer are required'}), 400
        
        if len(password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400
        
        if username in users_db:
            return jsonify({'message': 'Username already exists'}), 400
        
        if not is_valid_email(email):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Store user with security question and answer (answer stored in lowercase for case-insensitive comparison)
        users_db[username] = {
            "password": password,
            "email": email,
            "security_question": security_question,
            "security_answer": security_answer.lower().strip()
        }
        
        logging.info(f'New user registered: {username} ({email})')
        
        return jsonify({'message': 'User created successfully', 'username': username}), 201
        
    except Exception as e:
        logging.error(f'Registration error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500

# ========== LOGIN ENDPOINT ==========
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'message': 'Username and password required'}), 400
        
        if username not in users_db or users_db[username]["password"] != password:
            logging.warning(f'Failed login attempt for: {username}')
            return jsonify({'message': 'Invalid username or password'}), 401
        
        token = jwt.encode({
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
            'iat': datetime.datetime.utcnow()
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        logging.info(f'User logged in: {username}')
        
        return jsonify({'token': token, 'message': 'Login successful', 'username': username}), 200
        
    except Exception as e:
        logging.error(f'Login error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500

# ========== FORGOT PASSWORD - GET SECURITY QUESTION ==========
@app.route('/get-security-question', methods=['POST'])
def get_security_question():
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
            return jsonify({'message': 'Username is required'}), 400
        
        if username not in users_db:
            # Don't reveal if user exists (security)
            return jsonify({'message': 'If account exists, security question will be shown'}), 200
        
        user = users_db[username]
        
        return jsonify({
            'security_question': user['security_question'],
            'username': username
        }), 200
        
    except Exception as e:
        logging.error(f'Get security question error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500

# ========== VERIFY SECURITY ANSWER ==========
@app.route('/verify-security-answer', methods=['POST'])
def verify_security_answer():
    try:
        data = request.get_json()
        username = data.get('username')
        answer = data.get('answer')
        
        if not username or not answer:
            return jsonify({'message': 'Username and answer are required'}), 400
        
        if username not in users_db:
            return jsonify({'message': 'User not found'}), 404
        
        user = users_db[username]
        
        # Verify answer (case-insensitive)
        if user['security_answer'] != answer.lower().strip():
            logging.warning(f'Failed security answer attempt for: {username}')
            return jsonify({'message': 'Incorrect answer'}), 401
        
        # Generate reset token (valid for 15 minutes)
        reset_token = jwt.encode({
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
            'type': 'password_reset'
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        # Store token with expiry
        reset_tokens[username] = {
            'token': reset_token,
            'expires_at': (datetime.datetime.now() + datetime.timedelta(minutes=15)).timestamp()
        }
        
        logging.info(f'Security answer verified for: {username}')
        
        return jsonify({
            'message': 'Answer verified successfully',
            'reset_token': reset_token
        }), 200
        
    except Exception as e:
        logging.error(f'Verify security answer error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500

# ========== RESET PASSWORD ==========
@app.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        reset_token = data.get('reset_token')
        new_password = data.get('new_password')
        
        if not reset_token or not new_password:
            return jsonify({'message': 'Reset token and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400
        
        # Decode token
        try:
            token_data = jwt.decode(reset_token, app.config['SECRET_KEY'], algorithms=['HS256'])
            username = token_data['username']
            
            # Verify token is for password reset
            if token_data.get('type') != 'password_reset':
                return jsonify({'message': 'Invalid reset token'}), 400
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Reset token has expired. Please request a new one.'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid reset token'}), 400
        
        # Check if user exists
        if username not in users_db:
            return jsonify({'message': 'User not found'}), 404
        
        # Update password
        users_db[username]["password"] = new_password
        
        # Clean up used token
        if username in reset_tokens:
            del reset_tokens[username]
        
        logging.info(f'Password reset successful for user: {username}')
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        logging.error(f'Reset password error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500

# ========== PROTECTED ENDPOINT ==========
@app.route('/protected', methods=['GET'])
@token_required
def protected(current_user):
    return jsonify({
        'message': f'Welcome {current_user}! You have accessed a protected route.',
        'user': current_user,
        'status': 'authenticated'
    }), 200

# ========== HEALTH CHECK ==========
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.datetime.now().isoformat()}), 200

if __name__ == '__main__':
    print("🚀 Server starting on http://localhost:5000")
    print("📝 Available endpoints:")
    print("   POST /register - Create account with security question")
    print("   POST /login - Login to account")
    print("   POST /get-security-question - Get user's security question")
    print("   POST /verify-security-answer - Verify security answer")
    print("   POST /reset-password - Reset password")
    print("   GET /protected - Test auth (requires token)")
    print("   GET /health - Health check")
    app.run(debug=True, port=5000)
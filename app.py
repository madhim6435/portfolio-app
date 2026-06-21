import os
import json
import re
from datetime import datetime

from flask import (
    Flask, render_template, request, redirect, url_for,
    jsonify, session, flash, send_from_directory
)
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user
)
from flask_sqlalchemy import SQLAlchemy
from authlib.integrations.flask_client import OAuth
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config.from_object('config.Config')

db = SQLAlchemy(app)
oauth = OAuth(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# ── Models ──

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(120), unique=True)
    email = db.Column(db.String(120), unique=True)
    name = db.Column(db.String(120))
    username = db.Column(db.String(60), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    portfolio = db.relationship('Portfolio', backref='user', uselist=False)

class Portfolio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True)
    data = db.Column(db.Text, default='{}')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

# ── Auth ──

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

google = oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

@app.route('/login')
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/auth/google')
def auth_google():
    redirect_uri = url_for('auth_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/auth/callback')
def auth_callback():
    try:
        token = google.authorize_access_token()
        userinfo = token.get('userinfo')
        if not userinfo:
            userinfo = google.parse_id_token(token)
    except Exception as e:
        flash('התחברות נכשלה', 'error')
        return redirect(url_for('login'))

    google_id = userinfo['sub']
    email = userinfo.get('email', '')
    name = userinfo.get('name', '')

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        # New user – try to create username from email
        base = email.split('@')[0].lower()
        username = re.sub(r'[^a-z0-9_-]', '', base)[:50]
        if not username:
            username = f'user{google_id[:8]}'
        # Ensure unique
        existing = User.query.filter_by(username=username).first()
        if existing:
            username = f'{username}{User.query.count() + 1}'

        user = User(google_id=google_id, email=email, name=name, username=username)
        db.session.add(user)
        db.session.flush()

        # Create empty portfolio
        initial = {
            'projects': [],
            'about': {'name': name, 'role': '', 'email': email, 'phone': '',
                      'location': '', 'heroDesc': '', 'bio1': '', 'bio2': '',
                      'skills': [], 'stats': [], 'photo': ''},
            'theme': {
                'accent': '#e94560', 'bg': '#0d0d0d', 'surface': '#141414',
                'card': '#1a1a1a', 'text': '#f0f0f0', 'textMuted': '#888888',
                'border': '#2a2a2a', 'radius': 12, 'siteName': '', 'heroTitle': '',
                'ctaText': '', 'portfolioSub': '', 'showStats': True, 'showAbout': True
            },
            'categories': [
                {'value': 'logo', 'label': 'לוגו'},
                {'value': 'branding', 'label': 'מיתוג'},
                {'value': 'web', 'label': 'עיצוב רשת'},
                {'value': 'print', 'label': 'דפוס'}
            ]
        }
        portfolio = Portfolio(user_id=user.id, data=json.dumps(initial))
        db.session.add(portfolio)
        db.session.commit()

    login_user(user)
    return redirect(url_for('dashboard'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# ── Routes ──

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@app.route('/u/<username>')
def public_portfolio(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return render_template('public.html', exists=False, username=username)
    portfolio = user.portfolio
    data = json.loads(portfolio.data) if portfolio else {}
    return render_template('public.html', exists=True, user=user, data=data)

# ── API ──

@app.route('/api/portfolio', methods=['GET'])
@login_required
def get_portfolio():
    portfolio = current_user.portfolio
    if not portfolio:
        return jsonify({})
    return jsonify(json.loads(portfolio.data))

@app.route('/api/portfolio', methods=['POST'])
@login_required
def save_portfolio():
    portfolio = current_user.portfolio
    if not portfolio:
        portfolio = Portfolio(user_id=current_user.id, data='{}')
        db.session.add(portfolio)
    portfolio.data = json.dumps(request.json)
    portfolio.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/portfolio/upload', methods=['POST'])
@login_required
def upload_image():
    if 'file' not in request.files:
        return jsonify({'error': 'no file'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    # Save with unique name
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
    name = f'u{current_user.id}_{datetime.utcnow().strftime("%Y%m%d%H%M%S%f")}.{ext}'
    path = os.path.join(app.config['UPLOAD_FOLDER'], name)
    file.save(path)

    url = url_for('uploaded_file', filename=name, _external=True)
    return jsonify({'url': url})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/portfolio/check-username', methods=['POST'])
@login_required
def check_username():
    new_username = request.json.get('username', '').strip().lower()
    new_username = re.sub(r'[^a-z0-9_-]', '', new_username)[:50]
    if not new_username:
        return jsonify({'valid': False, 'error': 'invalid'})
    existing = User.query.filter_by(username=new_username).first()
    if existing and existing.id != current_user.id:
        return jsonify({'valid': False, 'error': 'taken'})
    return jsonify({'valid': True, 'username': new_username})

@app.route('/api/portfolio/update-username', methods=['POST'])
@login_required
def update_username():
    new_username = request.json.get('username', '').strip().lower()
    new_username = re.sub(r'[^a-z0-9_-]', '', new_username)[:50]
    if not new_username:
        return jsonify({'error': 'invalid'}), 400
    existing = User.query.filter_by(username=new_username).first()
    if existing and existing.id != current_user.id:
        return jsonify({'error': 'taken'}), 400
    current_user.username = new_username
    db.session.commit()
    return jsonify({'ok': True, 'username': new_username})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

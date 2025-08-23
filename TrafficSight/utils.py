import os
import uuid
from PIL import Image
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from app import db
from models import User, Notification, Badge, UserBadge, VisitorCount

def save_file(file, folder):
    """Save uploaded file with secure filename"""
    if file:
        filename = secure_filename(file.filename)
        # Add UUID to prevent filename conflicts
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Ensure upload directory exists
        upload_path = os.path.join('static', 'uploads', folder)
        os.makedirs(upload_path, exist_ok=True)
        
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)
        
        # Resize image if it's an image file
        if folder == 'images' and ext.lower() in ['.jpg', '.jpeg', '.png']:
            resize_image(file_path)
        
        return f"uploads/{folder}/{filename}"
    return None

def resize_image(file_path, max_size=(800, 600)):
    """Resize image to reduce file size"""
    try:
        with Image.open(file_path) as img:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            img.save(file_path, optimize=True, quality=85)
    except Exception as e:
        print(f"Error resizing image: {e}")

def update_visitor_count():
    """Increment visitor count"""
    visitor_count = VisitorCount.query.first()
    if not visitor_count:
        visitor_count = VisitorCount(count=1)
        db.session.add(visitor_count)
    else:
        visitor_count.count += 1
    db.session.commit()
    return visitor_count.count

def create_notification(user_id, notification_type, content, related_post_id=None, related_user_id=None):
    """Create a new notification for a user"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        content=content,
        related_post_id=related_post_id,
        related_user_id=related_user_id
    )
    db.session.add(notification)
    db.session.commit()

def update_user_status(user, is_online=True):
    """Update user's online status and last seen"""
    user.is_online = is_online
    user.last_seen = datetime.utcnow()
    db.session.commit()

def check_offline_users():
    """Mark users as offline if they haven't been seen for more than 1 minute"""
    cutoff_time = datetime.utcnow() - timedelta(minutes=1)
    offline_users = User.query.filter(
        User.is_online == True,
        User.last_seen < cutoff_time
    ).all()
    
    for user in offline_users:
        user.is_online = False
    
    if offline_users:
        db.session.commit()

def award_points(user, points, reason):
    """Award points to user and check for level up"""
    user.points += points
    
    # Calculate new level (every 100 points = 1 level)
    new_level = (user.points // 100) + 1
    if new_level > user.level:
        user.level = new_level
        create_notification(user.id, 'achievement', f'Congratulations! You reached level {new_level}!')
    
    db.session.commit()
    
    # Check for badges
    check_badges(user)

def check_badges(user):
    """Check and award badges to user"""
    badges_to_award = []
    
    # First Comment badge
    if user.comments.count() >= 1:
        badge = Badge.query.filter_by(name='First Comment').first()
        if badge and not UserBadge.query.filter_by(user_id=user.id, badge_id=badge.id).first():
            badges_to_award.append(badge)
    
    # 100 Likes badge
    total_likes = sum(post.get_likes_count() for post in user.posts)
    if total_likes >= 100:
        badge = Badge.query.filter_by(name='100 Likes').first()
        if badge and not UserBadge.query.filter_by(user_id=user.id, badge_id=badge.id).first():
            badges_to_award.append(badge)
    
    # Award badges
    for badge in badges_to_award:
        user_badge = UserBadge(user_id=user.id, badge_id=badge.id)
        db.session.add(user_badge)
        create_notification(user.id, 'badge', f'You earned the "{badge.name}" badge!')
    
    if badges_to_award:
        db.session.commit()

def get_daily_content():
    """Get or create daily content"""
    from models import DailyContent
    import random
    
    today = datetime.utcnow().date()
    daily_content = DailyContent.query.filter_by(date=today, is_active=True).first()
    
    if not daily_content:
        # Create new daily content
        content_types = ['quote', 'joke', 'fact']
        content_type = random.choice(content_types)
        
        contents = {
            'quote': [
                "The only way to do great work is to love what you do. - Steve Jobs",
                "Innovation distinguishes between a leader and a follower. - Steve Jobs",
                "Life is what happens to you while you're busy making other plans. - John Lennon"
            ],
            'joke': [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? He was outstanding in his field!",
                "Why don't eggs tell jokes? They'd crack each other up!"
            ],
            'fact': [
                "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still edible.",
                "Octopuses have three hearts and blue blood.",
                "A group of flamingos is called a 'flamboyance'."
            ]
        }
        
        content = random.choice(contents[content_type])
        daily_content = DailyContent(
            content_type=content_type,
            content=content,
            date=today
        )
        db.session.add(daily_content)
        db.session.commit()
    
    return daily_content

def init_badges():
    """Initialize default badges"""
    default_badges = [
        {'name': 'First Comment', 'description': 'Made your first comment', 'icon': 'fa-comment'},
        {'name': '100 Likes', 'description': 'Received 100 likes on your posts', 'icon': 'fa-heart'},
        {'name': 'Daily Login 7', 'description': 'Logged in for 7 consecutive days', 'icon': 'fa-calendar-check'},
        {'name': 'Video Pioneer', 'description': 'Uploaded your first video', 'icon': 'fa-video'},
        {'name': 'Poll Master', 'description': 'Created 10 polls', 'icon': 'fa-poll'},
    ]
    
    for badge_data in default_badges:
        existing_badge = Badge.query.filter_by(name=badge_data['name']).first()
        if not existing_badge:
            badge = Badge(**badge_data)
            db.session.add(badge)
    
    db.session.commit()

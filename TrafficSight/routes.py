import os
from flask import render_template, redirect, url_for, flash, request, jsonify, session, abort
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from sqlalchemy import func, desc, or_
import random

from app import app, db
from models import *
from forms import *
from utils import *

# Badge initialization moved to app.py

@app.before_request
def before_request():
    if current_user.is_authenticated:
        update_user_status(current_user, True)
    check_offline_users()

@app.route('/')
def index():
    if not session.get('visited'):
        update_visitor_count()
        session['visited'] = True
    
    visitor_count = VisitorCount.query.first()
    total_visitors = visitor_count.count if visitor_count else 0
    
    # Get recent posts (pinned first)
    posts = Post.query.order_by(desc(Post.is_pinned), desc(Post.created_at)).limit(10).all()
    
    # Get daily content
    daily_content = get_daily_content()
    
    # Get online users count
    online_users = User.query.filter_by(is_online=True).count()
    
    return render_template('index.html', 
                         posts=posts, 
                         total_visitors=total_visitors,
                         daily_content=daily_content,
                         online_users=online_users)

# Authentication routes
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        hashed_password = generate_password_hash(form.password.data)
        user = User(
            username=form.username.data,
            email=form.email.data,
            password_hash=hashed_password
        )
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! You can now log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('auth/register.html', form=form)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        
        if user and check_password_hash(user.password_hash, form.password.data):
            login_user(user, remember=form.remember_me.data)
            update_user_status(user, True)
            award_points(user, 5, 'Daily login')
            
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('dashboard'))
        
        flash('Invalid username or password', 'danger')
    
    return render_template('auth/login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    update_user_status(current_user, False)
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get user statistics
    user_posts = current_user.posts.count()
    user_comments = current_user.comments.count()
    user_badges = current_user.badges.count()
    
    # Get recent notifications
    notifications = current_user.notifications.filter_by(is_read=False).order_by(desc(Notification.created_at)).limit(5).all()
    
    # Get leaderboard
    top_users = User.query.order_by(desc(User.points)).limit(10).all()
    
    return render_template('dashboard.html',
                         user_posts=user_posts,
                         user_comments=user_comments,
                         user_badges=user_badges,
                         notifications=notifications,
                         top_users=top_users)

# Post routes
@app.route('/create_post', methods=['GET', 'POST'])
@login_required
def create_post():
    form = PostForm()
    if form.validate_on_submit():
        image_filename = None
        if form.image.data:
            image_filename = save_file(form.image.data, 'images')
        
        post = Post(
            title=form.title.data,
            content=form.content.data,
            image=image_filename,
            user_id=current_user.id
        )
        db.session.add(post)
        db.session.commit()
        
        award_points(current_user, 10, 'Created post')
        flash('Post created successfully!', 'success')
        return redirect(url_for('view_post', id=post.id))
    
    return render_template('posts/create.html', form=form)

@app.route('/post/<int:id>')
def view_post(id):
    post = Post.query.get_or_404(id)
    
    # Get comments
    comments = Comment.query.filter_by(post_id=id).order_by(Comment.created_at).all()
    
    # Check if current user has liked/disliked
    user_like = None
    if current_user.is_authenticated:
        user_like = Like.query.filter_by(user_id=current_user.id, post_id=id).first()
    
    form = CommentForm()
    return render_template('posts/view.html', post=post, comments=comments, user_like=user_like, form=form)

@app.route('/post/<int:id>/comment', methods=['POST'])
@login_required
def add_comment(id):
    post = Post.query.get_or_404(id)
    form = CommentForm()
    
    if form.validate_on_submit():
        comment = Comment(
            content=form.content.data,
            user_id=current_user.id,
            post_id=id
        )
        db.session.add(comment)
        db.session.commit()
        
        # Create notification for post author
        if post.user_id != current_user.id:
            create_notification(
                post.user_id,
                'comment',
                f'{current_user.username} commented on your post',
                related_post_id=post.id,
                related_user_id=current_user.id
            )
        
        award_points(current_user, 3, 'Added comment')
        flash('Comment added successfully!', 'success')
    
    return redirect(url_for('view_post', id=id))

@app.route('/like_post/<int:id>/<int:is_like>')
@login_required
def like_post(id, is_like):
    post = Post.query.get_or_404(id)
    existing_like = Like.query.filter_by(user_id=current_user.id, post_id=id).first()
    
    if existing_like:
        if existing_like.is_like == bool(is_like):
            # Remove like/dislike if clicking same button
            db.session.delete(existing_like)
        else:
            # Change like to dislike or vice versa
            existing_like.is_like = bool(is_like)
    else:
        # Add new like/dislike
        new_like = Like(
            user_id=current_user.id,
            post_id=id,
            is_like=bool(is_like)
        )
        db.session.add(new_like)
        
        # Create notification for post author
        if post.user_id != current_user.id:
            action = 'liked' if is_like else 'disliked'
            create_notification(
                post.user_id,
                'like',
                f'{current_user.username} {action} your post',
                related_post_id=post.id,
                related_user_id=current_user.id
            )
    
    db.session.commit()
    award_points(current_user, 1, 'Post interaction')
    return redirect(url_for('view_post', id=id))

# Profile routes
@app.route('/profile/<username>')
def view_profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    posts = user.posts.order_by(desc(Post.created_at)).all()
    videos = user.videos.order_by(desc(Video.created_at)).all()
    badges = user.badges.all()
    
    return render_template('profile/view.html', user=user, posts=posts, videos=videos, badges=badges)

@app.route('/edit_profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    form = ProfileForm()
    
    if form.validate_on_submit():
        current_user.bio = form.bio.data
        
        if form.profile_image.data:
            image_filename = save_file(form.profile_image.data, 'profiles')
            current_user.profile_image = image_filename
        
        db.session.commit()
        flash('Profile updated successfully!', 'success')
        return redirect(url_for('view_profile', username=current_user.username))
    
    form.bio.data = current_user.bio
    return render_template('profile/edit.html', form=form)

# Chat routes
@app.route('/chat/global')
@login_required
def global_chat():
    messages = Message.query.filter_by(is_global=True).order_by(desc(Message.created_at)).limit(50).all()
    messages.reverse()  # Show oldest first
    form = MessageForm()
    return render_template('chat/global.html', messages=messages, form=form)

@app.route('/chat/global/send', methods=['POST'])
@login_required
def send_global_message():
    form = MessageForm()
    if form.validate_on_submit():
        message = Message(
            content=form.content.data,
            sender_id=current_user.id,
            is_global=True
        )
        db.session.add(message)
        db.session.commit()
        
        award_points(current_user, 2, 'Chat participation')
        flash('Message sent!', 'success')
    
    return redirect(url_for('global_chat'))

@app.route('/chat/private/<username>')
@login_required
def private_chat(username):
    user = User.query.filter_by(username=username).first_or_404()
    
    if user.id == current_user.id:
        flash('You cannot chat with yourself!', 'warning')
        return redirect(url_for('dashboard'))
    
    # Get messages between current user and target user
    messages = Message.query.filter(
        Message.is_global == False,
        or_(
            (Message.sender_id == current_user.id) & (Message.recipient_id == user.id),
            (Message.sender_id == user.id) & (Message.recipient_id == current_user.id)
        )
    ).order_by(Message.created_at).all()
    
    form = MessageForm()
    return render_template('chat/private.html', messages=messages, user=user, form=form)

@app.route('/chat/private/<username>/send', methods=['POST'])
@login_required
def send_private_message(username):
    user = User.query.filter_by(username=username).first_or_404()
    form = MessageForm()
    
    if form.validate_on_submit():
        message = Message(
            content=form.content.data,
            sender_id=current_user.id,
            recipient_id=user.id,
            is_global=False
        )
        db.session.add(message)
        db.session.commit()
        
        # Create notification for recipient
        create_notification(
            user.id,
            'message',
            f'{current_user.username} sent you a message',
            related_user_id=current_user.id
        )
        
        award_points(current_user, 2, 'Private message')
        flash('Message sent!', 'success')
    
    return redirect(url_for('private_chat', username=username))

# Video routes
@app.route('/videos')
def video_feed():
    videos = Video.query.order_by(desc(Video.is_pinned), desc(Video.created_at)).all()
    return render_template('videos/feed.html', videos=videos)

@app.route('/upload_video', methods=['GET', 'POST'])
@login_required
def upload_video():
    form = VideoUploadForm()
    if form.validate_on_submit():
        video_filename = save_file(form.video.data, 'videos')
        
        if video_filename:
            video = Video(
                title=form.title.data,
                description=form.description.data,
                filename=video_filename,
                user_id=current_user.id
            )
            db.session.add(video)
            db.session.commit()
            
            award_points(current_user, 15, 'Video upload')
            flash('Video uploaded successfully!', 'success')
            return redirect(url_for('video_feed'))
        else:
            flash('Error uploading video. Please try again.', 'danger')
    
    return render_template('videos/upload.html', form=form)

@app.route('/like_video/<int:id>/<int:is_like>')
@login_required
def like_video(id, is_like):
    video = Video.query.get_or_404(id)
    existing_like = Like.query.filter_by(user_id=current_user.id, video_id=id).first()
    
    if existing_like:
        if existing_like.is_like == bool(is_like):
            db.session.delete(existing_like)
        else:
            existing_like.is_like = bool(is_like)
    else:
        new_like = Like(
            user_id=current_user.id,
            video_id=id,
            is_like=bool(is_like)
        )
        db.session.add(new_like)
    
    db.session.commit()
    return redirect(url_for('video_feed'))

@app.route('/video/<int:id>/comment', methods=['POST'])
@login_required
def add_video_comment(id):
    video = Video.query.get_or_404(id)
    content = request.form.get('content')
    
    if content and content.strip():
        comment = Comment(
            content=content.strip(),
            user_id=current_user.id,
            video_id=id
        )
        db.session.add(comment)
        db.session.commit()
        
        # Create notification for video author
        if video.user_id != current_user.id:
            create_notification(
                video.user_id,
                'comment',
                f'{current_user.username} commented on your video',
                related_user_id=current_user.id
            )
        
        award_points(current_user, 3, 'Added video comment')
        flash('Comment added successfully!', 'success')
    
    return redirect(url_for('video_feed'))

# Notification routes
@app.route('/notifications')
@login_required
def notifications():
    user_notifications = current_user.notifications.order_by(desc(Notification.created_at)).all()
    
    # Mark all as read
    for notification in user_notifications:
        notification.is_read = True
    db.session.commit()
    
    return render_template('notifications.html', notifications=user_notifications)

@app.route('/notifications/count')
@login_required
def notification_count():
    count = current_user.notifications.filter_by(is_read=False).count()
    return jsonify({'count': count})

# Theme toggle
@app.route('/toggle_theme')
@login_required
def toggle_theme():
    current_user.theme_preference = 'dark' if current_user.theme_preference == 'light' else 'light'
    db.session.commit()
    return redirect(request.referrer or url_for('index'))

# Report system
@app.route('/report/<type>/<int:id>', methods=['GET', 'POST'])
@login_required
def report_content(type, id):
    form = ReportForm()
    
    if form.validate_on_submit():
        report = Report(
            reason=form.reason.data,
            description=form.description.data,
            reporter_id=current_user.id
        )
        
        if type == 'post':
            post = Post.query.get_or_404(id)
            report.post_id = id
        elif type == 'comment':
            comment = Comment.query.get_or_404(id)
            report.comment_id = id
        
        db.session.add(report)
        db.session.commit()
        
        flash('Report submitted successfully. Thank you for helping keep our community safe.', 'success')
        return redirect(request.referrer or url_for('index'))
    
    return render_template('report_form.html', form=form, type=type, id=id)

# Poll system
@app.route('/polls')
def polls():
    active_polls = Poll.query.filter_by(is_active=True).order_by(desc(Poll.created_at)).all()
    return render_template('polls/list.html', polls=active_polls)

@app.route('/create_poll', methods=['GET', 'POST'])
@login_required
def create_poll():
    form = PollForm()
    if form.validate_on_submit():
        poll = Poll(
            question=form.question.data,
            user_id=current_user.id
        )
        
        if form.duration_hours.data:
            poll.ends_at = datetime.utcnow() + timedelta(hours=form.duration_hours.data)
        
        db.session.add(poll)
        db.session.flush()
        
        # Add options
        options = [form.option1.data, form.option2.data]
        if form.option3.data:
            options.append(form.option3.data)
        if form.option4.data:
            options.append(form.option4.data)
        
        for option_text in options:
            option = PollOption(text=option_text, poll_id=poll.id)
            db.session.add(option)
        
        db.session.commit()
        award_points(current_user, 5, 'Created poll')
        flash('Poll created successfully!', 'success')
        return redirect(url_for('view_poll', id=poll.id))
    
    return render_template('polls/create.html', form=form)

@app.route('/poll/<int:id>')
def view_poll(id):
    poll = Poll.query.get_or_404(id)
    
    # Check if poll has expired
    if poll.ends_at and poll.ends_at < datetime.utcnow():
        poll.is_active = False
        db.session.commit()
    
    # Get vote counts for each option
    options_with_counts = []
    total_votes = 0
    
    for option in poll.options:
        vote_count = option.votes.count()
        options_with_counts.append({
            'option': option,
            'votes': vote_count
        })
        total_votes += vote_count
    
    # Calculate percentages
    for item in options_with_counts:
        item['percentage'] = (item['votes'] / total_votes * 100) if total_votes > 0 else 0
    
    # Check if current user has voted
    user_vote = None
    if current_user.is_authenticated:
        user_vote = Vote.query.filter_by(user_id=current_user.id, poll_id=id).first()
    
    return render_template('polls/view.html', poll=poll, options_with_counts=options_with_counts, 
                         total_votes=total_votes, user_vote=user_vote)

@app.route('/vote/<int:poll_id>/<int:option_id>')
@login_required
def vote_poll(poll_id, option_id):
    poll = Poll.query.get_or_404(poll_id)
    option = PollOption.query.get_or_404(option_id)
    
    if not poll.is_active:
        flash('This poll is no longer active.', 'warning')
        return redirect(url_for('view_poll', id=poll_id))
    
    # Check if user already voted
    existing_vote = Vote.query.filter_by(user_id=current_user.id, poll_id=poll_id).first()
    if existing_vote:
        # Update existing vote
        existing_vote.option_id = option_id
    else:
        # Create new vote
        vote = Vote(
            user_id=current_user.id,
            poll_id=poll_id,
            option_id=option_id
        )
        db.session.add(vote)
    
    db.session.commit()
    award_points(current_user, 1, 'Poll participation')
    flash('Vote recorded!', 'success')
    return redirect(url_for('view_poll', id=poll_id))

# Game routes
@app.route('/games')
@login_required
def games():
    # Get user's best scores
    snake_score = GameScore.query.filter_by(user_id=current_user.id, game_type='snake').order_by(desc(GameScore.score)).first()
    quiz_score = GameScore.query.filter_by(user_id=current_user.id, game_type='quiz').order_by(desc(GameScore.score)).first()
    guess_score = GameScore.query.filter_by(user_id=current_user.id, game_type='guess_number').order_by(desc(GameScore.score)).first()
    
    # Get leaderboards
    snake_leaders = GameScore.query.filter_by(game_type='snake').order_by(desc(GameScore.score)).limit(5).all()
    quiz_leaders = GameScore.query.filter_by(game_type='quiz').order_by(desc(GameScore.score)).limit(5).all()
    guess_leaders = GameScore.query.filter_by(game_type='guess_number').order_by(desc(GameScore.score)).limit(5).all()
    
    return render_template('games/index.html',
                         snake_score=snake_score, quiz_score=quiz_score, guess_score=guess_score,
                         snake_leaders=snake_leaders, quiz_leaders=quiz_leaders, guess_leaders=guess_leaders)

@app.route('/games/snake')
@login_required
def snake_game():
    return render_template('games/snake.html')

@app.route('/games/quiz')
@login_required
def quiz_game():
    # Simple math quiz
    questions = [
        {'question': 'What is 15 + 27?', 'answer': '42'},
        {'question': 'What is 8 × 7?', 'answer': '56'},
        {'question': 'What is 144 ÷ 12?', 'answer': '12'},
        {'question': 'What is 25²?', 'answer': '625'},
        {'question': 'What is the square root of 81?', 'answer': '9'}
    ]
    
    current_question = random.choice(questions)
    session['quiz_answer'] = current_question['answer']
    session['quiz_score'] = session.get('quiz_score', 0)
    
    form = QuizForm()
    return render_template('games/quiz.html', question=current_question['question'], form=form, 
                         score=session.get('quiz_score', 0))

@app.route('/games/quiz/answer', methods=['POST'])
@login_required
def quiz_answer():
    form = QuizForm()
    if form.validate_on_submit():
        correct_answer = session.get('quiz_answer', '')
        user_answer = form.answer.data.strip()
        
        if user_answer.lower() == correct_answer.lower():
            session['quiz_score'] = session.get('quiz_score', 0) + 10
            flash('Correct! +10 points', 'success')
        else:
            flash(f'Wrong! The correct answer was {correct_answer}', 'danger')
            # Save final score
            final_score = session.get('quiz_score', 0)
            if final_score > 0:
                game_score = GameScore(
                    game_type='quiz',
                    score=final_score,
                    user_id=current_user.id
                )
                db.session.add(game_score)
                db.session.commit()
                award_points(current_user, final_score // 10, 'Quiz game')
            
            session.pop('quiz_score', None)
            session.pop('quiz_answer', None)
            return redirect(url_for('games'))
    
    return redirect(url_for('quiz_game'))

@app.route('/games/guess')
@login_required
def guess_number_game():
    if 'guess_number' not in session:
        session['guess_number'] = random.randint(1, 100)
        session['guess_attempts'] = 0
    
    form = GuessNumberForm()
    return render_template('games/guess_number.html', form=form, 
                         attempts=session.get('guess_attempts', 0))

@app.route('/games/guess/submit', methods=['POST'])
@login_required
def submit_guess():
    form = GuessNumberForm()
    if form.validate_on_submit():
        target_number = session.get('guess_number', 0)
        user_guess = form.guess.data
        session['guess_attempts'] = session.get('guess_attempts', 0) + 1
        
        if user_guess == target_number:
            score = max(100 - session['guess_attempts'] * 5, 10)
            game_score = GameScore(
                game_type='guess_number',
                score=score,
                user_id=current_user.id
            )
            db.session.add(game_score)
            db.session.commit()
            
            award_points(current_user, score // 10, 'Guess number game')
            flash(f'Correct! You guessed it in {session["guess_attempts"]} attempts. Score: {score}', 'success')
            
            session.pop('guess_number', None)
            session.pop('guess_attempts', None)
            return redirect(url_for('games'))
        elif user_guess < target_number:
            flash('Too low! Try again.', 'warning')
        else:
            flash('Too high! Try again.', 'warning')
        
        if session['guess_attempts'] >= 10:
            flash(f'Game over! The number was {target_number}', 'danger')
            session.pop('guess_number', None)
            session.pop('guess_attempts', None)
            return redirect(url_for('games'))
    
    return redirect(url_for('guess_number_game'))

@app.route('/save_snake_score', methods=['POST'])
@login_required
def save_snake_score():
    score = request.json.get('score', 0)
    if score > 0:
        game_score = GameScore(
            game_type='snake',
            score=score,
            user_id=current_user.id
        )
        db.session.add(game_score)
        db.session.commit()
        
        award_points(current_user, score // 10, 'Snake game')
        return jsonify({'success': True})
    
    return jsonify({'success': False})

# Admin routes
@app.route('/admin')
@login_required
def admin_panel():
    if not current_user.is_admin:
        abort(403)
    
    # Get statistics
    total_users = User.query.count()
    total_posts = Post.query.count()
    total_comments = Comment.query.count()
    total_videos = Video.query.count()
    pending_reports = Report.query.filter_by(status='pending').count()
    
    return render_template('admin/panel.html',
                         total_users=total_users,
                         total_posts=total_posts,
                         total_comments=total_comments,
                         total_videos=total_videos,
                         pending_reports=pending_reports)

@app.route('/admin/users')
@login_required
def admin_users():
    if not current_user.is_admin:
        abort(403)
    
    users = User.query.order_by(desc(User.created_at)).all()
    return render_template('admin/users.html', users=users)

@app.route('/admin/reports')
@login_required
def admin_reports():
    if not current_user.is_admin:
        abort(403)
    
    reports = Report.query.order_by(desc(Report.created_at)).all()
    return render_template('admin/reports.html', reports=reports)

@app.route('/admin/statistics')
@login_required
def admin_statistics():
    if not current_user.is_admin:
        abort(403)
    
    # Get daily statistics for the last 30 days
    from sqlalchemy import text
    
    # Users registered per day
    user_stats = db.session.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM user
        WHERE created_at >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
    """)).fetchall()
    
    # Posts per day
    post_stats = db.session.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM post
        WHERE created_at >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
    """)).fetchall()
    
    # Comments per day
    comment_stats = db.session.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM comment
        WHERE created_at >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
    """)).fetchall()
    
    return render_template('admin/statistics.html',
                         user_stats=user_stats,
                         post_stats=post_stats,
                         comment_stats=comment_stats)

@app.route('/admin/pin_post/<int:id>')
@login_required
def admin_pin_post(id):
    if not current_user.is_admin:
        abort(403)
    
    post = Post.query.get_or_404(id)
    post.is_pinned = not post.is_pinned
    db.session.commit()
    
    action = 'pinned' if post.is_pinned else 'unpinned'
    flash(f'Post {action} successfully!', 'success')
    return redirect(request.referrer or url_for('index'))

@app.route('/admin/delete_post/<int:id>')
@login_required
def admin_delete_post(id):
    if not current_user.is_admin:
        abort(403)
    
    post = Post.query.get_or_404(id)
    db.session.delete(post)
    db.session.commit()
    
    flash('Post deleted successfully!', 'success')
    return redirect(request.referrer or url_for('index'))

@app.route('/admin/pin_video/<int:id>')
@login_required
def admin_pin_video(id):
    if not current_user.is_admin:
        abort(403)
    
    video = Video.query.get_or_404(id)
    video.is_pinned = not video.is_pinned
    db.session.commit()
    
    action = 'pinned' if video.is_pinned else 'unpinned'
    flash(f'Video {action} successfully!', 'success')
    return redirect(request.referrer or url_for('video_feed'))

@app.route('/admin/delete_video/<int:id>')
@login_required
def admin_delete_video(id):
    if not current_user.is_admin:
        abort(403)
    
    video = Video.query.get_or_404(id)
    db.session.delete(video)
    db.session.commit()
    
    flash('Video deleted successfully!', 'success')
    return redirect(request.referrer or url_for('video_feed'))

@app.route('/admin/verify_user/<int:id>')
@login_required
def admin_verify_user(id):
    if not current_user.is_admin:
        abort(403)
    
    user = User.query.get_or_404(id)
    user.is_verified = not user.is_verified
    db.session.commit()
    
    action = 'verified' if user.is_verified else 'unverified'
    flash(f'User {action} successfully!', 'success')
    return redirect(url_for('admin_users'))

@app.route('/admin/reset_password/<int:id>')
@login_required
def admin_reset_password(id):
    if not current_user.is_admin:
        abort(403)
    
    user = User.query.get_or_404(id)
    new_password = 'newpass123'
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    flash(f'Password reset for {user.username}. New password: {new_password}', 'success')
    return redirect(url_for('admin_users'))

@app.route('/admin/delete_user/<int:id>')
@login_required
def admin_delete_user(id):
    if not current_user.is_admin:
        abort(403)
    
    user = User.query.get_or_404(id)
    if user.is_admin:
        flash('Cannot delete admin user!', 'danger')
        return redirect(url_for('admin_users'))
    
    db.session.delete(user)
    db.session.commit()
    
    flash('User deleted successfully!', 'success')
    return redirect(url_for('admin_users'))

@app.route('/admin/resolve_report/<int:id>')
@login_required
def admin_resolve_report(id):
    if not current_user.is_admin:
        abort(403)
    
    report = Report.query.get_or_404(id)
    report.status = 'resolved'
    db.session.commit()
    
    flash('Report marked as resolved!', 'success')
    return redirect(url_for('admin_reports'))

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(403)
def forbidden_error(error):
    return render_template('403.html'), 403

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

# Context processor to make theme available in all templates
@app.context_processor
def inject_theme():
    theme = 'light'
    if current_user.is_authenticated:
        theme = current_user.theme_preference
    return dict(theme=theme)
